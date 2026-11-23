export interface LiveQuotePatch {
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
  marketSessionOpen: boolean;
  sessionStateLabel: string;
  sessionProgressRatio: number;
  fearGreed7d?: number[];
  move5mPct?: number;
  vol5mRangePct?: number;
  move5mSource?: 'server-5m' | 'intraday-1m' | 'closed';
}

export interface CandlePoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface LiveChartResponse {
  id: string;
  timeframe: string;
  points: number[];
  timestamps: number[];
  candles?: CandlePoint[];
  prevClose: number;
}

export interface LiveNewsItem {
  id: string;
  publisher: string;
  timeAgo: string;
  publishedAt: string;
  isBreaking?: boolean;
  newsTier?: 'breaking' | 'recent';
  impactScore?: number;
  impact?: string;
  topic: 'rates' | 'idx' | 'commodities' | 'crypto';
  tags: string[];
  headline: string;
  summary: string;
  paragraphs: string[];
  badgeMetric?: string;
  badgePositive?: boolean;
  url?: string;
}

export interface LiveCalendarItem {
  id: string;
  timeWib: string;
  isoDate: string;
  day: 'today' | 'tomorrow' | 'week';
  currency: 'USD' | 'IDR' | 'CNY' | 'EUR' | 'JPY';
  impact: 'HIGH' | 'MED';
  title: string;
  description: string;
  actual: string;
  forecast: string;
  previous: string;
  deviationLabel: string;
  deviationType: 'beat' | 'miss' | 'neutral';
}

export interface LiveCalendarResponse {
  events: LiveCalendarItem[];
  nextCatalyst: {
    title: string;
    currency: string;
    timeWib: string;
    targetEpochMs: number;
    description: string;
  } | null;
  source: string;
  updatedAt: string;
}

export interface LiveFxResponse {
  base: string;
  rates: Record<string, number>;
  pairTiles: {
    pair: string;
    base: string;
    quote: string;
    rate: string;
    changePercent: number;
    high: string;
    low: string;
  }[];
  updatedAt: string;
}

export type BandarmologyPhase =
  | 'Strong Accumulation'
  | 'Early Accumulation'
  | 'Early Distribution'
  | 'Strong Distribution'
  | 'Neutral';

export interface BandarmologyAnalysis {
  phase: BandarmologyPhase;
  score: number;
  volumeRatio: number;
  accumulationPressure: number;
  foreignBias: 'Net Buy' | 'Net Sell' | 'Balanced';
  summary: string;
}

export interface StockMover {
  symbol: string;
  name: string;
  market: 'US' | 'ID';
  exchange: string;
  currency: 'USD' | 'IDR';
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: string;
  volumeRaw: number;
  marketState: string;
  sparklinePoints: number[];
  foreignNetAmount?: number;
  foreignNetLabel?: string;
  foreignFlowSide?: 'BUY' | 'SELL';
  foreignSourceLabel?: string;
  bandarmology?: BandarmologyAnalysis;
}

export interface StocksMoversBucket {
  impact: StockMover[];
  gainers: StockMover[];
  losers: StockMover[];
  foreignBuy?: StockMover[];
  foreignSell?: StockMover[];
}

export interface StocksMoversResponse {
  us: StocksMoversBucket;
  indonesia: StocksMoversBucket;
  updatedAt: string;
}

const YAHOO_SYMBOL_CONFIG: {
  id: string;
  name: string;
  yahooSymbol: string;
  decimals: number;
  currencyPrefix?: string;
  unitSuffix?: string;
}[] = [
  { id: 'SPX', name: 'S&P 500 Index', yahooSymbol: '^GSPC', decimals: 2 },
  { id: 'IXIC', name: 'NASDAQ Composite', yahooSymbol: '^IXIC', decimals: 2 },
  { id: 'DJI', name: 'Dow Jones Industrial Average', yahooSymbol: '^DJI', decimals: 2 },
  { id: 'IHSG', name: 'IDX Composite Index', yahooSymbol: '^JKSE', decimals: 2 },
  { id: 'EIDO', name: 'iShares MSCI Indonesia ETF', yahooSymbol: 'EIDO', decimals: 2, currencyPrefix: '$' },
  { id: 'HSI', name: 'Hang Seng Index', yahooSymbol: '^HSI', decimals: 2 },
  { id: 'TAIEX', name: 'Taiwan Weighted Index', yahooSymbol: '^TWII', decimals: 2 },
  { id: 'KOSPI', name: 'Korea Composite Index', yahooSymbol: '^KS11', decimals: 2 },
  { id: 'SSEC', name: 'Shanghai Composite Index', yahooSymbol: '000001.SS', decimals: 2 },
  { id: 'NIFTY', name: 'NIFTY 50 Index', yahooSymbol: '^NSEI', decimals: 2 },
  { id: 'XAUUSD', name: 'Gold Spot', yahooSymbol: 'GC=F', decimals: 2, currencyPrefix: '$' },
  { id: 'BTCUSD', name: 'Bitcoin', yahooSymbol: 'BTC-USD', decimals: 2, currencyPrefix: '$' },
  { id: 'ETHUSD', name: 'Ethereum', yahooSymbol: 'ETH-USD', decimals: 2, currencyPrefix: '$' },
  { id: 'WTI', name: 'Crude Oil WTI', yahooSymbol: 'CL=F', decimals: 2, currencyPrefix: '$' },
  { id: 'BRENT', name: 'Brent Crude Oil', yahooSymbol: 'BZ=F', decimals: 2, currencyPrefix: '$' },
  { id: 'USDIDR', name: 'USD/IDR', yahooSymbol: 'IDR=X', decimals: 2 },
  { id: 'EURUSD', name: 'EUR/USD', yahooSymbol: 'EURUSD=X', decimals: 4 },
  { id: 'GBPUSD', name: 'GBP/USD', yahooSymbol: 'GBPUSD=X', decimals: 4 },
  { id: 'USDJPY', name: 'USD/JPY', yahooSymbol: 'JPY=X', decimals: 2 },
  { id: 'AUDUSD', name: 'AUD/USD', yahooSymbol: 'AUDUSD=X', decimals: 4 },
  { id: 'USDCHF', name: 'USD/CHF', yahooSymbol: 'CHF=X', decimals: 4 },
  { id: 'USDCAD', name: 'USD/CAD', yahooSymbol: 'CAD=X', decimals: 4 },
  { id: 'NZDUSD', name: 'NZD/USD', yahooSymbol: 'NZDUSD=X', decimals: 4 },
  { id: 'USDCNY', name: 'USD/CNY', yahooSymbol: 'CNY=X', decimals: 4 },
  { id: 'DXY', name: 'US Dollar Index', yahooSymbol: 'DX-Y.NYB', decimals: 3 },
  { id: 'US10Y', name: 'US 10-Year Treasury Yield', yahooSymbol: '^TNX', decimals: 3, unitSuffix: '%' },
  { id: 'US30Y', name: 'US 30-Year Treasury Yield', yahooSymbol: '^TYX', decimals: 3, unitSuffix: '%' },
];

const UA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Accept: 'application/json, text/xml, application/xml, */*',
};

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const quotesCache: { entry: CacheEntry<{ quotes: LiveQuotePatch[]; updatedAt: string }> | null } = {
  entry: null,
};
const chartCache = new Map<string, CacheEntry<LiveChartResponse>>();
const fxCache: { entry: CacheEntry<LiveFxResponse> | null } = { entry: null };
const newsCache: { entry: CacheEntry<{ stories: LiveNewsItem[]; updatedAt: string }> | null } = {
  entry: null,
};
const calendarCache: { entry: CacheEntry<LiveCalendarResponse> | null } = { entry: null };
const stocksMoversCache: { entry: CacheEntry<StocksMoversResponse> | null } = { entry: null };
const heatmapCache: { entry: CacheEntry<MarketHeatmapResponse> | null } = { entry: null };

export type ProviderHealthStatus = 'live' | 'failover' | 'cached' | 'offline';
export type ProviderId = 'coinbase' | 'yahoo_macro' | 'idx_proxy' | 'fx_rates' | 'news_cal';

export interface ProviderFeedDiagnostic {
  id: ProviderId;
  label: string;
  primarySource: string;
  activeSource: string;
  status: ProviderHealthStatus;
  latencyMs: number | null;
  lastSuccessAt: number | null;
  isCachedFallback: boolean;
  fallbackReason?: string;
}

export interface ServerFeedDiagnosticsResponse {
  overallStatus: ProviderHealthStatus;
  hasCachedFallback: boolean;
  hasFailover: boolean;
  providers: ProviderFeedDiagnostic[];
  serverTimestamp: number;
}

const providerDiagnosticsMap = new Map<ProviderId, ProviderFeedDiagnostic>([
  [
    'coinbase',
    {
      id: 'coinbase',
      label: 'Coinbase L2 & Spot',
      primarySource: 'Coinbase Exchange L2',
      activeSource: 'Coinbase Exchange L2',
      status: 'live',
      latencyMs: null,
      lastSuccessAt: null,
      isCachedFallback: false,
    },
  ],
  [
    'yahoo_macro',
    {
      id: 'yahoo_macro',
      label: 'Global Indices & Macro',
      primarySource: 'Yahoo Finance v8 + TV',
      activeSource: 'Yahoo Finance v8 + TV',
      status: 'live',
      latencyMs: null,
      lastSuccessAt: null,
      isCachedFallback: false,
    },
  ],
  [
    'idx_proxy',
    {
      id: 'idx_proxy',
      label: 'IDX Equities Proxy',
      primarySource: 'IDX TV Scanner + Flow',
      activeSource: 'IDX TV Scanner + Flow',
      status: 'live',
      latencyMs: null,
      lastSuccessAt: null,
      isCachedFallback: false,
    },
  ],
  [
    'fx_rates',
    {
      id: 'fx_rates',
      label: 'FX Matrix & SBN',
      primarySource: 'Open ER-API + Live FX',
      activeSource: 'Open ER-API + Live FX',
      status: 'live',
      latencyMs: null,
      lastSuccessAt: null,
      isCachedFallback: false,
    },
  ],
  [
    'news_cal',
    {
      id: 'news_cal',
      label: 'News & Macro Calendar',
      primarySource: 'RSS + TradingView Cal',
      activeSource: 'RSS + TradingView Cal',
      status: 'live',
      latencyMs: null,
      lastSuccessAt: null,
      isCachedFallback: false,
    },
  ],
]);

function updateProviderMetric(
  id: ProviderId,
  patch: Partial<Omit<ProviderFeedDiagnostic, 'id' | 'label' | 'primarySource'>>
): void {
  const existing = providerDiagnosticsMap.get(id);
  if (!existing) return;
  providerDiagnosticsMap.set(id, {
    ...existing,
    ...patch,
  });
}

export function getServerFeedDiagnostics(): ServerFeedDiagnosticsResponse {
  const providers = Array.from(providerDiagnosticsMap.values());
  const hasCachedFallback = providers.some((p) => p.isCachedFallback || p.status === 'cached');
  const hasFailover = providers.some((p) => p.status === 'failover');
  const hasOffline = providers.some((p) => p.status === 'offline');
  const overallStatus: ProviderHealthStatus = hasOffline
    ? 'offline'
    : hasCachedFallback
      ? 'cached'
      : hasFailover
        ? 'failover'
        : 'live';

  return {
    overallStatus,
    hasCachedFallback,
    hasFailover,
    providers,
    serverTimestamp: Date.now(),
  };
}

const serverTickHistory = new Map<string, Array<{ t: number; price: number }>>();
const SERVER_5M_WINDOW_MS = 5 * 60 * 1000;
const SERVER_10M_PRUNE_MS = 10 * 60 * 1000;

function recordAndComputeServer5m(
  assetId: string,
  livePrice: number,
  sameSourcePairs: Array<{ t: number; v: number }>,
  isSessionOpen: boolean,
  now: number
): { move5mPct: number; vol5mRangePct: number; move5mSource: 'server-5m' | 'intraday-1m' | 'closed' } {
  if (!isSessionOpen || !Number.isFinite(livePrice) || livePrice <= 0) {
    return { move5mPct: 0, vol5mRangePct: 0, move5mSource: 'closed' };
  }

  const buf = serverTickHistory.get(assetId) ?? [];
  const pruned = buf.filter((s) => now - s.t <= SERVER_10M_PRUNE_MS);
  const lastSample = pruned[pruned.length - 1];
  if (!lastSample || now - lastSample.t >= 2000 || Math.abs(livePrice - lastSample.price) > 1e-8) {
    pruned.push({ t: now, price: livePrice });
  }
  serverTickHistory.set(assetId, pruned);

  // 1. Once server tick buffer covers >= 4 minutes, compute exact time-interpolated 5m change + 5m realized range
  const fiveMinCutoff = now - SERVER_5M_WINDOW_MS;
  const recent5m = pruned.filter((s) => s.t >= fiveMinCutoff);
  if (pruned.length >= 4 && now - pruned[0].t >= 240_000) {
    let beforeAnchor = pruned[0];
    let afterAnchor = recent5m[0] ?? pruned[pruned.length - 1];
    for (let i = pruned.length - 1; i >= 0; i--) {
      if (pruned[i].t <= fiveMinCutoff) {
        beforeAnchor = pruned[i];
        afterAnchor = pruned[i + 1] ?? pruned[i];
        break;
      }
    }
    let anchorPrice = beforeAnchor.price;
    if (afterAnchor.t > beforeAnchor.t && fiveMinCutoff > beforeAnchor.t && fiveMinCutoff < afterAnchor.t) {
      const ratio = (fiveMinCutoff - beforeAnchor.t) / (afterAnchor.t - beforeAnchor.t);
      anchorPrice = beforeAnchor.price + (afterAnchor.price - beforeAnchor.price) * ratio;
    }
    if (anchorPrice > 0) {
      const move5mPct = ((livePrice - anchorPrice) / anchorPrice) * 100;
      const vals5m = recent5m.length >= 2 ? recent5m.map((s) => s.price) : [anchorPrice, livePrice];
      const hi = Math.max(...vals5m);
      const lo = Math.min(...vals5m);
      const mid = (hi + lo) / 2 || livePrice;
      const vol5mRangePct = ((hi - lo) / mid) * 100;
      return {
        move5mPct: Number(move5mPct.toFixed(3)),
        vol5mRangePct: Number(vol5mRangePct.toFixed(3)),
        move5mSource: 'server-5m',
      };
    }
  }

  // 2. Fallback: exact same-source intraday bars (1m/5m) so there is zero cross-provider basis jump
  if (sameSourcePairs.length >= 2) {
    const lastBar = sameSourcePairs[sameSourcePairs.length - 1];
    // Only trust intraday bars if latest bar is reasonably fresh (<= 20 min old)
    if (now - lastBar.t <= 20 * 60_000 && lastBar.v > 0) {
      const targetTs = lastBar.t - SERVER_5M_WINDOW_MS;
      let closestIdx = sameSourcePairs.length - 2;
      let bestDiff = Infinity;
      for (let i = sameSourcePairs.length - 2; i >= 0; i--) {
        const diff = Math.abs(sameSourcePairs[i].t - targetTs);
        if (diff < bestDiff) {
          bestDiff = diff;
          closestIdx = i;
        }
        if (sameSourcePairs[i].t < targetTs - 12 * 60_000) break;
      }
      const anchorBar = sameSourcePairs[closestIdx];
      const gapMinutes = Math.max(1, (lastBar.t - anchorBar.t) / 60_000);
      if (anchorBar.v > 0 && gapMinutes <= 18) {
        const rawPct = ((lastBar.v - anchorBar.v) / anchorBar.v) * 100;
        const move5mPct = gapMinutes > 6.5 ? rawPct * (5 / gapMinutes) : rawPct;
        const windowSlice = sameSourcePairs.slice(closestIdx).map((p) => p.v);
        const hi = Math.max(...windowSlice);
        const lo = Math.min(...windowSlice);
        const mid = (hi + lo) / 2 || lastBar.v;
        const vol5mRangePct = ((hi - lo) / mid) * 100;
        return {
          move5mPct: Number(move5mPct.toFixed(3)),
          vol5mRangePct: Number(vol5mRangePct.toFixed(3)),
          move5mSource: 'intraday-1m',
        };
      }
    }
  }

  return { move5mPct: 0, vol5mRangePct: 0, move5mSource: 'intraday-1m' };
}

const inFlightSharedMap = new Map<string, Promise<unknown>>();

function coalesceInFlight<T>(
  key: string,
  staleFallback: T | undefined,
  taskFn: () => Promise<T>
): Promise<T> {
  const existing = inFlightSharedMap.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const wrapped = taskFn()
    .catch((err) => {
      if (staleFallback !== undefined) return staleFallback;
      throw err;
    })
    .finally(() => {
      inFlightSharedMap.delete(key);
    });
  inFlightSharedMap.set(key, wrapped);
  return wrapped;
}

interface ServerSessionInfo {
  isOpen: boolean;
  stateLabel: string;
  progressRatio: number;
}

function getTzClockServer(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const totalMin = hour * 60 + minute;
  return { weekday, hour, minute, isWeekend, totalMin };
}

export function getServerSessionInfo(keyOrSymbol: string, now = new Date()): ServerSessionInfo {
  const clamp = (v: number) => Math.max(0.08, Math.min(1, v));
  const upper = keyOrSymbol.toUpperCase();

  // Crypto 24/7
  if (upper === 'BTCUSD' || upper === 'ETHUSD' || upper.endsWith('-USD')) {
    const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    return { isOpen: true, stateLabel: 'Live 24/7', progressRatio: clamp(utcMins / 1440) };
  }

  // Indonesia Equities (.JK or IHSG)
  if (upper === 'IHSG' || upper === '^JKSE' || upper.endsWith('.JK')) {
    const jkt = getTzClockServer(now, 'Asia/Jakarta');
    if (jkt.isWeekend) return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
    const isFri = jkt.weekday === 'Fri';
    const lunchStart = isFri ? 11 * 60 + 30 : 12 * 60;
    const lunchEnd = isFri ? 14 * 60 : 13 * 60 + 30;
    const progress =
      jkt.totalMin >= 9 * 60 && jkt.totalMin < 16 * 60
        ? clamp((jkt.totalMin - 9 * 60) / (7 * 60))
        : 1;
    if (jkt.totalMin >= 9 * 60 && jkt.totalMin < lunchStart) {
      return { isOpen: true, stateLabel: 'Open (Ses I)', progressRatio: progress };
    }
    if (jkt.totalMin >= lunchStart && jkt.totalMin < lunchEnd) {
      return { isOpen: false, stateLabel: 'Lunch Break', progressRatio: progress };
    }
    if (jkt.totalMin >= lunchEnd && jkt.totalMin < 16 * 60) {
      return { isOpen: true, stateLabel: 'Open (Ses II)', progressRatio: progress };
    }
    return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
  }

  // Hong Kong (.HK / HSI)
  if (upper === 'HSI' || upper === '^HSI' || upper.endsWith('.HK')) {
    const hkg = getTzClockServer(now, 'Asia/Hong_Kong');
    if (hkg.isWeekend) return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
    const progress =
      hkg.totalMin >= 9 * 60 + 30 && hkg.totalMin < 16 * 60
        ? clamp((hkg.totalMin - (9 * 60 + 30)) / 390)
        : 1;
    if (hkg.totalMin >= 9 * 60 + 30 && hkg.totalMin < 12 * 60) {
      return { isOpen: true, stateLabel: 'Open (AM)', progressRatio: progress };
    }
    if (hkg.totalMin >= 12 * 60 && hkg.totalMin < 13 * 60) {
      return { isOpen: false, stateLabel: 'Lunch Break', progressRatio: progress };
    }
    if (hkg.totalMin >= 13 * 60 && hkg.totalMin < 16 * 60) {
      return { isOpen: true, stateLabel: 'Open (PM)', progressRatio: progress };
    }
    return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
  }

  // Taiwan
  if (upper === 'TAIEX' || upper === '^TWII' || upper.endsWith('.TW')) {
    const tw = getTzClockServer(now, 'Asia/Taipei');
    const open = !tw.isWeekend && tw.totalMin >= 9 * 60 && tw.totalMin < 13 * 60 + 30;
    return {
      isOpen: open,
      stateLabel: open ? 'Open' : 'Closed',
      progressRatio: open ? clamp((tw.totalMin - 9 * 60) / 270) : 1,
    };
  }

  // Korea
  if (upper === 'KOSPI' || upper === '^KS11' || upper.endsWith('.KS')) {
    const kr = getTzClockServer(now, 'Asia/Seoul');
    const open = !kr.isWeekend && kr.totalMin >= 9 * 60 && kr.totalMin < 15 * 60 + 30;
    return {
      isOpen: open,
      stateLabel: open ? 'Open' : 'Closed',
      progressRatio: open ? clamp((kr.totalMin - 9 * 60) / 390) : 1,
    };
  }

  // Shanghai
  if (upper === 'SSEC' || upper === '000001.SS' || upper.endsWith('.SS') || upper.endsWith('.SZ')) {
    const cn = getTzClockServer(now, 'Asia/Shanghai');
    if (cn.isWeekend) return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
    const progress =
      cn.totalMin >= 9 * 60 + 30 && cn.totalMin < 15 * 60
        ? clamp((cn.totalMin - (9 * 60 + 30)) / 330)
        : 1;
    if (cn.totalMin >= 9 * 60 + 30 && cn.totalMin < 11 * 60 + 30) {
      return { isOpen: true, stateLabel: 'Open (AM)', progressRatio: progress };
    }
    if (cn.totalMin >= 11 * 60 + 30 && cn.totalMin < 13 * 60) {
      return { isOpen: false, stateLabel: 'Lunch Break', progressRatio: progress };
    }
    if (cn.totalMin >= 13 * 60 && cn.totalMin < 15 * 60) {
      return { isOpen: true, stateLabel: 'Open (PM)', progressRatio: progress };
    }
    return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
  }

  // India NSE
  if (upper === 'NIFTY' || upper === '^NSEI' || upper.endsWith('.NS')) {
    const ist = getTzClockServer(now, 'Asia/Kolkata');
    const open = !ist.isWeekend && ist.totalMin >= 9 * 60 + 15 && ist.totalMin < 15 * 60 + 30;
    return {
      isOpen: open,
      stateLabel: open ? 'Open' : 'Closed',
      progressRatio: open ? clamp((ist.totalMin - (9 * 60 + 15)) / 375) : 1,
    };
  }

  // Japan TSE
  if (upper === '^N225' || upper.endsWith('.T')) {
    const jp = getTzClockServer(now, 'Asia/Tokyo');
    const open =
      !jp.isWeekend &&
      ((jp.totalMin >= 9 * 60 && jp.totalMin < 11 * 60 + 30) ||
        (jp.totalMin >= 12 * 60 + 30 && jp.totalMin < 15 * 60));
    return {
      isOpen: open,
      stateLabel: open ? 'Open' : 'Closed',
      progressRatio: !jp.isWeekend && jp.totalMin >= 9 * 60 && jp.totalMin < 15 * 60 ? clamp((jp.totalMin - 9 * 60) / 360) : 1,
    };
  }

  // Global 24/5 FX, Futures Commodities, DXY, and US Yields
  if (
    upper === 'USDIDR' ||
    upper === 'EURUSD' ||
    upper === 'GBPUSD' ||
    upper === 'USDJPY' ||
    upper === 'AUDUSD' ||
    upper === 'USDCHF' ||
    upper === 'USDCAD' ||
    upper === 'NZDUSD' ||
    upper === 'USDCNY' ||
    upper === 'DXY' ||
    upper === 'DX-Y.NYB' ||
    upper === 'XAUUSD' ||
    upper === 'WTI' ||
    upper === 'BRENT' ||
    upper === 'US10Y' ||
    upper === 'US30Y' ||
    upper.endsWith('=X') ||
    upper.endsWith('=F') ||
    upper === '^TNX' ||
    upper === '^TYX'
  ) {
    const ny = getTzClockServer(now, 'America/New_York');
    const isWeekendClosed =
      (ny.weekday === 'Fri' && ny.totalMin >= 17 * 60) ||
      ny.weekday === 'Sat' ||
      (ny.weekday === 'Sun' && ny.totalMin < 18 * 60);
    return {
      isOpen: !isWeekendClosed,
      stateLabel: isWeekendClosed ? 'Closed' : 'Open (24/5)',
      progressRatio: isWeekendClosed ? 1 : clamp(((ny.hour * 60 + ny.minute + 360) % 1440) / 1440),
    };
  }

  // US Equities & Indices (NYSE / NASDAQ Regular Session 09:30–16:00 ET)
  const ny = getTzClockServer(now, 'America/New_York');
  if (!ny.isWeekend && ny.totalMin >= 9 * 60 + 30 && ny.totalMin < 16 * 60) {
    return {
      isOpen: true,
      stateLabel: 'Open',
      progressRatio: clamp((ny.totalMin - (9 * 60 + 30)) / 390),
    };
  }
  return { isOpen: false, stateLabel: 'Closed', progressRatio: 1 };
}

function formatStatNumber(
  value: number | undefined,
  decimals: number,
  prefix = '',
  suffix = ''
): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${formatted}${suffix}`;
}

function formatVolume(vol: number | undefined, prefix = ''): string {
  if (!vol || !Number.isFinite(vol) || vol <= 0) return '—';
  if (vol >= 1e9) return `${prefix}${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${prefix}${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${prefix}${(vol / 1e3).toFixed(1)}K`;
  return `${prefix}${Math.round(vol)}`;
}

function samplePoints(values: number[], targetCount = 24): number[] {
  if (values.length <= targetCount) return values;
  const out: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(values.length - 1, Math.round((i / (targetCount - 1)) * (values.length - 1)));
    out.push(values[idx]);
  }
  return out;
}

interface RawQuoteMeta {
  cfg: (typeof YAHOO_SYMBOL_CONFIG)[number];
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  firstOpen: number;
  dayHighNum: number;
  dayLowNum: number;
  w52LowNum: number;
  w52HighNum: number;
  w52Pct: number;
  vol: number;
  closes: number[];
  timestamps: number[];
  updatedAtEpoch: number;
  exchangeName: string;
  fearGreed7d: number[];
  move5mPct: number;
  vol5mRangePct: number;
  move5mSource: 'server-5m' | 'intraday-1m' | 'closed';
}

interface CoinbaseSpotStats {
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volumeUsd: number;
}

async function fetchCoinbaseSpotStats(
  pair: 'BTC-USD' | 'ETH-USD'
): Promise<CoinbaseSpotStats | null> {
  const t0 = Date.now();
  try {
    const res = await fetch(`https://api.exchange.coinbase.com/products/${pair}/stats`, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) {
      const json = (await res.json()) as {
        open?: string;
        high?: string;
        low?: string;
        last?: string;
        volume?: string;
      };
      const price = Number(json.last);
      const open24h = Number(json.open);
      const high24h = Number(json.high);
      const low24h = Number(json.low);
      const baseVol = Number(json.volume ?? 0);
      if (Number.isFinite(price) && price > 0) {
        updateProviderMetric('coinbase', {
          status: 'live',
          activeSource: 'Coinbase Exchange L2 / Spot',
          latencyMs,
          lastSuccessAt: Date.now(),
          isCachedFallback: false,
          fallbackReason: undefined,
        });
        return {
          price,
          open24h: Number.isFinite(open24h) && open24h > 0 ? open24h : price,
          high24h: Number.isFinite(high24h) && high24h > 0 ? high24h : price,
          low24h: Number.isFinite(low24h) && low24h > 0 ? low24h : price,
          volumeUsd: Number.isFinite(baseVol) && baseVol > 0 ? baseVol * price : 0,
        };
      }
    }

    // Secondary Coinbase Spot REST endpoint before failing over to Yahoo
    const v2Res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(4500),
    }).catch(() => null);
    if (v2Res?.ok) {
      const v2Json = (await v2Res.json()) as { data?: { amount?: string } };
      const spotPx = Number(v2Json?.data?.amount);
      if (Number.isFinite(spotPx) && spotPx > 0) {
        updateProviderMetric('coinbase', {
          status: 'live',
          activeSource: 'Coinbase Spot v2 Live',
          latencyMs: Date.now() - t0,
          lastSuccessAt: Date.now(),
          isCachedFallback: false,
          fallbackReason: undefined,
        });
        return {
          price: spotPx,
          open24h: spotPx,
          high24h: spotPx,
          low24h: spotPx,
          volumeUsd: 0,
        };
      }
    }

    updateProviderMetric('coinbase', {
      status: 'failover',
      activeSource: 'Yahoo Crypto Fallback',
      latencyMs: Date.now() - t0,
      isCachedFallback: false,
      fallbackReason: `Coinbase REST HTTP ${res.status}`,
    });
    return null;
  } catch {
    const v2Res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(4500),
    }).catch(() => null);
    if (v2Res?.ok) {
      const v2Json = (await v2Res.json()) as { data?: { amount?: string } };
      const spotPx = Number(v2Json?.data?.amount);
      if (Number.isFinite(spotPx) && spotPx > 0) {
        updateProviderMetric('coinbase', {
          status: 'live',
          activeSource: 'Coinbase Spot v2 Live',
          latencyMs: Date.now() - t0,
          lastSuccessAt: Date.now(),
          isCachedFallback: false,
          fallbackReason: undefined,
        });
        return {
          price: spotPx,
          open24h: spotPx,
          high24h: spotPx,
          low24h: spotPx,
          volumeUsd: 0,
        };
      }
    }
    updateProviderMetric('coinbase', {
      status: 'failover',
      activeSource: 'Yahoo Crypto Fallback',
      latencyMs: Date.now() - t0,
      isCachedFallback: false,
      fallbackReason: 'Coinbase REST timeout/unreachable',
    });
    return null;
  }
}

interface TvGlobalQuote {
  price: number;
  changePct: number;
  changeAbs: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  preferPrimary: boolean;
}

const TV_GLOBAL_SYMBOL_MAP: Record<string, { tv: string; preferPrimary: boolean }> = {
  SPX: { tv: 'SP:SPX', preferPrimary: false },
  IXIC: { tv: 'NASDAQ:IXIC', preferPrimary: false },
  DJI: { tv: 'DJ:DJI', preferPrimary: false },
  IHSG: { tv: 'IDX:COMPOSITE', preferPrimary: false },
  EIDO: { tv: 'AMEX:EIDO', preferPrimary: false },
  HSI: { tv: 'HSI:HSI', preferPrimary: false },
  KOSPI: { tv: 'KRX:KOSPI', preferPrimary: false },
  SSEC: { tv: 'SSE:000001', preferPrimary: false },
  NIFTY: { tv: 'NSE:NIFTY', preferPrimary: false },
  XAUUSD: { tv: 'OANDA:XAUUSD', preferPrimary: true },
  WTI: { tv: 'NYMEX:CL1!', preferPrimary: true },
  BRENT: { tv: 'ICEEUR:BRN1!', preferPrimary: true },
  USDIDR: { tv: 'FX_IDC:USDIDR', preferPrimary: true },
  EURUSD: { tv: 'FX:EURUSD', preferPrimary: true },
  GBPUSD: { tv: 'FX:GBPUSD', preferPrimary: true },
  USDJPY: { tv: 'FX:USDJPY', preferPrimary: true },
  AUDUSD: { tv: 'FX:AUDUSD', preferPrimary: true },
  USDCHF: { tv: 'FX:USDCHF', preferPrimary: true },
  USDCAD: { tv: 'FX:USDCAD', preferPrimary: true },
  NZDUSD: { tv: 'FX:NZDUSD', preferPrimary: true },
  USDCNY: { tv: 'FX_IDC:USDCNY', preferPrimary: true },
  DXY: { tv: 'TVC:DXY', preferPrimary: true },
  US10Y: { tv: 'TVC:US10Y', preferPrimary: true },
  US30Y: { tv: 'TVC:US30Y', preferPrimary: true },
};

const tvGlobalCache: { entry: CacheEntry<Map<string, TvGlobalQuote>> | null } = { entry: null };

