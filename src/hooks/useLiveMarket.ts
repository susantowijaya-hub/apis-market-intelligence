import { apiUrl } from '../lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ECONOMIC_EVENTS,
  FX_PAIR_TILES,
  FX_RATES_USD_BASE,
  INITIAL_ASSETS,
  NEWS_STORIES,
} from '../data/marketData';
import {
  CalendarCatalyst,
  ClientFeedTransportDiagnostics,
  CurrencyCode,
  DailyMarketHighlight,
  DailyMarketSummaryResponse,
  EconomicEvent,
  FxPairTile,
  MarketAsset,
  MarketHeatmapResponse,
  MarketIntelligenceResponse,
  NewsStory,
  ServerFeedDiagnosticsResponse,
  StocksMoversBucket,
  Timeframe,
} from '../types/market';

interface QuotePatch {
  id: string;
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  open: string;
  dayHigh: string;
  dayLow: string;
  volume: string;
  avgVol: string;
  avgVolLabel: string;
  peLabel: string;
  peValue: string;
  capLabel: string;
  capValue: string;
  w52Low: string;
  w52High: string;
  w52Pct: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  support: string;
  supportNote: string;
  resistance: string;
  resistanceNote: string;
  commentary: string;
  sparklinePoints: number[];
  chart1D: number[];
  timestamps1D: number[];
  updatedAtEpoch: number;
  marketSessionOpen?: boolean;
  sessionStateLabel?: string;
  sessionProgressRatio?: number;
  fearGreed7d?: number[];
  move5mPct?: number;
  vol5mRangePct?: number;
  move5mSource?: 'server-5m' | 'intraday-1m' | 'closed';
}

interface BackoffTracker {
  failures: number;
  nextAllowedAt: number;
}

const JITTER_WINDOW_SIZE = 5;
const BOOTSTRAP_CACHE_KEY = 'stocks-free-public-cache-v1';
const BOOTSTRAP_MAX_AGE_MS = 45 * 60 * 1000;

interface BootstrapCachePayload {
  savedAt: number;
  assets?: Array<
    Pick<
      MarketAsset,
      | 'id'
      | 'price'
      | 'prevClose'
      | 'changeValue'
      | 'changePercent'
      | 'open'
      | 'dayHigh'
      | 'dayLow'
      | 'volume'
      | 'sentiment'
      | 'support'
      | 'resistance'
      | 'commentary'
      | 'updatedAtEpoch'
      | 'marketSessionOpen'
      | 'sessionStateLabel'
      | 'fearGreed7d'
      | 'move5mPct'
      | 'vol5mRangePct'
      | 'move5mSource'
    >
  >;
  fxRates?: Record<CurrencyCode, number>;
  fxPairTiles?: FxPairTile[];
  newsStories?: NewsStory[];
  economicEvents?: EconomicEvent[];
  usMoversBucket?: StocksMoversBucket;
  idxMoversBucket?: StocksMoversBucket;
}

