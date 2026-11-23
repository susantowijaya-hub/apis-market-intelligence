import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Asset5mVolatility,
  BandarmologyPhase,
  IctSignalAnalysis,
  MarketAsset,
  PriceAlertItem,
  StocksMoversBucket,
} from '../types/market';
import {
  BandarmologyQuoteSnapshot,
  BandarmologyShiftCooldown,
  buildBandarmologyAlertItem,
  detectBandarmologyAccumulationShifts,
  extractUniqueIdxBandarmologyStocks,
  isAccumulationTargetPhase,
  loadPersistedBandarPhases,
  savePersistedBandarPhases,
} from '../utils/bandarmologyAlerts';
import { scanAllIctSignals } from '../utils/ictSignals';

const WINDOW_MS = 5 * 60 * 1000; // 5-minute rolling window
const LIVE_CONFIRM_MIN_SPAN_MS = 4 * 60 * 1000; // Require >= 4 minutes of browser samples before switching from verified server 5m telemetry
const ALERT_MIN_SPAN_MS = 30 * 1000; // Require >= 30s live tick span before emitting spike alert
const THRESHOLD_PERCENT = 2.0; // Trigger when |confirmed move| >= 2.0% within 5 minutes
const CONFIRM_SECOND_TICK_PCT = 1.85; // 2nd confirming sample must hold >= 1.85% in the same direction
const COOLDOWN_MS = 5 * 60 * 1000; // Prevent duplicate spam within 5 minutes unless move escalates >= 1% or reverses
const ICT_COOLDOWN_MS = 10 * 60 * 1000; // Avoid repeating identical ICT setups inside 10 minutes
const TOAST_TTL_MS = 9500;
const MAX_ALERTS = 30;

interface PriceSample {
  t: number;
  price: number;
}

interface AlertCooldownState {
  triggeredAt: number;
  direction: 'surge' | 'drop';
  movePercent: number;
}

interface IctCooldownState {
  triggeredAt: number;
  direction: 'BUY' | 'SELL';
  confidence: number;
  setupName: string;
}

interface PendingSpikeState {
  direction: 'surge' | 'drop';
  peakPct: number;
  anchorPrice: number;
  anchorTs: number;
  seenAt: number;
}

function interpolateLiveBufferAnchor(liveBuf: PriceSample[], targetTs: number): number | null {
  if (liveBuf.length < 2) return null;
  if (targetTs <= liveBuf[0].t) return liveBuf[0].price;

  for (let i = 1; i < liveBuf.length; i++) {
    const prev = liveBuf[i - 1];
    const curr = liveBuf[i];
    if (curr.t >= targetTs) {
      const span = Math.max(1, curr.t - prev.t);
      const weight = Math.max(0, Math.min(1, (targetTs - prev.t) / span));
      return prev.price + (curr.price - prev.price) * weight;
    }
  }
  return liveBuf[0].price;
}