async function fetchTradingViewGlobalQuotes(): Promise<Map<string, TvGlobalQuote>> {
  const now = Date.now();
  if (tvGlobalCache.entry && tvGlobalCache.entry.expiresAt > now) {
    return tvGlobalCache.entry.data;
  }
  const out = new Map<string, TvGlobalQuote>();
  try {
    const tvToId = new Map<string, { id: string; preferPrimary: boolean }>();
    const tickers: string[] = [];
    for (const [id, spec] of Object.entries(TV_GLOBAL_SYMBOL_MAP)) {
      tvToId.set(spec.tv, { id, preferPrimary: spec.preferPrimary });
      tickers.push(spec.tv);
    }

    const res = await fetch('https://scanner.tradingview.com/global/scan', {
      method: 'POST',
      headers: {
        ...UA_HEADERS,
        'Content-Type': 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
      body: JSON.stringify({
        symbols: { tickers },
        columns: ['name', 'close', 'change', 'change_abs', 'open', 'high', 'low'],
      }),
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return tvGlobalCache.entry?.data ?? out;
    const json = (await res.json()) as {
      data?: Array<{ s?: string; d?: Array<number | string | null> }>;
    };
    for (const row of json.data ?? []) {
      const mapping = row.s ? tvToId.get(row.s) : undefined;
      const d = row.d;
      if (!mapping || !d || d.length < 4) continue;
      const price = Number(d[1]);
      const changePct = Number(d[2]);
      const changeAbs = Number(d[3]);
      const open = Number(d[4]);
      const high = Number(d[5]);
      const low = Number(d[6]);
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(changePct)) continue;
      const safeAbs = Number.isFinite(changeAbs) ? changeAbs : price - price / (1 + changePct / 100);
      const prevClose =
        Math.abs(safeAbs) > 0 && Math.abs(price - safeAbs) > 0
          ? price - safeAbs
          : price / (1 + changePct / 100);
      out.set(mapping.id, {
        price,
        changePct,
        changeAbs: safeAbs,
        prevClose,
        open: Number.isFinite(open) && open > 0 ? open : NaN,
        high: Number.isFinite(high) && high > 0 ? high : NaN,
        low: Number.isFinite(low) && low > 0 ? low : NaN,
        preferPrimary: mapping.preferPrimary,
      });
    }
    if (out.size > 0) {
      tvGlobalCache.entry = { data: out, expiresAt: now + 2500 };
    }
  } catch {
    return tvGlobalCache.entry?.data ?? out;
  }
  return out;
}

const dailyHistoryCache = new Map<string, CacheEntry<number[]>>();

async function fetchRecentDailyCloses(yahooSymbol: string): Promise<number[]> {
  const now = Date.now();
  const cached = dailyHistoryCache.get(yahooSymbol);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        yahooSymbol
      )}?range=1mo&interval=1d`,
      { headers: UA_HEADERS, signal: AbortSignal.timeout(4500) }
    );
    if (!res.ok) return cached?.data ?? [];
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const closes = (json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
    );
    if (closes.length >= 2) {
      dailyHistoryCache.set(yahooSymbol, { data: closes.slice(-14), expiresAt: now + 900_000 });
      return closes.slice(-14);
    }
  } catch {
    // ignore
  }
  return cached?.data ?? [];
}

function build7dFearGreedSeries(
  assetId: string,
  dailyCloses: number[],
  livePrice: number,
  liveChangePct: number,
  w52Low: number,
  w52High: number
): number[] {
  const upper = assetId.toUpperCase();
  const isCrypto = upper.includes('BTC') || upper.includes('ETH');
  const isGoldOrOil = upper.includes('XAU') || upper.includes('WTI') || upper.includes('BRENT');
  const isFxOrYield = upper.includes('USD') || upper.includes('DXY') || upper.includes('10Y') || upper.includes('30Y');
  const volScale = isCrypto ? 3.2 : isGoldOrOil ? 1.45 : isFxOrYield ? 0.85 : 1.35;
  if (!Number.isFinite(w52Low) || !Number.isFinite(w52High) || w52High <= w52Low) return [];
  const span52 = w52High - w52Low;

  const valid = dailyCloses.filter((v) => Number.isFinite(v) && v > 0);
  const series = valid.length >= 2 ? [...valid.slice(0, -1), livePrice] : [livePrice];

  const scores: number[] = [];
  if (series.length >= 4) {
    const startIdx = Math.max(1, series.length - 7);
    for (let i = startIdx; i < series.length; i++) {
      const px = series[i];
      const prev = series[i - 1];
      const pct = i === series.length - 1 ? liveChangePct : ((px - prev) / Math.max(1e-6, prev)) * 100;
      const mom = 50 + Math.tanh(pct / volScale) * 44;
      const r52 = Math.max(2, Math.min(98, ((px - w52Low) / span52) * 100));
      const ma5Slice = series.slice(Math.max(0, i - 4), i + 1);
      const ma5 = ma5Slice.reduce((a, b) => a + b, 0) / ma5Slice.length;
      const trendBias = Math.tanh((((px - ma5) / Math.max(1e-6, ma5)) * 100) / (volScale * 1.1)) * 18;
      const val = Math.max(0, Math.min(100, Math.round(mom * 0.52 + r52 * 0.28 + (50 + trendBias) * 0.20)));
      scores.push(val);
    }
  }

  // Only publish this technical sentiment proxy when it has a full seven-point
  // window from real daily observations. Never pad it with fabricated values.
  return scores.length >= 7 ? scores.slice(-7) : [];
}

function resolveConsistentChange(
  price: number,
  rawPrevClose: number,
  reportedChangePct: unknown,
  decimals: number,
  forcePrevCloseAnchor: boolean
): { prevClose: number; changeValue: number; changePercent: number } {
  const safeRawPrev = Number.isFinite(rawPrevClose) && rawPrevClose > 0 ? rawPrevClose : price;
  const regPct = Number(reportedChangePct);

  // For 24/7 crypto anchored to 24h open, use rawPrev directly
  if (forcePrevCloseAnchor || !Number.isFinite(regPct)) {
    const changeValue = Number((price - safeRawPrev).toFixed(decimals >= 3 ? decimals : 2));
    const changePercent = Number(
      (((price - safeRawPrev) / Math.max(1e-6, safeRawPrev)) * 100).toFixed(2)
    );
    return {
      prevClose: Number(safeRawPrev.toFixed(decimals)),
      changeValue,
      changePercent,
    };
  }

  // Yahoo v8 /chart?range=1d returns stale multi-day chartPreviousClose on several Asian & cash indices.
  // Reconstruct exact session previous close from regularMarketChangePercent.
  const calcFromRawPct =
    safeRawPrev > 0 ? ((price - safeRawPrev) / safeRawPrev) * 100 : regPct;
  const effectivePrev =
    Math.abs(calcFromRawPct - regPct) > 0.03 && 1 + regPct / 100 > 0.05
      ? price / (1 + regPct / 100)
      : safeRawPrev;

  const roundedPrev = Number(effectivePrev.toFixed(decimals));
  const changePercent = Number(regPct.toFixed(2));
  const changeValue = Number((price - roundedPrev).toFixed(decimals >= 3 ? decimals : 2));
  return { prevClose: roundedPrev, changeValue, changePercent };
}

const perSymbolQuoteCache = new Map<
  string,
  { data: RawQuoteMeta; expiresAt: number; wasOpen: boolean }
>();
let inFlightQuotesPromise: Promise<{ quotes: LiveQuotePatch[]; updatedAt: string }> | null = null;

export async function fetchLiveQuotes(): Promise<{
  quotes: LiveQuotePatch[];
  updatedAt: string;
  diagnostics: ServerFeedDiagnosticsResponse;
}> {
  const now = Date.now();
  if (quotesCache.entry) {
    if (quotesCache.entry.expiresAt > now) {
      return {
        ...quotesCache.entry.data,
        diagnostics: getServerFeedDiagnostics(),
      };
    }
    // Stale-while-revalidate: serve warm cache immediately (< 1ms) if <= 15s stale while refreshing quietly
    if (now - quotesCache.entry.expiresAt < 15_000) {
      if (!inFlightQuotesPromise) {
        void refreshQuotesInternal().catch(() => null);
      }
      return {
        ...quotesCache.entry.data,
        diagnostics: getServerFeedDiagnostics(),
      };
    }
  }
  if (inFlightQuotesPromise) {
    const res = await inFlightQuotesPromise;
    return { ...res, diagnostics: getServerFeedDiagnostics() };
  }
  const res = await refreshQuotesInternal();
  return { ...res, diagnostics: getServerFeedDiagnostics() };
}

async function refreshQuotesInternal(): Promise<{
  quotes: LiveQuotePatch[];
  updatedAt: string;
}> {
  if (inFlightQuotesPromise) {
    return inFlightQuotesPromise;
  }

  const now = Date.now();
  const batchStart = Date.now();
  let yahooCachedSymbolCount = 0;
  let yahooFreshSymbolCount = 0;
  inFlightQuotesPromise = (async () => {
    const nowDate = new Date(now);
    const tvGlobalMap = await fetchTradingViewGlobalQuotes();

    const rawResults = await Promise.all(
      YAHOO_SYMBOL_CONFIG.map(async (cfg): Promise<RawQuoteMeta | null> => {
        const sessionInfo = getServerSessionInfo(cfg.id, nowDate);
        const cached = perSymbolQuoteCache.get(cfg.id);
        if (cached && cached.expiresAt > now && cached.wasOpen === sessionInfo.isOpen) {
          return cached.data;
        }
        try {
          const cachedDaily = dailyHistoryCache.get(cfg.yahooSymbol);
          const dailyCloses = cachedDaily?.data ?? [];

          const interval = sessionInfo.isOpen ? '1m' : '15m';
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            cfg.yahooSymbol
          )}?range=1d&interval=${interval}`;
          const res = await fetch(url, {
            headers: UA_HEADERS,
            signal: AbortSignal.timeout(6500),
          });
          if (!res.ok) {
            if (cached?.data) yahooCachedSymbolCount += 1;
            return cached?.data ?? null;
          }
          const json = (await res.json()) as {
            chart?: {
              result?: Array<{
                meta?: Record<string, unknown>;
                timestamp?: number[];
                indicators?: {
                  quote?: Array<{
                    close?: Array<number | null>;
                    open?: Array<number | null>;
                  }>;
                };
              }>;
            };
          };

          const item = json.chart?.result?.[0];
          const meta = item?.meta;
          if (!meta) return cached?.data ?? null;

          let price = Number(meta.regularMarketPrice);
          let rawPrev = Number(
            meta.regularMarketPreviousClose ??
              meta.previousClose ??
              (dailyCloses.length >= 2 ? dailyCloses[dailyCloses.length - 2] : undefined) ??
              meta.chartPreviousClose
          );
          let regPct: unknown = meta.regularMarketChangePercent;
          if (!Number.isFinite(price) || price <= 0) return cached?.data ?? null;

          let coinbaseStats: CoinbaseSpotStats | null = null;
          const isCryptoAnchor = cfg.id === 'BTCUSD' || cfg.id === 'ETHUSD';
          if (isCryptoAnchor) {
            coinbaseStats = await fetchCoinbaseSpotStats(cfg.id === 'BTCUSD' ? 'BTC-USD' : 'ETH-USD');
            if (coinbaseStats) {
              price = coinbaseStats.price;
              rawPrev = coinbaseStats.open24h;
            }
          }

          // Cross-reconcile Spot Gold, Crude, DXY, Yields, FX & Indices with TradingView real-time institutional feed
          const tvQuote = tvGlobalMap.get(cfg.id);
          if (tvQuote && !isCryptoAnchor) {
            if (tvQuote.preferPrimary) {
              price = tvQuote.price;
              rawPrev = tvQuote.prevClose;
              regPct = tvQuote.changePct;
            } else {
              // For equity indices: reconcile if Yahoo regularMarketChangePercent is missing or diverges >0.12% from TV
              const yPct = Number(regPct);
              if (!Number.isFinite(yPct) || Math.abs(yPct - tvQuote.changePct) > 0.12) {
                price = tvQuote.price;
                rawPrev = tvQuote.prevClose;
                regPct = tvQuote.changePct;
              }
            }
          }

          if (!Number.isFinite(rawPrev) || rawPrev <= 0) return cached?.data ?? null;
          const { prevClose, changeValue, changePercent } = resolveConsistentChange(
            price,
            rawPrev,
            regPct,
            cfg.decimals,
            isCryptoAnchor
          );

          const rawCloses = item?.indicators?.quote?.[0]?.close ?? [];
          const rawTimestamps = item?.timestamp ?? [];
          const sameSourcePairs: { t: number; v: number }[] = [];
          for (let i = 0; i < rawCloses.length; i++) {
            const val = rawCloses[i];
            const ts = rawTimestamps[i];
            if (
              typeof val === 'number' && Number.isFinite(val) && val > 0 &&
              typeof ts === 'number' && Number.isFinite(ts) && ts > 0
            ) {
              sameSourcePairs.push({
                t: ts * 1000,
                v: Number(val.toFixed(cfg.decimals)),
              });
            }
          }
          const stats5m = recordAndComputeServer5m(
            cfg.id,
            price,
            sameSourcePairs,
            sessionInfo.isOpen,
            Date.now()
          );

          let validPairs = sameSourcePairs;
          if (validPairs.length > 0) {
            // Re-anchor chart series smoothly if TV/Coinbase price differs by futures-spot basis
            const lastRaw = validPairs[validPairs.length - 1].v;
            const ratio = lastRaw > 0 ? price / lastRaw : 1;
            if (Math.abs(ratio - 1) > 0.0004 && Math.abs(ratio - 1) < 0.05) {
              validPairs = validPairs.map((p) => ({
                t: p.t,
                v: Number((p.v * ratio).toFixed(cfg.decimals)),
              }));
            }
            validPairs.push({
              t: Date.now(), // collector observation time for the independently fetched spot snapshot
              v: Number(price.toFixed(cfg.decimals)),
            });
          }

          const closes = validPairs.map((p) => p.v);
          const timestamps = validPairs.map((p) => p.t);

          const rawOpens = item?.indicators?.quote?.[0]?.open ?? [];
          const regOpen = Number(meta.regularMarketOpen);
          const barOpen = rawOpens.find((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);

          const rawDayHigh = Number(
            coinbaseStats?.high24h ??
              (tvQuote?.preferPrimary ? tvQuote.high : undefined) ??
              meta.regularMarketDayHigh
          );
          const rawDayLow = Number(
            coinbaseStats?.low24h ??
              (tvQuote?.preferPrimary ? tvQuote.low : undefined) ??
              meta.regularMarketDayLow
          );
          const baseHigh = Number.isFinite(rawDayHigh) && rawDayHigh > 0 ? rawDayHigh : NaN;
          const baseLow = Number.isFinite(rawDayLow) && rawDayLow > 0 ? rawDayLow : NaN;

          let firstOpen =
            coinbaseStats
              ? coinbaseStats.open24h
              : tvQuote?.preferPrimary && tvQuote.open > 0
                ? tvQuote.open
                : Number.isFinite(regOpen) && regOpen > 0
                  ? regOpen
                  : typeof barOpen === 'number' &&
                      barOpen >= Math.min(baseLow, prevClose) * 0.985 &&
                      barOpen <= Math.max(baseHigh, prevClose) * 1.015
                    ? barOpen
                    : NaN;
          if (Number.isFinite(firstOpen) && Number.isFinite(baseLow) && Number.isFinite(baseHigh)) {
            firstOpen = Math.max(baseLow, Math.min(baseHigh, firstOpen));
          }

          const dayHighNum = Number.isFinite(baseHigh) ? Math.max(price, baseHigh) : NaN;
          const dayLowNum = Number.isFinite(baseLow) ? Math.min(price, baseLow) : NaN;

          const w52LowRaw = Number(meta.fiftyTwoWeekLow);
          const w52HighRaw = Number(meta.fiftyTwoWeekHigh);
          const has52WeekRange = Number.isFinite(w52LowRaw) && w52LowRaw > 0 && Number.isFinite(w52HighRaw) && w52HighRaw > w52LowRaw;
          const w52LowNum = has52WeekRange ? w52LowRaw : NaN;
          const w52HighNum = has52WeekRange ? w52HighRaw : NaN;
          const w52Span = has52WeekRange ? w52HighNum - w52LowNum : NaN;
          const w52Pct = has52WeekRange
            ? Math.max(0, Math.min(100, Math.round(((price - w52LowNum) / w52Span) * 100)))
            : NaN;

          const rawVol = Number(meta.regularMarketVolume);
          const vol = coinbaseStats?.volumeUsd && coinbaseStats.volumeUsd > 0 ? coinbaseStats.volumeUsd : rawVol;
          const updatedAtEpoch =
            isCryptoAnchor && coinbaseStats
              ? Date.now()
              : tvQuote?.preferPrimary
                ? Date.now()
                : Number.isFinite(Number(meta.regularMarketTime)) && Number(meta.regularMarketTime) > 0 ? Number(meta.regularMarketTime) * 1000 : Number.NaN;
          const exchangeName =
            isCryptoAnchor && coinbaseStats
              ? 'Coinbase Spot USD'
              : String(meta.fullExchangeName || meta.exchangeName || 'Global Market');

          const fearGreed7d = build7dFearGreedSeries(
            cfg.id,
            dailyCloses,
            price,
            changePercent,
            w52LowNum,
            w52HighNum
          );

          const rawMeta: RawQuoteMeta = {
            cfg,
            price: Number(price.toFixed(cfg.decimals)),
            prevClose: Number(prevClose.toFixed(cfg.decimals)),
            changeValue,
            changePercent,
            firstOpen,
            dayHighNum,
            dayLowNum,
            w52LowNum,
            w52HighNum,
            w52Pct,
            vol,
            closes,
            timestamps,
            updatedAtEpoch,
            exchangeName,
            fearGreed7d,
            move5mPct: stats5m.move5mPct,
            vol5mRangePct: stats5m.vol5mRangePct,
            move5mSource: stats5m.move5mSource,
          };

          perSymbolQuoteCache.set(cfg.id, {
            data: rawMeta,
            expiresAt: Date.now() + (sessionInfo.isOpen ? 1200 : 600_000),
            wasOpen: sessionInfo.isOpen,
          });
          yahooFreshSymbolCount += 1;
          return rawMeta;
        } catch {
          if (cached?.data) yahooCachedSymbolCount += 1;
          return cached?.data ?? null;
        }
      })
    );

  const validRaw = rawResults.filter((r): r is RawQuoteMeta => r !== null);
  const byId = new Map(validRaw.map((r) => [r.cfg.id, r]));

  const wtiPrice = byId.get('WTI')?.price;
  const brentPrice = byId.get('BRENT')?.price;
  const us10yPrice = byId.get('US10Y')?.price;
  const us30yPrice = byId.get('US30Y')?.price;

  const quotes: LiveQuotePatch[] = validRaw.map((r) => {
    const { cfg, price, prevClose, changeValue, changePercent, firstOpen, dayHighNum, dayLowNum, w52LowNum, w52HighNum, w52Pct, vol, closes, timestamps, updatedAtEpoch, fearGreed7d } = r;
    const prefix = cfg.currencyPrefix ?? '';
    const suffix = cfg.unitSuffix ?? '';

    const open = formatStatNumber(firstOpen, cfg.decimals, prefix, suffix);
    const dayHigh = formatStatNumber(dayHighNum, cfg.decimals, prefix, suffix);
    const dayLow = formatStatNumber(dayLowNum, cfg.decimals, prefix, suffix);
    const w52Low = formatStatNumber(w52LowNum, cfg.decimals, prefix, suffix);
    const w52High = formatStatNumber(w52HighNum, cfg.decimals, prefix, suffix);
    const priceLabel = formatStatNumber(price, cfg.decimals, prefix, suffix);

    // Live Pivot / Session Technicals
    const intradaySpan = Math.max(0, dayHighNum - dayLowNum);
    const pivot = (dayHighNum + dayLowNum + price) / 3;
    const calcSupport = 2 * pivot - dayHighNum;
    const calcResistance = 2 * pivot - dayLowNum;
    const supportNum = intradaySpan > 0 ? Math.min(calcSupport, dayLowNum, price * 0.996) : NaN;
    const resistanceNum = intradaySpan > 0 ? Math.max(calcResistance, dayHighNum, price * 1.004) : NaN;

    const support = intradaySpan > 0 ? formatStatNumber(supportNum, cfg.decimals, prefix, suffix) : '—';
    const resistance = intradaySpan > 0 ? formatStatNumber(resistanceNum, cfg.decimals, prefix, suffix) : '—';

    const signalTier = computeServerSignalTier({
      assetId: cfg.id,
      changePercent,
      price,
      open: firstOpen,
      prevClose,
      dayHigh: dayHighNum,
      dayLow: dayLowNum,
      series: closes,
      w52Pct,
    });
    const sentiment: 'Bullish' | 'Bearish' | 'Neutral' =
      signalTier === 'Strong Bull' || signalTier === 'Bull Signal'
        ? 'Bullish'
        : signalTier === 'Strong Bear' || signalTier === 'Bear Signal'
          ? 'Bearish'
          : 'Neutral';

    const supportNote =
      w52Pct <= 25
        ? `Session S1 · Near 52W Floor (${w52Low})`
        : 'Session Pivot S1 & Intraday Floor';
    const resistanceNote =
      w52Pct >= 85
        ? `Session R1 · Near 52W Peak (${w52High})`
        : 'Session Pivot R1 & Intraday Cap';

    const gapPct = Number.isFinite(firstOpen) && prevClose > 0 ? ((firstOpen - prevClose) / prevClose) * 100 : NaN;
    const ibsPct = dayHighNum > dayLowNum ? Math.round(((price - dayLowNum) / (dayHighNum - dayLowNum)) * 100) : null;
    const fgNow = fearGreed7d.length >= 7 ? fearGreed7d[fearGreed7d.length - 1] : null;
    const fgZone = fgNow === null ? 'Unavailable' :
      fgNow >= 75 ? 'Extreme Greed' : fgNow >= 55 ? 'Greed' : fgNow <= 24 ? 'Extreme Fear' : fgNow <= 44 ? 'Fear' : 'Neutral';
    const ibsLabel = ibsPct === null ? 'unavailable' : `${ibsPct}%`;

    const structureThesis =
      firstOpen > 0 && price >= firstOpen
        ? `Holding above opening drive (${open}) with ${ibsLabel} IBS confirms buyer absorption; defending ${support} keeps an upside rotation toward ${resistance} intact.`
        : firstOpen > 0
          ? `Fading below opening print (${open}) at ${ibsLabel} IBS highlights supply control; reclaiming ${open} is needed to neutralize downside pressure toward ${support}.`
          : Number.isFinite(dayHighNum) && Number.isFinite(dayLowNum)
            ? `Trading inside ${dayLow}–${dayHigh} (${ibsLabel} IBS) between S1 ${support} and R1 ${resistance}.`
            : 'Session range unavailable; support and resistance are not estimated.';

    let crossAssetThesis = '';
    if (cfg.id === 'BTCUSD' || cfg.id === 'ETHUSD') {
      crossAssetThesis = ` 24h Coinbase Spot regime reads ${signalTier} (technical sentiment ${fgNow ?? 'unavailable'} · ${fgZone}), tracking NASDAQ liquidity beta.`;
    } else if (cfg.id === 'XAUUSD') {
      crossAssetThesis = ` Spot Gold (XAU/USD) reflects real-rate & DXY sensitivity with ${fgZone} sentiment (${fgNow ?? 'unavailable'}).`;
    } else if (cfg.id === 'WTI' && brentPrice) {
      crossAssetThesis = ` WTI–Brent differential sits at $${Math.abs(price - brentPrice).toFixed(2)}/bbl ${
        price < brentPrice ? 'discount' : 'premium'
      } vs Brent ($${brentPrice.toFixed(2)}).`;
    } else if (cfg.id === 'BRENT' && wtiPrice) {
      crossAssetThesis = ` Brent–WTI spread trades at +$${(price - wtiPrice).toFixed(2)}/bbl over WTI ($${wtiPrice.toFixed(2)}).`;
    } else if ((cfg.id === 'US10Y' || cfg.id === 'US30Y') && us10yPrice && us30yPrice) {
      const bps = ((us30yPrice - us10yPrice) * 100).toFixed(1);
      crossAssetThesis = ` US 10s30s curve slope prints ${Number(bps) >= 0 ? '+' : ''}${bps} bps, driving equity duration multiples.`;
    } else if (cfg.id === 'IHSG' || cfg.id === 'EIDO') {
      crossAssetThesis = ` Jakarta benchmark sentiment reads ${fgZone} (${fgNow ?? 'unavailable'}), gated by foreign banking flow and USD/IDR stability.`;
    }

    const signStr = changePercent >= 0 ? '+' : '';
    const gapTag =
      Math.abs(gapPct) >= 0.12
        ? ` (open gap ${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(2)}%)`
        : '';

    const commentary = `${cfg.name} prints ${priceLabel} (${signStr}${changePercent.toFixed(
      2
    )}%${gapTag}, ${signalTier}, technical sentiment ${fgNow ?? 'unavailable'} ${fgZone}). ${structureThesis}${crossAssetThesis}`;

    let peLabel = '';
    let peValue = '';
    let capLabel = '';
    let capValue = '';

    if (cfg.id === 'WTI' && brentPrice) {
      capLabel = 'Spread vs Brent';
      capValue = `${price - brentPrice >= 0 ? '+' : '-'}$${Math.abs(price - brentPrice).toFixed(2)}/bbl`;
    } else if (cfg.id === 'BRENT' && wtiPrice) {
      capLabel = 'Spread vs WTI';
      capValue = `${price - wtiPrice >= 0 ? '+' : '-'}$${Math.abs(price - wtiPrice).toFixed(2)}/bbl`;
    } else if ((cfg.id === 'US10Y' || cfg.id === 'US30Y') && us10yPrice && us30yPrice) {
      const bps = (us30yPrice - us10yPrice) * 100;
      capLabel = '10Y–30Y Spread';
      capValue = `${bps >= 0 ? '+' : ''}${bps.toFixed(1)} bps`;
    }

    const sessionInfo = getServerSessionInfo(cfg.id, nowDate);
    return {
      id: cfg.id,
      price,
      prevClose,
      changeValue,
      changePercent,
      open,
      dayHigh,
      dayLow,
      volume: formatVolume(vol, cfg.id === 'BTCUSD' || cfg.id === 'ETHUSD' ? '$' : ''),
      avgVol: '',
      avgVolLabel: '',
      peLabel,
      peValue,
      capLabel,
      capValue,
      w52Low,
      w52High,
      w52Pct,
      sentiment,
      support,
      supportNote,
      resistance,
      resistanceNote,
      commentary,
      sparklinePoints: samplePoints(closes, 16),
      chart1D: closes,
      timestamps1D: timestamps,
      updatedAtEpoch,
      marketSessionOpen: sessionInfo.isOpen,
      sessionStateLabel: sessionInfo.stateLabel,
      sessionProgressRatio: sessionInfo.progressRatio,
      fearGreed7d,
      move5mPct: r.move5mPct,
      vol5mRangePct: r.vol5mRangePct,
      move5mSource: r.move5mSource,
    };
  });

    const payload = { quotes, updatedAt: new Date().toISOString() };
    const anyOpen = quotes.some((q) => q.marketSessionOpen);
    const isComplete = quotes.length >= YAHOO_SYMBOL_CONFIG.length;
    const batchLatency = Date.now() - batchStart;
    if (quotes.length > 0) {
      const ttlMs = !isComplete ? 3500 : anyOpen ? 1200 : 120_000;
      quotesCache.entry = { data: payload, expiresAt: Date.now() + ttlMs };
    }

    if (quotes.length === 0 || yahooCachedSymbolCount > 3) {
      updateProviderMetric('yahoo_macro', {
        status: 'cached',
        activeSource:
          quotes.length > 0
            ? `Cached Quotes (${yahooCachedSymbolCount} stale symbols)`
            : 'Offline / Cached Snapshot',
        latencyMs: batchLatency,
        lastSuccessAt: quotes.length > 0 ? Date.now() : undefined,
        isCachedFallback: true,
        fallbackReason: `${yahooCachedSymbolCount} ticker(s) fell back to cached quotes`,
      });
    } else if (tvGlobalMap.size === 0 && quotes.length < YAHOO_SYMBOL_CONFIG.length - 3) {
      updateProviderMetric('yahoo_macro', {
        status: 'failover',
        activeSource: 'Yahoo Finance v8 (Degraded)',
        latencyMs: batchLatency,
        lastSuccessAt: Date.now(),
        isCachedFallback: false,
        fallbackReason: 'TradingView scanner down and partial Yahoo quote response',
      });
    } else if (yahooFreshSymbolCount > 0 || quotes.length > 0) {
      updateProviderMetric('yahoo_macro', {
        status: 'live',
        activeSource:
          tvGlobalMap.size > 0
            ? 'Yahoo Finance v8 + TV Global'
            : 'Yahoo Finance v8 Live',
        latencyMs: yahooFreshSymbolCount > 0 ? batchLatency : undefined,
        lastSuccessAt: Date.now(),
        isCachedFallback: false,
        fallbackReason: undefined,
      });
    }

    // Softly warm missing 1mo daily Fear & Greed history in small batches AFTER primary quotes settle
    const coldDaily = YAHOO_SYMBOL_CONFIG.filter((c) => {
      const d = dailyHistoryCache.get(c.yahooSymbol);
      return !d || d.expiresAt <= Date.now();
    });
    if (coldDaily.length > 0) {
      setTimeout(() => {
        void Promise.allSettled(coldDaily.slice(0, 6).map((c) => fetchRecentDailyCloses(c.yahooSymbol)));
      }, 250);
    }

    return payload;
  })();

  try {
    return await inFlightQuotesPromise;
  } finally {
    inFlightQuotesPromise = null;
  }
}

const inFlightChartRequests = new Map<string, Promise<LiveChartResponse | null>>();

async function fetchYahooChartJson(
  yahooSymbol: string,
  range: string,
  interval: string,
  timeoutMs = 7000
): Promise<{
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
} | null> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
        yahooSymbol
      )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
      const res = await fetch(url, {
        headers: UA_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: Record<string, unknown>;
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                open?: Array<number | null>;
                high?: Array<number | null>;
                low?: Array<number | null>;
                close?: Array<number | null>;
                volume?: Array<number | null>;
              }>;
            };
          }>;
        };
      };
      if (json?.chart?.result?.[0]) {
        return json;
      }
    } catch {
      // Try mirror host on network/timeout error
    }
  }
  return null;
}

export async function fetchLiveChart(
  id: string,
  timeframe: string
): Promise<LiveChartResponse | null> {
  const key = `${id}:${timeframe}`;
  const now = Date.now();
  const cached = chartCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existingInFlight = inFlightChartRequests.get(key);
  if (existingInFlight) {
    return existingInFlight;
  }

  const task = (async (): Promise<LiveChartResponse | null> => {
    try {
      const cfg = YAHOO_SYMBOL_CONFIG.find((c) => c.id === id);
      if (!cfg) return null;

      const rangeMap: Record<
        string,
        { range: string; interval: string; sliceTail?: number; aggregateEvery?: number }
      > = {
        '1m': { range: '1d', interval: '1m', sliceTail: 36 },
        '5m': { range: '1d', interval: '5m', sliceTail: 36 },
        '15m': { range: '5d', interval: '15m', sliceTail: 40 },
        '15M': { range: '5d', interval: '15m', sliceTail: 40 },
        '30m': { range: '5d', interval: '30m', sliceTail: 42 },
        '1h': { range: '1mo', interval: '60m', sliceTail: 42 },
        '1H': { range: '1mo', interval: '60m', sliceTail: 42 },
        '4h': { range: '1mo', interval: '60m', aggregateEvery: 4, sliceTail: 38 },
        '4H': { range: '1mo', interval: '60m', aggregateEvery: 4, sliceTail: 38 },
        '1D': { range: '1d', interval: '15m' },
        '1W': { range: '5d', interval: '1h' },
        '1M': { range: '1mo', interval: '1d' },
        '3M': { range: '3mo', interval: '1d' },
        YTD: { range: 'ytd', interval: '1d' },
        '1Y': { range: '1y', interval: '1wk' },
        ALL: { range: '5y', interval: '1mo' },
      };
      const params = rangeMap[timeframe] ?? rangeMap['1D'];

      const json = await fetchYahooChartJson(
        cfg.yahooSymbol,
        params.range,
        params.interval,
        7000
      );

      if (!json) {
        if (cached?.data) {
          return cached.data;
        }
        const quoteCached = perSymbolQuoteCache.get(id)?.data;
        if (timeframe === '1D' && quoteCached && quoteCached.closes.length >= 2) {
          return {
            id,
            timeframe,
            points: quoteCached.closes,
            timestamps: quoteCached.timestamps,
            prevClose: quoteCached.prevClose,
          };
        }
        return null;
      }

      const item = json.chart?.result?.[0];
      const quoteObj = item?.indicators?.quote?.[0];
      const rawCloses = quoteObj?.close ?? [];
      const rawOpens = quoteObj?.open ?? [];
      const rawHighs = quoteObj?.high ?? [];
      const rawLows = quoteObj?.low ?? [];
      const rawTimestamps = item?.timestamp ?? [];
      let points: number[] = [];
      let timestamps: number[] = [];
      let candles: CandlePoint[] = [];

      for (let i = 0; i < rawCloses.length; i++) {
        const val = rawCloses[i];
        const ts = rawTimestamps[i];
        // A chart point is usable only when both its close and provider timestamp exist.
        // Never manufacture timestamps or OHLC values from a neighbouring close.
        if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) continue;
        if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) continue;

        const c = Number(val.toFixed(cfg.decimals));
        const tsMs = ts * 1000;
        points.push(c);
        timestamps.push(tsMs);

        const rawO = rawOpens[i];
        const rawH = rawHighs[i];
        const rawL = rawLows[i];
        if (
          typeof rawO === 'number' && Number.isFinite(rawO) && rawO > 0 &&
          typeof rawH === 'number' && Number.isFinite(rawH) && rawH > 0 &&
          typeof rawL === 'number' && Number.isFinite(rawL) && rawL > 0 &&
          rawH >= Math.max(rawO, rawL, val) && rawL <= Math.min(rawO, rawH, val)
        ) {
          candles.push({
            t: tsMs,
            o: Number(rawO.toFixed(cfg.decimals)),
            h: Number(rawH.toFixed(cfg.decimals)),
            l: Number(rawL.toFixed(cfg.decimals)),
            c,
          });
        }
      }

      // Candle arrays must align one-to-one with close points. When any OHLC field is
      // missing or invalid, keep the verified close series and omit candles entirely.
      if (candles.length !== points.length) candles = [];

      if (points.length === 0) {
        return cached?.data ?? null;
      }

      if (params.aggregateEvery && params.aggregateEvery > 1 && candles.length === points.length && candles.length >= params.aggregateEvery) {
        const aggCandles: CandlePoint[] = [];
        const step = params.aggregateEvery;
        for (let i = 0; i < candles.length; i += step) {
          const chunk = candles.slice(i, i + step);
          if (chunk.length === 0) continue;
          aggCandles.push({
            t: chunk[chunk.length - 1].t,
            o: Number(chunk[0].o.toFixed(cfg.decimals)),
            h: Number(Math.max(...chunk.map((x) => x.h)).toFixed(cfg.decimals)),
            l: Number(Math.min(...chunk.map((x) => x.l)).toFixed(cfg.decimals)),
            c: Number(chunk[chunk.length - 1].c.toFixed(cfg.decimals)),
          });
        }
        candles = aggCandles;
        points = aggCandles.map((b) => b.c);
        timestamps = aggCandles.map((b) => b.t);
      }

      const finalPoints =
        params.sliceTail && points.length > params.sliceTail
          ? points.slice(-params.sliceTail)
          : points;
      const finalTimestamps =
        params.sliceTail && timestamps.length > params.sliceTail
          ? timestamps.slice(-params.sliceTail)
          : timestamps;
      const finalCandles =
        params.sliceTail && candles.length > params.sliceTail
          ? candles.slice(-params.sliceTail)
          : candles;

      const prevClose = Number(
        item?.meta?.chartPreviousClose ?? item?.meta?.previousClose
      );

      const payload: LiveChartResponse = {
        id,
        timeframe,
        points: finalPoints,
        timestamps: finalTimestamps,
        candles: finalCandles,
        prevClose: Number.isFinite(prevClose) && prevClose > 0 ? Number(prevClose.toFixed(cfg.decimals)) : Number.NaN,
      };

      const chartTtl = params.sliceTail ? 15_000 : 180_000;
      chartCache.set(key, { data: payload, expiresAt: now + chartTtl });
      return payload;
    } catch {
      return cached?.data ?? null;
    } finally {
      inFlightChartRequests.delete(key);
    }
  })();

  inFlightChartRequests.set(key, task);
  return task;
}

export async function fetchLiveFxRates(): Promise<LiveFxResponse> {
  const now = Date.now();
  if (fxCache.entry) {
    if (fxCache.entry.expiresAt > now) {
      return fxCache.entry.data;
    }
    if (now - fxCache.entry.expiresAt < 900_000) {
      void fetchFxRatesFresh().catch(() => null);
      return fxCache.entry.data;
    }
  }
  return fetchFxRatesFresh();
}