function readBootstrapCache(): BootstrapCachePayload | null {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BootstrapCachePayload;
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > BOOTSTRAP_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function mergeBootstrapAssets(base: MarketAsset[], cached?: BootstrapCachePayload['assets']): MarketAsset[] {
  if (!Array.isArray(cached) || cached.length === 0) return base;
  const map = new Map(cached.map((c) => [c.id, c]));
  return base.map((asset) => {
    const patch = map.get(asset.id);
    if (!patch || !Number.isFinite(patch.price) || patch.price <= 0) return asset;
    return {
      ...asset,
      price: patch.price,
      prevClose: patch.prevClose > 0 ? patch.prevClose : asset.prevClose,
      changeValue: Number.isFinite(patch.changeValue) ? patch.changeValue : asset.changeValue,
      changePercent: Number.isFinite(patch.changePercent) ? patch.changePercent : asset.changePercent,
      open: patch.open || asset.open,
      dayHigh: patch.dayHigh || asset.dayHigh,
      dayLow: patch.dayLow || asset.dayLow,
      volume: patch.volume || asset.volume,
      sentiment: patch.sentiment || asset.sentiment,
      support: patch.support || asset.support,
      resistance: patch.resistance || asset.resistance,
      commentary: patch.commentary || asset.commentary,
      updatedAtEpoch: patch.updatedAtEpoch || asset.updatedAtEpoch,
      marketSessionOpen: patch.marketSessionOpen ?? asset.marketSessionOpen,
      sessionStateLabel: patch.sessionStateLabel ?? asset.sessionStateLabel,
      fearGreed7d: patch.fearGreed7d ?? asset.fearGreed7d,
      move5mPct: patch.move5mPct ?? asset.move5mPct,
      vol5mRangePct: patch.vol5mRangePct ?? asset.vol5mRangePct,
      move5mSource: patch.move5mSource ?? asset.move5mSource,
    };
  });
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function fetchJsonWithLatency<T>(
  url: string,
  timeoutMs: number
): Promise<{ data: T | null; rttMs: number | null }> {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(apiUrl(url), { signal: controller.signal, cache: 'no-store' });
    const rttMs = Math.max(1, Math.round(performance.now() - start));
    if (!res.ok) return { data: null, rttMs };
    return { data: (await res.json()) as T, rttMs };
  } catch {
    return { data: null, rttMs: null };
  } finally {
    window.clearTimeout(timerId);
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T | null> {
  const { data } = await fetchJsonWithLatency<T>(url, timeoutMs);
  return data;
}

export function useLiveMarket() {
  const bootstrapRef = useRef<BootstrapCachePayload | null | undefined>(undefined);
  if (bootstrapRef.current === undefined) {
    bootstrapRef.current = typeof window !== 'undefined' ? readBootstrapCache() : null;
  }
  const boot = bootstrapRef.current;

  const [assets, setAssets] = useState<MarketAsset[]>(() =>
    mergeBootstrapAssets(INITIAL_ASSETS, boot?.assets)
  );
  const [newsStories, setNewsStories] = useState<NewsStory[]>(() =>
    boot?.newsStories && boot.newsStories.length > 0 ? boot.newsStories : NEWS_STORIES
  );
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>(() =>
    boot?.economicEvents && boot.economicEvents.length > 0 ? boot.economicEvents : ECONOMIC_EVENTS
  );
  const [nextCatalyst, setNextCatalyst] = useState<CalendarCatalyst | null>(null);
  const [fxRates, setFxRates] = useState<Record<CurrencyCode, number>>(() =>
    boot?.fxRates ? { ...FX_RATES_USD_BASE, ...boot.fxRates } : FX_RATES_USD_BASE
  );
  const [fxPairTiles, setFxPairTiles] = useState<FxPairTile[]>(() =>
    boot?.fxPairTiles && boot.fxPairTiles.length > 0 ? boot.fxPairTiles : FX_PAIR_TILES
  );
  const [usMoversBucket, setUsMoversBucket] = useState<StocksMoversBucket>(() =>
    boot?.usMoversBucket ?? {
      impact: [],
      gainers: [],
      losers: [],
    }
  );
  const [idxMoversBucket, setIdxMoversBucket] = useState<StocksMoversBucket>(() =>
    boot?.idxMoversBucket ?? {
      impact: [],
      gainers: [],
      losers: [],
      foreignBuy: [],
      foreignSell: [],
    }
  );
  const [stocksUpdatedAt, setStocksUpdatedAt] = useState<string | null>(null);
  const [stocksLoading, setStocksLoading] = useState<boolean>(
    !(boot?.usMoversBucket?.impact?.length || boot?.idxMoversBucket?.impact?.length)
  );
  const [heatmapData, setHeatmapData] = useState<MarketHeatmapResponse | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState<boolean>(true);
  const [dailySummary, setDailySummary] = useState<DailyMarketSummaryResponse | null>(null);
  const [dailySummaryLoading, setDailySummaryLoading] = useState<boolean>(false);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligenceResponse | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState<boolean>(false);
  const [isPulseActive, setIsPulseActive] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [feedsLive, setFeedsLive] = useState(false);
  const [flashMap, setFlashMap] = useState<Record<string, 'gain' | 'loss'>>({});
  const [serverDiagnostics, setServerDiagnostics] = useState<ServerFeedDiagnosticsResponse | null>(
    null
  );
  const [quotesRttMs, setQuotesRttMs] = useState<number | null>(null);
  const [lastQuotesAt, setLastQuotesAt] = useState<number | null>(null);
  const [lastWsTickState, setLastWsTickState] = useState<number | null>(null);

  const isPulseRef = useRef(isPulseActive);
  isPulseRef.current = isPulseActive;
  const quotesInFlightRef = useRef(false);
  const stocksInFlightRef = useRef(false);
  const heatmapInFlightRef = useRef(false);
  const summaryInFlightRef = useRef(false);
  const intelInFlightRef = useRef(false);
  const anySessionOpenRef = useRef(true);
  const lastClosedPollAtRef = useRef(0);
  const lastWsTickAtRef = useRef<Record<string, number>>({});

  // Jitter-buffer, adaptive EMA filter, spike guard, and per-endpoint exponential backoff
  const tickWindowRef = useRef<Record<string, number[]>>({});
  const emaPriceRef = useRef<Record<string, number>>({});
  const pendingOutlierRef = useRef<Record<string, { price: number; count: number }>>({});
  const backoffRef = useRef<Record<string, BackoffTracker>>({});

  const shouldSkipForBackoff = useCallback((key: string, force = false): boolean => {
    if (force) return false;
    const tracker = backoffRef.current[key];
    return Boolean(tracker && tracker.failures > 0 && Date.now() < tracker.nextAllowedAt);
  }, []);

  const recordFetchOutcome = useCallback((key: string, ok: boolean, baseDelayMs = 1500, maxDelayMs = 15_000) => {
    if (ok) {
      backoffRef.current[key] = { failures: 0, nextAllowedAt: 0 };
      return;
    }
    const prev = backoffRef.current[key]?.failures ?? 0;
    const failures = prev + 1;
    const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.min(4, failures - 1)));
    backoffRef.current[key] = { failures, nextAllowedAt: Date.now() + delay };
  }, []);

  /**
   * Adaptive jitter-buffer + outlier guard + exponential moving average smoother.
   * - Closed markets snap directly to official settlement price with zero lag/drift.
   * - Single-tick spikes deviating sharply without confirmation are buffered until a 2nd tick confirms.
   * - Rapid live oscillations are smoothed over a 5-sample median/EMA blend.
   */
  const smoothTickPrice = useCallback(
    (
      assetId: string,
      incomingPrice: number,
      decimals: number,
      marketSessionOpen: boolean,
      currentDisplayPrice: number
    ): number => {
      if (!Number.isFinite(incomingPrice) || incomingPrice <= 0) {
        return currentDisplayPrice;
      }

      if (!marketSessionOpen) {
        tickWindowRef.current[assetId] = [incomingPrice];
        emaPriceRef.current[assetId] = incomingPrice;
        delete pendingOutlierRef.current[assetId];
        return Number(incomingPrice.toFixed(decimals));
      }

      const window = tickWindowRef.current[assetId] ?? [];
      if (window.length === 0) {
        tickWindowRef.current[assetId] = [incomingPrice];
        emaPriceRef.current[assetId] = incomingPrice;
        return Number(incomingPrice.toFixed(decimals));
      }

      const median = computeMedian(window);
      const outlierThreshold = assetId === 'BTCUSD' || assetId === 'ETHUSD' ? 0.035 : 0.025;
      const relDev = median > 0 ? Math.abs(incomingPrice - median) / median : 0;

      // Reject unconfirmed 1-tick spikes; confirm immediately if 2 consecutive ticks hold the new level
      if (window.length >= 3 && relDev > outlierThreshold) {
        const pending = pendingOutlierRef.current[assetId];
        const matchesPending =
          pending && Math.abs(incomingPrice - pending.price) / Math.max(1e-6, pending.price) < 0.015;
        if (!matchesPending) {
          pendingOutlierRef.current[assetId] = { price: incomingPrice, count: 1 };
          return Number((emaPriceRef.current[assetId] ?? median).toFixed(decimals));
        }
        // 2nd tick confirmed breakout: reset buffer cleanly to new price regime
        delete pendingOutlierRef.current[assetId];
        tickWindowRef.current[assetId] = [incomingPrice];
        emaPriceRef.current[assetId] = incomingPrice;
        return Number(incomingPrice.toFixed(decimals));
      }

      delete pendingOutlierRef.current[assetId];
      const nextWindow = [...window.slice(-(JITTER_WINDOW_SIZE - 1)), incomingPrice];
      tickWindowRef.current[assetId] = nextWindow;

      const prevEma = emaPriceRef.current[assetId] ?? median;
      // Blend trimmed window median (noise suppressor) + incoming tick with responsive alpha
      const trimmedMedian = computeMedian(nextWindow);
      const targetSample = 0.68 * incomingPrice + 0.32 * trimmedMedian;
      const alpha = nextWindow.length <= 2 ? 0.8 : 0.62;
      const smoothed = alpha * targetSample + (1 - alpha) * prevEma;
      emaPriceRef.current[assetId] = smoothed;

      return Number(smoothed.toFixed(decimals));
    },
    []
  );

  const triggerFlash = useCallback((id: string, dir: 'gain' | 'loss') => {
    setFlashMap((prev) => ({ ...prev, [id]: dir }));
    window.setTimeout(() => {
      setFlashMap((prev) => {
        if (!prev[id]) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 650);
  }, []);

  // Read timestamped free public-market snapshots; only Coinbase BTC/ETH ticks are live WebSocket data.
  const refreshQuotes = useCallback(
    async (force = false) => {
      if (quotesInFlightRef.current || shouldSkipForBackoff('quotes', force)) return;
      quotesInFlightRef.current = true;
      try {
        const { data: payload, rttMs } = await fetchJsonWithLatency<{
          quotes?: QuotePatch[];
          diagnostics?: ServerFeedDiagnosticsResponse;
        }>('/api/market/quotes', 4500);
        if (rttMs !== null) {
          setQuotesRttMs(rttMs);
        }
        const patches = payload?.quotes;
        if (!Array.isArray(patches) || patches.length === 0) {
          recordFetchOutcome('quotes', false, 2000, 15_000);
          return;
        }

        recordFetchOutcome('quotes', true);
        setLastQuotesAt(Date.now());
        if (payload?.diagnostics) {
          setServerDiagnostics(payload.diagnostics);
        }
        const patchMap = new Map(patches.map((p) => [p.id, p]));
        anySessionOpenRef.current = patches.some((p) => p.marketSessionOpen !== false);
        setFeedsLive(true);

        setAssets((prev) =>
          prev.map((asset) => {
            const patch = patchMap.get(asset.id);
            if (!patch) return asset;
            // Preserve live Coinbase WS crypto ticks when WS ticked recently so REST never ping-pongs
            const wsFresh =
              (asset.id === 'BTCUSD' || asset.id === 'ETHUSD') &&
              Date.now() - (lastWsTickAtRef.current[asset.id] ?? 0) < 5000;

            const sessionOpen = patch.marketSessionOpen !== false;
            const nextPrice = wsFresh
              ? asset.price
              : smoothTickPrice(asset.id, patch.price, asset.decimals, sessionOpen, asset.price);

            const safePrev = patch.prevClose > 0 ? patch.prevClose : asset.prevClose;
            const nextChangeValue = Number((nextPrice - safePrev).toFixed(asset.decimals));
            const nextChangePercent = Number(
              (((nextPrice - safePrev) / Math.max(1e-6, safePrev)) * 100).toFixed(2)
            );

            if (!wsFresh && Math.abs(nextPrice - asset.price) > Math.pow(10, -(asset.decimals + 1))) {
              triggerFlash(asset.id, nextPrice >= asset.price ? 'gain' : 'loss');
            }
            const patchedSeries =
              patch.chart1D.length > 1
                ? [...patch.chart1D.slice(0, -1), nextPrice]
                : asset.chartSeries['1D'];

            return {
              ...asset,
              price: nextPrice,
              prevClose: safePrev,
              changeValue: nextChangeValue,
              changePercent: nextChangePercent,
              open: patch.open,
              dayHigh: patch.dayHigh,
              dayLow: patch.dayLow,
              volume: patch.volume,
              avgVol: patch.avgVol,
              avgVolLabel: patch.avgVolLabel,
              peLabel: patch.peLabel,
              peValue: patch.peValue,
              capLabel: patch.capLabel,
              capValue: patch.capValue,
              w52Low: patch.w52Low,
              w52High: patch.w52High,
              w52Pct: patch.w52Pct,
              sentiment: patch.sentiment,
              support: patch.support,
              supportNote: patch.supportNote,
              resistance: patch.resistance,
              resistanceNote: patch.resistanceNote,
              commentary: patch.commentary,
              updatedAtEpoch: wsFresh ? asset.updatedAtEpoch : patch.updatedAtEpoch,
              marketSessionOpen: patch.marketSessionOpen,
              sessionStateLabel: patch.sessionStateLabel,
              sessionProgressRatio: patch.sessionProgressRatio,
              fearGreed7d:
                Array.isArray(patch.fearGreed7d) && patch.fearGreed7d.length >= 2
                  ? patch.fearGreed7d
                  : asset.fearGreed7d,
              move5mPct:
                typeof patch.move5mPct === 'number' && Number.isFinite(patch.move5mPct)
                  ? patch.move5mPct
                  : asset.move5mPct,
              vol5mRangePct:
                typeof patch.vol5mRangePct === 'number' && Number.isFinite(patch.vol5mRangePct)
                  ? patch.vol5mRangePct
                  : asset.vol5mRangePct,
              move5mSource: patch.move5mSource ?? asset.move5mSource,
              sparklinePoints: patch.sparklinePoints.length > 1 ? patch.sparklinePoints : asset.sparklinePoints,
              chartSeries: {
                ...asset.chartSeries,
                '1D': patchedSeries,
              },
              chartTimestamps: {
                ...asset.chartTimestamps,
                '1D': patch.timestamps1D,
              },
            };
          })
        );
      } finally {
        quotesInFlightRef.current = false;
      }
    },
    [recordFetchOutcome, shouldSkipForBackoff, smoothTickPrice, triggerFlash]
  );

  // Fetch historical chart series on demand when changing timeframe or symbol
  const loadChartTimeframe = useCallback(async (assetId: string, timeframe: Timeframe) => {
    const data = await fetchJsonWithTimeout<{
      points?: number[];
      timestamps?: number[];
      candles?: Array<{ t: number; o: number; h: number; l: number; c: number }>;
      prevClose?: number;
    }>(
      `/api/market/chart?id=${encodeURIComponent(assetId)}&timeframe=${encodeURIComponent(timeframe)}`,
      8500
    );
    if (!data || !Array.isArray(data.points) || data.points.length < 2) return;

    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.id !== assetId) return asset;
        return {
          ...asset,
          chartSeries: {
            ...asset.chartSeries,
            [timeframe]: data.points!,
          },
          chartTimestamps: {
            ...asset.chartTimestamps,
            [timeframe]: data.timestamps,
          },
          chartCandles:
            Array.isArray(data.candles) && data.candles.length >= 2
              ? {
                  ...asset.chartCandles,
                  [timeframe]: data.candles,
                }
              : asset.chartCandles,
        };
      })
    );
  }, []);

  // Fetch FX Rates independently on boot for instant portfolio conversion
  const refreshFxRates = useCallback(async (force = false) => {
    if (shouldSkipForBackoff('fx', force)) return;
    const fxRes = await fetchJsonWithTimeout<{ rates?: Record<CurrencyCode, number>; pairTiles?: FxPairTile[] }>(
      '/api/fx/rates',
      6000
    );
    recordFetchOutcome('fx', Boolean(fxRes), 4000, 25_000);
    if (fxRes && fxRes.rates) {
      setFxRates((prev) => ({ ...prev, ...fxRes.rates }));
      if (Array.isArray(fxRes.pairTiles) && fxRes.pairTiles.length > 0) {
        setFxPairTiles(fxRes.pairTiles);
      }
    }
  }, [recordFetchOutcome, shouldSkipForBackoff]);

  // Fetch live News RSS and Economic Calendar
  const refreshSecondaryFeeds = useCallback(async (force = false) => {
    if (shouldSkipForBackoff('secondary', force)) return;
    const [newsRes, calRes] = await Promise.all([
      fetchJsonWithTimeout<{ stories?: NewsStory[] }>('/api/news/feed', 7500),
      fetchJsonWithTimeout<{ events?: EconomicEvent[]; nextCatalyst?: CalendarCatalyst | null }>(
        '/api/calendar/events',
        7500
      ),
    ]);

    const anyOk = Boolean(newsRes || calRes);
    recordFetchOutcome('secondary', anyOk, 5000, 30_000);

    if (newsRes && Array.isArray(newsRes.stories) && newsRes.stories.length > 0) {
      setNewsStories(newsRes.stories);
    }

    if (calRes && Array.isArray(calRes.events) && calRes.events.length > 0) {
      setEconomicEvents(calRes.events);
      if (calRes.nextCatalyst) {
        setNextCatalyst(calRes.nextCatalyst);
      }
    }
  }, [recordFetchOutcome, shouldSkipForBackoff]);

  // Fetch Top 10 US & Indonesia Stock Movers (impact, gainers, losers + IDX foreign buy/sell)
  const refreshStocks = useCallback(
    async (force = false) => {
      if (stocksInFlightRef.current || shouldSkipForBackoff('stocks', force)) return;
      stocksInFlightRef.current = true;
      setStocksLoading(true);
      try {
        const data = await fetchJsonWithTimeout<{
          us?: StocksMoversBucket;
          indonesia?: StocksMoversBucket;
          updatedAt?: string;
        }>('/api/stocks/movers', 10_000);
        if (!data) {
          recordFetchOutcome('stocks', false, 3000, 20_000);
          return;
        }
        recordFetchOutcome('stocks', true);
        if (data.us && Array.isArray(data.us.impact)) {
          setUsMoversBucket(data.us);
        }
        if (data.indonesia && Array.isArray(data.indonesia.impact)) {
          setIdxMoversBucket(data.indonesia);
        }
        if (data.updatedAt) setStocksUpdatedAt(data.updatedAt);
      } finally {
        stocksInFlightRef.current = false;
        setStocksLoading(false);
      }
    },
    [recordFetchOutcome, shouldSkipForBackoff]
  );

  // Fetch Market Cap & Sector Heatmap Data
  const refreshHeatmap = useCallback(
    async (force = false) => {
      if (heatmapInFlightRef.current || shouldSkipForBackoff('heatmap', force)) return;
      heatmapInFlightRef.current = true;
      setHeatmapLoading(true);
      try {
        const data = await fetchJsonWithTimeout<MarketHeatmapResponse>('/api/market/heatmap', 10_000);
        if (!data) {
          recordFetchOutcome('heatmap', false, 4000, 25_000);
          return;
        }
        recordFetchOutcome('heatmap', true);
        if (Array.isArray(data.us) || Array.isArray(data.indonesia)) {
          setHeatmapData(data);
        }
      } finally {
        heatmapInFlightRef.current = false;
        setHeatmapLoading(false);
      }
    },
    [recordFetchOutcome, shouldSkipForBackoff]
  );

  // Fetch and map summarized 24-hour market activity JSON (top gainers, losers, macro events)
  const fetchDailySummary = useCallback(
    async (force = false) => {
      if (summaryInFlightRef.current || shouldSkipForBackoff('dailySummary', force)) return;
      summaryInFlightRef.current = true;
      setDailySummaryLoading(true);
      try {
        const raw = await fetchJsonWithTimeout<Partial<DailyMarketSummaryResponse>>(
          '/api/market/daily-summary',
          10_000
        );
        if (!raw || !Array.isArray(raw.highlights)) {
          recordFetchOutcome('dailySummary', false, 5000, 30_000);
          return;
        }
        recordFetchOutcome('dailySummary', true);

        const mappedHighlights: DailyMarketHighlight[] = raw.highlights
          .filter((h) => h && typeof h.title === 'string' && typeof h.summaryText === 'string')
          .map((h) => ({
            id: String(h.id || `${h.category}-${h.title}`),
            category: h.category === 'loser' || h.category === 'event' ? h.category : 'gainer',
            title: h.title.trim(),
            metricText: String(h.metricText || '').trim(),
            summaryText: h.summaryText.trim(),
            metaText: String(h.metaText || '').trim(),
            symbol: h.symbol,
            yahooSymbol: h.yahooSymbol,
            assetId: h.assetId,
            routeTarget: h.routeTarget,
          }));

        setDailySummary({
          windowLabel: raw.windowLabel || 'Last 24 hours',
          dateLabel: raw.dateLabel || new Date().toLocaleDateString('en-US'),
          updatedAt: raw.updatedAt || new Date().toISOString(),
          highlights: mappedHighlights,
        });
      } finally {
        summaryInFlightRef.current = false;
        setDailySummaryLoading(false);
      }
    },
    [recordFetchOutcome, shouldSkipForBackoff]
  );

  // Fetch multi-source Market & Stocks Intelligence + 3-Phase Index Session Summaries
  const fetchMarketIntelligence = useCallback(
    async (force = false) => {
      if (intelInFlightRef.current || shouldSkipForBackoff('intel', force)) return;
      intelInFlightRef.current = true;
      setIntelligenceLoading(true);
      try {
        const data = await fetchJsonWithTimeout<MarketIntelligenceResponse>(
          '/api/market/intelligence',
          18_000
        );
        if (!data || !Array.isArray(data.indexSessions)) {
          recordFetchOutcome('intel', false, 5000, 30_000);
          return;
        }
        recordFetchOutcome('intel', true);
        setMarketIntelligence(data);
      } finally {
        intelInFlightRef.current = false;
        setIntelligenceLoading(false);
      }
    },
    [recordFetchOutcome, shouldSkipForBackoff]
  );

  // Throttled localStorage persistence so re-opening the terminal hydrates immediately at 0ms
  const lastBootSaveAtRef = useRef(0);
  useEffect(() => {
    if (!feedsLive) return;
    const now = Date.now();
    if (now - lastBootSaveAtRef.current < 12_000) return;
    lastBootSaveAtRef.current = now;
    try {
      const compactAssets: BootstrapCachePayload['assets'] = assets.map((a) => ({
        id: a.id,
        price: a.price,
        prevClose: a.prevClose,
        changeValue: a.changeValue,
        changePercent: a.changePercent,
        open: a.open,
        dayHigh: a.dayHigh,
        dayLow: a.dayLow,
        volume: a.volume,
        sentiment: a.sentiment,
        support: a.support,
        resistance: a.resistance,
        commentary: a.commentary,
        updatedAtEpoch: a.updatedAtEpoch,
        marketSessionOpen: a.marketSessionOpen,
        sessionStateLabel: a.sessionStateLabel,
        fearGreed7d: a.fearGreed7d,
        move5mPct: a.move5mPct,
        vol5mRangePct: a.vol5mRangePct,
        move5mSource: a.move5mSource,
      }));
      const payload: BootstrapCachePayload = {
        savedAt: now,
        assets: compactAssets,
        fxRates,
        fxPairTiles,
        newsStories: newsStories.slice(0, 20),
        economicEvents: economicEvents.slice(0, 20),
        usMoversBucket,
        idxMoversBucket,
      };
      localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [feedsLive, assets, fxRates, fxPairTiles, newsStories, economicEvents, usMoversBucket, idxMoversBucket]);

  // Prioritized initial fetch + low-frequency refresh of scheduled public snapshots
  useEffect(() => {
    // T=0: Critical first-paint quotes & FX rates
    void refreshQuotes(true);
    void refreshFxRates(true);

    // T=120ms: Stocks movers & live news/calendar
    const t1 = window.setTimeout(() => {
      void refreshStocks(true);
      void refreshSecondaryFeeds(true);
    }, 120);

    // T=340ms: Heavy analytics (heatmap, 24h summary, multi-source intelligence)
    const t2 = window.setTimeout(() => {
      void refreshHeatmap(true);
      void fetchDailySummary(true);
      void fetchMarketIntelligence(true);
    }, 340);

    const quoteTimer = window.setInterval(() => {
      if (!isPulseRef.current) return;
      if (anySessionOpenRef.current) {
        void refreshQuotes(false);
      } else {
        const now = Date.now();
        if (now - lastClosedPollAtRef.current >= 60_000) {
          lastClosedPollAtRef.current = now;
          void refreshQuotes(false);
        }
      }
    }, 15 * 60_000);

    const stocksTimer = window.setInterval(() => {
      if (isPulseRef.current) {
        void refreshStocks(false);
      }
    }, 30 * 60_000);

    const heatmapTimer = window.setInterval(() => {
      if (isPulseRef.current) {
        void refreshHeatmap(false);
      }
    }, 30 * 60_000);

    const secondaryTimer = window.setInterval(() => {
      if (isPulseRef.current) {
        void refreshFxRates(false);
        void refreshSecondaryFeeds(false);
        void fetchDailySummary(false);
        void fetchMarketIntelligence(false);
      }
    }, 30 * 60_000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(quoteTimer);
      window.clearInterval(stocksTimer);
      window.clearInterval(heatmapTimer);
      window.clearInterval(secondaryTimer);
    };
  }, [
    refreshQuotes,
    refreshFxRates,
    refreshSecondaryFeeds,
    refreshStocks,
    refreshHeatmap,
    fetchDailySummary,
    fetchMarketIntelligence,
  ]);

  // Unified Coinbase Exchange USD WebSocket with jitter-buffer EMA smoothing for BTC/USD & ETH/USD
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempts = 0;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

        ws.onopen = () => {
          if (isDisposed || !ws) return;
          setWsConnected(true);
          attempts = 0;
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              product_ids: ['BTC-USD', 'ETH-USD'],
              channels: ['ticker'],
            })
          );
        };

        ws.onmessage = (event) => {
          if (isDisposed || !isPulseRef.current) return;
          try {
            const payload = JSON.parse(event.data) as {
              type?: string;
              product_id?: string;
              price?: string;
              open_24h?: string;
            };
            if (payload?.type !== 'ticker' || !payload.product_id || !payload.price) return;

            const id =
              payload.product_id === 'BTC-USD'
                ? 'BTCUSD'
                : payload.product_id === 'ETH-USD'
                  ? 'ETHUSD'
                  : null;
            if (!id) return;

            const rawPrice = parseFloat(payload.price);
            if (!Number.isFinite(rawPrice) || rawPrice <= 0) return;

            const nowTick = Date.now();
            lastWsTickAtRef.current[id] = nowTick;
            setLastWsTickState(nowTick);

            setAssets((prev) =>
              prev.map((asset) => {
                if (asset.id !== id) return asset;
                const smoothedPrice = smoothTickPrice(id, rawPrice, asset.decimals, true, asset.price);
                const dir = smoothedPrice >= asset.price ? 'gain' : 'loss';
                if (Math.abs(smoothedPrice - asset.price) > 0.01) {
                  triggerFlash(id, dir);
                }
                const fallbackOpen = parseFloat(payload.open_24h ?? '');
                const anchorPrev =
                  Number.isFinite(fallbackOpen) && fallbackOpen > 0
                    ? fallbackOpen
                    : asset.prevClose > 0
                      ? asset.prevClose
                      : smoothedPrice;
                const changeValue = Number((smoothedPrice - anchorPrev).toFixed(2));
                const changePercent = Number(
                  (((smoothedPrice - anchorPrev) / Math.max(1e-6, anchorPrev)) * 100).toFixed(2)
                );
                const nextSeries1D = [...asset.chartSeries['1D'].slice(0, -1), smoothedPrice];
                const nextSentiment: 'Bullish' | 'Bearish' | 'Neutral' =
                  changePercent >= 0.35
                    ? 'Bullish'
                    : changePercent <= -0.35
                      ? 'Bearish'
                      : 'Neutral';
                return {
                  ...asset,
                  price: smoothedPrice,
                  prevClose: anchorPrev,
                  changeValue,
                  changePercent,
                  sentiment: nextSentiment,
                  updatedAtEpoch: Date.now(),
                  chartSeries: {
                    ...asset.chartSeries,
                    '1D': nextSeries1D,
                  },
                };
              })
            );
          } catch {
            // ignore malformed tick
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (!isDisposed && attempts < 4) {
            attempts += 1;
            reconnectTimer = window.setTimeout(connect, 4000);
          }
        };
      } catch {
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [smoothTickPrice, triggerFlash]);

  const togglePulse = useCallback(() => {
    setIsPulseActive((prev) => !prev);
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    const { data, rttMs } = await fetchJsonWithLatency<ServerFeedDiagnosticsResponse>(
      '/api/market/diagnostics',
      4000
    );
    if (data && Array.isArray(data.providers)) {
      setServerDiagnostics(data);
    }
    if (rttMs !== null && quotesRttMs === null) {
      setQuotesRttMs(rttMs);
    }
  }, [quotesRttMs]);

  const refreshAll = useCallback(() => {
    void refreshQuotes(true);
    void refreshFxRates(true);
    void refreshSecondaryFeeds(true);
    void refreshStocks(true);
    void refreshHeatmap(true);
    void fetchDailySummary(true);
    void fetchMarketIntelligence(true);
    void refreshDiagnostics();
  }, [
    refreshQuotes,
    refreshFxRates,
    refreshSecondaryFeeds,
    refreshStocks,
    refreshHeatmap,
    fetchDailySummary,
    fetchMarketIntelligence,
    refreshDiagnostics,
  ]);

  const nowMs = Date.now();
  const activeBackoffs = Object.entries(backoffRef.current)
    .filter(([, tracker]) => tracker.failures > 0 && tracker.nextAllowedAt > nowMs)
    .map(([endpoint, tracker]) => ({
      endpoint,
      failures: tracker.failures,
      retryInSec: Math.max(1, Math.ceil((tracker.nextAllowedAt - nowMs) / 1000)),
    }));

  const clientTransport: ClientFeedTransportDiagnostics = {
    quotesRttMs,
    wsConnected,
    lastWsTickAt: lastWsTickState,
    wsFresh: Boolean(wsConnected && lastWsTickState && nowMs - lastWsTickState < 15_000),
    usingBootstrapCache: !feedsLive && Boolean(boot?.assets && boot.assets.length > 0),
    bootstrapSavedAt: boot?.savedAt ?? null,
    activeBackoffs,
    lastQuotesAt,
  };

  return {
    assets,
    newsStories,
    economicEvents,
    nextCatalyst,
    fxRates,
    fxPairTiles,
    usMovers: usMoversBucket.impact,
    idxMovers: idxMoversBucket.impact,
    usMoversBucket,
    idxMoversBucket,
    stocksUpdatedAt,
    stocksLoading,
    heatmapData,
    heatmapLoading,
    refreshHeatmap: () => refreshHeatmap(true),
    dailySummary,
    dailySummaryLoading,
    refreshDailySummary: () => fetchDailySummary(true),
    marketIntelligence,
    intelligenceLoading,
    refreshMarketIntelligence: () => fetchMarketIntelligence(true),
    isPulseActive,
    wsConnected,
    feedsLive,
    flashMap,
    serverDiagnostics,
    clientTransport,
    refreshDiagnostics,
    togglePulse,
    loadChartTimeframe,
    refreshStocks: () => refreshStocks(true),
    refreshAll,
  };
}