function estimateAsset5mMetrics(
  asset: MarketAsset,
  liveBuf: PriceSample[],
  now: number
): {
  pct5m: number;
  range5mPct: number;
  isSessionOpen: boolean;
  sampleSource: Asset5mVolatility['sampleSource'];
} {
  const isSessionOpen = asset.marketSessionOpen !== false;
  if (!isSessionOpen || !Number.isFinite(asset.price) || asset.price <= 0) {
    return {
      pct5m: 0,
      range5mPct: 0,
      isSessionOpen,
      sampleSource: 'closed',
    };
  }

  // 1. Live browser rolling 5m ticks once >= 4 minutes of continuous samples are buffered
  if (liveBuf.length >= 4 && now - liveBuf[0].t >= LIVE_CONFIRM_MIN_SPAN_MS) {
    const anchor = interpolateLiveBufferAnchor(liveBuf, now - WINDOW_MS);
    if (anchor && anchor > 0) {
      const pct = ((asset.price - anchor) / anchor) * 100;
      let minP = asset.price;
      let maxP = asset.price;
      for (const s of liveBuf) {
        if (s.price < minP) minP = s.price;
        if (s.price > maxP) maxP = s.price;
      }
      const rangePct = minP > 0 ? ((maxP - minP) / minP) * 100 : 0;
      return {
        pct5m: Number.isFinite(pct) ? pct : 0,
        range5mPct: Number.isFinite(rangePct) ? rangePct : 0,
        isSessionOpen: true,
        sampleSource: 'live-5m',
      };
    }
  }

  // 2. Verified same-source provider 5m move, only while its source observation is fresh.
  const quoteObservationFresh =
    typeof asset.updatedAtEpoch === 'number' &&
    Number.isFinite(asset.updatedAtEpoch) &&
    asset.updatedAtEpoch <= now + 60_000 &&
    now - asset.updatedAtEpoch <= 30 * 60_000;
  if (quoteObservationFresh && typeof asset.move5mPct === 'number' && Number.isFinite(asset.move5mPct)) {
    return {
      pct5m: asset.move5mPct,
      range5mPct:
        typeof asset.vol5mRangePct === 'number' && Number.isFinite(asset.vol5mRangePct)
          ? Math.max(0, asset.vol5mRangePct)
          : Math.abs(asset.move5mPct),
      isSessionOpen: true,
      sampleSource: asset.move5mSource === 'server-5m' ? 'server-5m' : 'intraday-1m',
    };
  }

  // 3. Fallback intraday bar lookup using series only (avoid cross-provider last-tick jump)
  const series = asset.chartSeries?.['1D'] ?? [];
  const timestamps = asset.chartTimestamps?.['1D'] ?? [];
  if (series.length >= 2) {
    const lastIdx = series.length - 1;
    const lastTs = timestamps[lastIdx];
    const hasFreshBar =
      typeof lastTs === 'number' && Number.isFinite(lastTs) &&
      lastTs <= now + 60_000 && now - lastTs <= 30 * 60_000;

    if (hasFreshBar) {
      let anchorIdx = Math.max(0, lastIdx - 1);
      let gapMinutes = 5;

      if (timestamps.length === series.length && typeof lastTs === 'number') {
        for (let i = lastIdx - 1; i >= 0; i--) {
          const ts = timestamps[i];
          if (typeof ts === 'number' && lastTs - ts >= 4 * 60_000) {
            anchorIdx = i;
            gapMinutes = Math.max(5, (lastTs - ts) / 60_000);
            break;
          }
        }
      }

      const anchorPrice = series[anchorIdx];
      const endPrice = series[lastIdx];
      if (Number.isFinite(anchorPrice) && anchorPrice > 0 && Number.isFinite(endPrice) && endPrice > 0) {
        const rawPct = ((endPrice - anchorPrice) / anchorPrice) * 100;
        const scaled5m = gapMinutes > 7 ? rawPct * (5 / gapMinutes) : rawPct;
        return {
          pct5m: Number.isFinite(scaled5m) ? scaled5m : 0,
          range5mPct: Math.abs(Number.isFinite(scaled5m) ? scaled5m : 0),
          isSessionOpen: true,
          sampleSource: 'intraday-1m',
        };
      }
    }
  }

  return {
    pct5m: 0,
    range5mPct: 0,
    isSessionOpen: true,
    sampleSource: 'intraday-1m',
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function usePriceAlerts(assets: MarketAsset[], idxBucket?: StocksMoversBucket | null) {
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [toasts, setToasts] = useState<PriceAlertItem[]>([]);
  const [volatility5mMap, setVolatility5mMap] = useState<Record<string, Asset5mVolatility>>({});
  const [market5mStats, setMarket5mStats] = useState<{
    meanPct: number;
    medianPct: number;
    stdPct: number;
  }>({
    meanPct: 0,
    medianPct: 0,
    stdPct: 0.08,
  });

  const samplesRef = useRef<Record<string, PriceSample[]>>({});
  const cooldownRef = useRef<Record<string, AlertCooldownState>>({});
  const ictCooldownRef = useRef<Record<string, IctCooldownState>>({});
  const initialIctScannedRef = useRef<boolean>(false);
  const bandarPhaseMapRef = useRef<Record<string, BandarmologyPhase>>(loadPersistedBandarPhases());
  const bandarCooldownRef = useRef<Record<string, BandarmologyShiftCooldown>>({});
  const latestIdxSnapshotsRef = useRef<Record<string, BandarmologyQuoteSnapshot>>({});
  const pendingSpikeRef = useRef<Record<string, PendingSpikeState>>({});
  const toastTimersRef = useRef<Record<string, number>>({});

  const scheduleToastDismiss = useCallback((alertId: string) => {
    if (toastTimersRef.current[alertId]) {
      window.clearTimeout(toastTimersRef.current[alertId]);
    }
    toastTimersRef.current[alertId] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== alertId));
      delete toastTimersRef.current[alertId];
    }, TOAST_TTL_MS);
  }, []);

  const pushAlert = useCallback(
    (item: PriceAlertItem, showToast = true) => {
      setAlerts((prev) => [item, ...prev].slice(0, MAX_ALERTS));
      if (showToast) {
        setToasts((prev) => [item, ...prev].slice(0, 3));
        scheduleToastDismiss(item.id);
      }
    },
    [scheduleToastDismiss]
  );

  const buildIctAlertItem = useCallback(
    (sig: IctSignalAnalysis, forcedDirection?: 'BUY' | 'SELL'): PriceAlertItem => {
      const action: 'BUY' | 'SELL' =
        forcedDirection ?? (sig.direction === 'SELL' ? 'SELL' : 'BUY');
      const now = Date.now();
      return {
        id: `ict-${sig.assetId}-${action}-${now}-${Math.random().toString(36).slice(2, 6)}`,
        assetId: sig.assetId,
        symbol: sig.symbol,
        name: sig.name,
        direction: action === 'BUY' ? 'surge' : 'drop',
        movePercent: sig.confidence,
        windowMinutes: 15,
        fromPrice: sig.currentPrice,
        toPrice: sig.currentPrice,
        decimals: sig.decimals,
        currencyPrefix: sig.currencyPrefix,
        unitSuffix: sig.unitSuffix,
        triggeredAt: now,
        read: false,
        alertKind: 'ict',
        ictAction: action,
        ictSetup: sig.setupName,
        entryZone: sig.entryZone,
        stopLoss: sig.stopLoss,
        targetPrice: sig.targetPrice,
        ictTimeframe: sig.timeframe,
        confidence: sig.confidence,
      };
    },
    []
  );

  // Monitor rolling 5-minute price window & cross-market relative volatility across all instruments
  useEffect(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    const allMetrics: Array<{
      assetId: string;
      pct5m: number;
      range5mPct: number;
      isSessionOpen: boolean;
      sampleSource: Asset5mVolatility['sampleSource'];
    }> = [];

    for (const asset of assets) {
      if (!Number.isFinite(asset.price) || asset.price <= 0) continue;

      // Browser-generated rolling samples are valid only for crypto assets whose
      // last quote timestamp was refreshed by the active free Coinbase WebSocket.
      // Never turn an hourly static snapshot into repeated synthetic 10-second ticks.
      const hasFreshPublicWebSocketTick =
        (asset.id === 'BTCUSD' || asset.id === 'ETHUSD') &&
        typeof asset.updatedAtEpoch === 'number' &&
        Number.isFinite(asset.updatedAtEpoch) &&
        now - asset.updatedAtEpoch <= 15_000;
      const buf = hasFreshPublicWebSocketTick ? (samplesRef.current[asset.id] ?? []) : [];
      const pruned = buf.filter((s) => s.t >= cutoff);
      const lastSample = pruned[pruned.length - 1];
      const nextBuf = hasFreshPublicWebSocketTick
        ? !lastSample ||
          Math.abs(asset.price - lastSample.price) > Math.pow(10, -(asset.decimals + 1)) ||
          now - lastSample.t >= 10_000
          ? [...pruned, { t: now, price: asset.price }]
          : pruned
        : [];
      if (nextBuf.length > 0) samplesRef.current[asset.id] = nextBuf;
      else delete samplesRef.current[asset.id];

      const est = estimateAsset5mMetrics(asset, nextBuf, now);
      allMetrics.push({
        assetId: asset.id,
        pct5m: est.pct5m,
        range5mPct: est.range5mPct,
        isSessionOpen: est.isSessionOpen,
        sampleSource: est.sampleSource,
      });

      // 2.0% 5m spike alert verification:
      // Require open market session, >= 3 buffered live samples, >= 30s span, AND 2-tick confirmation
      if (
        !est.isSessionOpen ||
        nextBuf.length < 3 ||
        now - nextBuf[0].t < ALERT_MIN_SPAN_MS
      ) {
        delete pendingSpikeRef.current[asset.id];
        continue;
      }

      let minSample = nextBuf[0];
      let maxSample = nextBuf[0];
      for (const s of nextBuf) {
        if (s.price < minSample.price) minSample = s;
        if (s.price > maxSample.price) maxSample = s;
      }

      const surgePct = minSample.price > 0 ? ((asset.price - minSample.price) / minSample.price) * 100 : 0;
      const dropPct = maxSample.price > 0 ? ((asset.price - maxSample.price) / maxSample.price) * 100 : 0;

      const isSurge = surgePct >= THRESHOLD_PERCENT && surgePct >= Math.abs(dropPct);
      const isDrop = dropPct <= -THRESHOLD_PERCENT && Math.abs(dropPct) > surgePct;

      if (!isSurge && !isDrop) {
        // Clear stale unconfirmed candidate if move reversed back inside band
        const pending = pendingSpikeRef.current[asset.id];
        if (pending && now - pending.seenAt > 20_000) {
          delete pendingSpikeRef.current[asset.id];
        }
        continue;
      }

      const direction: 'surge' | 'drop' = isSurge ? 'surge' : 'drop';
      const movePercent = Number((isSurge ? surgePct : dropPct).toFixed(2));
      const anchor = isSurge ? minSample : maxSample;

      // Two-tick confirmation: previous buffered sample OR server 5m delta must corroborate >= 1.85%
      const prevSample = nextBuf[nextBuf.length - 2];
      const prevMoveFromAnchor =
        prevSample && anchor.price > 0
          ? ((prevSample.price - anchor.price) / anchor.price) * 100
          : 0;
      const prevConfirms =
        direction === 'surge'
          ? prevMoveFromAnchor >= CONFIRM_SECOND_TICK_PCT
          : prevMoveFromAnchor <= -CONFIRM_SECOND_TICK_PCT;
      const serverConfirms =
        typeof asset.move5mPct === 'number' &&
        (direction === 'surge'
          ? asset.move5mPct >= CONFIRM_SECOND_TICK_PCT
          : asset.move5mPct <= -CONFIRM_SECOND_TICK_PCT);

      const pending = pendingSpikeRef.current[asset.id];
      const pendingConfirms =
        pending &&
        pending.direction === direction &&
        now - pending.seenAt <= 12_000 &&
        now - pending.seenAt >= 800;

      if (!prevConfirms && !serverConfirms && !pendingConfirms) {
        pendingSpikeRef.current[asset.id] = {
          direction,
          peakPct: movePercent,
          anchorPrice: anchor.price,
          anchorTs: anchor.t,
          seenAt: now,
        };
        continue;
      }

      delete pendingSpikeRef.current[asset.id];

      const windowMinutes = Math.max(1, Math.min(5, Math.ceil((now - anchor.t) / 60_000)));
      const prevCooldown = cooldownRef.current[asset.id];
      const withinCooldown = prevCooldown && now - prevCooldown.triggeredAt < COOLDOWN_MS;
      const escalated =
        prevCooldown &&
        (prevCooldown.direction !== direction ||
          Math.abs(movePercent) - Math.abs(prevCooldown.movePercent) >= 1.0);

      if (withinCooldown && !escalated) continue;

      cooldownRef.current[asset.id] = {
        triggeredAt: now,
        direction,
        movePercent,
      };

      const alertItem: PriceAlertItem = {
        id: `${asset.id}-${now}`,
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.shortName,
        direction,
        movePercent,
        windowMinutes,
        fromPrice: anchor.price,
        toPrice: asset.price,
        decimals: asset.decimals,
        currencyPrefix: asset.currencyPrefix,
        unitSuffix: asset.unitSuffix,
        triggeredAt: now,
        read: false,
      };

      pushAlert(alertItem);
    }

    // Compute 5-minute deviation strictly across OPEN trading sessions so closed sessions do not crush variance
    const activeMetrics = allMetrics.filter((m) => m.isSessionOpen);
    const activeCount = activeMetrics.length;

    let overallMean = 0;
    let medianPct = 0;
    let stdPct = 0.08;
    let totalActiveSum = 0;

    if (activeCount > 0) {
      totalActiveSum = activeMetrics.reduce((acc, m) => acc + m.pct5m, 0);
      overallMean = totalActiveSum / activeCount;
      const activePcts = activeMetrics.map((m) => m.pct5m);
      medianPct = computeMedian(activePcts);

      const variance =
        activeMetrics.reduce((acc, m) => acc + Math.pow(m.pct5m - overallMean, 2), 0) / activeCount;
      const regularStd = Math.sqrt(variance);
      const deviations = activePcts.map((p) => Math.abs(p - medianPct));
      const madStd = computeMedian(deviations) * 1.4826;
      stdPct = Math.max(0.08, 0.55 * madStd + 0.45 * regularStd);
    }

    const nextMap: Record<string, Asset5mVolatility> = {};
    for (const m of allMetrics) {
      if (!m.isSessionOpen) {
        nextMap[m.assetId] = {
          assetId: m.assetId,
          pct5m: 0,
          range5mPct: 0,
          marketMean5m: Number(overallMean.toFixed(3)),
          medianBaseline5m: Number(medianPct.toFixed(3)),
          relDevPct: 0,
          zScore: 0,
          isSessionOpen: false,
          sampleSource: 'closed',
        };
        continue;
      }

      const restMean =
        activeCount > 1 ? (totalActiveSum - m.pct5m) / (activeCount - 1) : overallMean;
      const baseline = 0.5 * restMean + 0.5 * medianPct;
      const relDevPct = m.pct5m - baseline;
      const zScore = relDevPct / stdPct;

      nextMap[m.assetId] = {
        assetId: m.assetId,
        pct5m: Number(m.pct5m.toFixed(3)),
        range5mPct: Number(m.range5mPct.toFixed(3)),
        marketMean5m: Number(restMean.toFixed(3)),
        medianBaseline5m: Number(medianPct.toFixed(3)),
        relDevPct: Number(relDevPct.toFixed(3)),
        zScore: Number(Math.max(-4, Math.min(4, zScore)).toFixed(2)),
        isSessionOpen: true,
        sampleSource: m.sampleSource,
      };
    }

    setVolatility5mMap(nextMap);
    setMarket5mStats({
      meanPct: Number(overallMean.toFixed(3)),
      medianPct: Number(medianPct.toFixed(3)),
      stdPct: Number(stdPct.toFixed(3)),
    });
  }, [assets, pushAlert]);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(toastTimersRef.current)) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  // Automated ICT Smart Money setup monitor across FX Majors, BTC/USD, and XAU/USD
  useEffect(() => {
    if (assets.length === 0) return;
    const now = Date.now();
    const signals = scanAllIctSignals(assets);
    const activeSetups = signals.filter(
      (s) => s.direction !== 'NEUTRAL' && s.confidence >= 60
    );
    if (activeSetups.length === 0) return;

    if (!initialIctScannedRef.current) {
      initialIctScannedRef.current = true;
      for (const sig of activeSetups.slice(0, 2).reverse()) {
        const dir = sig.direction === 'SELL' ? 'SELL' : 'BUY';
        ictCooldownRef.current[sig.assetId] = {
          triggeredAt: now,
          direction: dir,
          confidence: sig.confidence,
          setupName: sig.setupName,
        };
        pushAlert(buildIctAlertItem(sig, dir), false);
      }
      return;
    }

    for (const sig of activeSetups) {
      const dir = sig.direction === 'SELL' ? 'SELL' : 'BUY';
      const prev = ictCooldownRef.current[sig.assetId];
      const withinCooldown = prev && now - prev.triggeredAt < ICT_COOLDOWN_MS;
      const changedDirection = !prev || prev.direction !== dir;
      const upgraded = prev && sig.confidence - prev.confidence >= 12;

      if (!prev || !withinCooldown || changedDirection || upgraded) {
        ictCooldownRef.current[sig.assetId] = {
          triggeredAt: now,
          direction: dir,
          confidence: sig.confidence,
          setupName: sig.setupName,
        };
        pushAlert(buildIctAlertItem(sig, dir), true);
      }
    }
  }, [assets, buildIctAlertItem, pushAlert]);

  const processBandarmologySnapshots = useCallback(
    (snapshots: BandarmologyQuoteSnapshot[], showToast = true): number => {
      if (snapshots.length === 0) return 0;
      for (const snap of snapshots) {
        latestIdxSnapshotsRef.current[snap.symbol] = snap;
      }
      const { triggeredAlerts, nextPhases, nextCooldowns } =
        detectBandarmologyAccumulationShifts(
          snapshots,
          bandarPhaseMapRef.current,
          bandarCooldownRef.current,
          Date.now()
        );
      bandarPhaseMapRef.current = nextPhases;
      bandarCooldownRef.current = nextCooldowns;
      savePersistedBandarPhases(nextPhases);

      for (const alertItem of triggeredAlerts) {
        pushAlert(alertItem, showToast);
      }
      return triggeredAlerts.length;
    },
    [pushAlert]
  );

  // Automated IDX Bandarmology monitor for 'Early Accumulation' <-> 'Strong Accumulation' shifts
  useEffect(() => {
    const snapshots = extractUniqueIdxBandarmologyStocks(idxBucket);
    if (snapshots.length === 0) return;
    processBandarmologySnapshots(snapshots, true);
  }, [idxBucket, processBandarmologySnapshots]);

  // Also monitor IDX Bandarmology quotes arriving from Portfolio holdings (.JK positions)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleCustomBandarQuotes = (e: Event) => {
      const detail = (e as CustomEvent<{ snapshots?: BandarmologyQuoteSnapshot[] }>).detail;
      if (Array.isArray(detail?.snapshots) && detail.snapshots.length > 0) {
        processBandarmologySnapshots(detail.snapshots, true);
      }
    };
    window.addEventListener('stocks:idx-bandar-quotes', handleCustomBandarQuotes);
    return () => window.removeEventListener('stocks:idx-bandar-quotes', handleCustomBandarQuotes);
  }, [processBandarmologySnapshots]);

  const pushIctSignalAlert = useCallback(
    (sig: IctSignalAnalysis) => {
      const forcedDir: 'BUY' | 'SELL' =
        sig.direction === 'SELL'
          ? 'SELL'
          : sig.direction === 'BUY'
            ? 'BUY'
            : sig.pdZone === 'Premium'
              ? 'SELL'
              : 'BUY';
      const now = Date.now();
      ictCooldownRef.current[sig.assetId] = {
        triggeredAt: now,
        direction: forcedDir,
        confidence: sig.confidence,
        setupName: sig.setupName,
      };
      pushAlert(buildIctAlertItem(sig, forcedDir), true);
    },
    [buildIctAlertItem, pushAlert]
  );

  const scanIctAlerts = useCallback(
    (preferredAssetId?: string): number => {
      const signals = scanAllIctSignals(assets);
      const actionable = signals.filter((s) => s.direction !== 'NEUTRAL');
      const selected =
        actionable.length > 0
          ? actionable.slice(0, 3)
          : [
              signals.find((s) => s.assetId === preferredAssetId) ?? signals[0],
            ].filter((x): x is IctSignalAnalysis => Boolean(x));

      const now = Date.now();
      selected
        .slice()
        .reverse()
        .forEach((sig, idx) => {
          const forcedDir: 'BUY' | 'SELL' =
            sig.direction === 'SELL'
              ? 'SELL'
              : sig.direction === 'BUY'
                ? 'BUY'
                : sig.pdZone === 'Premium'
                  ? 'SELL'
                  : 'BUY';
          ictCooldownRef.current[sig.assetId] = {
            triggeredAt: now,
            direction: forcedDir,
            confidence: sig.confidence,
            setupName: sig.setupName,
          };
          pushAlert(buildIctAlertItem(sig, forcedDir), idx === selected.length - 1);
        });
      return selected.length;
    },
    [assets, buildIctAlertItem, pushAlert]
  );

  const dismissToast = useCallback((id: string) => {
    if (toastTimersRef.current[id]) {
      window.clearTimeout(toastTimersRef.current[id]);
      delete toastTimersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => (a.read ? a : { ...a, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setToasts([]);
  }, []);

  const scanBandarmologyAlerts = useCallback((): number => {
    const merged = new Map<string, BandarmologyQuoteSnapshot>(
      Object.entries(latestIdxSnapshotsRef.current)
    );
    for (const s of extractUniqueIdxBandarmologyStocks(idxBucket)) {
      merged.set(s.symbol, s);
    }
    const allSnapshots = Array.from(merged.values());
    if (allSnapshots.length === 0) return 0;

    // 1. Check for genuine phase transitions first
    const shiftedCount = processBandarmologySnapshots(allSnapshots, true);
    if (shiftedCount > 0) return shiftedCount;

    // 2. Otherwise inspect strongest real Strong / Early Accumulation stocks for manual drawer visibility
    const candidates = allSnapshots
      .filter((s) => isAccumulationTargetPhase(s.bandarmology.phase))
      .sort((a, b) => Math.abs(b.bandarmology.score) - Math.abs(a.bandarmology.score))
      .slice(0, 2);

    const now = Date.now();
    candidates.forEach((stock, idx) => {
      const curPhase = stock.bandarmology.phase;
      const inferredPrev: BandarmologyPhase =
        curPhase === 'Strong Accumulation'
          ? 'Early Accumulation'
          : 'Strong Accumulation';
      pushAlert(
        buildBandarmologyAlertItem(stock, inferredPrev, curPhase, now),
        idx === 0
      );
    });
    return candidates.length;
  }, [idxBucket, processBandarmologySnapshots, pushAlert]);

  const unreadCount = alerts.reduce((acc, a) => acc + (a.read ? 0 : 1), 0);

  return {
    alerts,
    toasts,
    unreadCount,
    volatility5mMap,
    market5mStats,
    dismissToast,
    markRead,
    markAllRead,
    clearAlerts,
    pushIctSignalAlert,
    scanIctAlerts,
    scanBandarmologyAlerts,
  };
}
