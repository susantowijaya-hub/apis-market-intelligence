import {
  Asset5mVolatility,
  FearGreedInfo,
  FearGreedZone,
  MarketAsset,
  MarketSignalInfo,
  RiskRegimeInfo,
  RiskRegimeSectorBreakdown,
  RiskRegimeStatus,
  SignalTier,
  StockMover,
  Timeframe,
  VolatilityFearGreedInfo,
} from '../types/market';

const parsedNumberCache = new Map<string, number>();
const assetSignalCache = new WeakMap<MarketAsset, MarketSignalInfo>();
const stockSignalCache = new WeakMap<StockMover, MarketSignalInfo>();
const assetFearGreedCache = new WeakMap<MarketAsset, FearGreedInfo>();
const stockFearGreedCache = new WeakMap<StockMover, FearGreedInfo>();
const overallFearGreedCache = new WeakMap<MarketAsset[], OverallMarketFearGreed>();
const assetTimeframeReturnCache = new WeakMap<MarketAsset, Map<string, AssetTimeframeReturn>>();

export function parseFormattedMarketNumber(raw: string | number | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (!raw) return NaN;
  const cached = parsedNumberCache.get(raw);
  if (cached !== undefined) return cached;

  const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  const result = Number.isFinite(num) ? num : NaN;
  if (parsedNumberCache.size >= 600) {
    parsedNumberCache.clear();
  }
  parsedNumberCache.set(raw, result);
  return result;
}

