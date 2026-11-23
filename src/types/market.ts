export type AppRoute = 'dashboard' | 'watchlist' | 'portfolio' | 'stocks' | 'heatmap' | 'news' | 'calendar' | 'extract';

export type ThemeMode = 'obsidian' | 'arctic' | 'parchment';

export interface CandlePoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export type Timeframe =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | 'YTD'
  | '1Y'
  | 'ALL';

export type BandarmologyPhase =
  | 'Strong Accumulation'
  | 'Early Accumulation'
  | 'Neutral'
  | 'Early Distribution'
  | 'Strong Distribution';

export interface BandarmologyAnalysis {
  phase: BandarmologyPhase;
  score: number; // -100 (Strong Distribution) to +100 (Strong Accumulation)
  volumeRatio: number; // Current vs 20D average volume
  accumulationPressure: number; // Chaikin / money flow scaled 0..100
  foreignBias: 'Net Buy' | 'Net Sell' | 'Balanced';
  summary: string;
}

export type IctDirection = 'BUY' | 'SELL' | 'NEUTRAL';

export interface IctSignalAnalysis {
  assetId: string;
  symbol: string;
  name: string;
  direction: IctDirection;
  confidence: number; // 0..100
  setupName: string;
  pdZone: 'Discount' | 'Equilibrium' | 'Premium';
  entryZone: string;
  stopLoss: string;
  targetPrice: string;
  riskReward: string;
  triggers: string[];
  timeframe: Timeframe;
  currentPrice: number;
  decimals: number;
  currencyPrefix?: string;
  unitSuffix?: string;
  evaluatedAt: number;
}

export type WatchlistCategory =
  | 'us-indices'
  | 'asia-indices'
  | 'commodities-crypto'
  | 'forex-yields';

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  shortName: string;
  exchange: string;
  category: WatchlistCategory;
  categoryLabel: string;
  price: number;
  prevClose: number;
  changeValue: number;
  changePercent: number;
  currencyPrefix?: string;
  unitSuffix?: string;
  decimals: number;
  isYield?: boolean;
  isSnapshotTile?: boolean;
  open: string;
  dayHigh: string;
  dayLow: string;
  volume: string;
  avgVol: string;
  avgVolLabel?: string;
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
  chartSeries: Partial<Record<Timeframe, number[]>> & { '1D': number[] };
  chartTimestamps?: Partial<Record<Timeframe, number[]>>;
  chartCandles?: Partial<Record<Timeframe, CandlePoint[]>>;
  liveStreamable?: boolean;
  updatedAtEpoch?: number;
  marketSessionOpen?: boolean;
  sessionStateLabel?: string;
  sessionProgressRatio?: number;
  fearGreed7d?: number[];
  move5mPct?: number;
  vol5mRangePct?: number;
  move5mSource?: 'server-5m' | 'intraday-1m' | 'closed';
}

