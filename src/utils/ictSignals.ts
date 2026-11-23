import {
  CandlePoint,
  IctDirection,
  IctSignalAnalysis,
  MarketAsset,
  Timeframe,
} from '../types/market';

const ICT_TIMEFRAME_PRIORITY: Timeframe[] = ['15m', '5m', '30m', '1h', '4h', '1m', '1D'];

export function isIctEligibleAsset(asset: MarketAsset): boolean {
  if (!asset || asset.isYield) return false;
  if (asset.id === 'BTCUSD' || asset.id === 'XAUUSD') return true;
  if (asset.category === 'forex-yields') return true;
  return false;
}

function formatPriceWithAsset(val: number, asset: MarketAsset): string {
  const safeVal = Number.isFinite(val) ? val : asset.price;
  const formatted = safeVal.toLocaleString('en-US', {
    minimumFractionDigits: asset.decimals,
    maximumFractionDigits: asset.decimals,
  });
  return `${asset.currencyPrefix ?? ''}${formatted}${asset.unitSuffix ?? ''}`;
}

function resolveBarsForAsset(
  asset: MarketAsset,
  preferredTimeframe?: Timeframe
): { bars: CandlePoint[]; timeframe: Timeframe } {
  const candidates: Timeframe[] = preferredTimeframe
    ? [preferredTimeframe, ...ICT_TIMEFRAME_PRIORITY.filter((t) => t !== preferredTimeframe)]
    : ICT_TIMEFRAME_PRIORITY;

  for (const tf of candidates) {
    const rawCandles = asset.chartCandles?.[tf];
    if (Array.isArray(rawCandles) && rawCandles.length >= 6) {
      const valid = rawCandles.filter(
        (b) =>
          Number.isFinite(b.o) &&
          Number.isFinite(b.h) &&
          Number.isFinite(b.l) &&
          Number.isFinite(b.c) &&
          b.c > 0
      );
      if (valid.length >= 6) {
        return { bars: valid.slice(-40), timeframe: tf };
      }
    }
  }

  for (const tf of candidates) {
    const rawSeries = asset.chartSeries?.[tf];
    if (Array.isArray(rawSeries) && rawSeries.length >= 6) {
      const tsList = asset.chartTimestamps?.[tf];
      const out: CandlePoint[] = [];
      for (let i = 0; i < rawSeries.length; i++) {
        const c = rawSeries[i];
        const o = i > 0 ? rawSeries[i - 1] : c;
        const h = Math.max(o, c);
        const l = Math.min(o, c);
        out.push({
          t: tsList?.[i] ?? Date.now() - (rawSeries.length - i) * 300_000,
          o,
          h,
          l,
          c,
        });
      }
      return { bars: out.slice(-40), timeframe: tf };
    }
  }

  const p0 = asset.prevClose > 0 ? asset.prevClose : asset.price;
  const p1 = asset.price;
  return {
    bars: [
      { t: Date.now() - 600_000, o: p0, h: Math.max(p0, p1), l: Math.min(p0, p1), c: p0 },
      { t: Date.now() - 300_000, o: p0, h: Math.max(p0, p1), l: Math.min(p0, p1), c: (p0 + p1) / 2 },
      { t: Date.now(), o: (p0 + p1) / 2, h: Math.max(p0, p1), l: Math.min(p0, p1), c: p1 },
    ],
    timeframe: '1D',
  };
}