async function fetchFxRatesFresh(): Promise<LiveFxResponse> {
  const now = Date.now();
  const fxStart = Date.now();
  return coalesceInFlight('fx-rates', fxCache.entry?.data, async () => {

  const [erRes, quotesRes] = await Promise.all([
    fetch('https://open.er-api.com/v6/latest/USD', {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(8000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchLiveQuotes(),
  ]);

  const erRates = (erRes as { rates?: Record<string, number>; time_last_update_utc?: string } | null)
    ?.rates;

  const usdIdrQuote = quotesRes.quotes.find((q) => q.id === 'USDIDR');
  const eurUsdQuote = quotesRes.quotes.find((q) => q.id === 'EURUSD');
  const gbpUsdQuote = quotesRes.quotes.find((q) => q.id === 'GBPUSD');
  const usdJpyQuote = quotesRes.quotes.find((q) => q.id === 'USDJPY');
  const audUsdQuote = quotesRes.quotes.find((q) => q.id === 'AUDUSD');
  const usdChfQuote = quotesRes.quotes.find((q) => q.id === 'USDCHF');
  const usdCadQuote = quotesRes.quotes.find((q) => q.id === 'USDCAD');
  const nzdUsdQuote = quotesRes.quotes.find((q) => q.id === 'NZDUSD');
  const usdCnyQuote = quotesRes.quotes.find((q) => q.id === 'USDCNY');

  const idrRate = usdIdrQuote?.price ?? erRates?.IDR ?? 0;
  const eurPerUsd = eurUsdQuote?.price ? 1 / eurUsdQuote.price : erRates?.EUR ?? 0;
  const gbpPerUsd = gbpUsdQuote?.price ? 1 / gbpUsdQuote.price : erRates?.GBP ?? 0;
  const jpyPerUsd = usdJpyQuote?.price ?? erRates?.JPY ?? 0;
  const chfPerUsd = usdChfQuote?.price ?? erRates?.CHF ?? 0;
  const cadPerUsd = usdCadQuote?.price ?? erRates?.CAD ?? 0;
  const audPerUsd = audUsdQuote?.price ? 1 / audUsdQuote.price : erRates?.AUD ?? 0;
  const nzdPerUsd = nzdUsdQuote?.price ? 1 / nzdUsdQuote.price : erRates?.NZD ?? 0;
  const cnyPerUsd = usdCnyQuote?.price ?? erRates?.CNY ?? 0;
  const sgdPerUsd = erRates?.SGD ?? 0;

  const rates: Record<string, number> = {
    USD: 1,
    EUR: Number(eurPerUsd.toFixed(6)),
    GBP: Number(gbpPerUsd.toFixed(6)),
    JPY: Number(jpyPerUsd.toFixed(4)),
    CHF: Number(chfPerUsd.toFixed(6)),
    CAD: Number(cadPerUsd.toFixed(6)),
    AUD: Number(audPerUsd.toFixed(6)),
    NZD: Number(nzdPerUsd.toFixed(6)),
    CNY: Number(cnyPerUsd.toFixed(6)),
    SGD: Number(sgdPerUsd.toFixed(6)),
    IDR: Number(idrRate.toFixed(2)),
  };

  const formatTileRate = (val: number, decimals: number) =>
    val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const eurUsdVal = eurUsdQuote?.price ?? (rates.EUR > 0 ? 1 / rates.EUR : 0);
  const gbpUsdVal = gbpUsdQuote?.price ?? (rates.GBP > 0 ? 1 / rates.GBP : 0);
  const audUsdVal = audUsdQuote?.price ?? (rates.AUD > 0 ? 1 / rates.AUD : 0);
  const nzdUsdVal = nzdUsdQuote?.price ?? (rates.NZD > 0 ? 1 / rates.NZD : 0);
  const sgdIdrVal = rates.IDR > 0 && rates.SGD > 0 ? rates.IDR / rates.SGD : 0;

  const pairTiles = [
    {
      pair: 'USD / IDR',
      base: 'USD',
      quote: 'IDR',
      rate: rates.IDR > 0 ? formatTileRate(rates.IDR, 0) : '—',
      changePercent: usdIdrQuote?.changePercent ?? 0,
      high: usdIdrQuote?.dayHigh ?? '—',
      low: usdIdrQuote?.dayLow ?? '—',
    },
    {
      pair: 'EUR / USD',
      base: 'EUR',
      quote: 'USD',
      rate: eurUsdVal > 0 ? formatTileRate(eurUsdVal, 4) : '—',
      changePercent: eurUsdQuote?.changePercent ?? 0,
      high: eurUsdQuote?.dayHigh ?? '—',
      low: eurUsdQuote?.dayLow ?? '—',
    },
    {
      pair: 'GBP / USD',
      base: 'GBP',
      quote: 'USD',
      rate: gbpUsdVal > 0 ? formatTileRate(gbpUsdVal, 4) : '—',
      changePercent: gbpUsdQuote?.changePercent ?? 0,
      high: gbpUsdQuote?.dayHigh ?? '—',
      low: gbpUsdQuote?.dayLow ?? '—',
    },
    {
      pair: 'USD / JPY',
      base: 'USD',
      quote: 'JPY',
      rate: rates.JPY > 0 ? formatTileRate(rates.JPY, 2) : '—',
      changePercent: usdJpyQuote?.changePercent ?? 0,
      high: usdJpyQuote?.dayHigh ?? '—',
      low: usdJpyQuote?.dayLow ?? '—',
    },
    {
      pair: 'USD / CHF',
      base: 'USD',
      quote: 'CHF',
      rate: rates.CHF > 0 ? formatTileRate(rates.CHF, 4) : '—',
      changePercent: usdChfQuote?.changePercent ?? 0,
      high: usdChfQuote?.dayHigh ?? '—',
      low: usdChfQuote?.dayLow ?? '—',
    },
    {
      pair: 'USD / CAD',
      base: 'USD',
      quote: 'CAD',
      rate: rates.CAD > 0 ? formatTileRate(rates.CAD, 4) : '—',
      changePercent: usdCadQuote?.changePercent ?? 0,
      high: usdCadQuote?.dayHigh ?? '—',
      low: usdCadQuote?.dayLow ?? '—',
    },
    {
      pair: 'AUD / USD',
      base: 'AUD',
      quote: 'USD',
      rate: audUsdVal > 0 ? formatTileRate(audUsdVal, 4) : '—',
      changePercent: audUsdQuote?.changePercent ?? 0,
      high: audUsdQuote?.dayHigh ?? '—',
      low: audUsdQuote?.dayLow ?? '—',
    },
    {
      pair: 'NZD / USD',
      base: 'NZD',
      quote: 'USD',
      rate: nzdUsdVal > 0 ? formatTileRate(nzdUsdVal, 4) : '—',
      changePercent: nzdUsdQuote?.changePercent ?? 0,
      high: nzdUsdQuote?.dayHigh ?? '—',
      low: nzdUsdQuote?.dayLow ?? '—',
    },
    {
      pair: 'USD / CNY',
      base: 'USD',
      quote: 'CNY',
      rate: rates.CNY > 0 ? formatTileRate(rates.CNY, 4) : '—',
      changePercent: usdCnyQuote?.changePercent ?? 0,
      high: usdCnyQuote?.dayHigh ?? '—',
      low: usdCnyQuote?.dayLow ?? '—',
    },
    {
      pair: 'SGD / IDR',
      base: 'SGD',
      quote: 'IDR',
      rate: sgdIdrVal > 0 ? formatTileRate(sgdIdrVal, 0) : '—',
      changePercent: 0,
      high: '—',
      low: '—',
    },
  ];

  const payload: LiveFxResponse = {
    base: 'USD',
    rates,
    pairTiles,
    updatedAt: new Date().toISOString(),
  };

  fxCache.entry = { data: payload, expiresAt: now + 600_000 };
  const fxLatency = Date.now() - fxStart;
  if (!erRates) {
    updateProviderMetric('fx_rates', {
      status: 'failover',
      activeSource: 'Yahoo FX Crosses Fallback',
      latencyMs: fxLatency,
      lastSuccessAt: Date.now(),
      isCachedFallback: false,
      fallbackReason: 'Open ER-API unavailable; using live Yahoo FX quotes',
    });
  } else {
    updateProviderMetric('fx_rates', {
      status: 'live',
      activeSource: 'Open ER-API + Live FX',
      latencyMs: fxLatency,
      lastSuccessAt: Date.now(),
      isCachedFallback: false,
      fallbackReason: undefined,
    });
  }
  return payload;
  });
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXmlEntities(match[1]) : '';
}

function formatRelativeTime(pubDateStr: string): string {
  const ts = Date.parse(pubDateStr);
  if (!Number.isFinite(ts)) return 'Just now';
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function classifyTopic(
  text: string,
  defaultTopic?: 'rates' | 'idx' | 'commodities' | 'crypto'
): {
  topic: 'rates' | 'idx' | 'commodities' | 'crypto';
  tags: string[];
} {
  const lower = text.toLowerCase();
  if (
    /\b(bitcoin|crypto|cryptocurrency|ethereum|solana|btc|eth|stablecoin|blockchain)\b/.test(lower)
  ) {
    return { topic: 'crypto', tags: ['Bitcoin', 'Digital Assets'] };
  }
  if (
    /\b(gold|silver|oil|brent|wti|crude|opec|commodities|commodity|copper|emas)\b/.test(lower)
  ) {
    return { topic: 'commodities', tags: ['Commodities', 'Energy & Metals'] };
  }
  if (
    /\b(ihsg|jakarta|rupiah|indonesia|bi-rate|saham|emiten|bei|ojk|nikkei|taiex|kospi)\b/.test(
      lower
    ) ||
    lower.includes('bank indonesia') ||
    lower.includes('hang seng') ||
    defaultTopic === 'idx'
  ) {
    return { topic: 'idx', tags: ['Asia-Pacific', 'IDX / FX'] };
  }
  if (defaultTopic === 'commodities') {
    return { topic: 'commodities', tags: ['Commodities', 'Energy & Metals'] };
  }
  if (defaultTopic === 'crypto') {
    return { topic: 'crypto', tags: ['Bitcoin', 'Digital Assets'] };
  }
  return { topic: 'rates', tags: ['Equities', 'Macro & Rates'] };
}

function scoreNewsImpact(
  headline: string,
  summary: string,
  publisher: string,
  ageMs: number
): {
  impactScore: number;
  isBreaking: boolean;
  newsTier: 'breaking' | 'recent';
  impactLabel?: string;
} {
  const text = `${headline} ${summary}`.toLowerCase();
  const titleLower = headline.toLowerCase();

  let score = 0;

  // 1. Freshness tier (breaking events must be fresh)
  if (ageMs <= 45 * 60_000) score += 32;
  else if (ageMs <= 2 * 3600_000) score += 24;
  else if (ageMs <= 4 * 3600_000) score += 14;

  // 2. High-impact central bank & macro release keywords
  if (
    /\b(fed|fomc|powell|ecb|boj|bank indonesia|bi rate|rate cut|rate hike|interest rate|cpi|inflation|pce|nfp|nonfarm|payrolls|gdp|recession|unemployment|pmi)\b/.test(
      text
    )
  ) {
    score += 32;
  }

  // 3. Sharp market move / systemic shock / policy catalyst keywords
  if (
    /\b(breaking|urgent|alert|plunge|plunges|surge|surges|crash|crashes|soar|soars|tumble|tumbles|slump|slumps|record high|all-time high|trading halt|circuit breaker|emergency|default|downgrade|sanctions|tariff|tariffs|opec|ceasefire|strike|invasion)\b/.test(
      titleLower
    )
  ) {
    score += 30;
  } else if (
    /\b(rally|rallies|selloff|sell-off|drops|jumps|spikes|sinks|rebound|sec |antitrust|bankruptcy|guidance cut|earnings beat|earnings miss|acquisition|merger)\b/.test(
      titleLower
    )
  ) {
    score += 18;
  }

  // 4. Local Indonesia/Asia high-impact catalyst terms
  if (/\b(ihsg|rupiah|bank indonesia|ojk|bei|prabowo|apbn|bbca|bbri|bmri|bni|tlkm)\b/.test(text)) {
    score += 14;
  }

  // 5. Quantified shock / basis-point magnitude cue
  if (/\b\d+(\.\d+)?%|\bbps\b|\$\d+(\.\d+)?[bmt]\b|rp\s?\d+/i.test(headline)) {
    score += 14;
  }

  // 6. Wire publisher bonus
  if (/financial times|cnbc|marketwatch|coindesk|bbc business/i.test(publisher)) {
    score += 6;
  }

  // 7. Editorial/evergreen/listicle/clickbait Q&A penalty — prevent opinion/speculative pieces from entering BREAKING
  const isEditorialOrNoise =
    /\b(opinion|editorial|podcast|watch live|how to|why you|what to know|best |top \d+|tips|explained|newsletter|week ahead|looking ahead|retirement|credit card|mortgage rate|gift guide|quiz|review:|here'?s why|price prediction|forecast for 20\d\d)\b/i.test(
      titleLower
    ) || /^(can|will|should|could|is|are|what|why|how)\b.*\?$/i.test(headline.trim());
  if (isEditorialOrNoise) {
    score -= 42;
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const isBreaking = !isEditorialOrNoise && ageMs <= 4 * 3600_000 && boundedScore >= 64;
  const newsTier: 'breaking' | 'recent' = isBreaking ? 'breaking' : 'recent';
  const impactLabel = isBreaking
    ? 'Breaking · High Impact'
    : boundedScore >= 52
      ? 'Market Mover'
      : undefined;

  return {
    impactScore: boundedScore,
    isBreaking,
    newsTier,
    impactLabel,
  };
}

function parseRssFeed(
  xml: string,
  publisher: string,
  defaultTopic?: 'rates' | 'idx' | 'commodities' | 'crypto',
  maxPerSource = 6
): (LiveNewsItem & { ts: number })[] {
  const items: (LiveNewsItem & { ts: number })[] = [];
  const matches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (let i = 0; i < matches.length && items.length < maxPerSource; i++) {
    const raw = matches[i];
    const headline = extractTag(raw, 'title');
    const summaryRaw = extractTag(raw, 'description');
    const link = extractTag(raw, 'link');
    const pubDate = extractTag(raw, 'pubDate');
    if (!headline || headline.length < 12) continue;

    const ts = Date.parse(pubDate);
    if (!Number.isFinite(ts)) continue;
    const ageMs = Math.max(0, Date.now() - ts);
    const summary = summaryRaw || headline;
    const { topic, tags } = classifyTopic(`${headline} ${summary}`, defaultTopic);
    const impactEval = scoreNewsImpact(headline, summary, publisher, ageMs);
    const publishedWib = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(ts));

    items.push({
      id: `live-${publisher.toLowerCase().replace(/\W+/g, '')}-${i}-${ts}`,
      publisher,
      timeAgo: formatRelativeTime(pubDate),
      publishedAt: `${publishedWib} WIB`,
      isBreaking: impactEval.isBreaking,
      newsTier: impactEval.newsTier,
      impactScore: impactEval.impactScore,
      impact: impactEval.impactLabel,
      topic,
      tags,
      headline,
      summary,
      paragraphs: [
        summary,
        `Published ${publishedWib} WIB via ${publisher}. Open the verified dispatch link below for full coverage and source reporting.`,
      ],
      url: link || undefined,
      ts,
    });
  }
  return items;
}

const NEWS_RSS_SOURCES: {
  publisher: string;
  url: string;
  defaultTopic?: 'rates' | 'idx' | 'commodities' | 'crypto';
  maxItems: number;
}[] = [
  {
    publisher: 'MarketWatch',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    defaultTopic: 'rates',
    maxItems: 5,
  },
  {
    publisher: 'Financial Times',
    url: 'https://www.ft.com/markets?format=rss',
    defaultTopic: 'rates',
    maxItems: 5,
  },
  {
    publisher: 'CNBC',
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',
    defaultTopic: 'rates',
    maxItems: 5,
  },
  {
    publisher: 'CNBC Investing',
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069',
    defaultTopic: 'rates',
    maxItems: 4,
  },
  {
    publisher: 'BBC Business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    defaultTopic: 'rates',
    maxItems: 5,
  },
  {
    publisher: 'Yahoo Finance',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,%5EDJI,%5ETNX&region=US&lang=en-US',
    defaultTopic: 'rates',
    maxItems: 5,
  },
  {
    publisher: 'CNBC Indonesia',
    url: 'https://www.cnbcindonesia.com/market/rss',
    defaultTopic: 'idx',
    maxItems: 6,
  },
  {
    publisher: 'Yahoo Finance Asia',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EJKSE,IDR%3DX,%5ETWII,%5EKS11,%5EHSI&region=US&lang=en-US',
    defaultTopic: 'idx',
    maxItems: 5,
  },
  {
    publisher: 'Yahoo Commodities',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF,CL%3DF,BZ%3DF&region=US&lang=en-US',
    defaultTopic: 'commodities',
    maxItems: 5,
  },
  {
    publisher: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    defaultTopic: 'crypto',
    maxItems: 5,
  },
  {
    publisher: 'Yahoo Crypto',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD,ETH-USD&region=US&lang=en-US',
    defaultTopic: 'crypto',
    maxItems: 4,
  },
];

export async function fetchLiveNews(): Promise<{
  stories: LiveNewsItem[];
  updatedAt: string;
}> {
  const now = Date.now();
  if (newsCache.entry) {
    if (newsCache.entry.expiresAt > now) {
      return newsCache.entry.data;
    }
    if (now - newsCache.entry.expiresAt < 900_000) {
      void fetchLiveNewsFresh().catch(() => null);
      return newsCache.entry.data;
    }
  }
  return fetchLiveNewsFresh();
}

async function fetchLiveNewsFresh(): Promise<{
  stories: LiveNewsItem[];
  updatedAt: string;
}> {
  const now = Date.now();
  const newsStart = Date.now();
  return coalesceInFlight('live-news', newsCache.entry?.data, async () => {

  const feeds = await Promise.all(
    NEWS_RSS_SOURCES.map(async (src) => {
      try {
        const res = await fetch(src.url, {
          headers: UA_HEADERS,
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssFeed(xml, src.publisher, src.defaultTopic, src.maxItems);
      } catch {
        return [];
      }
    })
  );

  const combined = feeds.flat();

  const seenTitles = new Set<string>();
  const deduped = combined
    .sort((a, b) => {
      if (Boolean(b.isBreaking) !== Boolean(a.isBreaking)) {
        return b.isBreaking ? 1 : -1;
      }
      if (b.isBreaking && a.isBreaking) {
        const scoreDiff = (b.impactScore ?? 0) - (a.impactScore ?? 0);
        if (Math.abs(scoreDiff) >= 8) return scoreDiff;
      }
      return b.ts - a.ts;
    })
    .filter((item) => {
      const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 55);
      if (!key || seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, 36)
    .map(({ ts: _ts, ...rest }) => rest);

  const payload = { stories: deduped, updatedAt: new Date().toISOString() };
  const newsLatency = Date.now() - newsStart;
  if (deduped.length > 0) {
    newsCache.entry = { data: payload, expiresAt: now + 300_000 };
    updateProviderMetric('news_cal', {
      status: 'live',
      activeSource: 'Live RSS + Macro Calendar',
      latencyMs: newsLatency,
      lastSuccessAt: Date.now(),
      isCachedFallback: false,
      fallbackReason: undefined,
    });
  } else if (newsCache.entry?.data) {
    updateProviderMetric('news_cal', {
      status: 'cached',
      activeSource: 'Cached RSS News Snapshot',
      latencyMs: newsLatency,
      isCachedFallback: true,
      fallbackReason: 'RSS upstream returned zero stories; serving cache',
    });
    return newsCache.entry.data;
  }
  return payload;
  });
}

function getWibDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function formatWibTimeLabel(d: Date): string {
  const nowKey = getWibDateKey(new Date());
  const tomorrowKey = getWibDateKey(new Date(Date.now() + 86400_000));
  const itemKey = getWibDateKey(d);
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  if (itemKey === nowKey) return `Today ${hhmm}`;
  if (itemKey === tomorrowKey) return `Tmrw ${hhmm}`;
  const monDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    month: 'short',
    day: '2-digit',
  }).format(d);
  return `${monDay} ${hhmm}`;
}

function classifyDay(d: Date): 'today' | 'tomorrow' | 'week' {
  const nowKey = getWibDateKey(new Date());
  const tomorrowKey = getWibDateKey(new Date(Date.now() + 86400_000));
  const itemKey = getWibDateKey(d);
  if (itemKey === nowKey) return 'today';
  if (itemKey === tomorrowKey) return 'tomorrow';
  return 'week';
}

function computeDeviation(actual?: string, forecast?: string): {
  label: string;
  type: 'beat' | 'miss' | 'neutral';
} {
  if (!actual || !actual.trim() || actual === 'Pending') {
    return { label: 'Upcoming', type: 'neutral' };
  }
  if (!forecast || !forecast.trim() || forecast === '—') {
    return { label: 'Released', type: 'neutral' };
  }
  const numActual = parseFloat(actual.replace(/[^0-9.-]/g, ''));
  const numForecast = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numActual) || !Number.isFinite(numForecast)) {
    return { label: 'Reported', type: 'neutral' };
  }
  const diff = numActual - numForecast;
  if (Math.abs(diff) < 1e-6) return { label: 'In-line', type: 'neutral' };
  return diff > 0
    ? { label: `Beat (+${Math.abs(diff).toFixed(1).replace(/\.0$/, '')})`, type: 'beat' }
    : { label: `Miss (-${Math.abs(diff).toFixed(1).replace(/\.0$/, '')})`, type: 'miss' };
}

function formatTvMetric(
  val: number | null | undefined,
  unit?: string,
  scale?: string,
  isActual = false,
  isFuture = false
): string {
  if (val === null || val === undefined || !Number.isFinite(val)) {
    if (isActual && isFuture) return 'Pending';
    return '—';
  }
  const absStr =
    Math.abs(val) >= 100
      ? Math.abs(val).toFixed(1).replace(/\.0$/, '')
      : Number(Math.abs(val).toFixed(3)).toString();
  const sign = val < 0 ? '-' : '';
  const sc = scale || '';
  if (unit === '%') return `${sign}${absStr}${sc}%`;
  if (unit === '$' || unit === '¥' || unit === '€') return `${sign}${unit}${absStr}${sc}`;
  return `${sign}${absStr}${sc}${unit ? ` ${unit}` : ''}`;
}

function computeTvDeviation(
  actual: number | null | undefined,
  forecast: number | null | undefined,
  unit?: string,
  scale?: string,
  isFuture = false
): { label: string; type: 'beat' | 'miss' | 'neutral' } {
  if (actual === null || actual === undefined || !Number.isFinite(actual)) {
    return { label: isFuture ? 'Upcoming' : 'Pending', type: 'neutral' };
  }
  if (forecast === null || forecast === undefined || !Number.isFinite(forecast)) {
    return { label: 'Released', type: 'neutral' };
  }
  const diff = actual - forecast;
  if (Math.abs(diff) < 1e-6) return { label: 'In-line', type: 'neutral' };
  const mag = Math.abs(diff) >= 100
    ? Math.abs(diff).toFixed(1).replace(/\.0$/, '')
    : Number(Math.abs(diff).toFixed(2)).toString();
  const suffix = unit === '%' ? '%' : scale || '';
  return diff > 0
    ? { label: `Beat (+${mag}${suffix})`, type: 'beat' }
    : { label: `Miss (-${mag}${suffix})`, type: 'miss' };
}

export async function fetchLiveCalendar(): Promise<LiveCalendarResponse> {
  const now = Date.now();
  if (calendarCache.entry) {
    if (calendarCache.entry.expiresAt > now) {
      return calendarCache.entry.data;
    }
    if (now - calendarCache.entry.expiresAt < 900_000) {
      void fetchLiveCalendarFresh().catch(() => null);
      return calendarCache.entry.data;
    }
  }
  return fetchLiveCalendarFresh();
}

async function fetchLiveCalendarFresh(): Promise<LiveCalendarResponse> {
  const now = Date.now();
  const calStart = Date.now();
  return coalesceInFlight('live-calendar', calendarCache.entry?.data, async () => {

  let events: LiveCalendarItem[] = [];
  let source = 'Live Macro Feed';

  // Primary source: TradingView Live Economic Calendar API
  try {
    const fromIso = new Date(now - 36 * 3600_000).toISOString();
    const toIso = new Date(now + 6 * 86400_000).toISOString();
    const tvUrl = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(
      fromIso
    )}&to=${encodeURIComponent(toIso)}&countries=US,ID,JP,EU,CN`;

    const res = await fetch(tvUrl, {
      headers: {
        ...UA_HEADERS,
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        status?: string;
        result?: Array<{
          id?: string;
          title?: string;
          country?: string;
          currency?: string;
          period?: string;
          source?: string;
          comment?: string;
          actual?: number | null;
          forecast?: number | null;
          previous?: number | null;
          unit?: string;
          scale?: string;
          importance?: number;
          date?: string;
        }>;
      };

      const countryCurrencyMap: Record<string, LiveCalendarItem['currency']> = {
        US: 'USD',
        ID: 'IDR',
        CN: 'CNY',
        EU: 'EUR',
        JP: 'JPY',
      };
      const allowedCurrencies = new Set<LiveCalendarItem['currency']>([
        'USD',
        'IDR',
        'CNY',
        'EUR',
        'JPY',
      ]);

      const rawList = (json.result ?? [])
        .filter((ev) => ev.title && ev.date && typeof ev.importance === 'number' && ev.importance >= 0)
        .sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));

      // Keep all High-impact, Indonesian (IDR), and Today/Tomorrow events first, capped at 36 rows
      const mappedAll: LiveCalendarItem[] = rawList.map((ev, idx) => {
        const d = new Date(ev.date!);
        const isFuture = d.getTime() > now;
        const currCandidate = String(ev.currency || '') as LiveCalendarItem['currency'];
        const curr = allowedCurrencies.has(currCandidate)
          ? currCandidate
          : countryCurrencyMap[String(ev.country || '')] || 'USD';
        const impact: 'HIGH' | 'MED' = ev.importance === 1 ? 'HIGH' : 'MED';
        const actual = formatTvMetric(ev.actual, ev.unit, ev.scale, true, isFuture);
        const forecast = formatTvMetric(ev.forecast, ev.unit, ev.scale, false, isFuture);
        const previous = formatTvMetric(ev.previous, ev.unit, ev.scale, false, isFuture);
        const dev = computeTvDeviation(ev.actual, ev.forecast, ev.unit, ev.scale, isFuture);
        const cleanComment = (ev.comment || '').replace(/\s+/g, ' ').trim();
        const shortComment =
          cleanComment.length > 105 ? `${cleanComment.slice(0, 102).trim()}…` : cleanComment;
        const descParts = [ev.source, ev.period, shortComment].filter(Boolean);

        return {
          id: `tv-${ev.id || idx}-${d.getTime()}`,
          timeWib: formatWibTimeLabel(d),
          isoDate: d.toISOString(),
          day: classifyDay(d),
          currency: curr,
          impact,
          title: String(ev.title),
          description: descParts.join(' · ') || `${curr} Macroeconomic Release`,
          actual,
          forecast,
          previous,
          deviationLabel: dev.label,
          deviationType: dev.type,
        };
      });

      const isRelevantMacroRelease = (title: string, impact: 'HIGH' | 'MED') => {
        if (impact === 'HIGH') return true;
        return /(gdp|cpi|ppi|pce|pmi|retail|sales|trade|export|import|industrial|manufacturing|unemployment|jobless|payrolls|employment|confidence|sentiment|inflation|rate|minutes|housing|building|orders|inventories|money supply|m2|foreign exchange|fx reserves|balance|current account)/i.test(
          title
        );
      };

      const priority = mappedAll.filter(
        (e) =>
          e.impact === 'HIGH' ||
          e.currency === 'IDR' ||
          ((e.day === 'today' || e.day === 'tomorrow' || e.day === 'week') &&
            isRelevantMacroRelease(e.title, e.impact))
      );
      events = (priority.length >= 16 ? priority : mappedAll).slice(0, 44);
      if (events.length > 0) {
        source = 'TradingView Live Macroeconomic Calendar';
      }
    }
  } catch {
    // fallback below
  }

  // Secondary fallback: ForexFactory weekly JSON feed
  if (events.length === 0) {
    try {
      const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        headers: UA_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const raw = (await res.json()) as Array<{
            title?: string;
            country?: string;
            date?: string;
            impact?: string;
            actual?: string;
            forecast?: string;
            previous?: string;
          }>;
          const allowed = new Set(['USD', 'IDR', 'CNY', 'EUR', 'JPY']);
          events = raw
            .filter(
              (item) =>
                item.title &&
                item.date &&
                (item.impact === 'High' || item.impact === 'Medium')
            )
            .map((item, idx) => {
              const d = new Date(item.date!);
              const curr = allowed.has(String(item.country))
                ? (item.country as LiveCalendarItem['currency'])
                : 'USD';
              const actual = item.actual?.trim() || (d.getTime() > now ? 'Pending' : '—');
              const forecast = item.forecast?.trim() || '—';
              const previous = item.previous?.trim() || '—';
              const dev = computeDeviation(actual, forecast);

              return {
                id: `ff-${idx}-${d.getTime()}`,
                timeWib: formatWibTimeLabel(d),
                isoDate: d.toISOString(),
                day: classifyDay(d),
                currency: curr,
                impact: item.impact === 'High' ? 'HIGH' : 'MED',
                title: String(item.title),
                description: `${item.country || 'Global'} Macroeconomic Release`,
                actual,
                forecast,
                previous,
                deviationLabel: dev.label,
                deviationType: dev.type,
              };
            });
          source = 'ForexFactory Weekly Macro Feed';
        }
      }
    } catch {
      // fallback below
    }
  }

  // Free public-source-only calendar: if providers return no verified events, keep the list empty.

  // Find next upcoming HIGH impact event (or next MED event) for live countdown
  const futureEvents = events
    .filter((e) => Date.parse(e.isoDate) > now)
    .sort((a, b) => Date.parse(a.isoDate) - Date.parse(b.isoDate));
  const upcomingCatalyst =
    futureEvents.find((e) => e.impact === 'HIGH') ?? futureEvents[0] ?? null;

  const nextCatalyst = upcomingCatalyst
    ? {
        title: upcomingCatalyst.title,
        currency: upcomingCatalyst.currency,
        timeWib: upcomingCatalyst.timeWib,
        targetEpochMs: Date.parse(upcomingCatalyst.isoDate),
        description: upcomingCatalyst.description,
      }
    : null;

  const payload: LiveCalendarResponse = {
    events,
    nextCatalyst,
    source,
    updatedAt: new Date().toISOString(),
  };

  const calLatency = Date.now() - calStart;
  if (events.length > 0) {
    calendarCache.entry = { data: payload, expiresAt: now + 1800_000 };
    const isFailoverCal = source.includes('ForexFactory') || source.includes('Google Search');
    updateProviderMetric('news_cal', {
      status: isFailoverCal ? 'failover' : 'live',
      activeSource: isFailoverCal ? `RSS + ${source}` : 'RSS + TradingView Cal',
      latencyMs: calLatency,
      lastSuccessAt: Date.now(),
      isCachedFallback: false,
      fallbackReason: isFailoverCal ? `Calendar fell back to ${source}` : undefined,
    });
  } else if (calendarCache.entry?.data) {
    updateProviderMetric('news_cal', {
      status: 'cached',
      activeSource: 'Cached Macro Calendar Snapshot',
      latencyMs: calLatency,
      isCachedFallback: true,
      fallbackReason: 'Macro calendar upstream failed; serving cached schedule',
    });
    return calendarCache.entry.data;
  }
  return payload;
  });
}

type InternalMover = StockMover & {
  dollarTurnover: number;
  marketCap?: number;
  relativeVolume?: number;
};

function formatIdrFlowLabel(amountIdr: number): string {
  const abs = Math.abs(amountIdr);
  const sign = amountIdr >= 0 ? '+' : '-';
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(1)}M`;
  return `${sign}Rp ${Math.round(abs).toLocaleString('en-US')}`;
}

const US_INDEX_CORE_CONSTITUENTS = new Set([
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'AVGO', 'TSLA', 'BRK.B',
  'LLY', 'JPM', 'V', 'WMT', 'MA', 'XOM', 'UNH', 'ORCL', 'COST', 'HD', 'PG', 'NFLX',
  'AMD', 'CRM', 'BAC', 'CVX', 'KO', 'PEP', 'TMO', 'ABBV', 'CSCO', 'ADBE', 'INTC',
  'QCOM', 'TXN', 'AMAT', 'MU', 'PLTR', 'PANW', 'GS', 'MS', 'CAT', 'DIS', 'UBER',
  'NOW', 'INTU', 'ISRG', 'LIN', 'BLK', 'TMUS', 'AMGN', 'SBUX', 'BA', 'ARM', 'CRWD',
  'SNOW', 'MRVL', 'KLAC', 'LRCX', 'ASML', 'IBM', 'GE', 'RTX', 'PM', 'AXP',
]);

const IDX_INDEX_CORE_CONSTITUENTS = new Set([
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'BREN', 'TPIA', 'AMMN', 'BYAN',
  'DSSA', 'DCII', 'CUAN', 'PANI', 'UNTR', 'ADRO', 'ICBP', 'INDF', 'KLBF', 'CPIN',
  'PGAS', 'PTBA', 'MDKA', 'ANTM', 'INCO', 'GOTO', 'BRIS', 'ISAT', 'EXCL', 'SMGR',
  'MYOR', 'MAPI', 'AMRT', 'MBMA', 'NCKL', 'MEDC', 'AKRA', 'INKP', 'TKIM', 'ITMG',
]);

const NON_INDEX_EXCLUSION_SYMBOLS = new Set([
  'ANT', 'SPCX', 'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'SQQQ', 'TQQQ', 'SOXL', 'SOXS',
]);

async function fetchTradingViewScan(
  region: 'america' | 'indonesia',
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  extraFilters: Array<Record<string, unknown>> = [],
  limit = 25
): Promise<InternalMover[]> {
  try {
    const baseFilters: Array<Record<string, unknown>> = [
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'subtype', operation: 'equal', right: 'common' },
      { left: 'is_primary', operation: 'equal', right: true },
      { left: 'close', operation: 'greater', right: region === 'indonesia' ? 60 : 5 },
      { left: 'volume', operation: 'greater', right: region === 'indonesia' ? 100_000 : 300_000 },
      ...extraFilters,
    ];
    const res = await fetch(`https://scanner.tradingview.com/${region}/scan`, {
      method: 'POST',
      headers: {
        ...UA_HEADERS,
        'Content-Type': 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
      body: JSON.stringify({
        filter: baseFilters,
        options: { lang: 'en' },
        markets: [region],
        columns: [
          'name',
          'description',
          'close',
          'change',
          'change_abs',
          'high',
          'low',
          'volume',
          'Value.Traded',
          'exchange',
          'market_cap_basic',
          'relative_volume_10d_calc',
        ],
        sort: { sortBy, sortOrder },
        range: [0, limit],
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{ s?: string; d?: Array<string | number | null> }>;
    };

    const out: InternalMover[] = [];
    for (const row of json.data ?? []) {
      const d = row.d;
      if (!d || d.length < 9) continue;
      const symbol = String(d[0] || '').trim().toUpperCase();
      if (!symbol || NON_INDEX_EXCLUSION_SYMBOLS.has(symbol)) continue;
      const exchange = String(d[9] || (region === 'indonesia' ? 'IDX' : 'NASDAQ/NYSE'));
      if (region === 'america' && /OTC|PINK/i.test(exchange)) continue;

      const name = String(d[1] || symbol).slice(0, 42);
      const close = Number(d[2]);
      const changePct = Number(d[3]);
      const changeAbs = Number(d[4]);
      const high = Number(d[5] ?? close);
      const low = Number(d[6] ?? close);
      const vol = Number(d[7] ?? 0);
      const valTraded = Number(d[8] ?? close * vol);
      const mcap = Number(d[10] ?? 0);
      const rvol = Number(d[11] ?? 1);

      if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(changePct)) continue;
      const isId = region === 'indonesia';
      const decimals = isId ? 0 : 2;
      const price = isId ? Math.round(close) : Number(close.toFixed(2));
      const safeAbs = Number.isFinite(changeAbs) ? changeAbs : close - close / (1 + changePct / 100);
      const prevRaw = Math.max(0.01, close - safeAbs);
      const prevClose = isId ? Math.max(1, Math.round(prevRaw)) : Number(prevRaw.toFixed(2));
      const chgVal = isId ? Math.round(price - prevClose) : Number((price - prevClose).toFixed(2));
      const consistentPct =
        prevRaw > 0 && Math.abs(((close - prevRaw) / prevRaw) * 100 - changePct) < 0.25
          ? changePct
          : prevClose > 0
            ? ((price - prevClose) / prevClose) * 100
            : changePct;
      const dHigh = isId ? Math.round(high) : Number(high.toFixed(2));
      const dLow = isId ? Math.round(low) : Number(low.toFixed(2));

      out.push({
        symbol,
        name: name.replace(/\s+Tbk\.?$/i, ' Tbk').slice(0, 42),
        market: isId ? 'ID' : 'US',
        exchange: isId ? 'IDX · Jakarta' : exchange,
        currency: isId ? 'IDR' : 'USD',
        price,
        prevClose,
        changeValue: chgVal,
        changePercent: Number(consistentPct.toFixed(2)),
        dayHigh: dHigh,
        dayLow: dLow,
        volume: formatVolume(vol),
        volumeRaw: Number.isFinite(vol) ? vol : 0,
        marketState: getServerSessionInfo(isId ? `${symbol}.JK` : symbol).stateLabel,
        sparklinePoints: [],
        dollarTurnover: Number.isFinite(valTraded) && valTraded > 0 ? valTraded : price * vol,
        marketCap: Number.isFinite(mcap) && mcap > 0 ? mcap : undefined,
        relativeVolume: Number.isFinite(rvol) && rvol > 0 ? rvol : 1,
      });
    }
    return out;
  } catch {
    return [];
  }
}

const IDX_FLAGSHIP_YAHOO_BASKET = [
  'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'BBNI.JK', 'TLKM.JK', 'ASII.JK',
  'UNTR.JK', 'ADRO.JK', 'AMMN.JK', 'BREN.JK', 'TPIA.JK', 'ICBP.JK',
  'INDF.JK', 'PGAS.JK', 'PTBA.JK', 'ANTM.JK', 'MDKA.JK', 'KLBF.JK',
  'GOTO.JK', 'BRIS.JK', 'ISAT.JK', 'EXCL.JK',
];

const US_FLAGSHIP_YAHOO_BASKET = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO',
  'AMD', 'NFLX', 'JPM', 'LLY', 'V', 'XOM', 'UNH', 'ORCL', 'PLTR', 'MU',
];

async function fetchYahooDirectBasket(market: 'US' | 'ID'): Promise<InternalMover[]> {
  const symbols = market === 'ID' ? IDX_FLAGSHIP_YAHOO_BASKET : US_FLAGSHIP_YAHOO_BASKET;
  const isId = market === 'ID';
  const decimals = isId ? 0 : 2;
  const results = await Promise.all(
    symbols.map(async (ySym): Promise<InternalMover | null> => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            ySym
          )}?range=1d&interval=30m`,
          { headers: UA_HEADERS, signal: AbortSignal.timeout(4500) }
        );
        if (!res.ok) return null;
        const json = (await res.json()) as {
          chart?: {
            result?: Array<{
              meta?: Record<string, unknown>;
              indicators?: { quote?: Array<{ close?: Array<number | null> }> };
            }>;
          };
        };
        const item = json.chart?.result?.[0];
        const meta = item?.meta;
        if (!meta) return null;
        const rawPrice = Number(meta.regularMarketPrice);
        if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;

        const rawPrev = Number(
          meta.regularMarketPreviousClose ?? meta.previousClose ?? meta.chartPreviousClose
        );
        if (!Number.isFinite(rawPrev) || rawPrev <= 0) return null;
        const { prevClose, changeValue, changePercent } = resolveConsistentChange(
          rawPrice,
          rawPrev,
          meta.regularMarketChangePercent,
          decimals,
          false
        );
        const price = isId ? Math.round(rawPrice) : Number(rawPrice.toFixed(2));
        const dayHighRaw = Number(meta.regularMarketDayHigh);
        const dayLowRaw = Number(meta.regularMarketDayLow);
        const dHigh = isId ? Math.round(dayHighRaw) : Number(dayHighRaw.toFixed(2));
        const dLow = isId ? Math.round(dayLowRaw) : Number(dayLowRaw.toFixed(2));
        const vol = Number(meta.regularMarketVolume ?? 0);
        const closes = (item?.indicators?.quote?.[0]?.close ?? []).filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v)
        );
        const spark = closes.length >= 2 ? samplePoints([...closes.slice(0, -1), price], 12) : [];
        const cleanSym = ySym.replace(/\.JK$/i, '');

        return {
          symbol: cleanSym,
          name: String(meta.shortName || meta.longName || cleanSym).slice(0, 42),
          market,
          exchange: isId ? 'IDX · Jakarta' : String(meta.fullExchangeName || meta.exchangeName || 'NASDAQ/NYSE'),
          currency: isId ? 'IDR' : 'USD',
          price,
          prevClose,
          changeValue,
          changePercent,
          dayHigh: dHigh,
          dayLow: dLow,
          volume: formatVolume(vol),
          volumeRaw: Number.isFinite(vol) ? vol : 0,
          marketState: getServerSessionInfo(ySym).stateLabel,
          sparklinePoints: spark,
          dollarTurnover: price * Math.max(1, vol),
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is InternalMover => r !== null);
}

async function fetchTradingViewIdxByTickers(
  tickers: string[]
): Promise<Map<string, InternalMover>> {
  const map = new Map<string, InternalMover>();
  if (tickers.length === 0) return map;
  try {
    const tvTickers = tickers.map((s) => `IDX:${s.replace(/\.JK$/i, '').toUpperCase()}`);
    const res = await fetch('https://scanner.tradingview.com/indonesia/scan', {
      method: 'POST',
      headers: {
        ...UA_HEADERS,
        'Content-Type': 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
      body: JSON.stringify({
        symbols: { tickers: tvTickers, query: { types: [] } },
        columns: [
          'name',
          'description',
          'close',
          'change',
          'change_abs',
          'high',
          'low',
          'volume',
          'Value.Traded',
          'exchange',
        ],
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return map;
    const json = (await res.json()) as {
      data?: Array<{ s?: string; d?: Array<string | number | null> }>;
    };
    for (const row of json.data ?? []) {
      const d = row.d;
      if (!d || d.length < 8) continue;
      const symbol = String(d[0] || '').trim().toUpperCase();
      const close = Number(d[2]);
      const changePct = Number(d[3]);
      const changeAbs = Number(d[4]);
      const high = Number(d[5] ?? close);
      const low = Number(d[6] ?? close);
      const vol = Number(d[7] ?? 0);
      const valTraded = Number(d[8] ?? close * vol);
      if (!symbol || !Number.isFinite(close) || close <= 0) continue;
      const price = Math.round(close);
      const prevClose = Math.max(1, Math.round(close - changeAbs));
      const dHigh = Math.round(high);
      const dLow = Math.round(low);
      map.set(symbol, {
        symbol,
        name: String(d[1] || symbol).replace(/\s+Tbk\.?$/i, ' Tbk').slice(0, 42),
        market: 'ID',
        exchange: 'IDX · Jakarta',
        currency: 'IDR',
        price,
        prevClose,
        changeValue: Math.round(changeAbs),
        changePercent: Number((Number.isFinite(changePct) ? changePct : 0).toFixed(2)),
        dayHigh: dHigh,
        dayLow: dLow,
        volume: formatVolume(vol),
        volumeRaw: Number.isFinite(vol) ? vol : 0,
        marketState: getServerSessionInfo(`${symbol}.JK`).stateLabel,
        sparklinePoints: [],
        dollarTurnover: Number.isFinite(valTraded) ? valTraded : price * vol,
      });
    }
  } catch {
    // ignore
  }
  return map;
}

async function fetchYahooScreenerStocks(scrId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${encodeURIComponent(
      scrId
    )}&count=25`;
    const res = await fetch(url, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      finance?: {
        result?: Array<{
          quotes?: Array<Record<string, unknown>>;
        }>;
      };
    };
    return json.finance?.result?.[0]?.quotes ?? [];
  } catch {
    return [];
  }
}

async function enrichSparklinesForMovers(movers: StockMover[]): Promise<StockMover[]> {
  const uniqueMap = new Map<string, StockMover>();
  for (const m of movers) {
    // Skip if Yahoo basket already supplied multi-point sparkline (>= 6 points)
    if (m.sparklinePoints.length >= 6) continue;
    const ySym = m.market === 'ID' ? `${m.symbol}.JK` : m.symbol;
    if (!uniqueMap.has(ySym) && uniqueMap.size < 32) {
      uniqueMap.set(ySym, m);
    }
  }

  const seriesMap = new Map<string, number[]>();
  await Promise.all(
    Array.from(uniqueMap.entries()).map(async ([ySym, item]) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            ySym
          )}?range=1d&interval=30m`,
          { headers: UA_HEADERS, signal: AbortSignal.timeout(2600) }
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          chart?: {
            result?: Array<{
              indicators?: { quote?: Array<{ close?: Array<number | null> }> };
            }>;
          };
        };
        const closes = (json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v)
        );
        if (closes.length >= 2) {
          seriesMap.set(ySym, samplePoints([...closes.slice(0, -1), item.price], 12));
        }
      } catch {
        // retain existing sparkline
      }
    })
  );

  return movers.map((m) => {
    const ySym = m.market === 'ID' ? `${m.symbol}.JK` : m.symbol;
    const pts = seriesMap.get(ySym);
    return pts ? { ...m, sparklinePoints: pts } : m;
  });
}

function parseYahooQuotesToMovers(quotes: Array<Record<string, unknown>>): InternalMover[] {
  const out: InternalMover[] = [];
  for (const q of quotes) {
    const symbol = String(q.symbol || '').trim().toUpperCase();
    if (!symbol || symbol.includes('=') || symbol.includes('^') || symbol.includes('.') || symbol.length > 6) {
      continue;
    }
    const price = Number(q.regularMarketPrice);
    const prevClose = Number(q.regularMarketPreviousClose);
    const changePercent = Number(q.regularMarketChangePercent);
    if (!Number.isFinite(prevClose) || prevClose <= 0) continue;
    const changeValue = Number(q.regularMarketChange ?? price - prevClose);
    const volumeRaw = Number(q.regularMarketVolume ?? 0);
    if (!Number.isFinite(price) || price < 2 || !Number.isFinite(changePercent) || volumeRaw < 250_000) {
      continue;
    }
    const dayHigh = Number(q.regularMarketDayHigh);
    const dayLow = Number(q.regularMarketDayLow);
    const name = String(q.shortName || q.longName || symbol).slice(0, 42);
    const exchange = String(q.fullExchangeName || q.exchange || 'NASDAQ/NYSE');

    out.push({
      symbol,
      name,
      market: 'US',
      exchange,
      currency: 'USD',
      price: Number(price.toFixed(2)),
      prevClose: Number(prevClose.toFixed(2)),
      changeValue: Number(changeValue.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      dayHigh: Number(dayHigh.toFixed(2)),
      dayLow: Number(dayLow.toFixed(2)),
      volume: formatVolume(volumeRaw),
      volumeRaw,
      marketState: String(q.marketState || 'POST'),
      sparklinePoints: [],
      dollarTurnover: price * volumeRaw,
    });
  }
  return out;
}

interface ParsedForeignEntry {
  symbol: string;
  companyName: string;
  amountIdr: number;
  side: 'BUY' | 'SELL';
  sourceLabel: string;
}

function parseIndonesianUnitMultiplier(unitRaw: string): number {
  const u = unitRaw.toLowerCase();
  if (u.includes('triliun')) return 1e12;
  if (u.includes('miliar') || u === 'm') return 1e9;
  if (u.includes('juta')) return 1e6;
  return 1e9;
}

function parseForeignListFromArticleHtml(
  html: string,
  expectedSide: 'BUY' | 'SELL',
  sourceLabel: string
): ParsedForeignEntry[] {
  const cleanText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  const pattern =
    /((?:PT\.?\s+)?[A-Za-z0-9.,&'()\-\s]{3,80}?)\s*\(([A-Z]{4})\)\s*[:\-]\s*(-?)Rp\.?\s*([0-9.,]+)\s*(triliun|miliar|juta|M)/gi;

  const entries: ParsedForeignEntry[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(cleanText)) !== null) {
    const rawCompany = match[1].replace(/^.*?:\s*/, '').trim();
    const symbol = match[2].toUpperCase();
    const hasMinus = match[3] === '-';
    const numStr = match[4].replace(/\./g, '').replace(',', '.');
    const numVal = parseFloat(numStr);
    const mult = parseIndonesianUnitMultiplier(match[5]);
    if (!symbol || !Number.isFinite(numVal) || numVal <= 0 || seen.has(symbol)) continue;

    seen.add(symbol);
    const magIdr = numVal * mult;
    const signedAmount = expectedSide === 'SELL' || hasMinus ? -Math.abs(magIdr) : Math.abs(magIdr);

    entries.push({
      symbol,
      companyName: rawCompany.slice(0, 42),
      amountIdr: signedAmount,
      side: expectedSide,
      sourceLabel,
    });
    if (entries.length >= 10) break;
  }
  return entries;
}

async function fetchIdxForeignFlowLists(): Promise<{
  foreignBuy: StockMover[];
  foreignSell: StockMover[];
}> {
  const candidateBuyUrls: { url: string; label: string }[] = [];
  const candidateSellUrls: { url: string; label: string }[] = [];

  try {
    const [rssHtml, tagHtml, tagBuyHtml] = await Promise.all([
      fetch('https://www.cnbcindonesia.com/market/rss', {
        headers: UA_HEADERS,
        signal: AbortSignal.timeout(6000),
      })
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => ''),
      fetch('https://www.cnbcindonesia.com/tag/investor-asing', {
        headers: UA_HEADERS,
        signal: AbortSignal.timeout(6000),
      })
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => ''),
      fetch('https://www.cnbcindonesia.com/tag/net-foreign-buy', {
        headers: UA_HEADERS,
        signal: AbortSignal.timeout(6000),
      })
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => ''),
    ]);

    const seenUrls = new Set<string>();
    const addCandidate = (url: string, titleHint: string) => {
      const clean = url.trim();
      if (!clean || seenUrls.has(clean)) return;
      seenUrls.add(clean);
      const lower = `${clean} ${titleHint}`.toLowerCase();
      const sessionHint = lower.includes('sesi-i') || lower.includes('sesi i')
        ? 'IDX Session I'
        : 'IDX Foreign Flow';
      if (/(borong|beli|serbu|net-foreign-buy|diminati).*10|10-saham-ini.*(borong|sesi|loyo)/i.test(lower) && !/lepas|keluar|jual|buang/i.test(lower)) {
        candidateBuyUrls.push({ url: clean, label: sessionHint });
      } else if (/(lepas|keluar|jual|buang|net-foreign-sell).*10|10-saham-ini.*(lepas|keluar|jual)/i.test(lower)) {
        candidateSellUrls.push({ url: clean, label: sessionHint });
      }
    };

    for (const itemMatch of rssHtml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = itemMatch[1];
      const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      if (/asing/i.test(title) && /10 saham/i.test(title)) {
        addCandidate(link, title);
      }
    }

    for (const htmlChunk of [tagHtml, tagBuyHtml]) {
      const links = htmlChunk.match(/https:\/\/www\.cnbcindonesia\.com\/market\/[0-9\-]+\/[a-z0-9\-]+/gi) ?? [];
      for (const link of links) {
        addCandidate(link, link);
      }
    }
  } catch {
    // ignore discovery error
  }

  let buyEntries: ParsedForeignEntry[] = [];
  let sellEntries: ParsedForeignEntry[] = [];

  for (const cand of candidateBuyUrls.slice(0, 4)) {
    try {
      const html = await fetch(cand.url, { headers: UA_HEADERS, signal: AbortSignal.timeout(5500) }).then((r) =>
        r.ok ? r.text() : ''
      );
      const parsed = parseForeignListFromArticleHtml(html, 'BUY', cand.label);
      if (parsed.length >= 3) {
        buyEntries = parsed;
        break;
      }
    } catch {
      // try next candidate
    }
  }

  for (const cand of candidateSellUrls.slice(0, 4)) {
    try {
      const html = await fetch(cand.url, { headers: UA_HEADERS, signal: AbortSignal.timeout(5500) }).then((r) =>
        r.ok ? r.text() : ''
      );
      const parsed = parseForeignListFromArticleHtml(html, 'SELL', cand.label);
      if (parsed.length >= 3) {
        sellEntries = parsed;
        break;
      }
    } catch {
      // try next candidate
    }
  }

  const allTickers = Array.from(
    new Set([...buyEntries.map((e) => e.symbol), ...sellEntries.map((e) => e.symbol)])
  );
  const tvQuotes = await fetchTradingViewIdxByTickers(allTickers);

  const mapEntryToMover = (entry: ParsedForeignEntry): StockMover => {
    const q = tvQuotes.get(entry.symbol);
    const price = q?.price ?? 0;
    const prevClose = q?.prevClose ?? price;
    return {
      symbol: entry.symbol,
      name: q?.name || entry.companyName,
      market: 'ID',
      exchange: 'IDX · Jakarta',
      currency: 'IDR',
      price,
      prevClose,
      changeValue: q?.changeValue ?? 0,
      changePercent: q?.changePercent ?? 0,
      dayHigh: q?.dayHigh ?? price,
      dayLow: q?.dayLow ?? price,
      volume: q?.volume ?? '—',
      volumeRaw: q?.volumeRaw ?? 0,
      marketState: q?.marketState ?? getServerSessionInfo(`${entry.symbol}.JK`).stateLabel,
      sparklinePoints: q?.sparklinePoints ?? [],
      foreignNetAmount: entry.amountIdr,
      foreignNetLabel: formatIdrFlowLabel(entry.amountIdr),
      foreignFlowSide: entry.side,
      foreignSourceLabel: entry.sourceLabel,
    };
  };

  const rawBuy = buyEntries.map(mapEntryToMover).slice(0, 10);
  const rawSell = sellEntries.map(mapEntryToMover).slice(0, 10);

  const enrichedAll = await enrichSparklinesForMovers([...rawBuy, ...rawSell]);
  return {
    foreignBuy: enrichedAll.slice(0, rawBuy.length),
    foreignSell: enrichedAll.slice(rawBuy.length),
  };
}

// Track latest IDX daily net foreign flow map for cross-module Bandarmology fusion
const latestIdxForeignFlowMap = new Map<string, number>();
const idxBandarmologyCache = new Map<
  string,
  { data: BandarmologyAnalysis; expiresAt: number }
>();

function computeIdxBandarmologyFromBars(params: {
  symbol: string;
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  opens: number[];
  currentPrice?: number;
  prevClose?: number;
  foreignNetAmount?: number;
}): BandarmologyAnalysis {
  const {
    closes,
    highs,
    lows,
    volumes,
    opens,
    currentPrice,
    prevClose,
    foreignNetAmount,
  } = params;

  const n = Math.min(closes.length, highs.length, lows.length, volumes.length);
  if (n === 0) {
    return {
      phase: 'Neutral',
      score: 0,
      volumeRatio: 1,
      accumulationPressure: 50,
      foreignBias:
        typeof foreignNetAmount === 'number'
          ? foreignNetAmount > 0
            ? 'Net Buy'
            : foreignNetAmount < 0
              ? 'Net Sell'
              : 'Balanced'
          : 'Balanced',
      summary: 'Awaiting multi-session OHLCV turnover bars for smart-money flow.',
    };
  }

  let totalVol = 0;
  let cmfNumerator = 0;
  let recent5Vol = 0;
  let recent5CmfNum = 0;
  let priorVol = 0;
  let priorCmfNum = 0;
  const split5 = Math.max(0, n - 5);

  for (let i = 0; i < n; i++) {
    const c = closes[i];
    const h = Math.max(highs[i], c);
    const l = Math.min(lows[i], c);
    const v = Math.max(0, volumes[i]);
    const hlSpan = Math.max(1e-6, h - l);
    const clv = ((c - l) - (h - c)) / hlSpan;
    const mfVol = clv * v;
    totalVol += v;
    cmfNumerator += mfVol;
    if (i >= split5) {
      recent5Vol += v;
      recent5CmfNum += mfVol;
    } else {
      priorVol += v;
      priorCmfNum += mfVol;
    }
  }

  const cmf20 = totalVol > 0 ? cmfNumerator / totalVol : 0; // -1 .. +1
  const cmf5 = recent5Vol > 0 ? recent5CmfNum / recent5Vol : cmf20;
  const cmfPrior = priorVol > 0 ? priorCmfNum / priorVol : cmf20;
  const cmfAccel = cmf5 - cmfPrior;

  const avgVol20 = n > 1 ? volumes.slice(0, n - 1).reduce((s, v) => s + v, 0) / (n - 1) : volumes[0] || 1;
  const lastVol = volumes[n - 1] || avgVol20;
  const volumeRatio = avgVol20 > 0 ? Number(Math.max(0.2, Math.min(6, lastVol / avgVol20)).toFixed(2)) : 1;

  // Last bar close strength & spread absorption
  const lastClose = currentPrice && currentPrice > 0 ? currentPrice : closes[n - 1];
  const lastOpen = opens[n - 1] ?? prevClose ?? lastClose;
  const lastHigh = Math.max(highs[n - 1] ?? lastClose, lastClose, lastOpen);
  const lastLow = Math.min(lows[n - 1] ?? lastClose, lastClose, lastOpen);
  const lastClv = ((lastClose - lastLow) - (lastHigh - lastClose)) / Math.max(1e-6, lastHigh - lastLow);
  const dayChgPct =
    prevClose && prevClose > 0
      ? ((lastClose - prevClose) / prevClose) * 100
      : n >= 2 && closes[n - 2] > 0
        ? ((lastClose - closes[n - 2]) / closes[n - 2]) * 100
        : 0;

  // Absorption: high volume with tight negative/flat price OR clean positive CLV acceleration
  const volBoost = Math.min(1.65, Math.max(0.65, 0.75 + (volumeRatio - 0.85) * 0.48));

  const cmfComponent = cmf20 * 52;
  const accelComponent = cmfAccel * 38 * volBoost;
  const priceVolumeComponent =
    (lastClv * 18 + Math.max(-1.5, Math.min(1.5, dayChgPct / 2.2)) * 12) * volBoost;

  const netFlow = typeof foreignNetAmount === 'number' ? foreignNetAmount : undefined;
  let foreignComponent = 0;
  let foreignBias: BandarmologyAnalysis['foreignBias'] = 'Balanced';
  if (typeof netFlow === 'number' && Math.abs(netFlow) > 100_000_000) {
    if (netFlow > 0) {
      foreignBias = 'Net Buy';
      foreignComponent = Math.min(26, 10 + Math.log10(Math.max(1, netFlow / 1e9)) * 7);
    } else {
      foreignBias = 'Net Sell';
      foreignComponent = -Math.min(26, 10 + Math.log10(Math.max(1, Math.abs(netFlow) / 1e9)) * 7);
    }
  } else if (cmf5 >= 0.14 && volumeRatio >= 1.15) {
    foreignBias = 'Net Buy';
  } else if (cmf5 <= -0.14 && volumeRatio >= 1.15) {
    foreignBias = 'Net Sell';
  }

  const rawScore = cmfComponent + accelComponent + priceVolumeComponent + foreignComponent;
  const score = Math.round(Math.max(-100, Math.min(100, rawScore)));
  const accumulationPressure = Math.round(Math.max(4, Math.min(96, 50 + cmf20 * 35 + cmf5 * 22)));

  let phase: BandarmologyPhase = 'Neutral';
  if (score >= 34 && (cmf20 >= 0.08 || foreignComponent >= 14 || (volumeRatio >= 1.25 && score >= 36))) {
    phase = 'Strong Accumulation';
  } else if (score >= 10 || (cmfAccel >= 0.08 && lastClv >= 0.1 && volumeRatio >= 1.0)) {
    phase = 'Early Accumulation';
  } else if (score <= -34 && (cmf20 <= -0.08 || foreignComponent <= -14 || (volumeRatio >= 1.25 && score <= -36))) {
    phase = 'Strong Distribution';
  } else if (score <= -10 || (cmfAccel <= -0.08 && lastClv <= -0.1 && volumeRatio >= 1.0)) {
    phase = 'Early Distribution';
  }

  const biasText =
    foreignBias === 'Balanced' ? 'Domestic flow balanced' : `Foreign ${foreignBias}`;
  const summary = `${phase} · ${volumeRatio.toFixed(2)}x 20D vol, CMF ${(cmf20 * 100).toFixed(0)}%, ${biasText}.`;

  return {
    phase,
    score,
    volumeRatio,
    accumulationPressure,
    foreignBias,
    summary,
  };
}

async function fetchIdxBandarmologyMap(
  idxTickerList: Array<{
    symbol: string;
    price?: number;
    prevClose?: number;
    foreignNetAmount?: number;
  }>
): Promise<Map<string, BandarmologyAnalysis>> {
  const out = new Map<string, BandarmologyAnalysis>();
  const now = Date.now();
  const idxOpen = getServerSessionInfo('BBCA.JK', new Date(now)).isOpen;
  const ttl = idxOpen ? 90_000 : 600_000;

  const uniqueMap = new Map<
    string,
    { symbol: string; yahooSymbol: string; price?: number; prevClose?: number; foreignNetAmount?: number }
  >();
  for (const item of idxTickerList) {
    const clean = item.symbol.trim().toUpperCase().replace(/\.JK$/i, '');
    if (!clean) continue;
    const cached = idxBandarmologyCache.get(clean);
    if (cached && cached.expiresAt > now) {
      out.set(clean, cached.data);
      continue;
    }
    if (!uniqueMap.has(clean)) {
      uniqueMap.set(clean, {
        symbol: clean,
        yahooSymbol: `${clean}.JK`,
        price: item.price,
        prevClose: item.prevClose,
        foreignNetAmount: item.foreignNetAmount ?? latestIdxForeignFlowMap.get(clean),
      });
    }
  }

  const queue = Array.from(uniqueMap.values()).slice(0, 36);
  const concurrency = 6;
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const target = queue[cursor++];
      try {
        const json = await fetchYahooChartJson(target.yahooSymbol, '1mo', '1d', 5000);
        const item = json?.chart?.result?.[0];
        const q = item?.indicators?.quote?.[0];
        const rawC = q?.close ?? [];
        const rawH = q?.high ?? [];
        const rawL = q?.low ?? [];
        const rawO = q?.open ?? [];
        const rawV = q?.volume ?? [];

        const closes: number[] = [];
        const highs: number[] = [];
        const lows: number[] = [];
        const opens: number[] = [];
        const volumes: number[] = [];

        for (let i = 0; i < rawC.length; i++) {
          const c = rawC[i];
          if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
            closes.push(c);
            highs.push(typeof rawH[i] === 'number' && Number.isFinite(rawH[i]!) ? rawH[i]! : c);
            lows.push(typeof rawL[i] === 'number' && Number.isFinite(rawL[i]!) ? rawL[i]! : c);
            opens.push(typeof rawO[i] === 'number' && Number.isFinite(rawO[i]!) ? rawO[i]! : c);
            volumes.push(typeof rawV[i] === 'number' && Number.isFinite(rawV[i]!) ? rawV[i]! : 0);
          }
        }

        const analysis = computeIdxBandarmologyFromBars({
          symbol: target.symbol,
          closes,
          highs,
          lows,
          volumes,
          opens,
          currentPrice: target.price,
          prevClose: target.prevClose,
          foreignNetAmount: target.foreignNetAmount,
        });

        out.set(target.symbol, analysis);
        idxBandarmologyCache.set(target.symbol, {
          data: analysis,
          expiresAt: Date.now() + ttl,
        });
      } catch {
        // fallback handled if needed
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, () => worker())
  );
  return out;
}

function computeIndexImpactScore(item: InternalMover, region: 'US' | 'ID'): number {
  // Cap-weighted index contribution formula: MarketCap^0.68 * (|chg%| + 0.35) * CoreIndexWeight * RVOL
  const mcapScale = region === 'ID' ? 1e13 : 1e11;
  const mcap = Number(item.marketCap ?? 0);
  const capWeight = Number.isFinite(mcap) && mcap > 0 ? Math.pow(mcap / mcapScale, 0.68) : 1;
  const absMove = Math.min(12, Math.abs(item.changePercent)) + 0.35;

  const minTurn = region === 'ID' ? 1e10 : 5e7;
  const turnFactor = 1 + Math.max(0, Math.log10(Math.max(minTurn, item.dollarTurnover) / minTurn)) * 0.25;
  const rvolBoost = Math.max(0.85, Math.min(1.45, item.relativeVolume ?? 1));
  const coreSet = region === 'ID' ? IDX_INDEX_CORE_CONSTITUENTS : US_INDEX_CORE_CONSTITUENTS;
  const constituentBoost = coreSet.has(item.symbol) ? 1.25 : 0.72;

  return capWeight * absMove * turnFactor * rvolBoost * constituentBoost;
}

export async function fetchTopStockMovers(): Promise<StocksMoversResponse> {
  const now = Date.now();
  if (stocksMoversCache.entry) {
    if (stocksMoversCache.entry.expiresAt > now) {
      return stocksMoversCache.entry.data;
    }
    if (now - stocksMoversCache.entry.expiresAt < 900_000) {
      void fetchTopStockMoversFresh().catch(() => null);
      return stocksMoversCache.entry.data;
    }
  }
  return fetchTopStockMoversFresh();
}

async function fetchTopStockMoversFresh(): Promise<StocksMoversResponse> {
  const now = Date.now();
  const moversStart = Date.now();
  return coalesceInFlight('stock-movers', stocksMoversCache.entry?.data, async () => {

  const [
    yActives,
    yGainers,
    yLosers,
    tvUsImpact,
    tvUsMegaCap,
    tvUsGainers,
    tvUsLosers,
    tvIdxImpact,
    tvIdxBlueChip,
    tvIdxGainersLiquid,
    tvIdxLosersLiquid,
    foreignFlows,
  ] = await Promise.all([
    fetchYahooScreenerStocks('most_actives'),
    fetchYahooScreenerStocks('day_gainers'),
    fetchYahooScreenerStocks('day_losers'),
    fetchTradingViewScan(
      'america',
      'Value.Traded',
      'desc',
      [
        { left: 'market_cap_basic', operation: 'greater', right: 30_000_000_000 },
        { left: 'Value.Traded', operation: 'greater', right: 150_000_000 },
      ],
      35
    ),
    fetchTradingViewScan(
      'america',
      'market_cap_basic',
      'desc',
      [{ left: 'Value.Traded', operation: 'greater', right: 100_000_000 }],
      35
    ),
    fetchTradingViewScan(
      'america',
      'change',
      'desc',
      [
        { left: 'market_cap_basic', operation: 'greater', right: 10_000_000_000 },
        { left: 'Value.Traded', operation: 'greater', right: 50_000_000 },
      ],
      25
    ),
    fetchTradingViewScan(
      'america',
      'change',
      'asc',
      [
        { left: 'market_cap_basic', operation: 'greater', right: 10_000_000_000 },
        { left: 'Value.Traded', operation: 'greater', right: 50_000_000 },
      ],
      25
    ),
    fetchTradingViewScan(
      'indonesia',
      'Value.Traded',
      'desc',
      [
        { left: 'market_cap_basic', operation: 'greater', right: 15_000_000_000_000 },
        { left: 'Value.Traded', operation: 'greater', right: 15_000_000_000 },
      ],
      35
    ),
    fetchTradingViewScan(
      'indonesia',
      'market_cap_basic',
      'desc',
      [{ left: 'Value.Traded', operation: 'greater', right: 10_000_000_000 }],
      35
    ),
    fetchTradingViewScan(
      'indonesia',
      'change',
      'desc',
      [
        { left: 'market_cap_basic', operation: 'greater', right: 5_000_000_000_000 },
        { left: 'Value.Traded', operation: 'greater', right: 8_000_000_000 },
        { left: 'close', operation: 'greater', right: 100 },
      ],
      25
    ),
    fetchTradingViewScan(
      'indonesia',
      'change',
      'asc',
      [
        { left: 'market_cap_basic', operation: 'greater', right: 5_000_000_000_000 },
        { left: 'Value.Traded', operation: 'greater', right: 8_000_000_000 },
        { left: 'close', operation: 'greater', right: 100 },
      ],
      25
    ),
    fetchIdxForeignFlowLists(),
  ]);

  const combinedTvIdxCount =
    tvIdxImpact.length +
    tvIdxBlueChip.length +
    tvIdxGainersLiquid.length +
    tvIdxLosersLiquid.length;

  // Parallel direct Yahoo Finance fallback if TradingView returned thin/empty results
  const [yahooUsFallback, yahooIdxFallback] = await Promise.all([
    tvUsImpact.length + tvUsMegaCap.length < 12 ? fetchYahooDirectBasket('US') : Promise.resolve([]),
    combinedTvIdxCount < 14 ? fetchYahooDirectBasket('ID') : Promise.resolve([]),
  ]);

  // 1. Build guaranteed 10-stock US buckets (Index Impact, Gainers, Losers)
  const usPoolMap = new Map<string, InternalMover>();
  for (const item of [
    ...tvUsMegaCap,
    ...tvUsImpact,
    ...tvUsGainers,
    ...tvUsLosers,
    ...yahooUsFallback,
    ...parseYahooQuotesToMovers([...yActives, ...yGainers, ...yLosers]),
  ]) {
    if (NON_INDEX_EXCLUSION_SYMBOLS.has(item.symbol)) continue;
    const existing = usPoolMap.get(item.symbol);
    if (!existing) {
      usPoolMap.set(item.symbol, item);
    } else if (!existing.marketCap && item.marketCap) {
      usPoolMap.set(item.symbol, { ...existing, marketCap: item.marketCap, relativeVolume: item.relativeVolume ?? existing.relativeVolume });
    }
  }
  const usPool = Array.from(usPoolMap.values());

  const usIndexHeavyweights = usPool.filter(
    (s) => ((s.marketCap ?? 0) >= 25_000_000_000 || US_INDEX_CORE_CONSTITUENTS.has(s.symbol)) && s.dollarTurnover >= 80_000_000
  );
  const usImpactBase = usIndexHeavyweights.length >= 10 ? usIndexHeavyweights : usPool;
  const usImpactRaw = [...usImpactBase]
    .sort((a, b) => computeIndexImpactScore(b, 'US') - computeIndexImpactScore(a, 'US'))
    .slice(0, 10);

  const usLiquidIndexMovers = usPool.filter(
    (s) => ((s.marketCap ?? 0) >= 10_000_000_000 || US_INDEX_CORE_CONSTITUENTS.has(s.symbol)) && s.dollarTurnover >= 40_000_000 && s.price >= 5
  );
  const usMoverPool = usLiquidIndexMovers.length >= 14 ? usLiquidIndexMovers : usPool;

  const usGainersList = usMoverPool
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent);
  const usGainersRaw = (
    usGainersList.length >= 10
      ? usGainersList
      : [...usPool].sort((a, b) => b.changePercent - a.changePercent)
  ).slice(0, 10);

  const usLosersList = usMoverPool
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent);
  const usLosersRaw = (
    usLosersList.length >= 10
      ? usLosersList
      : [...usPool].sort((a, b) => a.changePercent - b.changePercent)
  ).slice(0, 10);

  // 2. Build guaranteed 10-stock IDX buckets (Index Impact, Gainers, Losers)
  const idxPoolMap = new Map<string, InternalMover>();
  for (const item of [
    ...tvIdxBlueChip,
    ...tvIdxImpact,
    ...tvIdxGainersLiquid,
    ...tvIdxLosersLiquid,
    ...yahooIdxFallback,
  ]) {
    const existing = idxPoolMap.get(item.symbol);
    if (!existing) {
      idxPoolMap.set(item.symbol, item);
    } else if (!existing.marketCap && item.marketCap) {
      idxPoolMap.set(item.symbol, { ...existing, marketCap: item.marketCap, relativeVolume: item.relativeVolume ?? existing.relativeVolume });
    }
  }
  const idxPool = Array.from(idxPoolMap.values());

  const idxIndexHeavyweights = idxPool.filter(
    (s) => ((s.marketCap ?? 0) >= 15_000_000_000_000 || IDX_INDEX_CORE_CONSTITUENTS.has(s.symbol)) && s.dollarTurnover >= 12_000_000_000 && s.price >= 100
  );
  const idxLiquidFallback = idxPool.filter((s) => s.dollarTurnover >= 8_000_000_000 && s.price >= 100);
  const idxImpactBase =
    idxIndexHeavyweights.length >= 10
      ? idxIndexHeavyweights
      : idxLiquidFallback.length >= 10
        ? idxLiquidFallback
        : idxPool;
  const idxImpactRaw = [...idxImpactBase]
    .sort((a, b) => computeIndexImpactScore(b, 'ID') - computeIndexImpactScore(a, 'ID'))
    .slice(0, 10);

  const idxMoverBase =
    idxPool.filter((s) => ((s.marketCap ?? 0) >= 5_000_000_000_000 || IDX_INDEX_CORE_CONSTITUENTS.has(s.symbol)) && s.dollarTurnover >= 8_000_000_000 && s.price >= 100).length >= 14
      ? idxPool.filter((s) => ((s.marketCap ?? 0) >= 5_000_000_000_000 || IDX_INDEX_CORE_CONSTITUENTS.has(s.symbol)) && s.dollarTurnover >= 8_000_000_000 && s.price >= 100)
      : idxLiquidFallback.length >= 14
        ? idxLiquidFallback
        : idxPool;

  const idxGainersList = idxMoverBase
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent);
  const idxGainersRaw = (
    idxGainersList.length >= 10
      ? idxGainersList
      : [...idxPool].sort((a, b) => b.changePercent - a.changePercent)
  ).slice(0, 10);

  const idxLosersList = idxMoverBase
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent);
  const idxLosersRaw = (
    idxLosersList.length >= 10
      ? idxLosersList
      : [...idxPool].sort((a, b) => a.changePercent - b.changePercent)
  ).slice(0, 10);

  // Only report foreign-flow figures returned by the public source; never estimate them from turnover.
  const finalForeignBuy = foreignFlows.foreignBuy.slice(0, 10);
  const finalForeignSell = foreignFlows.foreignSell.slice(0, 10);

  for (const fb of finalForeignBuy) {
    if (typeof fb.foreignNetAmount === 'number') {
      latestIdxForeignFlowMap.set(fb.symbol, fb.foreignNetAmount);
    }
  }
  for (const fs of finalForeignSell) {
    if (typeof fs.foreignNetAmount === 'number') {
      latestIdxForeignFlowMap.set(fs.symbol, fs.foreignNetAmount);
    }
  }

  const stripInternal = ({
    dollarTurnover: _dt,
    marketCap: _mc,
    relativeVolume: _rv,
    ...rest
  }: InternalMover): StockMover => rest;

  const combinedMovers = [
    ...usImpactRaw.map(stripInternal),
    ...usGainersRaw.map(stripInternal),
    ...usLosersRaw.map(stripInternal),
    ...idxImpactRaw.map(stripInternal),
    ...idxGainersRaw.map(stripInternal),
    ...idxLosersRaw.map(stripInternal),
  ];

  const idxAllForBandar = [
    ...idxImpactRaw,
    ...idxGainersRaw,
    ...idxLosersRaw,
    ...finalForeignBuy,
    ...finalForeignSell,
  ].map((m) => ({
    symbol: m.symbol,
    price: m.price,
    prevClose: m.prevClose,
    foreignNetAmount: 'foreignNetAmount' in m ? m.foreignNetAmount : latestIdxForeignFlowMap.get(m.symbol),
  }));

  const [enriched, bandarMap] = await Promise.all([
    enrichSparklinesForMovers(combinedMovers),
    fetchIdxBandarmologyMap(idxAllForBandar),
  ]);

  const attachBandar = (m: StockMover): StockMover =>
    m.market === 'ID' && bandarMap.has(m.symbol)
      ? { ...m, bandarmology: bandarMap.get(m.symbol) }
      : m;

  const u0 = usImpactRaw.length;
  const u1 = u0 + usGainersRaw.length;
  const u2 = u1 + usLosersRaw.length;
  const i0 = u2 + idxImpactRaw.length;
  const i1 = i0 + idxGainersRaw.length;

  const payload: StocksMoversResponse = {
    us: {
      impact: enriched.slice(0, u0),
      gainers: enriched.slice(u0, u1),
      losers: enriched.slice(u1, u2),
    },
    indonesia: {
      impact: enriched.slice(u2, i0).map(attachBandar),
      gainers: enriched.slice(i0, i1).map(attachBandar),
      losers: enriched.slice(i1).map(attachBandar),
      foreignBuy: finalForeignBuy.map(attachBandar),
      foreignSell: finalForeignSell.map(attachBandar),
    },
    updatedAt: new Date().toISOString(),
  };

  const usOpen = getServerSessionInfo('SPX', new Date(now)).isOpen;
  const idxOpen = getServerSessionInfo('IHSG', new Date(now)).isOpen;
  const moversTtl = usOpen || idxOpen ? 10_000 : 600_000;

  const moversLatency = Date.now() - moversStart;
  if (payload.us.impact.length >= 10 && payload.indonesia.impact.length >= 10) {
    stocksMoversCache.entry = { data: payload, expiresAt: now + moversTtl };
  }

  if (combinedTvIdxCount < 10 && yahooIdxFallback.length > 0) {
    updateProviderMetric('idx_proxy', {
      status: 'failover',
      activeSource: 'Yahoo .JK Basket Proxy',
      latencyMs: moversLatency,
      lastSuccessAt: Date.now(),
      isCachedFallback: false,
      fallbackReason: 'IDX TradingView scanner sparse; Yahoo .JK proxy active',
    });
  } else if (payload.indonesia.impact.length === 0 && stocksMoversCache.entry?.data) {
    updateProviderMetric('idx_proxy', {
      status: 'cached',
      activeSource: 'Cached IDX Movers Snapshot',
      latencyMs: moversLatency,
      isCachedFallback: true,
      fallbackReason: 'IDX upstream unavailable; serving cached movers',
    });
    return stocksMoversCache.entry.data;
  } else {
    updateProviderMetric('idx_proxy', {
      status: 'live',
      activeSource:
        yahooIdxFallback.length > 0
          ? 'IDX TV Scanner + Yahoo .JK'
          : 'IDX TV Scanner + Foreign Flow',
      latencyMs: moversLatency,
      lastSuccessAt: Date.now(),
      isCachedFallback: false,
      fallbackReason: undefined,
    });
  }
  return payload;
  });
}

// =========================================================================
// Portfolio Live Quotes (1s Open Session / Freeze Last Close), Multi-Chart & Search
// =========================================================================

export interface PortfolioQuoteResult {
  symbol: string;
  yahooSymbol: string;
  name: string;
  exchange: string;
  currency: 'USD' | 'IDR';
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  sessionOpen: boolean;
  sessionStateLabel: string;
  sessionProgressRatio: number;
  chart1D: number[];
  timestamps1D: number[];
  updatedAtEpoch: number;
  bandarmology?: BandarmologyAnalysis;
}

const portfolioQuoteCache = new Map<
  string,
  { data: PortfolioQuoteResult; expiresAt: number; wasOpen: boolean }
>();

export async function fetchPortfolioQuotes(
  yahooSymbols: string[]
): Promise<{ quotes: PortfolioQuoteResult[]; updatedAt: string }> {
  const uniqueSyms = Array.from(
    new Set(
      yahooSymbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0 && s.length <= 24 && /^[A-Z0-9.\-^=]+$/.test(s))
    )
  ).slice(0, 30);

  const now = Date.now();
  const nowDate = new Date(now);

  const results = await Promise.all(
    uniqueSyms.map(async (yahooSymbol): Promise<PortfolioQuoteResult | null> => {
      const sessionInfo = getServerSessionInfo(yahooSymbol, nowDate);
      const cached = portfolioQuoteCache.get(yahooSymbol);
      if (cached && cached.expiresAt > now && cached.wasOpen === sessionInfo.isOpen) {
        return cached.data;
      }

      try {
        const interval = sessionInfo.isOpen ? '5m' : '15m';
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          yahooSymbol
        )}?range=1d&interval=${interval}`;
        const res = await fetch(url, {
          headers: UA_HEADERS,
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) return cached?.data ?? null;

        const json = (await res.json()) as {
          chart?: {
            result?: Array<{
              meta?: Record<string, unknown>;
              timestamp?: number[];
              indicators?: {
                quote?: Array<{ close?: Array<number | null> }>;
              };
            }>;
          };
        };

        const item = json.chart?.result?.[0];
        const meta = item?.meta;
        if (!meta) return cached?.data ?? null;

        let price = Number(meta.regularMarketPrice);
        let rawPrev = Number(
          meta.regularMarketPreviousClose ?? meta.previousClose ?? meta.chartPreviousClose
        );
        if (!Number.isFinite(price) || price <= 0) return cached?.data ?? null;

        const isCrypto = yahooSymbol === 'BTC-USD' || yahooSymbol === 'ETH-USD';
        if (isCrypto) {
          const cb = await fetchCoinbaseSpotStats(yahooSymbol as 'BTC-USD' | 'ETH-USD');
          if (cb) {
            price = cb.price;
            rawPrev = cb.open24h;
          }
        }

        const isIdr =
          String(meta.currency || '').toUpperCase() === 'IDR' ||
          yahooSymbol.endsWith('.JK') ||
          yahooSymbol === '^JKSE' ||
          yahooSymbol === '^JKLQ45';
        if (!Number.isFinite(rawPrev) || rawPrev <= 0) return cached?.data ?? null;
        const currency: 'USD' | 'IDR' = isIdr ? 'IDR' : 'USD';
        const decimals = isIdr && yahooSymbol !== '^JKSE' && yahooSymbol !== '^JKLQ45' ? 0 : price < 2 ? 4 : 2;
        const { prevClose, changeValue, changePercent } = resolveConsistentChange(
          price,
          rawPrev,
          isCrypto ? ((price - rawPrev) / Math.max(1e-6, rawPrev)) * 100 : meta.regularMarketChangePercent,
          decimals,
          isCrypto
        );

        const rawCloses = item?.indicators?.quote?.[0]?.close ?? [];
        const rawTs = item?.timestamp ?? [];
        const validPairs: { t: number; v: number }[] = [];
        for (let i = 0; i < rawCloses.length; i++) {
          const val = rawCloses[i];
          const ts = rawTs[i];
          if (
            typeof val === 'number' && Number.isFinite(val) && val > 0 &&
            typeof ts === 'number' && Number.isFinite(ts) && ts > 0
          ) {
            validPairs.push({ t: ts * 1000, v: Number(val.toFixed(decimals)) });
          }
        }

        const dayHigh = Number(meta.regularMarketDayHigh);
        const dayLow = Number(meta.regularMarketDayLow);
        const cleanSym = yahooSymbol.replace(/\.JK$/i, '');
        const name = String(meta.shortName || meta.longName || cleanSym).slice(0, 60);
        const exchange = isIdr
          ? 'IDX'
          : String(meta.fullExchangeName || meta.exchangeName || 'Global');
        const updatedAtEpoch =
          Number.isFinite(Number(meta.regularMarketTime)) && Number(meta.regularMarketTime) > 0 ? Number(meta.regularMarketTime) * 1000 : Number.NaN;

        const result: PortfolioQuoteResult = {
          symbol: cleanSym,
          yahooSymbol,
          name,
          exchange,
          currency,
          price: Number(price.toFixed(decimals)),
          prevClose: Number(prevClose.toFixed(decimals)),
          changeValue,
          changePercent,
          dayHigh: Number(dayHigh.toFixed(decimals)),
          dayLow: Number(dayLow.toFixed(decimals)),
          sessionOpen: sessionInfo.isOpen,
          sessionStateLabel: sessionInfo.stateLabel,
          sessionProgressRatio: sessionInfo.progressRatio,
          chart1D: validPairs.map((p) => p.v),
          timestamps1D: validPairs.map((p) => p.t),
          updatedAtEpoch,
        };

        portfolioQuoteCache.set(yahooSymbol, {
          data: result,
          expiresAt: Date.now() + (sessionInfo.isOpen ? 900 : 600_000),
          wasOpen: sessionInfo.isOpen,
        });

        return result;
      } catch {
        return cached?.data ?? null;
      }
    })
  );

  const validQuotes = results.filter((r): r is PortfolioQuoteResult => r !== null);
  const idxPortfolioItems = validQuotes.filter(
    (q) => q.currency === 'IDR' && q.yahooSymbol.endsWith('.JK')
  );
  if (idxPortfolioItems.length > 0) {
    const bandarMap = await fetchIdxBandarmologyMap(
      idxPortfolioItems.map((q) => ({
        symbol: q.symbol,
        price: q.price,
        prevClose: q.prevClose,
        foreignNetAmount: latestIdxForeignFlowMap.get(q.symbol),
      }))
    );
    for (const q of validQuotes) {
      if (q.currency === 'IDR' && q.yahooSymbol.endsWith('.JK')) {
        const b = bandarMap.get(q.symbol);
        if (b) q.bandarmology = b;
      }
    }
  }

  return {
    quotes: validQuotes,
    updatedAt: new Date().toISOString(),
  };
}

const portfolioSeriesCache = new Map<
  string,
  CacheEntry<{ points: number[]; timestamps: number[]; candles: CandlePoint[]; prevClose: number }>
>();

export async function fetchPortfolioSymbolSeries(
  yahooSymbol: string,
  timeframe: string
): Promise<{ points: number[]; timestamps: number[]; candles: CandlePoint[]; prevClose: number } | null> {
  const sym = yahooSymbol.trim().toUpperCase();
  const key = `${sym}:${timeframe}`;
  const now = Date.now();
  const sessionInfo = getServerSessionInfo(sym, new Date(now));
  const cached = portfolioSeriesCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const rangeMap: Record<
    string,
    { range: string; interval: string; sliceTail?: number; aggregateEvery?: number }
  > = {
    '1m': { range: '1d', interval: '1m', sliceTail: 36 },
    '5m': { range: '1d', interval: '5m', sliceTail: 36 },
    '15m': { range: '5d', interval: '15m', sliceTail: 40 },
    '15M': { range: '5d', interval: '15m', sliceTail: 40 },
    '30m': { range: '5d', interval: '30m', sliceTail: 42 },
    '1h': { range: '1mo', interval: '60m', sliceTail: 42 },
    '1H': { range: '1mo', interval: '60m', sliceTail: 42 },
    '4h': { range: '1mo', interval: '60m', aggregateEvery: 4, sliceTail: 38 },
    '4H': { range: '1mo', interval: '60m', aggregateEvery: 4, sliceTail: 38 },
    '1D': { range: '1d', interval: sessionInfo.isOpen ? '5m' : '15m' },
    '5D': { range: '5d', interval: '30m' },
    '1W': { range: '5d', interval: '30m' },
    '1M': { range: '1mo', interval: '1d' },
    '3M': { range: '3mo', interval: '1d' },
    '6M': { range: '6mo', interval: '1d' },
    YTD: { range: 'ytd', interval: '1d' },
    '1Y': { range: '1y', interval: '1wk' },
    '5Y': { range: '5y', interval: '1mo' },
    ALL: { range: '5y', interval: '1mo' },
    MAX: { range: '5y', interval: '1mo' },
  };
  const params = rangeMap[timeframe] ?? rangeMap['1D'];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      sym
    )}?range=${params.range}&interval=${params.interval}`;
    const res = await fetch(url, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return cached?.data ?? null;

    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: Record<string, unknown>;
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
              close?: Array<number | null>;
            }>;
          };
        }>;
      };
    };

    const item = json.chart?.result?.[0];
    const quoteObj = item?.indicators?.quote?.[0];
    const rawCloses = quoteObj?.close ?? [];
    const rawOpens = quoteObj?.open ?? [];
    const rawHighs = quoteObj?.high ?? [];
    const rawLows = quoteObj?.low ?? [];
    const rawTs = item?.timestamp ?? [];
    let points: number[] = [];
    let timestamps: number[] = [];
    let candles: CandlePoint[] = [];

    for (let i = 0; i < rawCloses.length; i++) {
      const val = rawCloses[i];
      const ts = rawTs[i];
      if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) continue;
      if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) continue;
      const tsMs = ts * 1000;
      points.push(val);
      timestamps.push(tsMs);
      const rawO = rawOpens[i];
      const rawH = rawHighs[i];
      const rawL = rawLows[i];
      if (
        typeof rawO === 'number' && Number.isFinite(rawO) && rawO > 0 &&
        typeof rawH === 'number' && Number.isFinite(rawH) && rawH > 0 &&
        typeof rawL === 'number' && Number.isFinite(rawL) && rawL > 0 &&
        rawH >= Math.max(rawO, rawL, val) && rawL <= Math.min(rawO, rawH, val)
      ) {
        candles.push({ t: tsMs, o: rawO, h: rawH, l: rawL, c: val });
      }
    }
    if (candles.length !== points.length) candles = [];
    if (points.length === 0) return cached?.data ?? null;

    if (params.aggregateEvery && params.aggregateEvery > 1 && candles.length === points.length && candles.length >= params.aggregateEvery) {
      const aggCandles: CandlePoint[] = [];
      const step = params.aggregateEvery;
      for (let i = 0; i < candles.length; i += step) {
        const chunk = candles.slice(i, i + step);
        if (chunk.length === 0) continue;
        aggCandles.push({
          t: chunk[chunk.length - 1].t,
          o: chunk[0].o,
          h: Math.max(...chunk.map((x) => x.h)),
          l: Math.min(...chunk.map((x) => x.l)),
          c: chunk[chunk.length - 1].c,
        });
      }
      candles = aggCandles;
      points = aggCandles.map((b) => b.c);
      timestamps = aggCandles.map((b) => b.t);
    }

    const finalPoints = params.sliceTail && points.length > params.sliceTail ? points.slice(-params.sliceTail) : points;
    const finalTimestamps =
      params.sliceTail && timestamps.length > params.sliceTail ? timestamps.slice(-params.sliceTail) : timestamps;
    const finalCandles =
      params.sliceTail && candles.length > params.sliceTail ? candles.slice(-params.sliceTail) : candles;

    const prevClose = Number(
      item?.meta?.chartPreviousClose ?? item?.meta?.previousClose
    );
    const data = {
      points: finalPoints,
      timestamps: finalTimestamps,
      candles: finalCandles,
      prevClose: Number.isFinite(prevClose) && prevClose > 0 ? prevClose : Number.NaN,
    };

    const ttl =
      (timeframe === '1D' || timeframe === 'MAX' || Boolean(params.sliceTail)) && sessionInfo.isOpen
        ? 1_500
        : 180_000;
    portfolioSeriesCache.set(key, { data, expiresAt: now + ttl });
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

export interface SymbolDetailResponse {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  shortName: string;
  exchange: string;
  isIndex: boolean;
  currency: 'USD' | 'IDR';
  currencyPrefix?: string;
  decimals: number;
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  open: string;
  dayHigh: string;
  dayLow: string;
  volume: string;
  w52Low: string;
  w52High: string;
  w52Pct: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  support: string;
  supportNote: string;
  resistance: string;
  resistanceNote: string;
  commentary: string;
  points: number[];
  timestamps: number[];
  candles: CandlePoint[];
  chart1D: number[];
  timestamps1D: number[];
  candles1D: CandlePoint[];
  marketSessionOpen: boolean;
  sessionStateLabel: string;
  sessionProgressRatio: number;
  updatedAtEpoch: number;
  bandarmology?: BandarmologyAnalysis;
}

export async function fetchSymbolDetail(
  yahooSymbolInput: string,
  timeframe = '1D'
): Promise<SymbolDetailResponse | null> {
  let sym = yahooSymbolInput.trim().toUpperCase();
  if (!sym) return null;
  if (sym === 'IHSG' || sym === 'COMPOSITE' || sym === 'IDX:COMPOSITE') sym = '^JKSE';
  if (sym === 'SPX' || sym === 'S&P500') sym = '^GSPC';
  if (sym === 'IXIC' || sym === 'NASDAQ') sym = '^IXIC';
  if (sym === 'DJI' || sym === 'DOW') sym = '^DJI';
  if (sym === 'LQ45' || sym === 'IDX:LQ45') sym = '^JKLQ45';
  if (sym === 'DXY') sym = 'DX-Y.NYB';

  const now = Date.now();
  const sessionInfo = getServerSessionInfo(sym, new Date(now));
  const [quoteRes, seriesRes, cbTicker] = await Promise.all([
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m`, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(7000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    timeframe === '1D' ? Promise.resolve(null) : fetchPortfolioSymbolSeries(sym, timeframe),
    sym === 'BTC-USD' || sym === 'ETH-USD'
      ? fetchCoinbaseSpotStats(sym)
      : Promise.resolve(null),
  ]);

  const item = (
    quoteRes as {
      chart?: {
        result?: Array<{
          meta?: Record<string, unknown>;
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              close?: Array<number | null>;
              open?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
            }>;
          };
        }>;
      };
    } | null
  )?.chart?.result?.[0];

  const meta = item?.meta;
  if (!meta) return null;

  let price = Number(meta.regularMarketPrice);
  let rawPrev = Number(
    meta.regularMarketPreviousClose ?? meta.previousClose ?? meta.chartPreviousClose
  );
  if (cbTicker) {
    price = cbTicker.price;
    rawPrev = cbTicker.open24h;
  }
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(rawPrev) || rawPrev <= 0) return null;

  const isIndex = sym.startsWith('^') || sym === 'DX-Y.NYB' || String(meta.instrumentType || '').toUpperCase() === 'INDEX';
  const isIdr =
    String(meta.currency || '').toUpperCase() === 'IDR' ||
    sym.endsWith('.JK') ||
    sym === '^JKSE' ||
    sym === '^JKLQ45';
  const currency: 'USD' | 'IDR' = isIdr ? 'IDR' : 'USD';
  const decimals = sym === 'DX-Y.NYB' ? 3 : isIndex ? 2 : isIdr ? 0 : price < 2 ? 4 : 2;
  const prefix = isIndex ? '' : isIdr ? 'Rp ' : '$';
  const isCrypto = sym === 'BTC-USD' || sym === 'ETH-USD';
  const { prevClose, changeValue, changePercent } = resolveConsistentChange(
    price,
    rawPrev,
    cbTicker ? ((price - rawPrev) / Math.max(1e-6, rawPrev)) * 100 : meta.regularMarketChangePercent,
    decimals,
    isCrypto
  );

  const rawQuoteObj = item?.indicators?.quote?.[0];
  const rawCloses = rawQuoteObj?.close ?? [];
  const rawHighs1D = rawQuoteObj?.high ?? [];
  const rawLows1D = rawQuoteObj?.low ?? [];
  const rawOpens1D = rawQuoteObj?.open ?? [];
  const rawTs = item?.timestamp ?? [];
  const chart1D: number[] = [];
  const timestamps1D: number[] = [];
  const candles1D: CandlePoint[] = [];
  for (let i = 0; i < rawCloses.length; i++) {
    const val = rawCloses[i];
    const ts = rawTs[i];
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) continue;
    if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) continue;
    const c = Number(val.toFixed(decimals));
    const tsMs = ts * 1000;
    chart1D.push(c);
    timestamps1D.push(tsMs);
    const rawO = rawOpens1D[i];
    const rawH = rawHighs1D[i];
    const rawL = rawLows1D[i];
    if (
      typeof rawO === 'number' && Number.isFinite(rawO) && rawO > 0 &&
      typeof rawH === 'number' && Number.isFinite(rawH) && rawH > 0 &&
      typeof rawL === 'number' && Number.isFinite(rawL) && rawL > 0 &&
      rawH >= Math.max(rawO, rawL, val) && rawL <= Math.min(rawO, rawH, val)
    ) {
      candles1D.push({
        t: tsMs,
        o: Number(rawO.toFixed(decimals)),
        h: Number(rawH.toFixed(decimals)),
        l: Number(rawL.toFixed(decimals)),
        c,
      });
    }
  }
  if (candles1D.length !== chart1D.length) candles1D.length = 0;
  if (chart1D.length === 0) return null;

  const activePoints = timeframe === '1D' ? chart1D : (seriesRes?.points ?? []);
  const activeTimestamps = timeframe === '1D' ? timestamps1D : (seriesRes?.timestamps ?? []);
  const activeCandles: CandlePoint[] = timeframe === '1D'
    ? candles1D
    : (seriesRes?.candles ?? []).map((bar) => ({
        t: bar.t,
        o: Number(bar.o.toFixed(decimals)),
        h: Number(bar.h.toFixed(decimals)),
        l: Number(bar.l.toFixed(decimals)),
        c: Number(bar.c.toFixed(decimals)),
      }));
  if (activePoints.length < 2 || activeTimestamps.length !== activePoints.length) return null;

  const rawOpens = item?.indicators?.quote?.[0]?.open ?? [];
  const regOpen = Number(meta.regularMarketOpen);
  const barOpen = rawOpens.find((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  const baseHigh = Number(meta.regularMarketDayHigh);
  const baseLow = Number(meta.regularMarketDayLow);
  const firstOpen = Number.isFinite(regOpen) && regOpen > 0 ? regOpen :
    typeof barOpen === 'number' && Number.isFinite(barOpen) && barOpen > 0 ? barOpen : NaN;
  const dayHighNum = Number.isFinite(baseHigh) && baseHigh > 0 ? baseHigh : NaN;
  const dayLowNum = Number.isFinite(baseLow) && baseLow > 0 ? baseLow : NaN;
  const w52LowNum = Number(meta.fiftyTwoWeekLow);
  const w52HighNum = Number(meta.fiftyTwoWeekHigh);
  const has52WeekRange = Number.isFinite(w52LowNum) && w52LowNum > 0 && Number.isFinite(w52HighNum) && w52HighNum > w52LowNum;
  const w52Pct = has52WeekRange ? Math.max(0, Math.min(100, Math.round(((price - w52LowNum) / (w52HighNum - w52LowNum)) * 100))) : NaN;
  const volNum = Number(meta.regularMarketVolume ?? 0);

  const hasDayRange = Number.isFinite(dayHighNum) && Number.isFinite(dayLowNum) && dayHighNum > dayLowNum;
  const pivot = hasDayRange ? (dayHighNum + dayLowNum + price) / 3 : NaN;
  const supportNum = hasDayRange ? Math.min(2 * pivot - dayHighNum, dayLowNum, price * 0.992) : NaN;
  const resistanceNum = hasDayRange ? Math.max(2 * pivot - dayLowNum, dayHighNum, price * 1.008) : NaN;
  const tier = computeServerSignalTier({
    assetId: sym,
    changePercent,
    price,
    open: firstOpen,
    prevClose,
    dayHigh: dayHighNum,
    dayLow: dayLowNum,
    series: chart1D,
    w52Pct,
  });
  const sentiment: 'Bullish' | 'Bearish' | 'Neutral' =
    tier === 'Strong Bull' || tier === 'Bull Signal'
      ? 'Bullish'
      : tier === 'Strong Bear' || tier === 'Bear Signal'
        ? 'Bearish'
        : 'Neutral';

  const cleanSym =
    sym === '^JKSE'
      ? 'IHSG'
      : sym === '^GSPC'
        ? 'SPX'
        : sym === '^IXIC'
          ? 'IXIC'
          : sym === '^DJI'
            ? 'DJI'
            : sym.replace(/\.JK$/i, '');
  const fullName = String(meta.shortName || meta.longName || cleanSym).slice(0, 64);
  const openFormatted = formatStatNumber(firstOpen, decimals, prefix);

  let bandarmology: BandarmologyAnalysis | undefined;
  if (isIdr && !isIndex && sym.endsWith('.JK')) {
    const bMap = await fetchIdxBandarmologyMap([
      {
        symbol: cleanSym,
        price: Number(price.toFixed(decimals)),
        prevClose: Number(prevClose.toFixed(decimals)),
        foreignNetAmount: latestIdxForeignFlowMap.get(cleanSym),
      },
    ]);
    bandarmology = bMap.get(cleanSym);
  }

  return {
    id: sym,
    symbol: cleanSym,
    yahooSymbol: sym,
    name: fullName,
    shortName: fullName.slice(0, 24),
    exchange: isIdr ? 'IDX · Jakarta' : String(meta.fullExchangeName || meta.exchangeName || 'US Market'),
    isIndex,
    currency,
    currencyPrefix: prefix,
    decimals,
    price: Number(price.toFixed(decimals)),
    prevClose: Number(prevClose.toFixed(decimals)),
    changeValue,
    changePercent,
    open: openFormatted,
    dayHigh: formatStatNumber(dayHighNum, decimals, prefix),
    dayLow: formatStatNumber(dayLowNum, decimals, prefix),
    volume: formatVolume(volNum),
    w52Low: formatStatNumber(w52LowNum, decimals, prefix),
    w52High: formatStatNumber(w52HighNum, decimals, prefix),
    w52Pct,
    sentiment,
    support: formatStatNumber(supportNum, decimals, prefix),
    supportNote: 'Session Pivot S1 & Intraday Support',
    resistance: formatStatNumber(resistanceNum, decimals, prefix),
    resistanceNote: 'Session Pivot R1 & Intraday Resistance',
    commentary: `${fullName} (${cleanSym}) trades at ${formatStatNumber(
      price,
      decimals,
      prefix
    )} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(
      2
    )}%), ${Number.isFinite(firstOpen) ? (price >= firstOpen ? 'above' : 'below') + ` the verified open (${openFormatted})` : 'verified opening price unavailable'}; ${hasDayRange ? `day range ${formatStatNumber(dayLowNum, decimals, prefix)}–${formatStatNumber(dayHighNum, decimals, prefix)}` : 'day range unavailable'}. 52-week position: ${Number.isFinite(w52Pct) ? `${w52Pct}%` : 'unavailable'}; daily signal: ${tier}.`,
    points: activePoints,
    timestamps: activeTimestamps,
    candles: activeCandles,
    chart1D,
    timestamps1D,
    candles1D,
    marketSessionOpen: sessionInfo.isOpen,
    sessionStateLabel: sessionInfo.stateLabel,
    sessionProgressRatio: sessionInfo.progressRatio,
    updatedAtEpoch: Number.isFinite(Number(meta.regularMarketTime)) && Number(meta.regularMarketTime) > 0 ? Number(meta.regularMarketTime) * 1000 : Number.NaN,
    bandarmology,
  };
}

export interface PortfolioMoverBriefItem {
  symbol: string;
  yahooSymbol: string;
  name: string;
  currency: 'USD' | 'IDR';
  price: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  headline: string;
  summary: string;
  source: string;
  publishedAt?: string;
  url?: string;
}

export async function fetchPortfolioMoversBrief(
  yahooSymbols: string[]
): Promise<{ items: PortfolioMoverBriefItem[]; updatedAt: string }> {
  const uniqueSyms = Array.from(
    new Set(yahooSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
  ).slice(0, 8);
  if (uniqueSyms.length === 0) {
    return { items: [], updatedAt: new Date().toISOString() };
  }

  const [{ quotes }, yahooRssXml, cnbcNews] = await Promise.all([
    fetchPortfolioQuotes(uniqueSyms),
    fetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
        uniqueSyms.join(',')
      )}&region=US&lang=en-US`,
      { headers: UA_HEADERS, signal: AbortSignal.timeout(5500) }
    )
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
    fetchLiveNews().catch(() => ({ stories: [] })),
  ]);

  const rssItems: Array<{ title: string; desc: string; link: string; pubDate: string }> = [];
  for (const m of yahooRssXml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = decodeXmlEntities(
      (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '')
    );
    const desc = decodeXmlEntities(
      (block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '')
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<[^>]+>/g, ' ')
    ).trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
    if (title) rssItems.push({ title, desc, link, pubDate });
  }

  const sortedQuotes = [...quotes].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );

  const items: PortfolioMoverBriefItem[] = sortedQuotes.slice(0, 5).map((q) => {
    const clean = q.symbol.toUpperCase();
    const matchedRss = rssItems.find(
      (r) =>
        r.title.toUpperCase().includes(clean) ||
        r.desc.toUpperCase().includes(clean) ||
        r.title.toLowerCase().includes(q.name.split(' ')[0].toLowerCase())
    );
    const matchedMacro = cnbcNews.stories.find(
      (s) =>
        s.headline.toUpperCase().includes(clean) ||
        (q.currency === 'IDR' && s.topic === 'idx') ||
        (q.currency === 'USD' && s.topic === 'rates')
    );

    const dirPhrase =
      q.changePercent > 0.25
        ? `advanced ${q.changePercent.toFixed(2)}%`
        : q.changePercent < -0.25
          ? `declined ${Math.abs(q.changePercent).toFixed(2)}%`
          : `held steady (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`;

    const pxFormatted =
      q.currency === 'IDR'
        ? `Rp ${Math.round(q.price).toLocaleString('en-US')}`
        : `$${q.price.toFixed(2)}`;
    const rangeFormatted =
      q.currency === 'IDR'
        ? `Rp ${Math.round(q.dayLow).toLocaleString('en-US')}–Rp ${Math.round(q.dayHigh).toLocaleString('en-US')}`
        : `$${q.dayLow.toFixed(2)}–$${q.dayHigh.toFixed(2)}`;

    if (matchedRss) {
      return {
        symbol: q.symbol,
        yahooSymbol: q.yahooSymbol,
        name: q.name,
        currency: q.currency,
        price: q.price,
        changePercent: q.changePercent,
        dayHigh: q.dayHigh,
        dayLow: q.dayLow,
        headline: matchedRss.title,
        summary: `${q.name} (${q.symbol}) ${dirPhrase} to ${pxFormatted} across a ${rangeFormatted} session band. ${
          matchedRss.desc ? matchedRss.desc.slice(0, 175) : ''
        }`.trim(),
        source: 'Yahoo Finance',
        publishedAt: matchedRss.pubDate,
        url: matchedRss.link,
      };
    }

    if (matchedMacro) {
      return {
        symbol: q.symbol,
        yahooSymbol: q.yahooSymbol,
        name: q.name,
        currency: q.currency,
        price: q.price,
        changePercent: q.changePercent,
        dayHigh: q.dayHigh,
        dayLow: q.dayLow,
        headline: matchedMacro.headline,
        summary: `${q.name} (${q.symbol}) ${dirPhrase} to ${pxFormatted} (day range ${rangeFormatted}) during ${q.sessionStateLabel.toLowerCase()} trading amid ${matchedMacro.publisher} coverage.`,
        source: matchedMacro.publisher,
        publishedAt: matchedMacro.timeAgo,
        url: matchedMacro.url,
      };
    }

    return {
      symbol: q.symbol,
      yahooSymbol: q.yahooSymbol,
      name: q.name,
      currency: q.currency,
      price: q.price,
      changePercent: q.changePercent,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      headline: `${q.name} ${q.changePercent >= 0 ? 'gains' : 'eases'} ${Math.abs(q.changePercent).toFixed(2)}% in ${q.exchange} trading`,
      summary: `${q.name} (${q.symbol}) ${dirPhrase} to ${pxFormatted}, trading between ${rangeFormatted} with previous close at ${
        q.currency === 'IDR'
          ? `Rp ${Math.round(q.prevClose).toLocaleString('en-US')}`
          : `$${q.prevClose.toFixed(2)}`
      }.`,
      source: `${q.exchange} Live Feed`,
    };
  });

  return { items, updatedAt: new Date().toISOString() };
}

export interface StockSearchItem {
  symbol: string;
  yahooSymbol: string;
  name: string;
  exchange: string;
  typeDisp: string;
  currency: 'USD' | 'IDR';
  category: 'Equities' | 'Crypto' | 'Commodities' | 'Cash & FX';
  isIndex?: boolean;
  assetId?: string;
  price?: number;
  prevClose?: number;
  changePercent?: number;
  sparklinePoints?: number[];
  sessionOpen?: boolean;
}

const INDEX_AND_POPULAR_SYMBOLS: StockSearchItem[] = [
  { symbol: 'IHSG', yahooSymbol: '^JKSE', name: 'IDX Composite Index (IHSG)', exchange: 'IDX · Index', typeDisp: 'Index', currency: 'IDR', category: 'Equities', isIndex: true, assetId: 'IHSG' },
  { symbol: 'EIDO', yahooSymbol: 'EIDO', name: 'iShares MSCI Indonesia ETF', exchange: 'NYSE Arca', typeDisp: 'ETF', currency: 'USD', category: 'Equities', isIndex: false, assetId: 'EIDO' },
  { symbol: 'LQ45', yahooSymbol: '^JKLQ45', name: 'IDX LQ45 Blue-Chip Index', exchange: 'IDX · Index', typeDisp: 'Index', currency: 'IDR', category: 'Equities', isIndex: true },
  { symbol: 'SPX', yahooSymbol: '^GSPC', name: 'S&P 500 Index', exchange: 'NYSE/CME · Index', typeDisp: 'Index', currency: 'USD', category: 'Equities', isIndex: true, assetId: 'SPX' },
  { symbol: 'IXIC', yahooSymbol: '^IXIC', name: 'NASDAQ Composite Index', exchange: 'NASDAQ · Index', typeDisp: 'Index', currency: 'USD', category: 'Equities', isIndex: true, assetId: 'IXIC' },
  { symbol: 'DJI', yahooSymbol: '^DJI', name: 'Dow Jones Industrial Average', exchange: 'NYSE · Index', typeDisp: 'Index', currency: 'USD', category: 'Equities', isIndex: true, assetId: 'DJI' },
  { symbol: 'UNTR', yahooSymbol: 'UNTR.JK', name: 'United Tractors Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'BBCA', yahooSymbol: 'BBCA.JK', name: 'Bank Central Asia Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'BBRI', yahooSymbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'BMRI', yahooSymbol: 'BMRI.JK', name: 'Bank Mandiri Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'TLKM', yahooSymbol: 'TLKM.JK', name: 'Telkom Indonesia Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'ASII', yahooSymbol: 'ASII.JK', name: 'Astra International Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'ADRO', yahooSymbol: 'ADRO.JK', name: 'Alamtri Resources Indonesia Tbk', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'NVDA', yahooSymbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', typeDisp: 'Equity', currency: 'USD', category: 'Equities' },
  { symbol: 'AAPL', yahooSymbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', typeDisp: 'Equity', currency: 'USD', category: 'Equities' },
  { symbol: 'MSFT', yahooSymbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', typeDisp: 'Equity', currency: 'USD', category: 'Equities' },
  { symbol: 'GOOGL', yahooSymbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', typeDisp: 'Equity', currency: 'USD', category: 'Equities' },
  { symbol: 'BTC-USD', yahooSymbol: 'BTC-USD', name: 'Bitcoin USD', exchange: 'Coinbase Spot', typeDisp: 'Cryptocurrency', currency: 'USD', category: 'Crypto', assetId: 'BTCUSD' },
  { symbol: 'DXY', yahooSymbol: 'DX-Y.NYB', name: 'US Dollar Index (DXY)', exchange: 'ICE · Index', typeDisp: 'Index', currency: 'USD', category: 'Cash & FX', isIndex: true, assetId: 'DXY' },
  { symbol: 'GC=F', yahooSymbol: 'GC=F', name: 'Gold Futures', exchange: 'COMEX', typeDisp: 'Commodity', currency: 'USD', category: 'Commodities', assetId: 'XAUUSD' },
];

async function enrichSearchItemsWithQuotes(items: StockSearchItem[]): Promise<StockSearchItem[]> {
  const target = items.slice(0, 8);
  const rest = items.slice(8);
  const { quotes } = await fetchPortfolioQuotes(target.map((i) => i.yahooSymbol));
  const qMap = new Map(quotes.map((q) => [q.yahooSymbol.toUpperCase(), q]));

  const enrichedTop = target.map((item) => {
    const q = qMap.get(item.yahooSymbol.toUpperCase());
    if (!q) return item;
    return {
      ...item,
      price: q.price,
      prevClose: q.prevClose,
      changePercent: q.changePercent,
      sparklinePoints: samplePoints(q.chart1D, 14),
      sessionOpen: q.sessionOpen,
    };
  });

  return [...enrichedTop, ...rest];
}

export async function searchMarketSymbols(
  query: string,
  includeQuotes = false
): Promise<StockSearchItem[]> {
  const q = query.trim();
  const lower = q.toLowerCase();

  if (!q) {
    return includeQuotes
      ? enrichSearchItemsWithQuotes(INDEX_AND_POPULAR_SYMBOLS.slice(0, 8))
      : INDEX_AND_POPULAR_SYMBOLS;
  }

  const curatedMatches = INDEX_AND_POPULAR_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(lower) ||
      s.yahooSymbol.toLowerCase().includes(lower) ||
      s.name.toLowerCase().includes(lower) ||
      (lower.includes('indonesia') && (s.currency === 'IDR' || s.symbol === 'IHSG' || s.symbol === 'EIDO' || s.symbol === 'LQ45')) ||
      (lower.includes('idx') && (s.currency === 'IDR' || s.symbol === 'IHSG' || s.symbol === 'EIDO' || s.symbol === 'LQ45')) ||
      (lower.includes('etf') && s.symbol === 'EIDO') ||
      (lower === 'us' && s.currency === 'USD') ||
      (lower.includes('index') && s.isIndex)
  );

  const remoteItems: StockSearchItem[] = [];
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      q
    )}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        quotes?: Array<{
          symbol?: string;
          shortname?: string;
          longname?: string;
          exchDisp?: string;
          exchange?: string;
          quoteType?: string;
          typeDisp?: string;
        }>;
      };

      for (const item of json.quotes ?? []) {
        const yahooSym = String(item.symbol || '').trim().toUpperCase();
        if (!yahooSym) continue;
        const qType = String(item.quoteType || item.typeDisp || 'EQUITY').toUpperCase();
        if (!['EQUITY', 'ETF', 'INDEX', 'CRYPTOCURRENCY', 'FUTURE', 'CURRENCY', 'MUTUALFUND'].includes(qType)) {
          continue;
        }
        const isIdr = yahooSym.endsWith('.JK') || yahooSym === '^JKSE' || yahooSym === '^JKLQ45' || item.exchDisp === 'Jakarta';
        const cleanSym =
          yahooSym === '^JKSE'
            ? 'IHSG'
            : yahooSym === '^GSPC'
              ? 'SPX'
              : yahooSym === '^IXIC'
                ? 'IXIC'
                : yahooSym === '^DJI'
                  ? 'DJI'
                  : yahooSym.replace(/\.JK$/i, '');
        const category: StockSearchItem['category'] =
          qType === 'CRYPTOCURRENCY'
            ? 'Crypto'
            : qType === 'FUTURE' || yahooSym.endsWith('=F')
              ? 'Commodities'
              : qType === 'CURRENCY' || yahooSym.endsWith('=X')
                ? 'Cash & FX'
                : 'Equities';
        const builtIn = YAHOO_SYMBOL_CONFIG.find((c) => c.yahooSymbol.toUpperCase() === yahooSym);

        remoteItems.push({
          symbol: cleanSym,
          yahooSymbol: yahooSym,
          name: String(item.shortname || item.longname || cleanSym).slice(0, 80),
          exchange: isIdr ? 'IDX' : String(item.exchDisp || item.exchange || 'Global'),
          typeDisp: String(item.typeDisp || qType),
          currency: isIdr ? 'IDR' : 'USD',
          category,
          isIndex: qType === 'INDEX' || yahooSym.startsWith('^'),
          assetId: builtIn?.id,
        });
      }
    }
  } catch {
    // fallback to curated + ticker guess
  }

  // Also check IDX 4-letter shorthand if user typed an IDX ticker (e.g. "BBNI" or "ANTM")
  const upperClean = q.toUpperCase().replace(/[^A-Z0-9.\-^=]/g, '');
  const isCuratedExact = curatedMatches.some((c) => c.symbol.toUpperCase() === upperClean);
  if (
    /^[A-Z]{4}$/.test(upperClean) &&
    !isCuratedExact &&
    !remoteItems.some((r) => r.yahooSymbol === `${upperClean}.JK`)
  ) {
    remoteItems.push({
      symbol: upperClean,
      yahooSymbol: `${upperClean}.JK`,
      name: `${upperClean} Tbk (IDX)`,
      exchange: 'IDX',
      typeDisp: 'Equity',
      currency: 'IDR',
      category: 'Equities',
    });
  }

  const mergedMap = new Map<string, StockSearchItem>();
  for (const item of [...curatedMatches, ...remoteItems]) {
    if (!mergedMap.has(item.yahooSymbol)) {
      mergedMap.set(item.yahooSymbol, item);
    }
  }

  const finalList = Array.from(mergedMap.values()).slice(0, 12);
  if (finalList.length === 0 && upperClean) {
    finalList.push({
      symbol: upperClean.replace(/\.JK$/, ''),
      yahooSymbol: upperClean,
      name: `${upperClean} Market Ticker`,
      exchange: upperClean.endsWith('.JK') ? 'IDX' : 'Global',
      typeDisp: 'Equity',
      currency: upperClean.endsWith('.JK') ? 'IDR' : 'USD',
      category: 'Equities',
    });
  }

  return includeQuotes ? enrichSearchItemsWithQuotes(finalList) : finalList;
}

export interface DailyMarketSummaryHighlight {
  id: string;
  category: 'gainer' | 'loser' | 'event';
  title: string;
  metricText: string;
  summaryText: string;
  metaText: string;
  symbol?: string;
  yahooSymbol?: string;
  assetId?: string;
  routeTarget?: 'dashboard' | 'stocks' | 'calendar' | 'news';
}

export interface DailyMarketSummaryPayload {
  windowLabel: string;
  dateLabel: string;
  updatedAt: string;
  highlights: DailyMarketSummaryHighlight[];
}

const dailySummaryCache: { entry: CacheEntry<DailyMarketSummaryPayload> | null } = {
  entry: null,
};

export async function fetchDailyMarketSummary(): Promise<DailyMarketSummaryPayload> {
  const now = Date.now();
  if (dailySummaryCache.entry && dailySummaryCache.entry.expiresAt > now) {
    return dailySummaryCache.entry.data;
  }

  return coalesceInFlight('daily-summary', dailySummaryCache.entry?.data, async () => {

  const [quotesRes, moversRes, calendarRes, newsRes] = await Promise.allSettled([
    fetchLiveQuotes(),
    fetchTopStockMovers(),
    fetchLiveCalendar(),
    fetchLiveNews(),
  ]);

  const quotes = quotesRes.status === 'fulfilled' ? quotesRes.value.quotes : [];
  const movers = moversRes.status === 'fulfilled' ? moversRes.value : null;
  const calendar = calendarRes.status === 'fulfilled' ? calendarRes.value : null;
  const news = newsRes.status === 'fulfilled' ? newsRes.value : null;

  const cfgMap = new Map(YAHOO_SYMBOL_CONFIG.map((c) => [c.id, c]));
  const formatQuoteVal = (q: LiveQuotePatch) => {
    const cfg = cfgMap.get(q.id);
    const decimals = cfg?.decimals ?? 2;
    const prefix = cfg?.currencyPrefix ?? '';
    const suffix = cfg?.unitSuffix ?? '';
    return `${prefix}${q.price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  };

  const formatStockPx = (s: StockMover) =>
    s.currency === 'IDR'
      ? `Rp ${Math.round(s.price).toLocaleString('en-US')}`
      : `$${s.price.toFixed(2)}`;

  const highlights: DailyMarketSummaryHighlight[] = [];

  // 1. Top Global Benchmark Gainers
  const sortedQuotes = [...quotes]
    .filter((q) => Number.isFinite(q.changePercent))
    .sort((a, b) => b.changePercent - a.changePercent);

  const topBenchmark = sortedQuotes[0];
  if (topBenchmark && topBenchmark.changePercent >= 0) {
    const cfg = cfgMap.get(topBenchmark.id);
    highlights.push({
      id: `sum-bench-gain-${topBenchmark.id}`,
      category: 'gainer',
      title: `${cfg?.name || topBenchmark.id} (${topBenchmark.id})`,
      metricText: `+${topBenchmark.changePercent.toFixed(2)}%`,
      summaryText: `Led global benchmarks at ${formatQuoteVal(topBenchmark)} within a ${topBenchmark.dayLow}–${topBenchmark.dayHigh} intraday band.`,
      metaText: `${topBenchmark.sessionStateLabel} · Global Benchmark`,
      symbol: topBenchmark.id,
      assetId: topBenchmark.id,
      routeTarget: 'dashboard',
    });
  }

  // 2. Top US Stock Gainer
  const usTopGainer = movers?.us?.gainers?.[0] ?? movers?.us?.impact?.[0];
  if (usTopGainer && usTopGainer.changePercent >= 0) {
    highlights.push({
      id: `sum-us-gain-${usTopGainer.symbol}`,
      category: 'gainer',
      title: `${usTopGainer.name} (${usTopGainer.symbol})`,
      metricText: `+${usTopGainer.changePercent.toFixed(2)}%`,
      summaryText: `Topped US session gainers at ${formatStockPx(usTopGainer)} on ${usTopGainer.volume} share volume.`,
      metaText: `US Equities · ${usTopGainer.exchange}`,
      symbol: usTopGainer.symbol,
      yahooSymbol: usTopGainer.symbol,
      routeTarget: 'stocks',
    });
  }

  // 3. Top Indonesia IDX Gainer & Foreign Net Buy
  const idxTopGainer = movers?.indonesia?.gainers?.[0] ?? movers?.indonesia?.impact?.[0];
  if (idxTopGainer && idxTopGainer.changePercent >= 0) {
    highlights.push({
      id: `sum-idx-gain-${idxTopGainer.symbol}`,
      category: 'gainer',
      title: `${idxTopGainer.name} (${idxTopGainer.symbol})`,
      metricText: `+${idxTopGainer.changePercent.toFixed(2)}%`,
      summaryText: `Paced Indonesia IDX equities at ${formatStockPx(idxTopGainer)} with ${idxTopGainer.volume} traded.`,
      metaText: 'Indonesia IDX · Equities',
      symbol: idxTopGainer.symbol,
      yahooSymbol: `${idxTopGainer.symbol}.JK`,
      routeTarget: 'stocks',
    });
  }

  const idxForeignBuy = movers?.indonesia?.foreignBuy?.[0];
  if (idxForeignBuy && idxForeignBuy.foreignNetLabel) {
    highlights.push({
      id: `sum-idx-fbuy-${idxForeignBuy.symbol}`,
      category: 'gainer',
      title: `Foreign Accumulation: ${idxForeignBuy.symbol}`,
      metricText: `${idxForeignBuy.foreignNetLabel}`,
      summaryText: `${idxForeignBuy.name} led IDX foreign net buying at ${formatStockPx(idxForeignBuy)} (${idxForeignBuy.changePercent >= 0 ? '+' : ''}${idxForeignBuy.changePercent.toFixed(2)}%).`,
      metaText: 'IDX Foreign Flow · Net Buy',
      symbol: idxForeignBuy.symbol,
      yahooSymbol: `${idxForeignBuy.symbol}.JK`,
      routeTarget: 'stocks',
    });
  }

  // 4. Sharpest Benchmark & Equity Decliners (Losers)
  const bottomBenchmark = sortedQuotes[sortedQuotes.length - 1];
  if (bottomBenchmark && bottomBenchmark.changePercent < 0) {
    const cfg = cfgMap.get(bottomBenchmark.id);
    highlights.push({
      id: `sum-bench-loss-${bottomBenchmark.id}`,
      category: 'loser',
      title: `${cfg?.name || bottomBenchmark.id} (${bottomBenchmark.id})`,
      metricText: `${bottomBenchmark.changePercent.toFixed(2)}%`,
      summaryText: `Trailed macro benchmarks at ${formatQuoteVal(bottomBenchmark)}, testing session support near ${bottomBenchmark.support}.`,
      metaText: `${bottomBenchmark.sessionStateLabel} · Benchmark Lag`,
      symbol: bottomBenchmark.id,
      assetId: bottomBenchmark.id,
      routeTarget: 'dashboard',
    });
  }

  const usTopLoser = movers?.us?.losers?.[0];
  if (usTopLoser && usTopLoser.changePercent < 0) {
    highlights.push({
      id: `sum-us-loss-${usTopLoser.symbol}`,
      category: 'loser',
      title: `${usTopLoser.name} (${usTopLoser.symbol})`,
      metricText: `${usTopLoser.changePercent.toFixed(2)}%`,
      summaryText: `Led US session decliners at ${formatStockPx(usTopLoser)} across ${usTopLoser.volume} shares traded.`,
      metaText: `US Equities · ${usTopLoser.exchange}`,
      symbol: usTopLoser.symbol,
      yahooSymbol: usTopLoser.symbol,
      routeTarget: 'stocks',
    });
  }

  const idxTopLoser = movers?.indonesia?.losers?.[0];
  if (idxTopLoser && idxTopLoser.changePercent < 0) {
    highlights.push({
      id: `sum-idx-loss-${idxTopLoser.symbol}`,
      category: 'loser',
      title: `${idxTopLoser.name} (${idxTopLoser.symbol})`,
      metricText: `${idxTopLoser.changePercent.toFixed(2)}%`,
      summaryText: `Pulled back on the IDX to ${formatStockPx(idxTopLoser)} on ${idxTopLoser.volume} volume.`,
      metaText: 'Indonesia IDX · Pullback',
      symbol: idxTopLoser.symbol,
      yahooSymbol: `${idxTopLoser.symbol}.JK`,
      routeTarget: 'stocks',
    });
  }

  // 5. Major Economic Events of the Last 24 Hours
  const calEvents = calendar?.events ?? [];
  const twentyFourHoursAgo = now - 24 * 3600_000;
  const recentCal = calEvents
    .filter((ev) => {
      const ts = Date.parse(ev.isoDate);
      if (Number.isFinite(ts)) {
        return ts >= twentyFourHoursAgo && ts <= now + 6 * 3600_000;
      }
      return ev.day === 'today';
    })
    .sort((a, b) => {
      const scoreA = (a.impact === 'HIGH' ? 2 : 1) + (a.actual !== 'Pending' ? 2 : 0);
      const scoreB = (b.impact === 'HIGH' ? 2 : 1) + (b.actual !== 'Pending' ? 2 : 0);
      return scoreB - scoreA;
    });

  const selectedCal = (recentCal.length > 0 ? recentCal : calEvents).slice(0, 3);
  for (const ev of selectedCal) {
    const hasActual = ev.actual && ev.actual !== 'Pending' && ev.actual !== '—';
    highlights.push({
      id: `sum-ev-${ev.id}`,
      category: 'event',
      title: `${ev.currency} · ${ev.title}`,
      metricText: hasActual ? `${ev.actual} (${ev.deviationLabel})` : `${ev.impact} Impact`,
      summaryText: hasActual
        ? `Printed ${ev.actual} vs. ${ev.forecast} consensus (prior ${ev.previous}). ${ev.description}`
        : `Scheduled at ${ev.timeWib} with forecast ${ev.forecast} vs. ${ev.previous} prior. ${ev.description}`,
      metaText: `${ev.timeWib} · Economic Release`,
      routeTarget: 'calendar',
    });
  }

  if (selectedCal.length === 0 && news?.stories?.[0]) {
    const topStory = news.stories[0];
    highlights.push({
      id: `sum-news-${topStory.id}`,
      category: 'event',
      title: topStory.headline,
      metricText: topStory.badgeMetric || 'Macro Catalyst',
      summaryText: topStory.summary,
      metaText: `${topStory.publisher} · ${topStory.timeAgo}`,
      routeTarget: 'news',
    });
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(now));

  const payload: DailyMarketSummaryPayload = {
    windowLabel: 'Last 24 hours',
    dateLabel,
    updatedAt: new Date(now).toISOString(),
    highlights,
  };

  dailySummaryCache.entry = {
    data: payload,
    expiresAt: now + 20_000,
  };

  return payload;
  });
}

export type SessionPhaseKey = 'beforeOpen' | 'duringSession' | 'afterClose';

export interface IndexSessionBrief {
  assetId: string;
  symbol: string;
  name: string;
  region: 'US' | 'Indonesia' | 'Asia-Pacific';
  activePhase: SessionPhaseKey;
  sessionStateLabel: string;
  priceFormatted: string;
  changePercent: number;
  signalTier: 'Strong Bull' | 'Bull Signal' | 'Neutral' | 'Bear Signal' | 'Strong Bear';
  beforeOpen: string;
  duringSession: string;
  afterClose: string;
  keyLevels: string;
}

export interface MarketIntelligencePayload {
  updatedAt: string;
  headline: string;
  compositeSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  signalTally: {
    bullCount: number;
    bearCount: number;
    neutralCount: number;
  };
  sourcesCount: number;
  sourceNames: string[];
  commentaryPoints: string[];
  rumorAndCatalystThemes: Array<{
    tag: string;
    theme: string;
    tone: 'bull' | 'bear' | 'neutral';
  }>;
  dataReleaseImplications: Array<{
    currency: string;
    impact: 'HIGH' | 'MED';
    title: string;
    timing: string;
    implication: string;
  }>;
  stocksAndFlowSummary: string;
  forwardPrediction: string;
  sessionConditionAndTrigger?: string;
  oneSentenceSummary?: string;
  indexSessions: IndexSessionBrief[];
  aiRefined: boolean;
}

const intelligenceCache: { entry: CacheEntry<MarketIntelligencePayload> | null } = {
  entry: null,
};

function computeServerSignalTier(input: {
  assetId?: string;
  changePercent: number;
  price?: number;
  open?: number;
  prevClose?: number;
  dayHigh?: number;
  dayLow?: number;
  series?: number[];
  w52Pct?: number;
  foreignFlowSide?: 'BUY' | 'SELL';
}): 'Strong Bull' | 'Bull Signal' | 'Neutral' | 'Bear Signal' | 'Strong Bear' {
  const {
    assetId = '',
    changePercent,
    price = 0,
    open = 0,
    prevClose = 0,
    dayHigh,
    dayLow,
    series,
    w52Pct,
    foreignFlowSide,
  } = input;

  const upper = assetId.toUpperCase();
  const isCrypto = upper.includes('BTC') || upper.includes('ETH') || upper.endsWith('-USD');
  const isGold = upper.includes('XAU') || upper.includes('GC=F');

  const strongTh = isCrypto ? 2.2 : isGold ? 1.1 : 1.35;
  const mildTh = isCrypto ? 0.65 : isGold ? 0.30 : 0.35;

  let score = 0;

  // 1. Asset-class volatility-calibrated session move
  if (changePercent >= strongTh) score += 34;
  else if (changePercent >= mildTh) score += 18;
  else if (changePercent <= -strongTh) score -= 34;
  else if (changePercent <= -mildTh) score -= 18;

  // 2. Opening Drive (Price vs Open + Prev Close)
  if (price > 0 && open > 0) {
    const aboveOpen = price >= open * 1.0005;
    const belowOpen = price <= open * 0.9995;
    const abovePrev = prevClose > 0 ? price >= prevClose : aboveOpen;
    if (aboveOpen && abovePrev) score += 18;
    else if (belowOpen && !abovePrev) score -= 18;
    else if (aboveOpen) score += 8;
    else if (belowOpen) score -= 8;
  } else if (price > 0 && prevClose > 0) {
    if (price > prevClose * 1.001) score += 10;
    else if (price < prevClose * 0.999) score -= 10;
  }

  // 3. Internal Bar Strength (IBS)
  if (typeof dayHigh === 'number' && typeof dayLow === 'number' && dayHigh > dayLow && price > 0) {
    const ibs = (price - dayLow) / (dayHigh - dayLow);
    if (ibs >= 0.78) score += 20;
    else if (ibs >= 0.60) score += 10;
    else if (ibs <= 0.22) score -= 20;
    else if (ibs <= 0.40) score -= 10;
  }

  // 4. Intraday micro-trend slope & session-mean (pseudo-VWAP) position
  if (Array.isArray(series) && series.length >= 6 && price > 0) {
    const valid = series.filter((v) => Number.isFinite(v) && v > 0);
    if (valid.length >= 6) {
      const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
      const tail3 = valid.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const priorSlice = valid.slice(-8, -3);
      const priorMean = priorSlice.length > 0 ? priorSlice.reduce((a, b) => a + b, 0) / priorSlice.length : mean;
      const risingSlope = tail3 > priorMean * 1.0005;
      const fallingSlope = tail3 < priorMean * 0.9995;
      if (price >= mean && risingSlope) score += 16;
      else if (price <= mean && fallingSlope) score -= 16;
      else if (price >= mean) score += 7;
      else score -= 7;
    }
  }

  // 5. Light 52W structural filter & foreign institutional flow boost
  if (typeof w52Pct === 'number' && Number.isFinite(w52Pct)) {
    if (w52Pct >= 75) score += 8;
    else if (w52Pct <= 25) score -= 8;
  }

  if (foreignFlowSide === 'BUY') score += 10;
  else if (foreignFlowSide === 'SELL') score -= 10;

  if (score >= 48) return 'Strong Bull';
  if (score >= 16) return 'Bull Signal';
  if (score <= -48) return 'Strong Bear';
  if (score <= -16) return 'Bear Signal';
  return 'Neutral';
}

function resolveIndexPhase(assetId: string, nowDate: Date): SessionPhaseKey {
  const session = getServerSessionInfo(assetId, nowDate);
  if (session.isOpen) return 'duringSession';

  if (assetId === 'SPX' || assetId === 'IXIC' || assetId === 'DJI') {
    const ny = getTzClockServer(nowDate, 'America/New_York');
    if (!ny.isWeekend && ny.totalMin >= 4 * 60 && ny.totalMin < 9 * 60 + 30) {
      return 'beforeOpen';
    }
    return 'afterClose';
  }
  if (assetId === 'IHSG') {
    const jkt = getTzClockServer(nowDate, 'Asia/Jakarta');
    if (!jkt.isWeekend && jkt.totalMin >= 7 * 60 && jkt.totalMin < 9 * 60) return 'beforeOpen';
    if (!jkt.isWeekend && jkt.totalMin >= 11 * 60 + 30 && jkt.totalMin < 14 * 60) {
      return 'duringSession';
    }
    return 'afterClose';
  }
  if (assetId === 'HSI') {
    const hkg = getTzClockServer(nowDate, 'Asia/Hong_Kong');
    if (!hkg.isWeekend && hkg.totalMin >= 7 * 60 + 30 && hkg.totalMin < 9 * 60 + 30) return 'beforeOpen';
    if (!hkg.isWeekend && hkg.totalMin >= 12 * 60 && hkg.totalMin < 13 * 60) return 'duringSession';
    return 'afterClose';
  }
  if (assetId === 'TAIEX') {
    const tw = getTzClockServer(nowDate, 'Asia/Taipei');
    if (!tw.isWeekend && tw.totalMin >= 7 * 60 && tw.totalMin < 9 * 60) return 'beforeOpen';
    return 'afterClose';
  }
  if (assetId === 'KOSPI') {
    const kr = getTzClockServer(nowDate, 'Asia/Seoul');
    if (!kr.isWeekend && kr.totalMin >= 7 * 60 && kr.totalMin < 9 * 60) return 'beforeOpen';
    return 'afterClose';
  }
  if (assetId === 'SSEC') {
    const cn = getTzClockServer(nowDate, 'Asia/Shanghai');
    if (!cn.isWeekend && cn.totalMin >= 7 * 60 + 30 && cn.totalMin < 9 * 60 + 30) return 'beforeOpen';
    if (!cn.isWeekend && cn.totalMin >= 11 * 60 + 30 && cn.totalMin < 13 * 60) return 'duringSession';
    return 'afterClose';
  }
  if (assetId === 'NIFTY') {
    const ist = getTzClockServer(nowDate, 'Asia/Kolkata');
    if (!ist.isWeekend && ist.totalMin >= 7 * 60 + 30 && ist.totalMin < 9 * 60 + 15) return 'beforeOpen';
    return 'afterClose';
  }
  return 'afterClose';
}

function buildMacroImplicationText(ev: LiveCalendarItem): string {
  const hasActual = ev.actual && ev.actual !== 'Pending' && ev.actual !== '—';
  const currScope =
    ev.currency === 'USD'
      ? 'US Treasury yields, DXY, and global risk appetite'
      : ev.currency === 'IDR'
        ? 'Bank Indonesia rate path, USD/IDR stability, and IDX banking/consumer flows'
        : ev.currency === 'CNY'
          ? 'China industrial demand, commodities, and APAC regional indices'
          : ev.currency === 'EUR'
            ? 'EUR/USD carry and European equity cyclicals'
            : 'JPY carry trades and Asian bond yields';

  if (hasActual) {
    const bias =
      ev.deviationType === 'beat'
        ? `printed hotter/stronger than consensus (${ev.actual} vs ${ev.forecast}), supporting ${ev.currency} and nudging rate-sensitive sectors cautiously`
        : ev.deviationType === 'miss'
          ? `came in softer than forecast (${ev.actual} vs ${ev.forecast}), easing ${ev.currency} yield pressure and cushioning duration/growth assets`
          : `matched consensus (${ev.actual}), keeping ${currScope} anchored`;
    return `${ev.title} ${bias}. Watch follow-through across ${currScope}.`;
  }
  return `Scheduled at ${ev.timeWib} (consensus ${ev.forecast} vs prior ${ev.previous}). Any surprise will reprice ${currScope}.`;
}

export async function fetchMarketIntelligence(): Promise<MarketIntelligencePayload> {
  const now = Date.now();
  if (intelligenceCache.entry) {
    if (intelligenceCache.entry.expiresAt > now) {
      return intelligenceCache.entry.data;
    }
    if (now - intelligenceCache.entry.expiresAt < 900_000) {
      void fetchMarketIntelligenceFresh().catch(() => null);
      return intelligenceCache.entry.data;
    }
  }
  return fetchMarketIntelligenceFresh();
}

async function fetchMarketIntelligenceFresh(): Promise<MarketIntelligencePayload> {
  const now = Date.now();
  return coalesceInFlight('market-intel', intelligenceCache.entry?.data, async () => {

  const nowDate = new Date(now);
  const [quotesRes, moversRes, newsRes, calRes] = await Promise.allSettled([
    fetchLiveQuotes(),
    fetchTopStockMovers(),
    fetchLiveNews(),
    fetchLiveCalendar(),
  ]);

  const quotes = quotesRes.status === 'fulfilled' ? quotesRes.value.quotes : [];
  const movers = moversRes.status === 'fulfilled' ? moversRes.value : null;
  const stories = newsRes.status === 'fulfilled' ? newsRes.value.stories : [];
  const events = calRes.status === 'fulfilled' ? calRes.value.events : [];

  const qById = new Map(quotes.map((q) => [q.id, q]));
  const us10y = qById.get('US10Y');
  const us30y = qById.get('US30Y');
  const dxy = qById.get('DXY');
  const usdidr = qById.get('USDIDR');
  const wti = qById.get('WTI');
  const gold = qById.get('XAUUSD');
  const btc = qById.get('BTCUSD');

  const usLeader = movers?.us?.impact?.[0];
  const usTop3 = (movers?.us?.impact ?? []).slice(0, 3);
  const usGainer = movers?.us?.gainers?.[0];
  const usLoser = movers?.us?.losers?.[0];
  const idxLeader = movers?.indonesia?.impact?.[0];
  const idxTop3 = (movers?.indonesia?.impact ?? []).slice(0, 3);
  const idxBuyTop = movers?.indonesia?.foreignBuy?.[0];
  const idxSellTop = movers?.indonesia?.foreignSell?.[0];

  // Quantitative cross-asset factor metrics for thesis construction
  const yieldCurveBps = us10y && us30y ? (us30y.price - us10y.price) * 100 : null;
  const macroTighteningScore =
    (dxy?.changePercent ?? 0) * 1.4 + (us10y?.changePercent ?? 0) * 0.6;
  const macroRegimeLabel = !dxy && !us10y ? 'Insufficient verified macro data' :
    macroTighteningScore >= 0.45
      ? 'Tightening Liquidity & Strong Dollar'
      : macroTighteningScore <= -0.45
        ? 'Easing Financial Conditions & Rate Relief'
        : 'Balanced Rates & Dollar Equilibrium';

  const usBreadthNeg = (movers?.us?.impact ?? []).filter((s) => s.changePercent < 0).length;
  const usBreadthTotal = Math.max(1, (movers?.us?.impact ?? []).length);
  const idxBreadthPos = (movers?.indonesia?.impact ?? []).filter((s) => s.changePercent >= 0).length;
  const idxBreadthTotal = Math.max(1, (movers?.indonesia?.impact ?? []).length);

  const trackedIds: Array<{ id: string; symbol: string; name: string; region: IndexSessionBrief['region'] }> = [
    { id: 'SPX', symbol: 'SPX', name: 'S&P 500 Index', region: 'US' },
    { id: 'IXIC', symbol: 'IXIC', name: 'NASDAQ Composite', region: 'US' },
    { id: 'DJI', symbol: 'DJI', name: 'Dow Jones Industrial', region: 'US' },
    { id: 'IHSG', symbol: 'IHSG', name: 'IDX Composite (IHSG)', region: 'Indonesia' },
    { id: 'HSI', symbol: 'HSI', name: 'Hang Seng Index', region: 'Asia-Pacific' },
    { id: 'TAIEX', symbol: 'TAIEX', name: 'Taiwan Weighted', region: 'Asia-Pacific' },
    { id: 'KOSPI', symbol: 'KOSPI', name: 'KOSPI Korea', region: 'Asia-Pacific' },
    { id: 'SSEC', symbol: 'SSEC', name: 'Shanghai Composite', region: 'Asia-Pacific' },
    { id: 'NIFTY', symbol: 'NIFTY', name: 'NIFTY 50 India', region: 'Asia-Pacific' },
  ];

  const usCalNext = events.find((e) => e.currency === 'USD');
  const idCalNext = events.find((e) => e.currency === 'IDR');
  const asiaCalNext = events.find((e) => e.currency === 'CNY' || e.currency === 'JPY');

  const indexSessions: IndexSessionBrief[] = trackedIds.map((meta) => {
    const q = qById.get(meta.id);
    const priceNum = q?.price ?? 0;
    const chgPct = q?.changePercent ?? 0;
    const signStr = chgPct >= 0 ? '+' : '';
    const priceFormatted =
      priceNum > 0
        ? priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—';
    const parseNum = (raw?: string) => {
      if (!raw) return NaN;
      const v = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(v) ? v : NaN;
    };
    const openNum = parseNum(q?.open);
    const highNum = parseNum(q?.dayHigh);
    const lowNum = parseNum(q?.dayLow);
    const gapPct = Number.isFinite(openNum) && q?.prevClose ? ((openNum - q.prevClose) / q.prevClose) * 100 : 0;
    const ibsPct = Number.isFinite(highNum) && Number.isFinite(lowNum) && highNum > lowNum && priceNum > 0
      ? Math.round(((priceNum - lowNum) / (highNum - lowNum)) * 100) : null;
    const fgNow = q?.fearGreed7d?.length ? q.fearGreed7d[q.fearGreed7d.length - 1] : null;
    const fgLabel = fgNow === null ? 'Unavailable' : fgNow >= 75 ? 'Extreme Greed' : fgNow >= 55 ? 'Greed' : fgNow <= 24 ? 'Extreme Fear' : fgNow <= 44 ? 'Fear' : 'Neutral';
    const ibsLabel = ibsPct === null ? 'unavailable' : `${ibsPct}%`;

    const activePhase = resolveIndexPhase(meta.id, nowDate);
    const signalTier = computeServerSignalTier({
      assetId: meta.id,
      changePercent: chgPct,
      price: priceNum,
      open: openNum,
      prevClose: q?.prevClose,
      dayHigh: highNum,
      dayLow: lowNum,
      series: q?.chart1D,
      w52Pct: q?.w52Pct,
    });

    const macroThesis =
      meta.region === 'US'
        ? `Thesis hinges on discount-rate transmission (${us10y ? `${us10y.price.toFixed(3)}%` : 'unavailable'} US10Y, 10s30s ${yieldCurveBps === null ? 'unavailable' : `${yieldCurveBps === null ? 'unavailable' : `${yieldCurveBps >= 0 ? '+' : ''}${yieldCurveBps.toFixed(1)} bps`}`})${
            usCalNext ? ` ahead of ${usCalNext.title} (${usCalNext.timeWib}, consensus ${usCalNext.forecast})` : ''
          }.`
        : meta.region === 'Indonesia'
          ? `Thesis tracks carry compression (Indonesian sovereign 10Y yield spread (unavailable from verified free sources)) and FX stability with USD/IDR at ${
              usdidr ? usdidr.price.toLocaleString('en-US') : 'unavailable'
            }${idCalNext ? ` alongside ${idCalNext.title} (${idCalNext.timeWib})` : ''}.`
          : `Cross-market beta ties ${meta.symbol} to overnight NASDAQ factor dispersion (${
              qById.get('IXIC')?.changePercent.toFixed(2) ?? '0.00'
            }%) and DXY (${dxy ? dxy.price.toFixed(3) : 'unavailable'})${
              asiaCalNext ? `, with ${asiaCalNext.currency} ${asiaCalNext.title} as local catalyst` : ''
            }.`;

    const attributionText =
      meta.region === 'US'
        ? usTop3.length > 0
          ? `Cap-weighted attribution driven by ${usTop3
              .map((s) => `${s.symbol} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`)
              .join(', ')} (${usBreadthTotal - usBreadthNeg}/${usBreadthTotal} leaders positive).`
          : 'Mega-cap technology and cyclical financials govern index-point direction.'
        : meta.region === 'Indonesia'
          ? idxTop3.length > 0
            ? `IHSG heavyweights led by ${idxTop3
                .map((s) => `${s.symbol} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`)
                .join(', ')} (${idxBreadthPos}/${idxBreadthTotal} blue-chips firm; foreign ${
                idxBuyTop ? `bid ${idxBuyTop.symbol} ${idxBuyTop.foreignNetLabel}` : 'flows selective'
              }).`
            : 'Big banks and energy heavyweights govern Jakarta turnover.'
          : `Regional factor flow shows ${ibsLabel} intraday bar strength within ${q?.dayLow ?? '—'}–${q?.dayHigh ?? '—'}.`;

    const openConviction =
      Number.isFinite(openNum) && priceNum > 0
        ? priceNum >= openNum
          ? `buyers defended the ${q?.open ?? '—'} opening print (+${gapPct.toFixed(2)}% gap)`
          : `sellers rejected the ${q?.open ?? '—'} open (${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(2)}% gap)`
        : 'order flow balanced around pivot';

    const beforeOpen = `Pre-Open Thesis (${macroRegimeLabel}): ${macroThesis} DXY sits at ${
      dxy ? dxy.price.toFixed(3) : 'unavailable'
    } (${dxy && dxy.changePercent >= 0 ? '+' : ''}${dxy?.changePercent.toFixed(2) ?? '0.00'}%). Key validation: holding above ${
      q?.support ?? '—'
    } preserves dip-buying toward ${q?.resistance ?? '—'}, while a gap fade below ${q?.support ?? '—'} triggers defensive rotation.`;

    const duringSession = `Intraday Flow & Attribution: ${meta.symbol} trades at ${priceFormatted} (${signStr}${chgPct.toFixed(
      2
    )}%, ${signalTier}, F&G ${fgNow ?? 'unavailable'} ${fgLabel}), where ${openConviction} at ${ibsLabel} range position. ${attributionText}`;

    const afterClose = `Settlement Thesis & Next-Session Scenarios: ${meta.symbol} closed at ${priceFormatted} (${signStr}${chgPct.toFixed(
      2
    )}%, ${ibsLabel} IBS, ${Number.isFinite(q?.w52Pct) ? `${q?.w52Pct}th` : 'unavailable'} 52W range). Bull Case: reclaiming/holding ${q?.open ?? '—'} targets ${
      q?.resistance ?? '—'
    }. Bear Case: failing ${q?.support ?? '—'} signals institutional de-risking into lower demand shelves.`;

    return {
      assetId: meta.id,
      symbol: meta.symbol,
      name: meta.name,
      region: meta.region,
      activePhase,
      sessionStateLabel: q?.sessionStateLabel || getServerSessionInfo(meta.id, nowDate).stateLabel,
      priceFormatted,
      changePercent: chgPct,
      signalTier,
      beforeOpen,
      duringSession,
      afterClose,
      keyLevels: `S1 ${q?.support ?? '—'} · R1 ${q?.resistance ?? '—'}`,
    };
  });

  // Signal tally across all quotes + top impact US & IDX stocks using daily trading composite
  let bullCount = 0;
  let bearCount = 0;
  let neutralCount = 0;
  const parseQuoteNum = (raw?: string) => {
    if (!raw) return NaN;
    const v = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(v) ? v : NaN;
  };
  for (const q of quotes) {
    const tier = computeServerSignalTier({
      assetId: q.id,
      changePercent: q.changePercent,
      price: q.price,
      open: parseQuoteNum(q.open),
      prevClose: q.prevClose,
      dayHigh: parseQuoteNum(q.dayHigh),
      dayLow: parseQuoteNum(q.dayLow),
      series: q.chart1D,
      w52Pct: q.w52Pct,
    });
    if (tier === 'Strong Bull' || tier === 'Bull Signal') bullCount++;
    else if (tier === 'Strong Bear' || tier === 'Bear Signal') bearCount++;
    else neutralCount++;
  }
  for (const s of [...(movers?.us?.impact ?? []), ...(movers?.indonesia?.impact ?? [])]) {
    const tier = computeServerSignalTier({
      assetId: s.symbol,
      changePercent: s.changePercent,
      price: s.price,
      prevClose: s.prevClose,
      dayHigh: s.dayHigh,
      dayLow: s.dayLow,
      series: s.sparklinePoints,
      foreignFlowSide: s.foreignFlowSide,
    });
    if (tier === 'Strong Bull' || tier === 'Bull Signal') bullCount++;
    else if (tier === 'Strong Bear' || tier === 'Bear Signal') bearCount++;
    else neutralCount++;
  }

  const compositeSentiment: 'Bullish' | 'Bearish' | 'Neutral' =
    bullCount >= bearCount + 4 ? 'Bullish' : bearCount >= bullCount + 4 ? 'Bearish' : 'Neutral';

  const spx = qById.get('SPX');
  const ixic = qById.get('IXIC');
  const ihsg = qById.get('IHSG');
  const eido = qById.get('EIDO');

  const sourceNames = Array.from(
    new Set([
      'TradingView Institutional Scanner',
      'Yahoo Finance Historical & Quotes',
      'Coinbase Spot 24h Stats',
      ...stories.slice(0, 12).map((s) => s.publisher),
    ])
  ).slice(0, 8);

  // Extract rumor & narrative themes from live news stories
  const rumorAndCatalystThemes: MarketIntelligencePayload['rumorAndCatalystThemes'] = [];
  const topicCheck = [
    {
      tag: 'Fed & Yields',
      regex: /(fed|fomc|powell|rate|treasury|yield|inflation|cpi|pce|jobs)/i,
    },
    {
      tag: 'AI & Big Tech',
      regex: /(ai|nvidia|chip|semiconductor|nasdaq|tech|apple|microsoft|earnings)/i,
    },
    {
      tag: 'IDX & Rupiah Flow',
      regex: /(ihsg|rupiah|bi|bank indonesia|asing|saham|bbca|bbri|bmri)/i,
    },
    {
      tag: 'Energy & Gold',
      regex: /(oil|crude|opec|brent|wti|gold|bullion|commodity|middle east)/i,
    },
    {
      tag: 'Crypto Liquidity',
      regex: /(bitcoin|btc|eth|ethereum|crypto|etf|sec|stablecoin)/i,
    },
  ];

  for (const bucket of topicCheck) {
    const hit = stories.find((s) => bucket.regex.test(`${s.headline} ${s.summary}`));
    if (hit) {
      rumorAndCatalystThemes.push({
        tag: bucket.tag,
        theme: `${hit.headline} (${hit.publisher})`,
        tone: hit.badgePositive === true ? 'bull' : hit.badgePositive === false ? 'bear' : 'neutral',
      });
    }
  }
  if (rumorAndCatalystThemes.length === 0 && stories.length > 0) {
    for (const s of stories.slice(0, 3)) {
      rumorAndCatalystThemes.push({
        tag: s.publisher,
        theme: s.headline,
        tone: s.badgePositive === true ? 'bull' : s.badgePositive === false ? 'bear' : 'neutral',
      });
    }
  }

  const dataReleaseImplications = events.slice(0, 6).map((ev) => ({
    currency: ev.currency,
    impact: ev.impact,
    title: ev.title,
    timing: ev.timeWib,
    implication: buildMacroImplicationText(ev),
  }));

  const btcTier = btc
    ? computeServerSignalTier({
        assetId: 'BTCUSD',
        changePercent: btc.changePercent,
        price: btc.price,
        prevClose: btc.prevClose,
        series: btc.chart1D,
        w52Pct: btc.w52Pct,
      })
    : 'Neutral';
  const goldTier = gold
    ? computeServerSignalTier({
        assetId: 'XAUUSD',
        changePercent: gold.changePercent,
        price: gold.price,
        prevClose: gold.prevClose,
        series: gold.chart1D,
        w52Pct: gold.w52Pct,
      })
    : 'Neutral';

  const spxFg = spx?.fearGreed7d?.[spx.fearGreed7d.length - 1] ?? 'unavailable';
  const ihsgFg = ihsg?.fearGreed7d?.[ihsg.fearGreed7d.length - 1] ?? 'unavailable';
  const goldFg = gold?.fearGreed7d?.[gold.fearGreed7d.length - 1] ?? 'unavailable';
  const btcFg = btc?.fearGreed7d?.[btc.fearGreed7d.length - 1] ?? 'unavailable';

  const commentaryPoints = [
    `US Factor & Equity Attribution: S&P 500 (${spx?.price.toLocaleString('en-US') ?? '—'}, ${spx && spx.changePercent >= 0 ? '+' : ''}${spx?.changePercent.toFixed(2) ?? '0.00'}%, F&G ${spxFg}) and NASDAQ (${ixic && ixic.changePercent >= 0 ? '+' : ''}${ixic?.changePercent.toFixed(2) ?? '0.00'}%) reflect ${macroRegimeLabel.toLowerCase()}, with index points led by ${usTop3.map((s) => `${s.symbol} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`).join(', ') || 'mega-cap tech'}.`,
    `Indonesia IDX & FX: IHSG (${ihsg?.price.toLocaleString('en-US') ?? '—'}, ${ihsg && ihsg.changePercent >= 0 ? '+' : ''}${ihsg?.changePercent.toFixed(2) ?? '0.00'}%, F&G ${ihsgFg}) and EIDO ($${eido?.price.toFixed(2) ?? '—'}, ${eido && eido.changePercent >= 0 ? '+' : ''}${eido?.changePercent.toFixed(2) ?? '0.00'}%) trade alongside USD/IDR at ${usdidr?.price.toLocaleString('en-US') ?? '—'}; verified Indonesian 10Y yield data is unavailable from a free public source.`,
    `Rates, Dollar & Real-Asset Hedge: US 10Y (${us10y?.price.toFixed(3) ?? '—'}%, 10s30s ${yieldCurveBps === null ? 'unavailable' : `${yieldCurveBps >= 0 ? '+' : ''}${yieldCurveBps.toFixed(1)} bps`}) and DXY (${dxy?.price.toFixed(3) ?? '—'}) set macro discount pressure, keeping Spot Gold at $${gold?.price.toLocaleString('en-US') ?? '—'} (${gold && gold.changePercent >= 0 ? '+' : ''}${gold?.changePercent.toFixed(2) ?? '0.00'}%, F&G ${goldFg}) and WTI at $${wti?.price.toFixed(2) ?? '—'}.`,
    `Crypto Liquidity Beta: Bitcoin (${btc ? `$${btc.price.toLocaleString('en-US')}` : '—'}, ${btc && btc.changePercent >= 0 ? '+' : ''}${btc?.changePercent.toFixed(2) ?? '0.00'}%, ${btcTier}, F&G ${btcFg}) trades as a 24/7 liquidity proxy between S1 ${btc?.support ?? '—'} and R1 ${btc?.resistance ?? '—'}.`,
  ];

  const stocksAndFlowSummary = `Cap-weighted US index drivers center on ${
    usTop3.map((s) => `${s.symbol} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`).join(', ') || 'flagship mega-caps'
  } (${usBreadthTotal - usBreadthNeg}/${usBreadthTotal} heavyweights advancing). In Jakarta, IDX point movers center on ${
    idxTop3.map((s) => `${s.symbol} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`).join(', ') || 'LQ45 leaders'
  }${
    idxBuyTop || idxSellTop
      ? `, with foreign desks ${idxBuyTop ? `accumulating ${idxBuyTop.symbol} (${idxBuyTop.foreignNetLabel})` : 'selective'}${idxSellTop ? ` vs trimming ${idxSellTop.symbol} (${idxSellTop.foreignNetLabel})` : ''}.`
      : '.'
  }`;

  const headline =
    compositeSentiment === 'Bullish'
      ? `Thesis: Risk-on breadth expansion (${bullCount} Bull vs ${bearCount} Bear) as ${usGainer?.symbol ?? 'mega-caps'} lead equity inflows`
      : compositeSentiment === 'Bearish'
        ? `Thesis: Defensive de-risking (${bearCount} Bear vs ${bullCount} Bull) under ${macroRegimeLabel.toLowerCase()} pressure`
        : `Thesis: Cross-asset dispersion (${bullCount} Bull / ${bearCount} Bear) as US (${spx && spx.changePercent >= 0 ? '+' : ''}${spx?.changePercent.toFixed(2) ?? '0.00'}%), IDX (${ihsg && ihsg.changePercent >= 0 ? '+' : ''}${ihsg?.changePercent.toFixed(2) ?? '0.00'}%), and Gold ($${gold?.price.toLocaleString('en-US') ?? '—'}) reprice yield signals`;

  let forwardPrediction = `Dual-Scenario Thesis: Bull Case triggers if US 10Y eases below ${us10y?.support ?? 'unavailable'} and SPX reclaims ${spx?.open ?? spx?.resistance ?? 'opening drive'}, opening rotation back toward ${spx?.resistance ?? 'R1'} and IHSG ${ihsg?.resistance ?? 'R1'}. Bear Case activates if DXY breaks above ${dxy?.resistance ?? 'unavailable'} or SPX loses S1 ${spx?.support ?? 'support'} ahead of ${
    events[0] ? `${events[0].currency} ${events[0].title}` : 'upcoming macro prints'
  }, shifting flows into defensive cash & bullion hedges.`;

  // Deep session condition & movement trigger analysis (deterministic quantitative synthesis)
  const usSessState = getServerSessionInfo('SPX', nowDate);
  const idxSessState = getServerSessionInfo('IHSG', nowDate);
  const activeSessionDesc = [
    `US (${usSessState.stateLabel})`,
    `IDX (${idxSessState.stateLabel})`,
    '24/7 FX, Bullion & Crypto active',
  ].join(' · ');

  const topEvent = events[0];
  const topNews = stories[0];
  const triggerDrivers: string[] = [];
  if (dxy) {
    triggerDrivers.push(
      `DXY ${dxy.price.toFixed(3)} (${dxy.changePercent >= 0 ? '+' : ''}${dxy.changePercent.toFixed(2)}%)`
    );
  }
  if (us10y) {
    triggerDrivers.push(
      `US10Y ${us10y.price.toFixed(3)}% (${us10y.changePercent >= 0 ? '+' : ''}${us10y.changePercent.toFixed(2)}%)`
    );
  }
  if (usLeader) {
    triggerDrivers.push(
      `${usLeader.symbol} (${usLeader.changePercent >= 0 ? '+' : ''}${usLeader.changePercent.toFixed(2)}%)`
    );
  }
  if (idxLeader) {
    triggerDrivers.push(
      `${idxLeader.symbol} (${idxLeader.changePercent >= 0 ? '+' : ''}${idxLeader.changePercent.toFixed(2)}%)`
    );
  }
  if (topEvent) {
    triggerDrivers.push(
      topEvent.actual && topEvent.actual !== 'Pending' && topEvent.actual !== '—'
        ? `${topEvent.currency} ${topEvent.title} (${topEvent.actual} vs ${topEvent.forecast})`
        : `${topEvent.currency} ${topEvent.title} (${topEvent.timeWib})`
    );
  }

  let sessionConditionAndTrigger = `Session Condition (${macroRegimeLabel}): ${activeSessionDesc}. Primary movement triggers stem from ${
    triggerDrivers.slice(0, 4).join(', ') || 'rate expectations and index heavyweight positioning'
  }${topNews ? ` alongside headline focus on "${topNews.headline.slice(0, 88)}"` : ''}.`;

  // Strictly ONE concise sentence summarizing the trigger and cross-asset positioning
  const buildOneSentence = () => {
    const spxStr = spx ? `S&P 500 (${spx.changePercent >= 0 ? '+' : ''}${spx.changePercent.toFixed(2)}%)` : 'US equities';
    const ihsgStr = ihsg ? `IHSG (${ihsg.changePercent >= 0 ? '+' : ''}${ihsg.changePercent.toFixed(2)}%)` : 'IDX';
    const dxyStr = dxy ? `DXY at ${dxy.price.toFixed(2)}` : 'the dollar';
    const goldStr = gold ? `Gold at $${gold.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'bullion';
    const btcStr = btc ? `Bitcoin at $${btc.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'crypto';
    const catCue = topEvent
      ? `ahead of ${topEvent.currency} ${topEvent.title}`
      : `under ${macroRegimeLabel.toLowerCase()}`;
    return `${spxStr} and ${ihsgStr} are recalibrating ${catCue}, while ${dxyStr} steers USD/IDR near ${
      usdidr ? Math.round(usdidr.price).toLocaleString('en-US') : 'spot'
    } alongside ${goldStr} and ${btcStr}.`;
  };

  let oneSentenceSummary = buildOneSentence();

  const aiRefined = false;
  const finalHeadline = headline;
  const finalCommentary = commentaryPoints;

  const result: MarketIntelligencePayload = {
    updatedAt: new Date(now).toISOString(),
    headline: finalHeadline,
    compositeSentiment,
    signalTally: { bullCount, bearCount, neutralCount },
    sourcesCount: sourceNames.length,
    sourceNames,
    commentaryPoints: finalCommentary,
    rumorAndCatalystThemes,
    dataReleaseImplications,
    stocksAndFlowSummary,
    forwardPrediction,
    sessionConditionAndTrigger,
    oneSentenceSummary,
    indexSessions,
    aiRefined,
  };

  intelligenceCache.entry = { data: result, expiresAt: now + (aiRefined ? 300_000 : 45_000) };
  return result;
  });
}

export interface HeatmapStockItem {
  symbol: string;
  yahooSymbol: string;
  name: string;
  market: 'US' | 'ID';
  exchange: string;
  currency: 'USD' | 'IDR';
  sector: string;
  price: number;
  prevClose: number;
  changePercent: number;
  marketCap: number;
  marketCapNative: number;
  volumeRaw: number;
  marketCapLabel: string;
}

export interface MarketHeatmapResponse {
  us: HeatmapStockItem[];
  indonesia: HeatmapStockItem[];
  sectorsUs: string[];
  sectorsIndonesia: string[];
  updatedAt: string;
}

const US_DUAL_CLASS_SKIP = new Set([
  'GOOG', 'BRK.A', 'FOXA', 'NWSA', 'PARAA', 'UHAL.B', 'LEN.B', 'BF.A', 'HEI.A',
]);

const HEATMAP_SECTOR_OVERRIDES: Record<string, string> = {
  // Indonesia IDX accurate sector classification
  BBCA: 'Financials',
  BBRI: 'Financials',
  BMRI: 'Financials',
  BBNI: 'Financials',
  BRIS: 'Financials',
  ASII: 'Industrials',
  UNTR: 'Industrials',
  PANI: 'Industrials',
  BREN: 'Energy & Materials',
  TPIA: 'Energy & Materials',
  AMMN: 'Energy & Materials',
  ADRO: 'Energy & Materials',
  BYAN: 'Energy & Materials',
  CUAN: 'Energy & Materials',
  PTBA: 'Energy & Materials',
  ANTM: 'Energy & Materials',
  MDKA: 'Energy & Materials',
  INCO: 'Energy & Materials',
  TLKM: 'Telecom & Utilities',
  ISAT: 'Telecom & Utilities',
  EXCL: 'Telecom & Utilities',
  PGAS: 'Telecom & Utilities',
  DNET: 'Telecom & Utilities',
  DCII: 'Technology',
  GOTO: 'Technology',
  ICBP: 'Consumer',
  INDF: 'Consumer',
  UNVR: 'Consumer',
  AMRT: 'Consumer',
  HMSP: 'Consumer',
  GGRM: 'Consumer',
  KLBF: 'Healthcare',
  MIKA: 'Healthcare',
  SILO: 'Healthcare',
  // US flagship accurate grouping
  GOOGL: 'Technology',
  META: 'Technology',
  NFLX: 'Telecom & Utilities',
  TMUS: 'Telecom & Utilities',
  AMZN: 'Consumer',
  TSLA: 'Consumer',
  WMT: 'Consumer',
  COST: 'Consumer',
  HD: 'Consumer',
};

function normalizeHeatmapSector(symbol: string, rawSector: string, rawIndustry = ''): string {
  const override = HEATMAP_SECTOR_OVERRIDES[symbol];
  if (override) return override;

  const combined = `${rawSector} ${rawIndustry}`.toLowerCase();
  if (combined.includes('financ') || combined.includes('bank') || combined.includes('insurance') || combined.includes('reit')) {
    return 'Financials';
  }
  if (combined.includes('health') || combined.includes('pharma') || combined.includes('biotech') || combined.includes('medical') || combined.includes('hospital')) {
    return 'Healthcare';
  }
  if (
    combined.includes('energy') ||
    combined.includes('oil') ||
    combined.includes('gas') ||
    combined.includes('mineral') ||
    combined.includes('metal') ||
    combined.includes('mining') ||
    combined.includes('coal') ||
    combined.includes('chemical') ||
    combined.includes('material')
  ) {
    return 'Energy & Materials';
  }
  if (combined.includes('telecom') || combined.includes('utilit') || combined.includes('wireless') || combined.includes('electric') || combined.includes('renewable')) {
    return 'Telecom & Utilities';
  }
  if (combined.includes('retail') || combined.includes('consumer') || combined.includes('food') || combined.includes('beverage') || combined.includes('tobacco') || combined.includes('apparel')) {
    return 'Consumer';
  }
  if (combined.includes('tech') || combined.includes('electronic') || combined.includes('software') || combined.includes('semiconductor') || combined.includes('internet')) {
    return 'Technology';
  }
  if (combined.includes('manufact') || combined.includes('industr') || combined.includes('transport') || combined.includes('aerospace') || combined.includes('machinery') || combined.includes('auto') || combined.includes('real estate')) {
    return 'Industrials';
  }
  return 'Diversified';
}

function formatMarketCapCompact(capNative: number, currency: 'USD' | 'IDR'): string {
  if (!Number.isFinite(capNative) || capNative <= 0) return '—';
  if (currency === 'IDR') {
    if (capNative >= 1e12) return `Rp ${(capNative / 1e12).toFixed(1)}T`;
    if (capNative >= 1e9) return `Rp ${(capNative / 1e9).toFixed(0)}B`;
    return `Rp ${Math.round(capNative / 1e6)}M`;
  }
  if (capNative >= 1e12) return `$${(capNative / 1e12).toFixed(2)}T`;
  if (capNative >= 1e9) return `$${(capNative / 1e9).toFixed(1)}B`;
  return `$${(capNative / 1e6).toFixed(0)}M`;
}

const US_HEATMAP_META: Record<string, { sector: string }> = {
  NVDA: { sector: 'Technology' },
  AAPL: { sector: 'Technology' },
  MSFT: { sector: 'Technology' },
  AMZN: { sector: 'Consumer' },
  GOOGL: { sector: 'Technology' },
  META: { sector: 'Telecom & Utilities' },
  TSLA: { sector: 'Consumer' },
  AVGO: { sector: 'Technology' },
  LLY: { sector: 'Healthcare' },
  JPM: { sector: 'Financials' },
  V: { sector: 'Financials' },
  XOM: { sector: 'Energy & Materials' },
  UNH: { sector: 'Healthcare' },
  ORCL: { sector: 'Technology' },
  NFLX: { sector: 'Telecom & Utilities' },
  AMD: { sector: 'Technology' },
  PLTR: { sector: 'Technology' },
  MU: { sector: 'Technology' },
};

const IDX_HEATMAP_META: Record<string, { sector: string }> = {
  BBCA: { sector: 'Financials' },
  BREN: { sector: 'Energy & Materials' },
  BBRI: { sector: 'Financials' },
  TPIA: { sector: 'Energy & Materials' },
  AMMN: { sector: 'Energy & Materials' },
  BMRI: { sector: 'Financials' },
  TLKM: { sector: 'Telecom & Utilities' },
  ASII: { sector: 'Industrials' },
  BBNI: { sector: 'Financials' },
  ICBP: { sector: 'Consumer' },
  BRIS: { sector: 'Financials' },
  ADRO: { sector: 'Energy & Materials' },
  UNTR: { sector: 'Industrials' },
  INDF: { sector: 'Consumer' },
  KLBF: { sector: 'Healthcare' },
  ISAT: { sector: 'Telecom & Utilities' },
  GOTO: { sector: 'Technology' },
  MDKA: { sector: 'Energy & Materials' },
  PTBA: { sector: 'Energy & Materials' },
  ANTM: { sector: 'Energy & Materials' },
  PGAS: { sector: 'Telecom & Utilities' },
  EXCL: { sector: 'Telecom & Utilities' },
};

async function fetchTradingViewHeatmapScan(
  region: 'america' | 'indonesia',
  usdIdrRate: number,
  limit = 48
): Promise<HeatmapStockItem[]> {
  try {
    const isId = region === 'indonesia';
    const minCap = isId ? 8e12 : 1.5e10;
    const res = await fetch(`https://scanner.tradingview.com/${region}/scan`, {
      method: 'POST',
      headers: {
        ...UA_HEADERS,
        'Content-Type': 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
      body: JSON.stringify({
        filter: [
          { left: 'type', operation: 'equal', right: 'stock' },
          { left: 'subtype', operation: 'equal', right: 'common' },
          { left: 'close', operation: 'greater', right: isId ? 50 : 5 },
          { left: 'market_cap_basic', operation: 'greater', right: minCap },
        ],
        options: { lang: 'en' },
        markets: [region],
        columns: [
          'name',
          'description',
          'close',
          'change',
          'change_abs',
          'volume',
          'exchange',
          'market_cap_basic',
          'sector',
          'industry',
        ],
        sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
        range: [0, limit + 16],
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{ s?: string; d?: Array<string | number | null> }>;
    };

    const items: HeatmapStockItem[] = [];
    const seen = new Set<string>();
    const seenRoots = new Set<string>();
    for (const row of json.data ?? []) {
      const d = row.d;
      if (!d || d.length < 9) continue;
      const symbol = String(d[0] || '').trim().toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      // Exclude preferred shares, dual-class duplicates, rights, warrants, or depositary duplicates
      if (!isId && (US_DUAL_CLASS_SKIP.has(symbol) || /[.-](P|PR|WS|RT|UN)[A-Z0-9]*$/i.test(symbol))) {
        continue;
      }
      const rawName = String(d[1] || symbol).replace(/\s+Tbk\.?$/i, ' Tbk');
      if (/\b(Preferred|Depositary|Series\s+[A-Z]|ADR)\b/i.test(rawName)) continue;

      const rootNameKey = rawName
        .toLowerCase()
        .replace(/,?\s*(inc\.?|corp\.?|corporation|ltd\.?|llc|plc|co\.?|tbk|class\s+[a-c]|cl\s+[a-c]).*$/i, '')
        .replace(/[^a-z0-9]/g, '');
      if (rootNameKey.length >= 4 && seenRoots.has(`${region}-${rootNameKey}`)) continue;

      const name = rawName.slice(0, 42);
      const close = Number(d[2]);
      const changePct = Number(d[3]);
      const changeAbs = Number(d[4] ?? 0);
      const vol = Number(d[5] ?? 0);
      const exchange = isId ? 'IDX · Jakarta' : String(d[6] || 'NYSE/NASDAQ');
      const mcapNative = Number(d[7] ?? 0);
      const rawSector = String(d[8] || '');
      const rawIndustry = String(d[9] || '');
      if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(changePct) || !Number.isFinite(mcapNative) || mcapNative <= 0) {
        continue;
      }

      seen.add(symbol);
      if (rootNameKey.length >= 4) seenRoots.add(`${region}-${rootNameKey}`);
      const price = isId ? Math.round(close) : Number(close.toFixed(2));
      const prevClose = isId
        ? Math.max(1, Math.round(close - changeAbs))
        : Number(Math.max(0.01, close - changeAbs).toFixed(2));
      const marketCapUsd = isId ? mcapNative / Math.max(10_000, usdIdrRate) : mcapNative;

      items.push({
        symbol,
        yahooSymbol: isId ? `${symbol}.JK` : symbol,
        name,
        market: isId ? 'ID' : 'US',
        exchange,
        currency: isId ? 'IDR' : 'USD',
        sector: normalizeHeatmapSector(symbol, rawSector, rawIndustry),
        price,
        prevClose,
        changePercent: Number(changePct.toFixed(2)),
        marketCap: marketCapUsd,
        marketCapNative: mcapNative,
        volumeRaw: Number.isFinite(vol) ? vol : 0,
        marketCapLabel: formatMarketCapCompact(mcapNative, isId ? 'IDR' : 'USD'),
      });
      if (items.length >= limit) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchMarketHeatmap(): Promise<MarketHeatmapResponse> {
  const now = Date.now();
  if (heatmapCache.entry) {
    if (heatmapCache.entry.expiresAt > now) {
      return heatmapCache.entry.data;
    }
    if (now - heatmapCache.entry.expiresAt < 900_000) {
      void fetchMarketHeatmapFresh().catch(() => null);
      return heatmapCache.entry.data;
    }
  }
  return fetchMarketHeatmapFresh();
}

async function fetchMarketHeatmapFresh(): Promise<MarketHeatmapResponse> {
  const now = Date.now();
  return coalesceInFlight('market-heatmap', heatmapCache.entry?.data, async () => {

  // Resolve current USD/IDR conversion factor so cross-market cap comparisons stay accurate
  let usdIdrRate = 0;
  try {
    const q = await fetchLiveQuotes();
    const idrQuote = q.quotes.find((item) => item.id === 'USDIDR');
    if (idrQuote && idrQuote.price > 10_000) {
      usdIdrRate = idrQuote.price;
    }
  } catch {
    // Leave conversion unavailable; do not inject an assumed USD/IDR rate.
  }

  const [tvUs, tvId] = await Promise.all([
    fetchTradingViewHeatmapScan('america', usdIdrRate, 48),
    usdIdrRate > 0 ? fetchTradingViewHeatmapScan('indonesia', usdIdrRate, 36) : Promise.resolve([]),
  ]);

  let usItems = tvUs;
  let idItems = tvId;

  // Fallback to Yahoo Finance direct baskets + calibrated cap weights if TradingView throttles
  if (usItems.length < 10) {
    const yahooUs = await fetchYahooDirectBasket('US');
    usItems = yahooUs.map((m) => {
      const meta = US_HEATMAP_META[m.symbol] ?? { sector: 'Technology' };
      return {
        symbol: m.symbol,
        yahooSymbol: m.symbol,
        name: m.name,
        market: 'US',
        exchange: m.exchange,
        currency: 'USD',
        sector: meta.sector,
        price: m.price,
        prevClose: m.prevClose,
        changePercent: m.changePercent,
        marketCap: 0,
        marketCapNative: 0,
        volumeRaw: m.volumeRaw,
        marketCapLabel: 'Not available from this public quote source',
      };
    });
  }

  if (idItems.length < 10) {
    const yahooId = await fetchYahooDirectBasket('ID');
    idItems = yahooId.map((m) => {
      const meta = IDX_HEATMAP_META[m.symbol] ?? { sector: 'Financials' };
      return {
        symbol: m.symbol,
        yahooSymbol: `${m.symbol}.JK`,
        name: m.name,
        market: 'ID',
        exchange: 'IDX · Jakarta',
        currency: 'IDR',
        sector: meta.sector,
        price: m.price,
        prevClose: m.prevClose,
        changePercent: m.changePercent,
        marketCap: 0,
        marketCapNative: 0,
        volumeRaw: m.volumeRaw,
        marketCapLabel: 'Not available from this public quote source',
      };
    });
  }

  const sortSectors = (list: HeatmapStockItem[]) => {
    const totals = new Map<string, number>();
    for (const item of list) {
      totals.set(item.sector, (totals.get(item.sector) ?? 0) + item.marketCap);
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sec]) => sec);
  };

  const result: MarketHeatmapResponse = {
    us: usItems.slice(0, 48),
    indonesia: idItems.slice(0, 36),
    sectorsUs: sortSectors(usItems),
    sectorsIndonesia: sortSectors(idItems),
    updatedAt: new Date(now).toISOString(),
  };

  heatmapCache.entry = { data: result, expiresAt: now + 20_000 };
  return result;
  });
}

export type ShareScheduleSlot = 'morning_0530' | 'afternoon_1630';

export interface ShareSnapshotAsset {
  id: string;
  symbol: string;
  shortName: string;
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  decimals: number;
  currencyPrefix?: string;
  unitSuffix?: string;
  support: string;
  resistance: string;
  barTimestampIso: string;
  barTimeWib: string;
}

export interface ShareSnapshotResponse {
  slot: ShareScheduleSlot;
  dateKey: string;
  dateLabel: string;
  timeSlotLabel: string;
  targetTimestampIso: string;
  targetEpochMs: number;
  editionTitle: string;
  marketSummary: string;
  aiGenerated: boolean;
  assets: Record<string, ShareSnapshotAsset>;
  updatedAt: string;
}

const SHARE_SLOT_META: Record<
  string,
  { symbol: string; shortName: string; yahooSymbol: string; decimals: number; currencyPrefix?: string; fallbackTz: string }
> = {
  SPX: { symbol: 'SPX', shortName: 'S&P 500', yahooSymbol: '^GSPC', decimals: 2, fallbackTz: 'America/New_York' },
  IXIC: { symbol: 'IXIC', shortName: 'NASDAQ Composite', yahooSymbol: '^IXIC', decimals: 2, fallbackTz: 'America/New_York' },
  DJI: { symbol: 'DJI', shortName: 'Dow Jones', yahooSymbol: '^DJI', decimals: 2, fallbackTz: 'America/New_York' },
  IHSG: { symbol: 'IHSG', shortName: 'IDX Composite', yahooSymbol: '^JKSE', decimals: 2, fallbackTz: 'Asia/Jakarta' },
  BTCUSD: { symbol: 'BTC/USD', shortName: 'Bitcoin', yahooSymbol: 'BTC-USD', decimals: 2, currencyPrefix: '$', fallbackTz: 'UTC' },
  DXY: { symbol: 'DXY', shortName: 'US Dollar Index', yahooSymbol: 'DX-Y.NYB', decimals: 3, fallbackTz: 'America/New_York' },
  USDIDR: { symbol: 'USD/IDR', shortName: 'Rupiah Spot', yahooSymbol: 'IDR=X', decimals: 2, fallbackTz: 'Asia/Jakarta' },
  XAUUSD: { symbol: 'XAU/USD', shortName: 'Spot Gold', yahooSymbol: 'GC=F', decimals: 2, currencyPrefix: '$', fallbackTz: 'America/New_York' },
};

const shareSnapshotCache = new Map<string, CacheEntry<ShareSnapshotResponse>>();

function resolveShareTargetTimestamp(now: Date, slot: ShareScheduleSlot) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '11');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '20');

  const targetHourWib = slot === 'morning_0530' ? 5 : 16;
  const targetMinuteWib = 30;

  // Jakarta is fixed UTC+7 year-round (zero DST)
  let targetEpochMs = Date.UTC(year, month - 1, day, targetHourWib - 7, targetMinuteWib, 0);
  if (targetEpochMs > now.getTime()) {
    targetEpochMs -= 86_400_000;
  }

  const targetDate = new Date(targetEpochMs);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(targetDate);
  const dateKey = `${dateParts.find((p) => p.type === 'year')?.value}-${dateParts.find((p) => p.type === 'month')?.value}-${dateParts.find((p) => p.type === 'day')?.value}`;

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(targetDate);

  return {
    targetEpochMs,
    targetTimestampIso: targetDate.toISOString(),
    dateKey,
    dateLabel,
    timeSlotLabel: slot === 'morning_0530' ? '05:30 WIB' : '16:30 WIB',
  };
}

function formatDateInTimezone(epochMs: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toISOString().slice(0, 10);
  }
}

function formatWibShortTime(epochMs: number): string {
  return (
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(epochMs)) + ' WIB'
  );
}

function computeSnapshotSupportResistance(
  price: number,
  dayHigh: number,
  dayLow: number,
  decimals: number,
  prefix = ''
): { support: string; resistance: string } {
  const high = Math.max(price, dayHigh);
  const low = Math.min(price, dayLow);
  const span = Math.max(0, high - low);
  const pivot = (high + low + price) / 3;
  const calcSupport = 2 * pivot - high;
  const calcResistance = 2 * pivot - low;
  if (span <= 0) return { support: '—', resistance: '—' };
  const supportNum = Math.min(calcSupport, low, price * 0.996);
  const resistanceNum = Math.max(calcResistance, high, price * 1.004);
  return {
    support: formatStatNumber(supportNum, decimals, prefix, ''),
    resistance: formatStatNumber(resistanceNum, decimals, prefix, ''),
  };
}

interface OhlcBar {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

async function fetchYahooChartBars(
  yahooSymbol: string,
  range: string,
  interval: string
): Promise<{ tz: string | null; metaPrice: number | null; bars: OhlcBar[] }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        yahooSymbol
      )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`,
      { headers: UA_HEADERS, signal: AbortSignal.timeout(6500) }
    );
    if (!res.ok) return { tz: null, metaPrice: null, bars: [] };
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { exchangeTimezoneName?: string; regularMarketPrice?: number };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
              close?: Array<number | null>;
            }>;
          };
        }>;
      };
    };
    const item = json.chart?.result?.[0];
    const ts = item?.timestamp ?? [];
    const q = item?.indicators?.quote?.[0];
    const bars: OhlcBar[] = [];
    for (let i = 0; i < ts.length; i++) {
      const close = q?.close?.[i];
      if (typeof close !== 'number' || !Number.isFinite(close) || close <= 0) continue;
      const open = typeof q?.open?.[i] === 'number' && (q.open[i] as number) > 0 ? (q.open[i] as number) : close;
      const high = typeof q?.high?.[i] === 'number' && (q.high[i] as number) > 0 ? (q.high[i] as number) : Math.max(open, close);
      const low = typeof q?.low?.[i] === 'number' && (q.low[i] as number) > 0 ? (q.low[i] as number) : Math.min(open, close);
      bars.push({
        t: ts[i] * 1000,
        open,
        high,
        low,
        close,
      });
    }
    return {
      tz: item?.meta?.exchangeTimezoneName ?? null,
      metaPrice:
        typeof item?.meta?.regularMarketPrice === 'number'
          ? item.meta.regularMarketPrice
          : null,
      bars,
    };
  } catch {
    return { tz: null, metaPrice: null, bars: [] };
  }
}

async function fetchCoinbaseHistoricalBtcAt(
  targetEpochMs: number
): Promise<ShareSnapshotAsset | null> {
  try {
    const res = await fetch(
      'https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=900',
      { headers: UA_HEADERS, signal: AbortSignal.timeout(5500) }
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as Array<[number, number, number, number, number, number]>;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const bars = raw
      .filter((c) => Array.isArray(c) && c.length >= 5 && c[0] * 1000 <= targetEpochMs)
      .map((c) => ({
        t: c[0] * 1000,
        low: Number(c[1]),
        high: Number(c[2]),
        open: Number(c[3]),
        close: Number(c[4]),
      }))
      .filter((b) => Number.isFinite(b.close) && b.close > 0)
      .sort((a, b) => a.t - b.t);

    if (bars.length === 0) return null;
    const latest = bars[bars.length - 1];
    const targetPrevMs = targetEpochMs - 86_400_000;
    let prevBar = bars[0];
    let bestDiff = Infinity;
    for (const b of bars) {
      const diff = Math.abs(b.t - targetPrevMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        prevBar = b;
      }
    }

    const window24h = bars.filter((b) => b.t >= targetPrevMs && b.t <= latest.t);
    const sessionHigh =
      window24h.length > 0 ? Math.max(...window24h.map((b) => b.high)) : latest.high;
    const sessionLow =
      window24h.length > 0 ? Math.min(...window24h.map((b) => b.low)) : latest.low;

    const price = Number(latest.close.toFixed(2));
    const prevClose = Number(prevBar.close.toFixed(2));
    const changeValue = Number((price - prevClose).toFixed(2));
    const changePercent = Number(
      (((price - prevClose) / Math.max(1e-6, prevClose)) * 100).toFixed(2)
    );
    const { support, resistance } = computeSnapshotSupportResistance(
      price,
      sessionHigh,
      sessionLow,
      2,
      '$'
    );

    return {
      id: 'BTCUSD',
      symbol: 'BTC/USD',
      shortName: 'Bitcoin',
      price,
      prevClose,
      changeValue,
      changePercent,
      decimals: 2,
      currencyPrefix: '$',
      support,
      resistance,
      barTimestampIso: new Date(latest.t).toISOString(),
      barTimeWib: formatWibShortTime(latest.t),
    };
  } catch {
    return null;
  }
}

function buildDeterministicTimestampSummary(
  slot: ShareScheduleSlot,
  timeSlotLabel: string,
  dateLabel: string,
  map: Record<string, ShareSnapshotAsset>
): string {
  const fmtSigned = (v?: ShareSnapshotAsset) =>
    v ? `${v.changePercent >= 0 ? '+' : ''}${v.changePercent.toFixed(2)}%` : '—';
  const fmtPx = (v?: ShareSnapshotAsset) =>
    v
      ? `${v.currencyPrefix ?? ''}${v.price.toLocaleString('en-US', {
          minimumFractionDigits: v.decimals,
          maximumFractionDigits: v.decimals,
        })}`
      : '—';

  const ihsg = map.IHSG;
  const btc = map.BTCUSD;
  const dxy = map.DXY;
  const usdidr = map.USDIDR;
  const gold = map.XAUUSD;

  if (slot === 'morning_0530') {
    const spx = map.SPX;
    const ixic = map.IXIC;
    return `At ${timeSlotLabel} (${dateLabel}), Wall Street settled with S&P 500 at ${fmtPx(spx)} (${fmtSigned(
      spx
    )}) and NASDAQ (${fmtSigned(ixic)}) while IHSG holds ${fmtPx(ihsg)} (${fmtSigned(
      ihsg
    )}) ahead of the Jakarta open, with DXY at ${fmtPx(dxy)}, USD/IDR at ${fmtPx(
      usdidr
    )}, Gold at ${fmtPx(gold)} (${fmtSigned(gold)}), and Bitcoin at ${fmtPx(btc)} (${fmtSigned(
      btc
    )}).`;
  }

  return `At ${timeSlotLabel} (${dateLabel}), IHSG wrapped Jakarta trade at ${fmtPx(ihsg)} (${fmtSigned(
    ihsg
  )}) alongside USD/IDR at ${fmtPx(usdidr)} (${fmtSigned(usdidr)}), while DXY trades near ${fmtPx(
    dxy
  )} (${fmtSigned(dxy)}) with Gold at ${fmtPx(gold)} (${fmtSigned(gold)}) and Bitcoin at ${fmtPx(
    btc
  )} (${fmtSigned(btc)}).`;
}

export async function fetchScheduledShareSnapshot(
  slot: ShareScheduleSlot,
  forceRefresh = false
): Promise<ShareSnapshotResponse> {
  const now = new Date();
  const timing = resolveShareTargetTimestamp(now, slot);
  const cacheKey = `${timing.dateKey}:${slot}`;

  const cached = shareSnapshotCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > now.getTime()) {
    return cached.data;
  }

  return coalesceInFlight(`share-snapshot:${cacheKey}`, cached?.data, async () => {
    const targetIds =
      slot === 'morning_0530'
        ? ['SPX', 'IXIC', 'DJI', 'IHSG', 'BTCUSD', 'DXY', 'USDIDR', 'XAUUSD']
        : ['IHSG', 'BTCUSD', 'DXY', 'USDIDR', 'XAUUSD'];

    const [tvGlobalMap, liveQuotesPayload, calPayload, newsPayload] = await Promise.all([
      fetchTradingViewGlobalQuotes(),
      fetchLiveQuotes().catch(() => ({ quotes: [] as LiveQuotePatch[], updatedAt: '' })),
      fetchLiveCalendar().catch(() => ({ events: [] as LiveCalendarItem[], nextCatalyst: null, source: '', updatedAt: '' })),
      fetchLiveNews().catch(() => ({ stories: [] as LiveNewsItem[], updatedAt: '' })),
    ]);

    const liveById = new Map(liveQuotesPayload.quotes.map((q) => [q.id, q]));

    // Fetch spot gold basis once (OANDA Spot XAUUSD minus GC=F latest price)
    let goldSpotBasis = 0;
    const tvGold = tvGlobalMap.get('XAUUSD');

    const assetEntries = await Promise.all(
      targetIds.map(async (id): Promise<[string, ShareSnapshotAsset | null]> => {
        if (id === 'BTCUSD') {
          const btcSnap = await fetchCoinbaseHistoricalBtcAt(timing.targetEpochMs);
          if (btcSnap) return [id, btcSnap];
          const liveBtc = liveById.get('BTCUSD');
          if (liveBtc) {
            return [
              id,
              {
                id: 'BTCUSD',
                symbol: 'BTC/USD',
                shortName: 'Bitcoin',
                price: liveBtc.price,
                prevClose: liveBtc.prevClose,
                changeValue: liveBtc.changeValue,
                changePercent: liveBtc.changePercent,
                decimals: 2,
                currencyPrefix: '$',
                support: liveBtc.support,
                resistance: liveBtc.resistance,
                barTimestampIso: new Date(liveBtc.updatedAtEpoch || timing.targetEpochMs).toISOString(),
                barTimeWib: formatWibShortTime(liveBtc.updatedAtEpoch || timing.targetEpochMs),
              },
            ];
          }
          return [id, null];
        }

        const spec = SHARE_SLOT_META[id];
        if (!spec) return [id, null];

        const [intraday, daily] = await Promise.all([
          fetchYahooChartBars(spec.yahooSymbol, '5d', '15m'),
          fetchYahooChartBars(spec.yahooSymbol, '1mo', '1d'),
        ]);

        const tz = intraday.tz || daily.tz || spec.fallbackTz;
        const intradayBefore = intraday.bars.filter((b) => b.t <= timing.targetEpochMs);

        if (id === 'XAUUSD' && tvGold && intraday.bars.length > 0) {
          const latestGcf = intraday.bars[intraday.bars.length - 1].close;
          const diff = tvGold.price - latestGcf;
          if (Number.isFinite(diff) && Math.abs(diff) / latestGcf <= 0.035) {
            goldSpotBasis = diff;
          }
        }

        if (intradayBefore.length > 0) {
          const latest = intradayBefore[intradayBefore.length - 1];
          const activeDateStr = formatDateInTimezone(latest.t, tz);
          const sameSessionBars = intradayBefore.filter(
            (b) => formatDateInTimezone(b.t, tz) === activeDateStr
          );
          const earlierSessionBars = intradayBefore.filter(
            (b) => formatDateInTimezone(b.t, tz) < activeDateStr
          );
          const prev15mClose =
            earlierSessionBars.length > 0
              ? earlierSessionBars[earlierSessionBars.length - 1].close
              : undefined;

          const dailyBefore = daily.bars.filter(
            (d) => formatDateInTimezone(d.t, tz) < activeDateStr
          );
          const priorDaily = dailyBefore[dailyBefore.length - 1];

          // For IDR=X Yahoo occasionally prints an off-market 1d settlement outlier (>1.5% gap); keep genuine daily moves for DXY & XAUUSD
          let basePrev = priorDaily?.close ?? prev15mClose ?? sameSessionBars[0]?.open ?? latest.close;
          if (
            id === 'USDIDR' &&
            typeof prev15mClose === 'number' &&
            prev15mClose > 0 &&
            priorDaily?.close &&
            Math.abs(priorDaily.close - prev15mClose) / prev15mClose > 0.015
          ) {
            basePrev = prev15mClose;
          }

          const rawPrice = latest.close + (id === 'XAUUSD' ? goldSpotBasis : 0);
          const rawPrev = basePrev + (id === 'XAUUSD' ? goldSpotBasis : 0);

          const sessionHigh =
            Math.max(...sameSessionBars.map((b) => b.high)) +
            (id === 'XAUUSD' ? goldSpotBasis : 0);
          const sessionLow =
            Math.min(...sameSessionBars.map((b) => b.low)) +
            (id === 'XAUUSD' ? goldSpotBasis : 0);

          const price = Number(rawPrice.toFixed(spec.decimals));
          const prevClose = Number(rawPrev.toFixed(spec.decimals));
          const changeValue = Number((price - prevClose).toFixed(spec.decimals >= 3 ? spec.decimals : 2));
          const changePercent = Number(
            (((price - prevClose) / Math.max(1e-6, prevClose)) * 100).toFixed(2)
          );
          const { support, resistance } = computeSnapshotSupportResistance(
            price,
            sessionHigh,
            sessionLow,
            spec.decimals,
            spec.currencyPrefix ?? ''
          );

          return [
            id,
            {
              id,
              symbol: spec.symbol,
              shortName: spec.shortName,
              price,
              prevClose,
              changeValue,
              changePercent,
              decimals: spec.decimals,
              currencyPrefix: spec.currencyPrefix,
              support,
              resistance,
              barTimestampIso: new Date(latest.t).toISOString(),
              barTimeWib: formatWibShortTime(latest.t),
            },
          ];
        }

        // Daily fallback if 15m window has zero bars for holiday edge cases
        const dailyValid = daily.bars.filter((d) => d.t <= timing.targetEpochMs);
        if (dailyValid.length >= 2) {
          const latest = dailyValid[dailyValid.length - 1];
          const prev = dailyValid[dailyValid.length - 2];
          const rawPrice = latest.close + (id === 'XAUUSD' ? goldSpotBasis : 0);
          const rawPrev = prev.close + (id === 'XAUUSD' ? goldSpotBasis : 0);
          const price = Number(rawPrice.toFixed(spec.decimals));
          const prevClose = Number(rawPrev.toFixed(spec.decimals));
          const changeValue = Number((price - prevClose).toFixed(spec.decimals >= 3 ? spec.decimals : 2));
          const changePercent = Number(
            (((price - prevClose) / Math.max(1e-6, prevClose)) * 100).toFixed(2)
          );
          const { support, resistance } = computeSnapshotSupportResistance(
            price,
            latest.high + (id === 'XAUUSD' ? goldSpotBasis : 0),
            latest.low + (id === 'XAUUSD' ? goldSpotBasis : 0),
            spec.decimals,
            spec.currencyPrefix ?? ''
          );
          return [
            id,
            {
              id,
              symbol: spec.symbol,
              shortName: spec.shortName,
              price,
              prevClose,
              changeValue,
              changePercent,
              decimals: spec.decimals,
              currencyPrefix: spec.currencyPrefix,
              support,
              resistance,
              barTimestampIso: new Date(latest.t).toISOString(),
              barTimeWib: formatWibShortTime(latest.t),
            },
          ];
        }

        const liveFallback = liveById.get(id);
        if (liveFallback) {
          return [
            id,
            {
              id,
              symbol: spec.symbol,
              shortName: spec.shortName,
              price: liveFallback.price,
              prevClose: liveFallback.prevClose,
              changeValue: liveFallback.changeValue,
              changePercent: liveFallback.changePercent,
              decimals: spec.decimals,
              currencyPrefix: spec.currencyPrefix,
              support: liveFallback.support,
              resistance: liveFallback.resistance,
              barTimestampIso: new Date(liveFallback.updatedAtEpoch || timing.targetEpochMs).toISOString(),
              barTimeWib: formatWibShortTime(liveFallback.updatedAtEpoch || timing.targetEpochMs),
            },
          ];
        }
        return [id, null];
      })
    );

    const assetsRecord: Record<string, ShareSnapshotAsset> = {};
    for (const [id, item] of assetEntries) {
      if (item) assetsRecord[id] = item;
    }

    let marketSummary = buildDeterministicTimestampSummary(
      slot,
      timing.timeSlotLabel,
      timing.dateLabel,
      assetsRecord
    );
    let aiGenerated = false;


    const response: ShareSnapshotResponse = {
      slot,
      dateKey: timing.dateKey,
      dateLabel: timing.dateLabel,
      timeSlotLabel: timing.timeSlotLabel,
      targetTimestampIso: timing.targetTimestampIso,
      targetEpochMs: timing.targetEpochMs,
      editionTitle:
        slot === 'morning_0530'
          ? '05:30 WIB Morning · All Markets'
          : '16:30 WIB Afternoon · IDX, FX, Gold & BTC',
      marketSummary,
      aiGenerated,
      assets: assetsRecord,
      updatedAt: new Date().toISOString(),
    };

    shareSnapshotCache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + (aiGenerated ? 1_800_000 : 300_000),
    });

    return response;
  });
}

// ============================================================================
// Market Depth (Live Coinbase L2 Order Book + Session Liquidity Depth Profile)
// ============================================================================

export interface MarketDepthLevel {
  price: number;
  size: number;
  total: number;
  pctOfMax: number;
  isWall?: boolean;
  tag?: string;
}

export interface MarketDepthSnapshot {
  assetId: string;
  symbol: string;
  decimals: number;
  currencyPrefix?: string;
  unitSuffix?: string;
  midPrice: number;
  bestBid: number;
  bestAsk: number;
  spreadAbs: number;
  spreadPct: number;
  bidRatioPct: number;
  askRatioPct: number;
  imbalanceLabel: string;
  sourceKind: 'live-l2' | 'session-liquidity';
  sourceLabel: string;
  buyWallPrice: number;
  buyWallSize: number;
  sellWallPrice: number;
  sellWallSize: number;
  bids: MarketDepthLevel[];
  asks: MarketDepthLevel[];
  isCachedFallback?: boolean;
  updatedAt: string;
}

const marketDepthCache = new Map<string, CacheEntry<MarketDepthSnapshot>>();

function roundNiceBucketStep(rawStep: number, decimals: number): number {
  const minTick = Math.pow(10, -Math.min(4, Math.max(0, decimals)));
  if (!Number.isFinite(rawStep) || rawStep <= minTick) return minTick;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / pow10;
  const nice = norm <= 1.2 ? 1 : norm <= 2.4 ? 2 : norm <= 5.5 ? 5 : 10;
  return Math.max(minTick, Number((nice * pow10).toFixed(Math.min(6, decimals + 2))));
}

function deriveImbalanceLabel(bidRatioPct: number): string {
  if (bidRatioPct >= 60) return 'Strong Bid Absorption';
  if (bidRatioPct >= 53) return 'Buy-Side Tilt';
  if (bidRatioPct <= 40) return 'Heavy Ask Supply';
  if (bidRatioPct <= 47) return 'Sell-Side Tilt';
  return 'Balanced Two-Way Book';
}

function finalizeDepthLevels(
  rawBids: Array<{ price: number; size: number; tag?: string }>,
  rawAsks: Array<{ price: number; size: number; tag?: string }>,
  decimals: number
): {
  bids: MarketDepthLevel[];
  asks: MarketDepthLevel[];
  bidRatioPct: number;
  askRatioPct: number;
  buyWallPrice: number;
  buyWallSize: number;
  sellWallPrice: number;
  sellWallSize: number;
} {
  const sortedBids = [...rawBids]
    .sort((a, b) => b.price - a.price)
    .slice(0, 8);
  const sortedAsks = [...rawAsks]
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);

  const avgBid =
    sortedBids.reduce((s, b) => s + b.size, 0) / Math.max(1, sortedBids.length);
  const avgAsk =
    sortedAsks.reduce((s, a) => s + a.size, 0) / Math.max(1, sortedAsks.length);

  let maxBidIdx = 0;
  for (let i = 1; i < sortedBids.length; i++) {
    if (sortedBids[i].size > sortedBids[maxBidIdx].size) maxBidIdx = i;
  }
  let maxAskIdx = 0;
  for (let i = 1; i < sortedAsks.length; i++) {
    if (sortedAsks[i].size > sortedAsks[maxAskIdx].size) maxAskIdx = i;
  }

  let cumBid = 0;
  const bidsOut: MarketDepthLevel[] = sortedBids.map((b, idx) => {
    cumBid += b.size;
    const isWall = idx === maxBidIdx || b.size >= avgBid * 1.55;
    return {
      price: Number(b.price.toFixed(decimals)),
      size: Number(b.size.toFixed(decimals >= 3 ? 2 : 3)),
      total: Number(cumBid.toFixed(decimals >= 3 ? 2 : 3)),
      pctOfMax: 0,
      isWall,
      tag: b.tag ?? (idx === 0 ? 'Best Bid' : idx === maxBidIdx ? 'Buy Wall' : undefined),
    };
  });

  let cumAsk = 0;
  const asksOut: MarketDepthLevel[] = sortedAsks.map((a, idx) => {
    cumAsk += a.size;
    const isWall = idx === maxAskIdx || a.size >= avgAsk * 1.55;
    return {
      price: Number(a.price.toFixed(decimals)),
      size: Number(a.size.toFixed(decimals >= 3 ? 2 : 3)),
      total: Number(cumAsk.toFixed(decimals >= 3 ? 2 : 3)),
      pctOfMax: 0,
      isWall,
      tag: a.tag ?? (idx === 0 ? 'Best Ask' : idx === maxAskIdx ? 'Sell Wall' : undefined),
    };
  });

  const maxCum = Math.max(cumBid, cumAsk, 1e-6);
  for (const b of bidsOut) {
    b.pctOfMax = Math.max(4, Math.min(100, Math.round((b.total / maxCum) * 100)));
  }
  for (const a of asksOut) {
    a.pctOfMax = Math.max(4, Math.min(100, Math.round((a.total / maxCum) * 100)));
  }

  const totalNotionalVol = cumBid + cumAsk || 1;
  const bidRatioPct = Number(((cumBid / totalNotionalVol) * 100).toFixed(1));
  const askRatioPct = Number((100 - bidRatioPct).toFixed(1));

  const buyWall = bidsOut[maxBidIdx] ?? bidsOut[0];
  const sellWall = asksOut[maxAskIdx] ?? asksOut[0];

  return {
    bids: bidsOut,
    asks: asksOut,
    bidRatioPct,
    askRatioPct,
    buyWallPrice: buyWall?.price ?? 0,
    buyWallSize: buyWall?.size ?? 0,
    sellWallPrice: sellWall?.price ?? 0,
    sellWallSize: sellWall?.size ?? 0,
  };
}

export async function fetchMarketDepth(assetId: string): Promise<MarketDepthSnapshot | null> {
  const id = assetId.trim().toUpperCase();
  if (id !== 'BTCUSD' && id !== 'ETHUSD') return null;

  if (!YAHOO_SYMBOL_CONFIG.some((c) => c.id === id)) return null;

  const now = Date.now();
  const cached = marketDepthCache.get(id);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const sessionInfo = getServerSessionInfo(id, new Date(now));
  const isCryptoL2 = id === 'BTCUSD' || id === 'ETHUSD';

  return coalesceInFlight(
    `market-depth:${id}`,
    cached?.data ?? null,
    async () => {
      const cfg = YAHOO_SYMBOL_CONFIG.find((c) => c.id === id);
      const decimals = cfg?.decimals ?? 3;
      const prefix = cfg?.currencyPrefix;
      const suffix = cfg?.unitSuffix;
      const fxLabels: Record<string, string> = {
        BTCUSD: 'BTC/USD',
        ETHUSD: 'ETH/USD',
        XAUUSD: 'XAU/USD',
        USDIDR: 'USD/IDR',
        EURUSD: 'EUR/USD',
        GBPUSD: 'GBP/USD',
        USDJPY: 'USD/JPY',
        AUDUSD: 'AUD/USD',
        USDCHF: 'USD/CHF',
        USDCAD: 'USD/CAD',
        NZDUSD: 'NZD/USD',
        USDCNY: 'USD/CNY',
      };
      const symbolLabel = fxLabels[id] ?? id;

      // 1. Live Level-2 Order Book via Coinbase Exchange for BTCUSD & ETHUSD
      if (isCryptoL2) {
        const pair = id === 'BTCUSD' ? 'BTC-USD' : 'ETH-USD';
        const l2Start = Date.now();
        try {
          const res = await fetch(
            `https://api.exchange.coinbase.com/products/${pair}/book?level=2`,
            { headers: UA_HEADERS, signal: AbortSignal.timeout(5500) }
          );
          const l2Latency = Date.now() - l2Start;
          if (res.ok) {
            const json = (await res.json()) as {
              bids?: Array<[string, string, number]>;
              asks?: Array<[string, string, number]>;
            };
            const rawBids = (json.bids ?? [])
              .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
              .filter((r) => Number.isFinite(r.price) && r.price > 0 && Number.isFinite(r.size) && r.size > 0);
            const rawAsks = (json.asks ?? [])
              .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
              .filter((r) => Number.isFinite(r.price) && r.price > 0 && Number.isFinite(r.size) && r.size > 0);

            if (rawBids.length >= 4 && rawAsks.length >= 4) {
              const bestBid = rawBids[0].price;
              const bestAsk = rawAsks[0].price;
              const midPrice = Number(((bestBid + bestAsk) / 2).toFixed(decimals));
              const spreadAbs = Math.max(0, bestAsk - bestBid);
              const spreadPct = midPrice > 0 ? (spreadAbs / midPrice) * 100 : 0;

              const nearBids = rawBids.filter((b) => b.price >= bestBid * 0.97);
              const nearAsks = rawAsks.filter((a) => a.price <= bestAsk * 1.03);
              const activeBids = nearBids.length >= 4 ? nearBids : rawBids.filter((b) => b.price >= bestBid * 0.85);
              const activeAsks = nearAsks.length >= 4 ? nearAsks : rawAsks.filter((a) => a.price <= bestAsk * 1.15);

              const safeBids = activeBids.length >= 2 ? activeBids : rawBids.slice(0, 8);
              const safeAsks = activeAsks.length >= 2 ? activeAsks : rawAsks.slice(0, 8);

              const deepestBid = safeBids[safeBids.length - 1].price;
              const deepestAsk = safeAsks[safeAsks.length - 1].price;
              const rawSpan = Math.max(
                bestBid - deepestBid,
                deepestAsk - bestAsk,
                midPrice * 0.0006
              );
              const clampedSpan = Math.min(midPrice * 0.012, rawSpan);
              const bucketStep = roundNiceBucketStep(clampedSpan / 8, decimals);

              const bidBuckets = new Map<number, number>();
              for (const b of safeBids) {
                if (bestBid - b.price > bucketStep * 10) continue;
                const bucketPx = Number(
                  (Math.floor(b.price / bucketStep) * bucketStep).toFixed(decimals)
                );
                if (bucketPx > 0) {
                  bidBuckets.set(bucketPx, (bidBuckets.get(bucketPx) ?? 0) + b.size);
                }
              }
              const askBuckets = new Map<number, number>();
              for (const a of safeAsks) {
                if (a.price - bestAsk > bucketStep * 10) continue;
                const bucketPx = Number(
                  (Math.ceil(a.price / bucketStep) * bucketStep).toFixed(decimals)
                );
                if (bucketPx > 0) {
                  askBuckets.set(bucketPx, (askBuckets.get(bucketPx) ?? 0) + a.size);
                }
              }

              let aggBids = Array.from(bidBuckets.entries())
                .map(([price, size]) => ({ price, size }))
                .sort((a, b) => b.price - a.price)
                .slice(0, 8);
              let aggAsks = Array.from(askBuckets.entries())
                .map(([price, size]) => ({ price, size }))
                .sort((a, b) => a.price - b.price)
                .slice(0, 8);

              if (aggBids.length < 5) aggBids = safeBids.slice(0, 8);
              if (aggAsks.length < 5) aggAsks = safeAsks.slice(0, 8);

              const finalized = finalizeDepthLevels(aggBids, aggAsks, decimals);
              const snapshot: MarketDepthSnapshot = {
                assetId: id,
                symbol: symbolLabel,
                decimals,
                currencyPrefix: prefix,
                unitSuffix: suffix,
                midPrice,
                bestBid: Number(bestBid.toFixed(decimals)),
                bestAsk: Number(bestAsk.toFixed(decimals)),
                spreadAbs: Number(spreadAbs.toFixed(decimals)),
                spreadPct: Number(spreadPct.toFixed(4)),
                bidRatioPct: finalized.bidRatioPct,
                askRatioPct: finalized.askRatioPct,
                imbalanceLabel: deriveImbalanceLabel(finalized.bidRatioPct),
                sourceKind: 'live-l2',
                sourceLabel: 'Coinbase Live L2 Order Book',
                buyWallPrice: finalized.buyWallPrice,
                buyWallSize: finalized.buyWallSize,
                sellWallPrice: finalized.sellWallPrice,
                sellWallSize: finalized.sellWallSize,
                bids: finalized.bids,
                asks: finalized.asks,
                isCachedFallback: false,
                updatedAt: new Date().toISOString(),
              };
              updateProviderMetric('coinbase', {
                status: 'live',
                activeSource: 'Coinbase Exchange L2 Book',
                latencyMs: l2Latency,
                lastSuccessAt: Date.now(),
                isCachedFallback: false,
                fallbackReason: undefined,
              });
              marketDepthCache.set(id, { data: snapshot, expiresAt: Date.now() + 2500 });
              return snapshot;
            }
          }
          if (cached && now - cached.expiresAt < 12_000 && cached.data.sourceKind === 'live-l2') {
            return { ...cached.data, isCachedFallback: true };
          }
          updateProviderMetric('coinbase', {
            status: 'failover',
            activeSource: 'Session Liquidity Fallback',
            latencyMs: l2Latency,
            isCachedFallback: false,
            fallbackReason: `Coinbase L2 HTTP ${res.status}; fell back to session book`,
          });
        } catch {
          if (cached && now - cached.expiresAt < 12_000 && cached.data.sourceKind === 'live-l2') {
            return { ...cached.data, isCachedFallback: true };
          }
          updateProviderMetric('coinbase', {
            status: 'failover',
            activeSource: 'Session Liquidity Fallback',
            latencyMs: Date.now() - l2Start,
            isCachedFallback: false,
            fallbackReason: 'Coinbase L2 timeout; fell back to session book',
          });
        }
      }

      // No synthetic fallback: order-book depth is unavailable when the public Coinbase L2 feed fails.
      return cached?.data ?? null;
    }
  );
}