export interface NewsStory {
  id: string;
  publisher: string;
  timeAgo: string;
  publishedAt?: string;
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

export interface EditorialInsight {
  id: string;
  sentiment: 'Bullish Macro' | 'Neutral Structuring' | 'Defensive Hedge';
  isPositive: boolean;
  desk: string;
  dateLabel: string;
  title: string;
  summary: string;
}

export interface EconomicEvent {
  id: string;
  timeWib: string;
  isoDate?: string;
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

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  category: 'Equities' | 'Crypto' | 'Commodities' | 'Cash & FX';
  units: number;
  avgCost: number;
  currentPrice: number;
  linkedAssetId?: string;
}

export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CHF'
  | 'CAD'
  | 'AUD'
  | 'NZD'
  | 'CNY'
  | 'SGD'
  | 'IDR';

export interface FxPairTile {
  pair: string;
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: string;
  changePercent: number;
  high: string;
  low: string;
}

export interface GroundedSource {
  title: string;
  uri: string;
}

export interface AiResearchResult {
  answer: string;
  sources: GroundedSource[];
  searchQueries: string[];
  model: string;
  generatedAt: string;
}

export interface SavedAiBrief {
  id: string;
  ownerId: string;
  query: string;
  assetSymbol?: string;
  answer: string;
  sources: GroundedSource[];
  createdAtLabel?: string;
}

export interface CalendarCatalyst {
  title: string;
  currency: string;
  timeWib: string;
  targetEpochMs: number;
  description: string;
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

export type PortfolioAssetCategory = 'Equities' | 'Crypto' | 'Commodities' | 'Cash & FX';

export interface PortfolioGroup {
  id: string;
  name: string;
  displayCurrency: CurrencyCode;
  createdAt: string;
}

export interface PortfolioPurchaseLot {
  id: string;
  portfolioId: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  category: PortfolioAssetCategory;
  currency: 'USD' | 'IDR';
  units: number;
  remainingUnits: number;
  pricePerUnit: number;
  purchaseDateIso: string;
}

export interface PortfolioHolding {
  id: string;
  portfolioId: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  category: PortfolioAssetCategory;
  currency: 'USD' | 'IDR';
  units: number;
  avgCost: number;
  linkedAssetId?: string;
  createdAt: string;
}

export interface PortfolioTransaction {
  id: string;
  portfolioId: string;
  lotId?: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  units: number;
  pricePerUnit: number;
  currency: 'USD' | 'IDR';
  dateIso: string;
  note?: string;
}

export interface PortfolioQuoteItem {
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

export interface PortfolioMoverItem {
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

export interface StockSearchResult {
  symbol: string;
  yahooSymbol: string;
  name: string;
  exchange: string;
  typeDisp: string;
  currency: 'USD' | 'IDR';
  category: PortfolioAssetCategory;
  isIndex?: boolean;
  assetId?: string;
  price?: number;
  prevClose?: number;
  changePercent?: number;
  sparklinePoints?: number[];
  sessionOpen?: boolean;
}

export type DailySummaryCategory = 'gainer' | 'loser' | 'event';

export interface DailyMarketHighlight {
  id: string;
  category: DailySummaryCategory;
  title: string;
  metricText: string;
  summaryText: string;
  metaText: string;
  symbol?: string;
  yahooSymbol?: string;
  assetId?: string;
  routeTarget?: AppRoute;
}

export interface DailyMarketSummaryResponse {
  windowLabel: string;
  dateLabel: string;
  updatedAt: string;
  highlights: DailyMarketHighlight[];
}

export type SignalTier = 'Strong Bull' | 'Bull Signal' | 'Neutral' | 'Bear Signal' | 'Strong Bear';

export interface MarketSignalInfo {
  tier: SignalTier;
  direction: 'bull' | 'bear' | 'neutral';
  score: number;
  shortLabel: string;
  reason: string;
}

export type FearGreedZone =
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed'
  | 'Unavailable';

export interface FearGreedInfo {
  score: number;
  zone: FearGreedZone;
  shortLabel: string;
  driver: string;
  history7d: number[];
  components: {
    momentum: number;
    intradayStrength: number;
    range52w: number;
  };
}

export interface VolatilityFearGreedInfo {
  score: number;
  zone: FearGreedZone;
  shortLabel: string;
  volRegime: 'Compressed' | 'Normal' | 'Elevated' | 'Panic' | 'Unavailable';
  avg5mRangePct: number;
  dispersionSigma: number;
  intradayRangePct: number;
  downsideSkewPct: number;
  safeHavenBidScore: number;
  driver: string;
  history7d: number[];
}

export interface PriceAlertItem {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  direction: 'surge' | 'drop';
  movePercent: number;
  windowMinutes: number;
  fromPrice: number;
  toPrice: number;
  decimals: number;
  currencyPrefix?: string;
  unitSuffix?: string;
  triggeredAt: number;
  read: boolean;
  alertKind?: 'volatility' | 'ict' | 'bandarmology';
  ictAction?: 'BUY' | 'SELL';
  ictSetup?: string;
  entryZone?: string;
  stopLoss?: string;
  targetPrice?: string;
  ictTimeframe?: Timeframe;
  confidence?: number;
  bandarFromPhase?: BandarmologyPhase;
  bandarToPhase?: BandarmologyPhase;
  bandarScore?: number;
  bandarVolumeRatio?: number;
  bandarAccPressure?: number;
  bandarForeignBias?: 'Net Buy' | 'Net Sell' | 'Balanced';
}

export interface Asset5mVolatility {
  assetId: string;
  pct5m: number;
  range5mPct: number;
  marketMean5m: number;
  medianBaseline5m: number;
  relDevPct: number;
  zScore: number;
  isSessionOpen: boolean;
  sampleSource: 'live-5m' | 'server-5m' | 'intraday-1m' | 'closed';
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
  signalTier: SignalTier;
  beforeOpen: string;
  duringSession: string;
  afterClose: string;
  keyLevels: string;
}

export interface MarketIntelligenceResponse {
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

export type HeatmapMarketFilter = 'us' | 'indonesia' | 'all';

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
  sourceKind: 'live-l2' | 'session-liquidity' | 'unavailable';
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

export interface CorrelationMatrixResponse {
  timeframe: '1M' | '3M';
  assetIds: string[];
  matrix: number[][];
  sampleDays: number;
  updatedAt: string;
}

export type ProviderHealthStatus = 'live' | 'failover' | 'cached' | 'offline';

export interface ProviderFeedDiagnostic {
  id: 'coinbase' | 'yahoo_macro' | 'idx_proxy' | 'fx_rates' | 'news_cal';
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

export interface ClientFeedTransportDiagnostics {
  quotesRttMs: number | null;
  wsConnected: boolean;
  lastWsTickAt: number | null;
  wsFresh: boolean;
  usingBootstrapCache: boolean;
  bootstrapSavedAt: number | null;
  activeBackoffs: Array<{ endpoint: string; failures: number; retryInSec: number }>;
  lastQuotesAt: number | null;
}

export interface DailyDigestMoverImpact {
  symbol: string;
  yahooSymbol?: string;
  name: string;
  market: string;
  movePercent: string;
  direction: 'up' | 'down' | 'flat';
  associatedHeadline: string;
  impactAnalysis: string;
}

export interface DailyDigestResponse {
  sessionHeadline: string;
  marketMood: string;
  executiveBrief: string;
  topicLabel: string;
  moverImpacts: DailyDigestMoverImpact[];
  sessionWatchpoints: string[];
  model: string;
  generatedAt: string;
}

export type RiskRegimeStatus =
  | 'Strong Risk-On'
  | 'Risk-On'
  | 'Neutral'
  | 'Risk-Off'
  | 'Strong Risk-Off'
  | 'Unavailable';

export interface RiskRegimeSectorBreakdown {
  id: string;
  label: string;
  weightPct: number;
  avgMovePct: number;
  weightedContributionPct: number;
  stance: 'Risk-On' | 'Neutral' | 'Risk-Off';
}

export interface RiskRegimeInfo {
  status: RiskRegimeStatus;
  polarity: 'risk-on' | 'neutral' | 'risk-off';
  score: number; // 0 (Strong Risk-Off) to 100 (Strong Risk-On)
  weightedMovePct: number;
  advancingSectors: number;
  totalSectors: number;
  driver: string;
  sectors: RiskRegimeSectorBreakdown[];
}