export function computeTechnicalSignal(params: {
  price: number;
  prevClose: number;
  changePercent: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  series?: number[];
  w52Pct?: number;
  isYield?: boolean;
  assetId?: string;
  category?: string;
  foreignFlowSide?: 'BUY' | 'SELL';
}): MarketSignalInfo {
  const {
    price,
    prevClose,
    changePercent,
    open,
    dayHigh,
    dayLow,
    series,
    w52Pct,
    isYield,
    assetId = '',
    category = '',
    foreignFlowSide,
  } = params;

  const upper = assetId.toUpperCase();
  const isCrypto =
    category === 'Crypto' ||
    upper.includes('BTC') ||
    upper.includes('ETH') ||
    upper.endsWith('-USD');
  const isGold =
    upper.includes('XAU') || upper.includes('GC=F');
  const isStock = category === 'stocks' || category === 'Equities';

  // Daily-trading volatility thresholds per asset class
  const strongTh = isCrypto ? 2.2 : isStock ? 1.75 : isGold ? 1.1 : 1.15;
  const mildTh = isCrypto ? 0.65 : isStock ? 0.45 : isGold ? 0.30 : 0.32;

  let score = 0;
  const reasons: string[] = [];

  // 1. Volatility-calibrated intraday session delta
  if (changePercent >= strongTh) {
    score += 34;
    reasons.push(`Strong session drive (+${changePercent.toFixed(2)}%)`);
  } else if (changePercent >= mildTh) {
    score += 18;
    reasons.push(`Positive session bias (+${changePercent.toFixed(2)}%)`);
  } else if (changePercent <= -strongTh) {
    score -= 34;
    reasons.push(`Heavy selling tape (${changePercent.toFixed(2)}%)`);
  } else if (changePercent <= -mildTh) {
    score -= 18;
    reasons.push(`Negative session drift (${changePercent.toFixed(2)}%)`);
  } else {
    reasons.push(`Tight range (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
  }

  // 2. Opening Drive (Price vs Daily Open & Previous Close)
  if (typeof open === 'number' && Number.isFinite(open) && open > 0 && price > 0) {
    const aboveOpen = price >= open * 1.0005;
    const belowOpen = price <= open * 0.9995;
    const abovePrev = prevClose > 0 ? price >= prevClose : aboveOpen;
    if (aboveOpen && abovePrev) {
      score += 18;
      reasons.push('Holding above Open');
    } else if (belowOpen && !abovePrev) {
      score -= 18;
      reasons.push('Below Open & Prev Close');
    } else if (aboveOpen) {
      score += 8;
      reasons.push('Intraday Open reclaim');
    } else if (belowOpen) {
      score -= 8;
      reasons.push('Fading below Open');
    }
  } else if (prevClose > 0 && price > 0) {
    if (price > prevClose * 1.001) score += 10;
    else if (price < prevClose * 0.999) score -= 10;
  }

  // 3. Internal Bar Strength / Intraday Range Position (IBS)
  if (
    typeof dayHigh === 'number' &&
    typeof dayLow === 'number' &&
    Number.isFinite(dayHigh) &&
    Number.isFinite(dayLow) &&
    dayHigh > dayLow &&
    price > 0
  ) {
    const ibs = (price - dayLow) / (dayHigh - dayLow);
    if (ibs >= 0.78) {
      score += 20;
      reasons.push('Upper quartile close');
    } else if (ibs >= 0.60) {
      score += 10;
    } else if (ibs <= 0.22) {
      score -= 20;
      reasons.push('Lower quartile pressure');
    } else if (ibs <= 0.40) {
      score -= 10;
    }
  }

  // 4. Intraday micro-trend slope & session-mean (pseudo-VWAP) alignment
  if (Array.isArray(series) && series.length >= 6 && price > 0) {
    const valid = series.filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0);
    if (valid.length >= 6) {
      const sessionMean = valid.reduce((a, b) => a + b, 0) / valid.length;
      const tail3 = valid.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const priorWindow = valid.slice(-8, -3);
      const priorMean =
        priorWindow.length > 0
          ? priorWindow.reduce((a, b) => a + b, 0) / priorWindow.length
          : sessionMean;
      const risingSlope = tail3 > priorMean * 1.0005;
      const fallingSlope = tail3 < priorMean * 0.9995;

      if (price >= sessionMean && risingSlope) {
        score += 16;
        reasons.push('Rising above session mean');
      } else if (price <= sessionMean && fallingSlope) {
        score -= 16;
        reasons.push('Sliding below session mean');
      } else if (price >= sessionMean) {
        score += 7;
      } else {
        score -= 7;
      }
    }
  }

  // 5. Light 52W structural filter & institutional flow alignment
  if (typeof w52Pct === 'number' && Number.isFinite(w52Pct)) {
    if (w52Pct >= 75) score += 8;
    else if (w52Pct <= 25) score -= 8;
  }

  if (foreignFlowSide === 'BUY') {
    score += 10;
    reasons.push('Foreign Net Buy');
  } else if (foreignFlowSide === 'SELL') {
    score -= 10;
    reasons.push('Foreign Net Sell');
  }

  const clamped = Math.max(-100, Math.min(100, Math.round(score)));

  let tier: SignalTier = 'Neutral';
  let direction: MarketSignalInfo['direction'] = 'neutral';
  let shortLabel = 'Neutral';

  if (clamped >= 48) {
    tier = 'Strong Bull';
    direction = 'bull';
    shortLabel = isYield ? 'Yield Surge' : 'Strong Bull';
  } else if (clamped >= 16) {
    tier = 'Bull Signal';
    direction = 'bull';
    shortLabel = 'Bull';
  } else if (clamped <= -48) {
    tier = 'Strong Bear';
    direction = 'bear';
    shortLabel = isYield ? 'Yield Drop' : 'Strong Bear';
  } else if (clamped <= -16) {
    tier = 'Bear Signal';
    direction = 'bear';
    shortLabel = 'Bear';
  }

  return {
    tier,
    direction,
    score: clamped,
    shortLabel,
    reason: reasons.slice(0, 3).join(' · '),
  };
}

export function getAssetSignal(asset: MarketAsset): MarketSignalInfo {
  const cached = assetSignalCache.get(asset);
  if (cached) return cached;

  const highNum = parseFormattedMarketNumber(asset.dayHigh);
  const lowNum = parseFormattedMarketNumber(asset.dayLow);
  const openNum = parseFormattedMarketNumber(asset.open);
  const series = asset.chartSeries['1D']?.length ? asset.chartSeries['1D'] : asset.sparklinePoints;

  const result = computeTechnicalSignal({
    price: asset.price,
    prevClose: asset.prevClose,
    changePercent: asset.changePercent,
    open: Number.isFinite(openNum) ? openNum : undefined,
    dayHigh: Number.isFinite(highNum) ? highNum : undefined,
    dayLow: Number.isFinite(lowNum) ? lowNum : undefined,
    series,
    w52Pct: asset.w52Pct,
    isYield: asset.isYield,
    assetId: asset.id,
    category: asset.category,
  });
  assetSignalCache.set(asset, result);
  return result;
}

export function getStockSignal(stock: StockMover): MarketSignalInfo {
  const cached = stockSignalCache.get(stock);
  if (cached) return cached;

  const result = computeTechnicalSignal({
    price: stock.price,
    prevClose: stock.prevClose,
    changePercent: stock.changePercent,
    dayHigh: stock.dayHigh,
    dayLow: stock.dayLow,
    series: stock.sparklinePoints,
    assetId: stock.symbol,
    category: 'stocks',
    foreignFlowSide: stock.foreignFlowSide,
  });
  stockSignalCache.set(stock, result);
  return result;
}

function clamp0100(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function getFearGreedZone(score: number): { zone: FearGreedZone; shortLabel: string } {
  if (!Number.isFinite(score)) return { zone: 'Unavailable', shortLabel: 'N/A' };
  if (score >= 75) return { zone: 'Extreme Greed', shortLabel: 'Ex. Greed' };
  if (score >= 55) return { zone: 'Greed', shortLabel: 'Greed' };
  if (score <= 24) return { zone: 'Extreme Fear', shortLabel: 'Ex. Fear' };
  if (score <= 44) return { zone: 'Fear', shortLabel: 'Fear' };
  return { zone: 'Neutral', shortLabel: 'Neutral' };
}

function deriveSevenDayHistory(
  currentScore: number,
  providedHistory: number[] | undefined,
  _series: number[] | undefined,
  _w52Pct: number | undefined,
  _changePercent: number,
  _seedId: string
): number[] {
  if (!Array.isArray(providedHistory)) return [currentScore];
  const cleaned = providedHistory
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .map((value) => clamp0100(value));
  return cleaned.length >= 7 ? cleaned.slice(-7) : [currentScore];
}

export function computeFearGreedIndex(params: {
  price: number;
  prevClose: number;
  changePercent: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  series?: number[];
  history7d?: number[];
  w52Pct?: number;
  isYield?: boolean;
  assetId?: string;
  category?: string;
  foreignFlowSide?: 'BUY' | 'SELL';
}): FearGreedInfo {
  const {
    price,
    prevClose,
    changePercent,
    open,
    dayHigh,
    dayLow,
    series,
    history7d,
    w52Pct,
    assetId = '',
    category = '',
    foreignFlowSide,
  } = params;

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(prevClose) || prevClose <= 0 || !Number.isFinite(changePercent)) {
    return {
      score: Number.NaN,
      zone: 'Unavailable',
      shortLabel: 'N/A',
      driver: 'Waiting for a verified current price and previous close.',
      history7d: [],
      components: { momentum: Number.NaN, intradayStrength: Number.NaN, range52w: Number.NaN },
    };
  }

  const upper = assetId.toUpperCase();
  const isCrypto =
    category === 'Crypto' ||
    upper.includes('BTC') ||
    upper.includes('ETH') ||
    upper.endsWith('-USD');
  const isGoldOrOil =
    upper.includes('XAU') ||
    upper.includes('GC=F') ||
    upper.includes('WTI') ||
    upper.includes('BRENT') ||
    upper.includes('CL=F');
  const isStock = category === 'stocks' || category === 'Equities';
  const isFxOrYield = category === 'forex-yields' || upper.includes('USD') || upper.includes('DXY') || upper.includes('10Y') || upper.includes('30Y');

  // Volatility scale calibrating +-100% saturation per asset class
  const volScale = isCrypto ? 3.2 : isStock ? 2.15 : isGoldOrOil ? 1.45 : isFxOrYield ? 0.85 : 1.35;

  // 1. Price Momentum & Opening Drive (0..100)
  let momentum = 50 + Math.tanh(changePercent / volScale) * 42;
  if (typeof open === 'number' && Number.isFinite(open) && open > 0 && price > 0) {
    const openDeltaPct = ((price - open) / open) * 100;
    momentum += Math.tanh(openDeltaPct / (volScale * 0.8)) * 8;
  } else if (prevClose > 0 && price > 0) {
    const prevDeltaPct = ((price - prevClose) / prevClose) * 100;
    momentum += Math.tanh(prevDeltaPct / volScale) * 5;
  }
  const momentumScore = clamp0100(momentum);

  // 2. Intraday Tape Strength (IBS + Session Mean / Trend Slope + Foreign Flow)
  let ibsComponent = 50;
  if (
    typeof dayHigh === 'number' &&
    typeof dayLow === 'number' &&
    Number.isFinite(dayHigh) &&
    Number.isFinite(dayLow) &&
    dayHigh > dayLow &&
    price > 0
  ) {
    const ibs = Math.max(0, Math.min(1, (price - dayLow) / (dayHigh - dayLow)));
    ibsComponent = ibs * 100;
  } else {
    ibsComponent = momentumScore;
  }

  let seriesBias = 0;
  if (Array.isArray(series) && series.length >= 6 && price > 0) {
    const valid = series.filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0);
    if (valid.length >= 6) {
      const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
      const distPct = ((price - mean) / mean) * 100;
      const tail3 = valid.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const priorWindow = valid.slice(-8, -3);
      const priorMean =
        priorWindow.length > 0
          ? priorWindow.reduce((a, b) => a + b, 0) / priorWindow.length
          : mean;
      const slopePct = ((tail3 - priorMean) / priorMean) * 100;
      seriesBias = Math.tanh((distPct + slopePct) / (volScale * 0.7)) * 18;
    }
  }

  let flowBias = 0;
  if (foreignFlowSide === 'BUY') flowBias = 8;
  else if (foreignFlowSide === 'SELL') flowBias = -8;

  const intradayStrength = clamp0100(ibsComponent * 0.72 + momentumScore * 0.28 + seriesBias + flowBias);

  // 3. Structural 52-Week Range Position (0..100)
  const has52w = typeof w52Pct === 'number' && Number.isFinite(w52Pct);
  const range52w = has52w
    ? clamp0100(w52Pct)
    : clamp0100(momentumScore * 0.55 + intradayStrength * 0.45);

  // Weighted composite (Momentum 45%, Tape Strength 30%, 52W Position 25%)
  const composite = clamp0100(
    has52w
      ? momentumScore * 0.45 + intradayStrength * 0.30 + range52w * 0.25
      : momentumScore * 0.58 + intradayStrength * 0.42
  );

  const { zone, shortLabel } = getFearGreedZone(composite);

  const driverParts: string[] = [];
  if (Math.abs(changePercent) >= volScale * 0.6) {
    driverParts.push(
      changePercent > 0
        ? `Strong upside drive (+${changePercent.toFixed(2)}%)`
        : `Heavy downside pressure (${changePercent.toFixed(2)}%)`
    );
  } else {
    driverParts.push(`Balanced tape (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
  }
  if (has52w) {
    driverParts.push(`52W range at ${range52w}%`);
  }
  if (intradayStrength >= 68) {
    driverParts.push('buyers controlling high');
  } else if (intradayStrength <= 32) {
    driverParts.push('sellers pressing lows');
  }

  const resolvedHistory7d = deriveSevenDayHistory(
    composite,
    history7d,
    series,
    w52Pct,
    changePercent,
    assetId || category || 'asset'
  );

  return {
    score: composite,
    zone,
    shortLabel,
    driver: driverParts.join(' · '),
    history7d: resolvedHistory7d,
    components: {
      momentum: momentumScore,
      intradayStrength,
      range52w,
    },
  };
}

export function getAssetFearGreed(asset: MarketAsset): FearGreedInfo {
  const cached = assetFearGreedCache.get(asset);
  if (cached) return cached;

  const highNum = parseFormattedMarketNumber(asset.dayHigh);
  const lowNum = parseFormattedMarketNumber(asset.dayLow);
  const openNum = parseFormattedMarketNumber(asset.open);
  const series = asset.chartSeries['1D']?.length ? asset.chartSeries['1D'] : asset.sparklinePoints;

  const result = computeFearGreedIndex({
    price: asset.price,
    prevClose: asset.prevClose,
    changePercent: asset.changePercent,
    open: Number.isFinite(openNum) ? openNum : undefined,
    dayHigh: Number.isFinite(highNum) ? highNum : undefined,
    dayLow: Number.isFinite(lowNum) ? lowNum : undefined,
    series,
    history7d: asset.fearGreed7d,
    w52Pct: asset.w52Pct,
    isYield: asset.isYield,
    assetId: asset.id,
    category: asset.category,
  });
  assetFearGreedCache.set(asset, result);
  return result;
}

export function getStockFearGreed(stock: StockMover): FearGreedInfo {
  const cached = stockFearGreedCache.get(stock);
  if (cached) return cached;

  const result = computeFearGreedIndex({
    price: stock.price,
    prevClose: stock.prevClose,
    changePercent: stock.changePercent,
    dayHigh: stock.dayHigh,
    dayLow: stock.dayLow,
    series: stock.sparklinePoints,
    assetId: stock.symbol,
    category: 'stocks',
    foreignFlowSide: stock.foreignFlowSide,
  });
  stockFearGreedCache.set(stock, result);
  return result;
}

export interface OverallMarketFearGreed {
  score: number;
  zone: FearGreedZone;
  shortLabel: string;
  history7d: number[];
  delta1d: number;
  greedCount: number;
  neutralCount: number;
  fearCount: number;
  totalAssets: number;
  driver: string;
  sectors: Array<{
    id: string;
    label: string;
    score: number;
    zone: FearGreedZone;
  }>;
}

export function computeOverallMarketFearGreed(assets: MarketAsset[]): OverallMarketFearGreed {
  const observedAssets = (assets ?? []).filter((asset) => Number.isFinite(asset.price) && asset.price > 0 && Number.isFinite(asset.prevClose) && asset.prevClose > 0 && Number.isFinite(asset.changePercent));
  if (observedAssets.length === 0) {
    return {
      score: Number.NaN,
      zone: 'Unavailable',
      shortLabel: 'N/A',
      history7d: [],
      delta1d: Number.NaN,
      greedCount: 0,
      neutralCount: 0,
      fearCount: 0,
      totalAssets: 0,
      driver: 'Syncing live cross-asset sentiment feeds...',
      sectors: [],
    };
  }

  const cached = overallFearGreedCache.get(assets);
  if (cached) return cached;

  const enriched = observedAssets.map((asset) => ({
    asset,
    fg: getAssetFearGreed(asset),
  }));

  let weightedSum = 0;
  let totalWeight = 0;
  let greedCount = 0;
  let neutralCount = 0;
  let fearCount = 0;
  const histBuckets = [0, 0, 0, 0, 0, 0, 0];
  let histWeights = 0;

  for (const { asset, fg } of enriched) {
    // Give benchmark indices and core macro anchors slightly higher market weight
    const w =
      asset.id === 'SPX' || asset.id === 'IXIC' || asset.id === 'IHSG'
        ? 1.8
        : asset.isSnapshotTile
          ? 1.4
          : 1.0;

    weightedSum += fg.score * w;
    totalWeight += w;

    if (fg.score >= 55) greedCount += 1;
    else if (fg.score <= 44) fearCount += 1;
    else neutralCount += 1;

    const h = fg.history7d;
    if (Array.isArray(h) && h.length >= 7) {
      for (let i = 0; i < 7; i++) {
        histBuckets[i] += h[h.length - 7 + i] * w;
      }
      histWeights += w;
    }
  }

  const score = clamp0100(totalWeight > 0 ? weightedSum / totalWeight : 50);
  const { zone, shortLabel } = getFearGreedZone(score);
  const history7d =
    histWeights > 0
      ? histBuckets.map((sum, idx) => (idx === 6 ? score : clamp0100(sum / histWeights)))
      : [score];
  const delta1d = history7d.length >= 2 ? score - history7d[history7d.length - 2] : Number.NaN;

  const avgGroup = (items: typeof enriched) => {
    if (items.length === 0) return Number.NaN;
    const values = items.map((item) => item.fg.score).filter(Number.isFinite);
    return values.length ? clamp0100(values.reduce((acc, value) => acc + value, 0) / values.length) : Number.NaN;
  };

  const usScore = avgGroup(enriched.filter((x) => x.asset.category === 'us-indices'));
  const asiaScore = avgGroup(enriched.filter((x) => x.asset.category === 'asia-indices'));
  const cryptoScore = avgGroup(
    enriched.filter((x) => x.asset.id === 'BTCUSD' || x.asset.id === 'ETHUSD')
  );
  const macroScore = avgGroup(
    enriched.filter(
      (x) =>
        x.asset.category === 'forex-yields' ||
        x.asset.id === 'GOLD' ||
        x.asset.id === 'XAUUSD'
    )
  );

  const sectors: OverallMarketFearGreed['sectors'] = [
    { id: 'us', label: 'US Equities', score: usScore, zone: getFearGreedZone(usScore).zone },
    { id: 'asia', label: 'Asia & IDX', score: asiaScore, zone: getFearGreedZone(asiaScore).zone },
    { id: 'crypto', label: 'Crypto', score: cryptoScore, zone: getFearGreedZone(cryptoScore).zone },
    { id: 'macro', label: 'Gold & Macro', score: macroScore, zone: getFearGreedZone(macroScore).zone },
  ];

  const driver = `${greedCount} Greed · ${neutralCount} Neutral · ${fearCount} Fear across ${observedAssets.length} verified markets`;

  const result: OverallMarketFearGreed = {
    score,
    zone,
    shortLabel,
    history7d,
    delta1d,
    greedCount,
    neutralCount,
    fearCount,
    totalAssets: observedAssets.length,
    driver,
    sectors,
  };
  overallFearGreedCache.set(assets, result);
  return result;
}

export interface AssetTimeframeReturn {
  hasSeries: boolean;
  startVal: number;
  endVal: number;
  delta: number;
  pct: number;
  isGain: boolean;
  isInspecting: boolean;
}

export function computeAssetTimeframeReturn(
  asset: MarketAsset,
  timeframe: Timeframe,
  inspectIndex: number | null = null
): AssetTimeframeReturn {
  let perAssetMap = assetTimeframeReturnCache.get(asset);
  const cacheKey = `${timeframe}:${inspectIndex ?? 'full'}`;
  const cached = perAssetMap?.get(cacheKey);
  if (cached) return cached;

  const storeResult = (val: AssetTimeframeReturn): AssetTimeframeReturn => {
    if (!perAssetMap) {
      perAssetMap = new Map();
      assetTimeframeReturnCache.set(asset, perAssetMap);
    }
    perAssetMap.set(cacheKey, val);
    return val;
  };

  const rawSeries = asset.chartSeries[timeframe];
  const activeSeries = Array.isArray(rawSeries)
    ? rawSeries.filter((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
    : [];
  const hasSeries = activeSeries.length >= 2;
  const unavailable = (isInspecting = false): AssetTimeframeReturn => ({
    hasSeries,
    startVal: Number.NaN,
    endVal: Number.NaN,
    delta: Number.NaN,
    pct: Number.NaN,
    isGain: false,
    isInspecting,
  });

  if (inspectIndex !== null) {
    if (!hasSeries || inspectIndex < 0 || inspectIndex >= activeSeries.length) {
      return storeResult(unavailable(true));
    }
    const start = timeframe === '1D' && Number.isFinite(asset.prevClose) && asset.prevClose > 0
      ? asset.prevClose
      : activeSeries[0];
    const point = activeSeries[inspectIndex];
    const delta = point - start;
    const pct = start > 0 ? (delta / start) * 100 : Number.NaN;
    return storeResult({
      hasSeries: true,
      startVal: start,
      endVal: point,
      delta,
      pct,
      isGain: Number.isFinite(delta) && delta >= 0,
      isInspecting: true,
    });
  }

  if (timeframe === '1D') {
    // A valid quote can have a daily change before an intraday chart is available.
    // Keep the quote-derived return, but never claim a chart series exists in that case.
    const startVal = Number.isFinite(asset.prevClose) && asset.prevClose > 0
      ? asset.prevClose
      : Number.NaN;
    const endVal = Number.isFinite(asset.price) && asset.price > 0 ? asset.price : Number.NaN;
    const delta = Number.isFinite(asset.changeValue) ? asset.changeValue : Number.NaN;
    const pct = Number.isFinite(asset.changePercent) ? asset.changePercent : Number.NaN;
    return storeResult({
      hasSeries,
      startVal,
      endVal,
      delta,
      pct,
      isGain: Number.isFinite(pct) && pct >= 0,
      isInspecting: false,
    });
  }

  if (!hasSeries) return storeResult(unavailable());

  const startVal = activeSeries[0];
  const endVal = activeSeries[activeSeries.length - 1];
  const delta = endVal - startVal;
  const pct = startVal > 0 ? (delta / startVal) * 100 : Number.NaN;
  return storeResult({
    hasSeries: true,
    startVal,
    endVal,
    delta,
    pct,
    isGain: Number.isFinite(delta) && delta >= 0,
    isInspecting: false,
  });

}

export function computeVolatilityFearGreed(
  assets: MarketAsset[],
  volatility5mMap: Record<string, Asset5mVolatility>
): VolatilityFearGreedInfo {
  const activeAssets = assets.filter((a) => !a.isYield && Number.isFinite(a.price) && a.price > 0 && Number.isFinite(a.prevClose) && a.prevClose > 0 && Number.isFinite(a.changePercent));
  const openAssets = activeAssets.filter((a) => a.marketSessionOpen !== false);
  const samplePool = openAssets.length >= 3 ? openAssets : activeAssets;

  const ranges5m: number[] = [];
  const moves5m: number[] = [];
  const intradayRanges: number[] = [];
  let negativeMoves = 0;

  for (const a of samplePool) {
    const v5 = volatility5mMap[a.id];
    const sampleIsVerified = v5?.sampleSource === 'server-5m' || v5?.sampleSource === 'live-5m' || v5?.sampleSource === 'intraday-1m' || a.move5mSource === 'server-5m' || a.move5mSource === 'intraday-1m';
    const r5 = sampleIsVerified ? (v5?.range5mPct ?? a.vol5mRangePct) : Number.NaN;
    const m5 = sampleIsVerified ? (v5?.pct5m ?? a.move5mPct) : Number.NaN;
    // Normalize crypto scale (~2.2x equities) so BTC 24/7 doesn't distort calm macro sessions
    const normFactor = a.id === 'BTCUSD' || a.id === 'ETHUSD' ? 0.55 : a.category === 'forex-yields' ? 1.5 : 1.0;
    if (Number.isFinite(r5) && r5 > 0) {
      ranges5m.push(r5 * normFactor);
    }
    if (Number.isFinite(m5)) {
      moves5m.push(m5 * normFactor);
      if (m5 < -0.02 || a.changePercent < -0.25) {
        negativeMoves += 1;
      }
    }

    const hi = parseFormattedMarketNumber(a.dayHigh);
    const lo = parseFormattedMarketNumber(a.dayLow);
    if (Number.isFinite(hi) && Number.isFinite(lo) && a.price > 0 && hi >= lo) {
      intradayRanges.push(((hi - lo) / a.price) * 100 * normFactor);
    }
  }

  const avg5mRangePct =
    ranges5m.length > 0
      ? ranges5m.reduce((s, x) => s + x, 0) / ranges5m.length
      : Number.NaN;

  const meanMove =
    moves5m.length > 0 ? moves5m.reduce((s, x) => s + x, 0) / moves5m.length : 0;
  const variance =
    moves5m.length > 1
      ? moves5m.reduce((s, x) => s + Math.pow(x - meanMove, 2), 0) / moves5m.length
      : 0;
  const dispersionSigma = Math.sqrt(variance);

  const intradayRangePct =
    intradayRanges.length > 0
      ? intradayRanges.reduce((s, x) => s + x, 0) / intradayRanges.length
      : Number.NaN;

  const downsideSkewPct =
    moves5m.length > 0 ? Math.round((negativeMoves / moves5m.length) * 100) : Number.NaN;

  if (moves5m.length < 3 || ranges5m.length < 3 || intradayRanges.length < 3) {
    return {
      score: Number.NaN, zone: 'Unavailable', shortLabel: 'N/A', volRegime: 'Unavailable',
      avg5mRangePct, dispersionSigma: Number.NaN, intradayRangePct, downsideSkewPct,
      safeHavenBidScore: Number.NaN, driver: 'Insufficient verified 5-minute and intraday observations for a volatility score.', history7d: [],
    };
  }

  // Safe-haven component is used only when all five underlying quotes are present.
  const byId = new Map(activeAssets.map((a) => [a.id, a]));
  const safeHavenIds = ['SPX', 'IXIC', 'IHSG', 'XAUUSD', 'DXY'];
  const safeHavenQuotes = safeHavenIds.map((id) => byId.get(id)?.changePercent);
  const safeHavenAvailable = safeHavenQuotes.every((value) => typeof value === 'number' && Number.isFinite(value));
  const safeHavenBidScore = safeHavenAvailable
    ? clamp0100(50 + Math.tanh(((safeHavenQuotes[0]! + safeHavenQuotes[1]! + safeHavenQuotes[2]!) / 3 - (safeHavenQuotes[3]! + safeHavenQuotes[4]!) / 2) / 1.1) * 38)
    : Number.NaN;

  // Convert normalized volatility metrics into Fear (high vol + downside skew) vs Greed (compressed vol + upside drift)
  const volCompressionScore = clamp0100(86 - Math.min(82, avg5mRangePct * 115));
  const intradayStabilityScore = clamp0100(84 - Math.min(78, intradayRangePct * 26));
  const breadthPolarityScore = clamp0100(100 - downsideSkewPct);
  const momentumDirectionScore = clamp0100(50 + Math.tanh(meanMove / 0.22) * 35);

  const score = safeHavenAvailable
    ? clamp0100(
        volCompressionScore * 0.28 +
          intradayStabilityScore * 0.22 +
          breadthPolarityScore * 0.24 +
          safeHavenBidScore * 0.14 +
          momentumDirectionScore * 0.12
      )
    : clamp0100(
        (volCompressionScore * 0.28 + intradayStabilityScore * 0.22 + breadthPolarityScore * 0.24 + momentumDirectionScore * 0.12) / 0.86
      );

  const { zone, shortLabel } = getFearGreedZone(score);

  const volRegime: VolatilityFearGreedInfo['volRegime'] =
    avg5mRangePct >= 0.55 || intradayRangePct >= 2.2
      ? 'Panic'
      : avg5mRangePct >= 0.30 || intradayRangePct >= 1.35
        ? 'Elevated'
        : avg5mRangePct <= 0.12 && intradayRangePct <= 0.75
          ? 'Compressed'
          : 'Normal';

  // A daily history is only exposed when a separate seven-day source exists;
  // this intraday score itself has one current observation only.
  const history7d = [score];

  const driver = `${volRegime} vol (${avg5mRangePct.toFixed(2)}% 5m avg) · ${downsideSkewPct}% downside skew`;

  return {
    score,
    zone,
    shortLabel,
    volRegime,
    avg5mRangePct: Number(avg5mRangePct.toFixed(2)),
    dispersionSigma: Number(dispersionSigma.toFixed(2)),
    intradayRangePct: Number(intradayRangePct.toFixed(2)),
    downsideSkewPct,
    safeHavenBidScore,
    driver,
    history7d,
  };
}

export function extractFiveMinuteTrajectory(
  asset: MarketAsset,
  volInfo?: Asset5mVolatility
): { points: number[]; deltaPct: number } {
  const series = asset.chartSeries?.['1D'] ?? [];
  const timestamps = asset.chartTimestamps?.['1D'] ?? [];
  let trajectory: number[] = [];

  if (series.length >= 3 && timestamps.length === series.length) {
    const lastTs = timestamps[timestamps.length - 1];
    if (typeof lastTs === 'number' && Number.isFinite(lastTs) && lastTs > 0) {
      const cutoff = lastTs - 5 * 60_000;
      trajectory = series.filter((value, index) =>
        Number.isFinite(value) && value > 0 &&
        Number.isFinite(timestamps[index]) && timestamps[index] >= cutoff
      );
    }
  }

  if (trajectory.length < 3) return { points: [], deltaPct: Number.NaN };

  const sampleSources = new Set(['server-5m', 'live-5m', 'intraday-1m']);
  const verifiedMove = volInfo && sampleSources.has(volInfo.sampleSource)
    ? volInfo.pct5m
    : sampleSources.has(asset.move5mSource ?? '')
      ? asset.move5mPct
      : Number.NaN;
  const first = trajectory[0];
  const last = trajectory[trajectory.length - 1];
  const computedDelta = first > 0 ? ((last - first) / first) * 100 : Number.NaN;
  const deltaPct = typeof verifiedMove === 'number' && Number.isFinite(verifiedMove) ? verifiedMove : computedDelta;

  return {
    points: trajectory,
    deltaPct: Number.isFinite(deltaPct) ? Number(deltaPct.toFixed(2)) : Number.NaN,
  };
}

export function computeRiskRegimeSentiment(assets: MarketAsset[]): RiskRegimeInfo {
  const observedAssets = (assets ?? []).filter((asset) => Number.isFinite(asset.price) && asset.price > 0 && Number.isFinite(asset.prevClose) && asset.prevClose > 0 && Number.isFinite(asset.changePercent));
  if (observedAssets.length < 3) {
    return {
      status: 'Unavailable',
      polarity: 'neutral',
      score: Number.NaN,
      weightedMovePct: Number.NaN,
      advancingSectors: 0,
      totalSectors: 4,
      driver: 'Awaiting live index & sector quotes...',
      sectors: [],
    };
  }

  const byId = new Map(observedAssets.map((a) => [a.id.toUpperCase(), a]));

  const weightedBucketAvg = (items: Array<{ id: string; w: number; scale?: number }>): number => {
    let sum = 0;
    let totalW = 0;
    for (const item of items) {
      const asset = byId.get(item.id.toUpperCase());
      if (!asset || !Number.isFinite(asset.changePercent)) continue;
      const scale = item.scale ?? 1;
      sum += (asset.changePercent / scale) * item.w;
      totalW += item.w;
    }
    return totalW > 0 ? sum / totalW : Number.NaN;
  };

  // 1. US Broad & Tech Indices (35% weight)
  const usMove = weightedBucketAvg([
    { id: 'SPX', w: 1.4 },
    { id: 'IXIC', w: 1.3 },
    { id: 'DJI', w: 1.0 },
  ]);

  // 2. Asia & Emerging Markets Indices (25% weight)
  const asiaMove = weightedBucketAvg([
    { id: 'IHSG', w: 1.3 },
    { id: 'EIDO', w: 1.1 },
    { id: 'HSI', w: 1.0 },
    { id: 'TAIEX', w: 1.0 },
    { id: 'KOSPI', w: 1.0 },
    { id: 'SSEC', w: 0.9 },
    { id: 'NIFTY', w: 1.0 },
  ]);

  // 3. Cyclicals & High-Beta Digital Risk Assets (15% weight)
  const cyclicalMove = weightedBucketAvg([
    { id: 'BTCUSD', w: 1.1, scale: 2.2 },
    { id: 'ETHUSD', w: 0.9, scale: 2.4 },
    { id: 'WTI', w: 1.0, scale: 1.3 },
    { id: 'BRENT', w: 1.0, scale: 1.3 },
    { id: 'AUDUSD', w: 0.9, scale: 0.65 },
    { id: 'NZDUSD', w: 0.8, scale: 0.65 },
  ]);

  // 4. Safe-Haven Inverse Sector (25% weight):
  // Rising Gold / DXY / CHF or falling 10Y Treasury yields indicates Risk-Off demand -> negative risk score
  const safeHavenInputs = [
    { value: byId.get('XAUUSD')?.changePercent, weight: 0.42 },
    { value: byId.get('DXY')?.changePercent, weight: 0.48 },
    { value: byId.get('USDCHF')?.changePercent, weight: -0.25 },
    { value: byId.get('US10Y')?.changePercent, weight: -0.22 },
  ].filter((item): item is { value: number; weight: number } => typeof item.value === 'number' && Number.isFinite(item.value));
  const safeHavenRiskMove = safeHavenInputs.length
    ? -safeHavenInputs.reduce((sum, item) => sum + item.value * item.weight, 0) / safeHavenInputs.reduce((sum, item) => sum + Math.abs(item.weight), 0)
    : Number.NaN;

  const classifyStance = (val: number): RiskRegimeSectorBreakdown['stance'] =>
    val >= 0.12 ? 'Risk-On' : val <= -0.12 ? 'Risk-Off' : 'Neutral';

  const rawBuckets: Array<{ id: string; label: string; weightPct: number; avgMovePct: number }> = [
    { id: 'us-indices', label: 'US Indices', weightPct: 35, avgMovePct: usMove },
    { id: 'asia-indices', label: 'Asia & IDX', weightPct: 25, avgMovePct: asiaMove },
    { id: 'cyclicals-crypto', label: 'Cyclicals & Crypto', weightPct: 15, avgMovePct: cyclicalMove },
    { id: 'safe-havens', label: 'Safe Havens (Inv)', weightPct: 25, avgMovePct: safeHavenRiskMove },
  ];

  const validBuckets = rawBuckets.filter((bucket) => Number.isFinite(bucket.avgMovePct));
  if (validBuckets.length === 0) {
    return { status: 'Unavailable', polarity: 'neutral', score: Number.NaN, weightedMovePct: Number.NaN, advancingSectors: 0, totalSectors: 0, driver: 'Insufficient verified cross-market quote coverage.', sectors: [] };
  }
  const totalBucketWeight = validBuckets.reduce((sum, bucket) => sum + bucket.weightPct, 0);
  const sectors: RiskRegimeSectorBreakdown[] = validBuckets.map((b) => ({
    id: b.id,
    label: b.label,
    weightPct: Number((b.weightPct / totalBucketWeight * 100).toFixed(1)),
    avgMovePct: Number(b.avgMovePct.toFixed(2)),
    weightedContributionPct: Number((b.avgMovePct * b.weightPct / totalBucketWeight).toFixed(3)),
    stance: classifyStance(b.avgMovePct),
  }));

  const weightedMovePct = sectors.reduce((acc, s) => acc + s.weightedContributionPct, 0);
  const score = clamp0100(50 + Math.tanh(weightedMovePct / 0.85) * 44);

  let status: RiskRegimeStatus = 'Neutral';
  let polarity: RiskRegimeInfo['polarity'] = 'neutral';
  if (score >= 65) {
    status = 'Strong Risk-On';
    polarity = 'risk-on';
  } else if (score >= 54) {
    status = 'Risk-On';
    polarity = 'risk-on';
  } else if (score <= 35) {
    status = 'Strong Risk-Off';
    polarity = 'risk-off';
  } else if (score <= 46) {
    status = 'Risk-Off';
    polarity = 'risk-off';
  }

  const advancingSectors = sectors.filter((s) => s.stance === 'Risk-On').length;
  const driver = `Weighted cross-sector delta ${
    weightedMovePct >= 0 ? '+' : ''
  }${weightedMovePct.toFixed(2)}% · ${advancingSectors}/${sectors.length} sectors Risk-On`;

  return {
    status,
    polarity,
    score,
    weightedMovePct: Number(weightedMovePct.toFixed(2)),
    advancingSectors,
    totalSectors: sectors.length,
    driver,
    sectors,
  };
}