export function computeIctSignal(
  asset: MarketAsset,
  preferredTimeframe?: Timeframe
): IctSignalAnalysis {
  const { bars, timeframe } = resolveBarsForAsset(asset, preferredTimeframe);
  const currentPrice = asset.price > 0 ? asset.price : bars[bars.length - 1]?.c ?? 0;

  let rangeHigh = -Infinity;
  let rangeLow = Infinity;
  let totalBarRange = 0;

  for (const b of bars) {
    if (b.h > rangeHigh) rangeHigh = b.h;
    if (b.l < rangeLow) rangeLow = b.l;
    totalBarRange += Math.max(0, b.h - b.l);
  }
  rangeHigh = Math.max(rangeHigh, currentPrice);
  rangeLow = Math.min(rangeLow, currentPrice);

  const dealingSpan = Math.max(1e-6, rangeHigh - rangeLow);
  const avgBarRange = Math.max(dealingSpan * 0.06, totalBarRange / Math.max(1, bars.length));
  const eqLevel = rangeLow + dealingSpan * 0.5;
  const posInRange = (currentPrice - rangeLow) / dealingSpan;
  const pdZone: IctSignalAnalysis['pdZone'] =
    posInRange <= 0.44 ? 'Discount' : posInRange >= 0.56 ? 'Premium' : 'Equilibrium';

  // Detect prior swing highs (BSL) and swing lows (SSL) using 3-bar pivots
  const swingHighs: Array<{ idx: number; price: number }> = [];
  const swingLows: Array<{ idx: number; price: number }> = [];
  const n = bars.length;

  for (let i = 1; i < n - 1; i++) {
    if (bars[i].h >= bars[i - 1].h && bars[i].h >= bars[i + 1].h) {
      swingHighs.push({ idx: i, price: bars[i].h });
    }
    if (bars[i].l <= bars[i - 1].l && bars[i].l <= bars[i + 1].l) {
      swingLows.push({ idx: i, price: bars[i].l });
    }
  }

  const recentBars = bars.slice(-4);
  const priorSwingHigh =
    swingHighs.filter((s) => s.idx < n - 3).slice(-1)[0]?.price ??
    Math.max(...bars.slice(0, Math.max(1, n - 3)).map((b) => b.h));
  const priorSwingLow =
    swingLows.filter((s) => s.idx < n - 3).slice(-1)[0]?.price ??
    Math.min(...bars.slice(0, Math.max(1, n - 3)).map((b) => b.l));

  let sslSwept = false;
  let bslSwept = false;
  for (const rb of recentBars) {
    if (rb.l < priorSwingLow && rb.c > priorSwingLow) sslSwept = true;
    if (rb.h > priorSwingHigh && rb.c < priorSwingHigh) bslSwept = true;
  }

  // Market Structure Shift (MSS) & impulsive displacement over last 5 bars
  const prev3Close = bars[Math.max(0, n - 4)].c;
  const prev5Close = bars[Math.max(0, n - 6)].c;
  const lastBar = bars[n - 1];
  const prevBar = bars[Math.max(0, n - 2)];
  const bullMss =
    (currentPrice > priorSwingHigh && prev3Close <= priorSwingHigh) ||
    (lastBar.c > lastBar.o &&
      lastBar.c - lastBar.o >= avgBarRange * 0.7 &&
      currentPrice > prev5Close);
  const bearMss =
    (currentPrice < priorSwingLow && prev3Close >= priorSwingLow) ||
    (lastBar.c < lastBar.o &&
      lastBar.o - lastBar.c >= avgBarRange * 0.7 &&
      currentPrice < prev5Close);

  // Fair Value Gaps (FVG 3-candle imbalance)
  let latestBullFvg: { low: number; high: number } | null = null;
  let latestBearFvg: { low: number; high: number } | null = null;
  for (let i = Math.max(2, n - 14); i < n; i++) {
    const b0 = bars[i - 2];
    const b1 = bars[i - 1];
    const b2 = bars[i];
    if (b2.l > b0.h && b1.c > b1.o && b2.l - b0.h >= avgBarRange * 0.12) {
      latestBullFvg = { low: b0.h, high: b2.l };
    }
    if (b2.h < b0.l && b1.c < b1.o && b0.l - b2.h >= avgBarRange * 0.12) {
      latestBearFvg = { low: b2.h, high: b0.l };
    }
  }

  // Order Blocks (last opposing candle before strong expansion leg)
  let latestBullOb: { low: number; high: number } | null = null;
  let latestBearOb: { low: number; high: number } | null = null;
  for (let i = Math.max(1, n - 12); i < n - 1; i++) {
    const cur = bars[i];
    const nxt = bars[i + 1];
    if (cur.c < cur.o && nxt.c > cur.h && nxt.c - nxt.o >= avgBarRange * 0.65) {
      latestBullOb = { low: cur.l, high: Math.max(cur.o, cur.c) };
    }
    if (cur.c > cur.o && nxt.c < cur.l && nxt.o - nxt.c >= avgBarRange * 0.65) {
      latestBearOb = { low: Math.min(cur.o, cur.c), high: cur.h };
    }
  }

  // Score bullish & bearish ICT confluence
  let bullPts = 0;
  let bearPts = 0;
  const bullTriggers: string[] = [];
  const bearTriggers: string[] = [];

  if (sslSwept) {
    bullPts += 28;
    bullTriggers.push('SSL Liquidity Sweep');
  }
  if (bslSwept) {
    bearPts += 28;
    bearTriggers.push('BSL Liquidity Sweep');
  }

  if (bullMss) {
    bullPts += 26;
    bullTriggers.push('Bullish MSS');
  }
  if (bearMss) {
    bearPts += 26;
    bearTriggers.push('Bearish MSS');
  }

  if (latestBullFvg && currentPrice >= latestBullFvg.low * 0.996) {
    bullPts += 20;
    bullTriggers.push('Bullish FVG');
  }
  if (latestBearFvg && currentPrice <= latestBearFvg.high * 1.004) {
    bearPts += 20;
    bearTriggers.push('Bearish FVG');
  }

  if (latestBullOb && currentPrice >= latestBullOb.low * 0.995) {
    bullPts += 16;
    bullTriggers.push('Bullish OB');
  }
  if (latestBearOb && currentPrice <= latestBearOb.high * 1.005) {
    bearPts += 16;
    bearTriggers.push('Bearish OB');
  }

  if (pdZone === 'Discount') {
    bullPts += 14;
    bullTriggers.push('Discount OTE');
  } else if (pdZone === 'Premium') {
    bearPts += 14;
    bearTriggers.push('Premium OTE');
  }

  // Short-term tape momentum confirmation
  const momentumPct =
    prev5Close > 0 ? ((currentPrice - prev5Close) / prev5Close) * 100 : asset.changePercent;
  if (momentumPct > 0.08 || (lastBar.c > prevBar.c && asset.changePercent > 0.12)) {
    bullPts += 10;
  } else if (momentumPct < -0.08 || (lastBar.c < prevBar.c && asset.changePercent < -0.12)) {
    bearPts += 10;
  }

  let direction: IctDirection = 'NEUTRAL';
  let confidence = 45;
  let triggers: string[] = [];

  const diff = bullPts - bearPts;
  if (diff >= 12 && bullPts >= 28) {
    direction = 'BUY';
    confidence = Math.min(94, Math.max(54, Math.round(bullPts * 0.85 + diff * 0.35)));
    triggers = bullTriggers.slice(0, 3);
  } else if (diff <= -12 && bearPts >= 28) {
    direction = 'SELL';
    confidence = Math.min(94, Math.max(54, Math.round(bearPts * 0.85 + Math.abs(diff) * 0.35)));
    triggers = bearTriggers.slice(0, 3);
  } else {
    direction = 'NEUTRAL';
    confidence = Math.max(38, Math.min(54, Math.round(Math.max(bullPts, bearPts))));
    triggers = [
      pdZone === 'Equilibrium' ? '50% Equilibrium Wait' : `${pdZone} Consolidation`,
      ...(bullTriggers.slice(0, 1)),
      ...(bearTriggers.slice(0, 1)),
    ].slice(0, 3);
  }

  const oteLongLow = rangeLow + dealingSpan * 0.22;
  const oteLongHigh = rangeLow + dealingSpan * 0.382;
  const oteShortLow = rangeHigh - dealingSpan * 0.382;
  const oteShortHigh = rangeHigh - dealingSpan * 0.22;

  let entryMid = currentPrice;
  let entryBandLow = currentPrice - avgBarRange * 0.35;
  let entryBandHigh = currentPrice + avgBarRange * 0.35;
  let slVal = currentPrice - avgBarRange * 1.4;
  let tpVal = currentPrice + avgBarRange * 2.8;

  if (direction === 'BUY') {
    if (latestBullFvg) {
      entryBandLow = latestBullFvg.low;
      entryBandHigh = Math.min(currentPrice, latestBullFvg.high);
      if (entryBandLow > entryBandHigh) entryBandHigh = entryBandLow + avgBarRange * 0.2;
    } else if (latestBullOb) {
      entryBandLow = latestBullOb.low;
      entryBandHigh = latestBullOb.high;
    } else {
      entryBandLow = Math.min(currentPrice, oteLongLow);
      entryBandHigh = Math.min(currentPrice, Math.max(entryBandLow, oteLongHigh));
    }
    entryMid = (entryBandLow + entryBandHigh) / 2;
    slVal = Math.min(priorSwingLow, entryBandLow) - avgBarRange * 0.55;
    const minRisk = Math.max(Math.abs(entryMid - slVal), avgBarRange * 0.9);
    slVal = entryMid - minRisk;
    tpVal = Math.max(rangeHigh, entryMid + minRisk * 2.15);
  } else if (direction === 'SELL') {
    if (latestBearFvg) {
      entryBandLow = Math.max(currentPrice, latestBearFvg.low);
      entryBandHigh = latestBearFvg.high;
      if (entryBandHigh < entryBandLow) entryBandLow = entryBandHigh - avgBarRange * 0.2;
    } else if (latestBearOb) {
      entryBandLow = latestBearOb.low;
      entryBandHigh = latestBearOb.high;
    } else {
      entryBandLow = Math.max(currentPrice, Math.min(oteShortLow, oteShortHigh));
      entryBandHigh = Math.max(currentPrice, oteShortHigh);
    }
    entryMid = (entryBandLow + entryBandHigh) / 2;
    slVal = Math.max(priorSwingHigh, entryBandHigh) + avgBarRange * 0.55;
    const minRisk = Math.max(Math.abs(slVal - entryMid), avgBarRange * 0.9);
    slVal = entryMid + minRisk;
    tpVal = Math.min(rangeLow, entryMid - minRisk * 2.15);
  } else {
    entryBandLow = eqLevel - avgBarRange * 0.35;
    entryBandHigh = eqLevel + avgBarRange * 0.35;
    slVal = priorSwingLow;
    tpVal = priorSwingHigh;
  }

  const risk = Math.max(1e-6, Math.abs(entryMid - slVal));
  const reward = Math.max(1e-6, Math.abs(tpVal - entryMid));
  const rrRatio = Math.max(1.1, Math.min(5.0, reward / risk));

  const setupName =
    direction === 'BUY'
      ? triggers.slice(0, 2).join(' + ') || 'Bullish ICT Displacement'
      : direction === 'SELL'
        ? triggers.slice(0, 2).join(' + ') || 'Bearish ICT Displacement'
        : `Awaiting Sweep (${pdZone})`;

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.shortName,
    direction,
    confidence,
    setupName,
    pdZone,
    entryZone: `${formatPriceWithAsset(entryBandLow, asset)}–${formatPriceWithAsset(entryBandHigh, asset)}`,
    stopLoss: formatPriceWithAsset(slVal, asset),
    targetPrice: formatPriceWithAsset(tpVal, asset),
    riskReward: `1:${rrRatio.toFixed(1)}`,
    triggers: triggers.length > 0 ? triggers : ['PD Equilibrium'],
    timeframe,
    currentPrice,
    decimals: asset.decimals,
    currencyPrefix: asset.currencyPrefix,
    unitSuffix: asset.unitSuffix,
    evaluatedAt: Date.now(),
  };
}

export function scanAllIctSignals(
  assets: MarketAsset[],
  preferredByAsset?: Record<string, Timeframe>
): IctSignalAnalysis[] {
  return assets
    .filter(isIctEligibleAsset)
    .map((asset) => computeIctSignal(asset, preferredByAsset?.[asset.id]))
    .sort((a, b) => {
      const aActive = a.direction === 'NEUTRAL' ? 0 : 1;
      const bActive = b.direction === 'NEUTRAL' ? 0 : 1;
      if (aActive !== bActive) return bActive - aActive;
      return b.confidence - a.confidence;
    });
}