// ============================================================================
// Watchlist Cross-Asset Correlation Matrix (Real Aligned Daily Returns)
// ============================================================================

export interface CorrelationMatrixResponse {
  timeframe: '1M' | '3M';
  assetIds: string[];
  matrix: number[][];
  sampleDays: number;
  updatedAt: string;
}

const correlationCache = new Map<'1M' | '3M', CacheEntry<CorrelationMatrixResponse>>();
const datedHistoryCache = new Map<string, CacheEntry<Map<string, number>>>();

async function fetchDatedDailyCloses(
  yahooSymbol: string,
  range: '1mo' | '3mo'
): Promise<Map<string, number>> {
  const key = `${yahooSymbol}:${range}`;
  const now = Date.now();
  const cached = datedHistoryCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const out = new Map<string, number>();
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        yahooSymbol
      )}?range=${range}&interval=1d`,
      { headers: UA_HEADERS, signal: AbortSignal.timeout(5500) }
    );
    if (!res.ok) return cached?.data ?? out;
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const item = json.chart?.result?.[0];
    const tsArr = item?.timestamp ?? [];
    const closeArr = item?.indicators?.quote?.[0]?.close ?? [];
    for (let i = 0; i < Math.min(tsArr.length, closeArr.length); i++) {
      const ts = tsArr[i];
      const c = closeArr[i];
      if (typeof ts === 'number' && typeof c === 'number' && Number.isFinite(c) && c > 0) {
        const dayKey = new Date(ts * 1000).toISOString().slice(0, 10);
        out.set(dayKey, c);
      }
    }
    if (out.size >= 5) {
      datedHistoryCache.set(key, { data: out, expiresAt: now + 900_000 });
      return out;
    }
  } catch {
    // ignore and return fallback
  }
  return cached?.data ?? out;
}

function computeAlignedPearson(
  mapA: Map<string, number>,
  mapB: Map<string, number>
): { r: number; pairs: number } {
  const commonDates: string[] = [];
  for (const date of mapA.keys()) {
    if (mapB.has(date)) commonDates.push(date);
  }
  commonDates.sort();
  if (commonDates.length < 5) return { r: 0, pairs: Math.max(0, commonDates.length - 1) };

  const retA: number[] = [];
  const retB: number[] = [];
  for (let i = 1; i < commonDates.length; i++) {
    const prevDate = commonDates[i - 1];
    const currDate = commonDates[i];
    const a0 = mapA.get(prevDate)!;
    const a1 = mapA.get(currDate)!;
    const b0 = mapB.get(prevDate)!;
    const b1 = mapB.get(currDate)!;
    if (a0 > 0 && a1 > 0 && b0 > 0 && b1 > 0) {
      retA.push(Math.log(a1 / a0));
      retB.push(Math.log(b1 / b0));
    }
  }

  const n = retA.length;
  if (n < 4) return { r: 0, pairs: n };

  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += retA[i];
    sumB += retB[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = retA[i] - meanA;
    const db = retB[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }

  const den = Math.sqrt(denA * denB);
  if (!Number.isFinite(den) || den <= 1e-12) return { r: 0, pairs: n };
  const corr = Math.max(-1, Math.min(1, num / den));
  return { r: Number(corr.toFixed(2)), pairs: n };
}

export async function fetchCorrelationMatrix(
  timeframe: '1M' | '3M' = '1M'
): Promise<CorrelationMatrixResponse> {
  const tf: '1M' | '3M' = timeframe === '3M' ? '3M' : '1M';
  const now = Date.now();
  const cached = correlationCache.get(tf);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  return coalesceInFlight(
    `correlation-matrix:${tf}`,
    cached?.data,
    async () => {
      const range = tf === '3M' ? '3mo' : '1mo';
      const assetConfigs = YAHOO_SYMBOL_CONFIG;
      const assetIds = assetConfigs.map((c) => c.id);

      const datedSeriesList = await Promise.all(
        assetConfigs.map((c) => fetchDatedDailyCloses(c.yahooSymbol, range))
      );

      // Inject today's live quote price onto today's UTC date key so live session moves are reflected
      const todayKey = new Date().toISOString().slice(0, 10);
      const liveMap = new Map(
        (quotesCache.entry?.data.quotes ?? []).map((q) => [q.id, q.price])
      );
      datedSeriesList.forEach((seriesMap, idx) => {
        const livePx = liveMap.get(assetIds[idx]);
        if (livePx && Number.isFinite(livePx) && livePx > 0 && seriesMap.size > 0) {
          seriesMap.set(todayKey, livePx);
        }
      });

      const n = assetIds.length;
      const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      let maxPairs = 0;

      for (let i = 0; i < n; i++) {
        matrix[i][i] = 1;
        for (let j = i + 1; j < n; j++) {
          const { r, pairs } = computeAlignedPearson(datedSeriesList[i], datedSeriesList[j]);
          matrix[i][j] = r;
          matrix[j][i] = r;
          if (pairs > maxPairs) maxPairs = pairs;
        }
      }

      const payload: CorrelationMatrixResponse = {
        timeframe: tf,
        assetIds,
        matrix,
        sampleDays: maxPairs > 0 ? maxPairs : tf === '3M' ? 60 : 20,
        updatedAt: new Date().toISOString(),
      };

      correlationCache.set(tf, { data: payload, expiresAt: Date.now() + 300_000 });
      return payload;
    }
  );
}

let warmupStarted = false;
export function warmServerCaches(): void {
  if (warmupStarted) return;
  warmupStarted = true;
  // Stage 1: warm critical live quotes & FX cleanly without Yahoo pool contention
  setTimeout(() => {
    void Promise.allSettled([
      fetchLiveQuotes(),
      fetchLiveFxRates(),
    ]).then(() => {
      // Stage 2: warm news, calendar & equity movers
      setTimeout(() => {
        void Promise.allSettled([
          fetchLiveNews(),
          fetchLiveCalendar(),
          fetchTopStockMovers(),
        ]).then(() => {
          // Stage 3: warm heavy heatmap, daily summary, correlations & intelligence
          setTimeout(() => {
            void Promise.allSettled([
              fetchMarketHeatmap(),
              fetchDailyMarketSummary(),
              fetchCorrelationMatrix('1M'),
              fetchMarketIntelligence(),
            ]);
          }, 400);
        });
      }, 200);
    });
  }, 150);
}

