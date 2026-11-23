import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  BellRing,
  Bookmark,
  CalendarClock,
  Clock,
  Flame,
  LineChart,
  Loader2,
  Moon,
  Newspaper,
  Sun,
  TrendingUp,
} from 'lucide-react';
import {
  AppRoute,
  Asset5mVolatility,
  IctSignalAnalysis,
  MarketAsset,
  MarketIntelligenceResponse,
  NewsStory,
  PriceAlertItem,
  ThemeMode,
  Timeframe,
} from '../types/market';
import {
  formatAssetPrevClose,
  formatAssetPrice,
  formatFullDelta,
} from '../utils/formatters';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  DashboardRegionTab,
  getAllMarketSessions,
  getRegionStatusSummary,
} from '../utils/marketSessions';
import {
  computeAssetTimeframeReturn,
  computeOverallMarketFearGreed,
  computeRiskRegimeSentiment,
  computeVolatilityFearGreed,
  extractFiveMinuteTrajectory,
  getAssetFearGreed,
  getAssetSignal,
} from '../utils/marketSignals';
import { D3FiveMinSparkline } from './D3FiveMinSparkline';
import { GoogleFinanceDeltaPill } from './GoogleFinanceMiniChart';
import { HeadlineSentimentGaugeCard } from './HeadlineSentimentGaugeCard';
import { IctSignalCard } from './IctSignalCard';
import { InteractiveChart } from './InteractiveChart';
import { MarketFearGreedGaugeCard } from './MarketFearGreedGaugeCard';
import {
  AssetCategoryMiniIcon,
  FearGreedMeter,
  GlobalMarketFearGreedCard,
  getFearGreedTextTone,
  SignalBadge,
} from './MarketUiPrimitives';
import { PriceAlertDrawer } from './PriceAlertOverlay';
import { RiskRegimeGaugeCard } from './RiskRegimeGaugeCard';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

const MarketDepthCard = lazyWithRetry(() =>
  import('./MarketDepthCard').then((m) => ({ default: m.MarketDepthCard }))
);
const CorrelationMatrixCard = lazyWithRetry(() =>
  import('./CorrelationMatrixCard').then((m) => ({ default: m.CorrelationMatrixCard }))
);
const MarketIntelligencePanel = lazyWithRetry(() =>
  import('./MarketIntelligencePanel').then((m) => ({ default: m.MarketIntelligencePanel }))
);

const DashboardWidgetSkeleton: React.FC<{ label: string; minHeightClass?: string }> = ({
  label,
  minHeightClass = 'min-h-[220px]',
}) => (
  <div
    className={`rounded-2xl liquid-glass-card p-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#6C6C70] dark:text-[#9EB5C8] ${minHeightClass}`}
  >
    <Loader2 className="w-4 h-4 animate-spin text-[#0071E3] dark:text-[#38BDF8]" />
    <span>{label}</span>
  </div>
);

interface DashboardTickerCardProps {
  tile: MarketAsset;
  isSelected: boolean;
  tileFlash?: 'gain' | 'loss';
  isCompactCards: boolean;
  showVolHeatmap: boolean;
  volInfo?: Asset5mVolatility;
  themeMode: ThemeMode;
  onSelect: (id: string) => void;
}

const DashboardTickerCard: React.FC<DashboardTickerCardProps> = React.memo(
  ({
    tile,
    isSelected,
    tileFlash,
    isCompactCards,
    showVolHeatmap,
    volInfo,
    themeMode,
    onSelect,
  }) => {
    const tileSignal = getAssetSignal(tile);
    const tileFearGreed = getAssetFearGreed(tile);
    const fiveMin = useMemo(
      () => extractFiveMinuteTrajectory(tile, volInfo),
      [tile, volInfo]
    );
    const isDarkSurface = themeMode === 'obsidian';

    const signalTextClass =
      tileSignal.direction === 'bull'
        ? 'text-[#0F7033] dark:text-[#4ADE80]'
        : tileSignal.direction === 'bear'
          ? 'text-[#C41C16] dark:text-[#FF6B63]'
          : 'text-[#4A4D57] dark:text-[#B4B8C4]';

    const z = volInfo?.zScore ?? 0;
    const absZ = Math.min(2.5, Math.abs(z));
    const intensity = showVolHeatmap ? Math.min(1, absZ / 2.2) : 0;

    let volHeatStyle: React.CSSProperties | undefined;
    if (showVolHeatmap && volInfo) {
      const isPosDev = volInfo.isSessionOpen && (volInfo.relDevPct > 0.01 || z > 0.2);
      const isNegDev = volInfo.isSessionOpen && (volInfo.relDevPct < -0.01 || z < -0.2);
      if (isPosDev) {
        const bgAlpha = isDarkSurface ? 0.14 + intensity * 0.24 : 0.1 + intensity * 0.22;
        const borderAlpha = 0.32 + intensity * 0.52;
        volHeatStyle = {
          backgroundColor: `rgba(22, 163, 74, ${bgAlpha.toFixed(2)})`,
          borderColor: `rgba(34, 197, 94, ${borderAlpha.toFixed(2)})`,
        };
      } else if (isNegDev) {
        const bgAlpha = isDarkSurface ? 0.14 + intensity * 0.24 : 0.1 + intensity * 0.22;
        const borderAlpha = 0.32 + intensity * 0.52;
        volHeatStyle = {
          backgroundColor: `rgba(220, 38, 38, ${bgAlpha.toFixed(2)})`,
          borderColor: `rgba(239, 68, 68, ${borderAlpha.toFixed(2)})`,
        };
      } else {
        volHeatStyle = {
          backgroundColor: isDarkSurface
            ? 'rgba(148, 163, 184, 0.08)'
            : 'rgba(148, 163, 184, 0.12)',
          borderColor: 'rgba(148, 163, 184, 0.28)',
        };
      }
    }

    return (
      <button
        type="button"
        onClick={() => onSelect(tile.id)}
        style={volHeatStyle}
        className={`text-left shrink-0 xl:min-w-0 liquid-glass-card overflow-hidden transition-all duration-200 ease-out flex flex-col justify-between ${
          isCompactCards
            ? 'min-w-[148px] rounded-xl px-3 py-2'
            : 'min-w-[162px] rounded-2xl px-3.5 py-2.5'
        } ${
          isSelected
            ? '!border-[#0071E3] dark:!border-[#3898FF] ring-2 ring-[#0071E3]/30 dark:ring-[#3898FF]/35 shadow-md'
            : 'hover:brightness-[0.98] dark:hover:brightness-110'
        }`}
      >
        <div className="flex items-center justify-between gap-2 w-full">
          <span
            className={`font-medium text-[#6C6C70] dark:text-[#D1D1D6] truncate ${
              isCompactCards ? 'text-[11px]' : 'text-xs'
            }`}
          >
            {tile.shortName}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isCompactCards && (
              <span
                className={`text-[9px] font-bold uppercase tracking-tight whitespace-nowrap ${signalTextClass}`}
                title={`${tileSignal.reason} · Fear & Greed ${tileFearGreed.score}/100 (${tileFearGreed.zone})`}
              >
                {tileSignal.direction === 'bull'
                  ? 'Bull'
                  : tileSignal.direction === 'bear'
                    ? 'Bear'
                    : 'Flat'}
                <span className={`ml-1 font-mono tabular-nums ${getFearGreedTextTone(tileFearGreed.zone)}`}>
                  · {tileFearGreed.score}
                </span>
              </span>
            )}
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                tile.marketSessionOpen ? 'bg-[#30D158]' : 'bg-[#8E8E93]/60'
              }`}
              title={
                tile.marketSessionOpen
                  ? 'Session Open (Latest Snapshot)'
                  : 'Session Closed (Last Close)'
              }
            />
          </div>
        </div>

        <div
          className={`w-full ${
            isCompactCards
              ? 'mt-1 flex items-center justify-between gap-2'
              : 'mt-1.5 flex items-baseline justify-between gap-2'
          }`}
        >
          <div
            className={`font-bold tabular-nums font-mono tracking-tight ${
              isCompactCards ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
            } ${
              tileFlash === 'gain'
                ? 'text-[#16803C] dark:text-[#30D158]'
                : tileFlash === 'loss'
                  ? 'text-[#D7261C] dark:text-[#FF453A]'
                  : 'text-[#1C1C1E] dark:text-white'
            }`}
          >
            {formatAssetPrice(tile)}
          </div>
          <GoogleFinanceDeltaPill changePercent={tile.changePercent} compact />
        </div>

        {/* Only show a five-minute trajectory when the source supplied a verified sample. */}
        {!isCompactCards && (fiveMin.points.length >= 3 || Number.isFinite(fiveMin.deltaPct)) && (
          <div
            data-testid="ticker-5m-sparkline-row"
            className="mt-1.5 pt-1 border-t border-black/8 dark:border-white/8 w-full flex items-center justify-between gap-2"
            title="Verified five-minute market-data sample"
          >
            {Number.isFinite(fiveMin.deltaPct) ? (
              <span className={`text-[9px] font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${
                fiveMin.deltaPct > 0.005
                  ? 'text-[#0F7033] dark:text-[#4ADE80]'
                  : fiveMin.deltaPct < -0.005
                    ? 'text-[#C41C16] dark:text-[#FF6B63]'
                    : 'text-[#6C6C70] dark:text-[#9EB5C8]'
              }`}>
                5m {fiveMin.deltaPct >= 0 ? '+' : ''}{fiveMin.deltaPct.toFixed(2)}%
              </span>
            ) : (
              <span className="text-[9px] font-mono text-[#6C6C70] dark:text-[#9EB5C8]">5m unavailable</span>
            )}
            {fiveMin.points.length >= 3 && (
              <D3FiveMinSparkline
                points={fiveMin.points}
                deltaPct={fiveMin.deltaPct}
                width={72}
                height={18}
                className="w-[72px] h-[18px] shrink-0"
              />
            )}
          </div>
        )}

        {showVolHeatmap && volInfo && (
          <div
            className="mt-1.5 pt-1 border-t border-black/10 dark:border-white/10 w-full flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums"
            title={
              volInfo.isSessionOpen
                ? `5m move: ${volInfo.pct5m >= 0 ? '+' : ''}${volInfo.pct5m.toFixed(2)}% · 5m Range: ${volInfo.range5mPct.toFixed(2)}% · Source: ${volInfo.sampleSource}`
                : 'Session Closed (0.00% 5m delta)'
            }
          >
            <span className="font-semibold text-[#4A4D57] dark:text-[#C2D4E2] truncate">
              {volInfo.isSessionOpen
                ? `5m ${volInfo.pct5m >= 0 ? '+' : ''}${volInfo.pct5m.toFixed(2)}%`
                : 'Closed'}
            </span>
            <span
              className={`font-extrabold shrink-0 ${
                !volInfo.isSessionOpen
                  ? 'text-[#6C6C70] dark:text-[#8E8E93]'
                  : volInfo.relDevPct > 0.01
                    ? 'text-[#0B5D2A] dark:text-[#4ADE80]'
                    : volInfo.relDevPct < -0.01
                      ? 'text-[#B91C1C] dark:text-[#FF6B63]'
                      : 'text-[#4A4D57] dark:text-[#9EB5C8]'
              }`}
            >
              {volInfo.isSessionOpen
                ? `${volInfo.zScore >= 0 ? '+' : ''}${volInfo.zScore.toFixed(1)}σ · R ${volInfo.range5mPct.toFixed(2)}%`
                : '0.0σ'}
            </span>
          </div>
        )}
      </button>
    );
  }
);

interface MarketDashboardViewProps {
  assets: MarketAsset[];
  selectedAssetId: string;
  onSelectAsset: (id: string) => void;
  searchQuery: string;
  flashMap: Record<string, 'gain' | 'loss'>;
  onNavigate: (route: AppRoute) => void;
  onLoadTimeframe?: (assetId: string, tf: Timeframe) => void;
  themeMode: ThemeMode;
  newsStories?: NewsStory[];
  onOpenStory?: (story: NewsStory) => void;
  marketIntelligence?: MarketIntelligenceResponse | null;
  intelligenceLoading?: boolean;
  onRefreshIntelligence?: () => void;
  alerts?: PriceAlertItem[];
  unreadAlertCount?: number;
  volatility5mMap?: Record<string, Asset5mVolatility>;
  market5mStats?: { meanPct: number; medianPct?: number; stdPct: number };
  onMarkAllAlertsRead?: () => void;
  onMarkAlertRead?: (id: string) => void;
  onClearAlerts?: () => void;
  onScanIct?: (assetId?: string) => void;
  onPushIctAlert?: (signal: IctSignalAnalysis) => void;
  onScanBandar?: () => void;
  onInspectSymbol?: (yahooSymbol: string) => void;
}

const REGION_TABS: { id: DashboardRegionTab; label: string }[] = [
  { id: 'all', label: 'All Markets' },
  { id: 'us', label: 'US' },
  { id: 'asia', label: 'Asia' },
  { id: 'commodities', label: 'Commodities & Crypto' },
  { id: 'currencies', label: 'Currencies & Yields' },
];

export const MarketDashboardView: React.FC<MarketDashboardViewProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  searchQuery,
  flashMap,
  onNavigate,
  onLoadTimeframe,
  themeMode,
  newsStories = [],
  onOpenStory,
  marketIntelligence = null,
  intelligenceLoading = false,
  onRefreshIntelligence,
  alerts = [],
  unreadAlertCount = 0,
  volatility5mMap = {},
  market5mStats = { meanPct: 0, medianPct: 0, stdPct: 0.08 },
  onMarkAllAlertsRead,
  onMarkAlertRead,
  onClearAlerts,
  onScanIct,
  onPushIctAlert,
  onScanBandar,
  onInspectSymbol,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [regionTab, setRegionTab] = useState<DashboardRegionTab>('all');
  const [isCompactCards, setIsCompactCards] = useState<boolean>(false);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState<boolean>(false);
  const [showVolHeatmap, setShowVolHeatmap] = useState<boolean>(false);
  const [inspectedChartIndex, setInspectedChartIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  // Sticky card compaction on scroll with hysteresis
  useEffect(() => {
    let rafId = 0;
    const updateScrollState = () => {
      rafId = 0;
      const y = window.scrollY || window.pageYOffset || 0;
      setIsCompactCards((prev) => {
        if (!prev && y > 56) return true;
        if (prev && y < 20) return false;
        return prev;
      });
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const activeAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? assets[0],
    [assets, selectedAssetId]
  );

  const sessions = useMemo(() => getAllMarketSessions(now), [now]);
  const sessionList = [sessions.us, sessions.idx, sessions.asia, sessions.crypto];

  const yieldCurveInfo = useMemo(() => {
    const us10y = assets.find((a) => a.id === 'US10Y');
    const us30y = assets.find((a) => a.id === 'US30Y');
    const hasCurrentPair = !!us10y && !!us30y && us10y.price > 0 && us30y.price > 0;
    const hasPreviousPair = !!us10y && !!us30y && us10y.prevClose > 0 && us30y.prevClose > 0;
    const spreadBps = hasCurrentPair ? (us30y!.price - us10y!.price) * 100 : Number.NaN;
    const prevSpreadBps = hasPreviousPair ? (us30y!.prevClose - us10y!.prevClose) * 100 : Number.NaN;
    const deltaBps = Number.isFinite(spreadBps) && Number.isFinite(prevSpreadBps)
      ? spreadBps - prevSpreadBps
      : Number.NaN;
    const posture = !Number.isFinite(spreadBps) || !Number.isFinite(deltaBps)
      ? 'Unavailable'
      : spreadBps < 0
        ? 'Inverted'
        : deltaBps >= 0.3
          ? 'Steepening'
          : deltaBps <= -0.3
            ? 'Flattening'
            : 'Steady';
    return {
      spreadBps,
      posture,
      us10yVal: us10y?.price && us10y.price > 0 ? us10y.price.toFixed(3) : '—',
      us30yVal: us30y?.price && us30y.price > 0 ? us30y.price.toFixed(3) : '—',
    };
  }, [assets]);

  const snapshotAssets = useMemo(() => {
    const baseTiles =
      regionTab === 'all'
        ? assets.filter((a) => a.isSnapshotTile)
        : regionTab === 'us'
          ? assets.filter((a) => a.category === 'us-indices')
          : regionTab === 'asia'
            ? assets.filter((a) => a.category === 'asia-indices')
            : regionTab === 'commodities'
              ? assets.filter((a) => a.category === 'commodities-crypto')
              : assets.filter((a) => a.category === 'forex-yields');

    const q = searchQuery.toLowerCase().trim();
    const list = baseTiles.length > 0 ? baseTiles : assets.filter((a) => a.isSnapshotTile);
    if (!q) return list;

    const matchingAll = assets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
    return matchingAll.length > 0 ? matchingAll.slice(0, 6) : list;
  }, [assets, regionTab, searchQuery]);

  const regionBanner = useMemo(
    () => getRegionStatusSummary(regionTab, now),
    [regionTab, now]
  );

  useEffect(() => {
    setInspectedChartIndex(null);
  }, [activeAsset?.id, timeframe]);

  useEffect(() => {
    if (onLoadTimeframe && activeAsset?.id) {
      onLoadTimeframe(activeAsset.id, timeframe);
    }
  }, [activeAsset?.id, timeframe, onLoadTimeframe]);

  const isGain = activeAsset.changePercent >= 0;
  const flash = flashMap[activeAsset.id];
  const activeSignal = useMemo(() => getAssetSignal(activeAsset), [activeAsset]);
  const activeFearGreed = useMemo(() => getAssetFearGreed(activeAsset), [activeAsset]);
  const overallFearGreed = useMemo(() => computeOverallMarketFearGreed(assets), [assets]);
  const riskRegime = useMemo(() => computeRiskRegimeSentiment(assets), [assets]);
  const volatilityFearGreed = useMemo(
    () => computeVolatilityFearGreed(assets, volatility5mMap),
    [assets, volatility5mMap]
  );
  const timeframeReturn = useMemo(
    () => computeAssetTimeframeReturn(activeAsset, timeframe, inspectedChartIndex),
    [activeAsset, timeframe, inspectedChartIndex]
  );

  const formatSignedAssetDelta = (delta: number, asset: MarketAsset) => {
    const sign = delta >= 0 ? '+' : '-';
    const absStr = Math.abs(delta).toLocaleString('en-US', {
      minimumFractionDigits: asset.decimals,
      maximumFractionDigits: asset.decimals,
    });
    return `${sign}${asset.currencyPrefix ?? ''}${absStr}${asset.unitSuffix ?? ''}`;
  };

  // Clean secondary Key Statistics excluding removed Intraday Spread / 52W Position / 52W Midpoint / Venue
  const extraStats = useMemo(() => {
    const blocked = new Set(['Intraday Spread', '52W Position', '52W Midpoint', 'Venue']);
    const items: { label: string; value: string }[] = [];
    const candidates = [
      { label: activeAsset.avgVolLabel, value: activeAsset.avgVol },
      { label: activeAsset.peLabel, value: activeAsset.peValue },
      { label: activeAsset.capLabel, value: activeAsset.capValue },
    ];
    for (const c of candidates) {
      if (c.label && c.value && !blocked.has(c.label)) {
        items.push({ label: c.label, value: c.value });
      }
    }
    return items;
  }, [activeAsset]);

  // Top active instruments sorted by 5m |zScore| & realized 5m range for the Insights Rail widget
  const top5mVolMovers = useMemo(() => {
    const byId = new Map(assets.map((a) => [a.id, a]));
    return (Object.values(volatility5mMap) as Asset5mVolatility[])
      .filter((v) => v.isSessionOpen && byId.has(v.assetId))
      .sort(
        (a, b) =>
          Math.abs(b.zScore) + b.range5mPct * 2 - (Math.abs(a.zScore) + a.range5mPct * 2)
      )
      .slice(0, 4)
      .map((v) => ({
        vol: v,
        asset: byId.get(v.assetId)!,
      }));
  }, [assets, volatility5mMap]);

  return (
    <div className="flex flex-col flex-1">
      {/* Sticky Region Tabs + Sessions Shown Above Cards Only + Simple No-Chart Ticker Cards */}
      <section
        style={{ top: 'var(--app-header-height, 108px)' }}
        className={`sticky z-30 liquid-glass-strong !border-x-0 !border-t-0 px-4 lg:px-6 transition-all duration-300 ease-out flex flex-col ${
          isCompactCards ? 'pt-2 pb-2 gap-1.5' : 'pt-2.5 pb-3 gap-2'
        }`}
      >
        {/* Region Filter Strip & Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {REGION_TABS.map((tab) => {
              const active = regionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRegionTab(tab.id)}
                  className={`px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                    isCompactCards ? 'py-1' : 'py-1.5'
                  } ${
                    active
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent shadow-sm'
                      : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 text-xs text-[#4A4D57] dark:text-[#C7CBD6]">
              {regionBanner.isOpen ? (
                <Sun className="w-3.5 h-3.5 text-[#D97706] dark:text-[#FBBF24]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#6366F1] dark:text-[#A78BFA]" />
              )}
              <span className="font-semibold">{regionBanner.text}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowVolHeatmap((prev) => !prev)}
              aria-pressed={showVolHeatmap}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border whitespace-nowrap shrink-0 transition-all ${
                showVolHeatmap
                  ? 'bg-gradient-to-r from-[#16A34A]/20 via-[#F59E0B]/20 to-[#DC2626]/20 border-[#F59E0B]/55 text-[#1C1C1E] dark:text-white shadow-sm'
                  : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
              title="Color-code dashboard assets by 5-minute price deviation relative to the rest of the market"
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  showVolHeatmap
                    ? 'text-[#D97706] dark:text-[#FBBF24]'
                    : 'text-[#6C6C70] dark:text-[#AEAEB2]'
                }`}
              />
              <span>5m Volatility</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAlertDrawerOpen((prev) => !prev)}
              data-testid="alerts-drawer-toggle"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border whitespace-nowrap shrink-0 transition-all ${
                unreadAlertCount > 0
                  ? 'bg-[#FF9F0A]/18 border-[#FF9F0A]/45 text-[#9A4E00] dark:text-[#FBBF24]'
                  : isAlertDrawerOpen
                    ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent'
                    : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
              title="Real-time 5m volatility (>2%) & ICT Buy/Sell signal alerts"
            >
              {unreadAlertCount > 0 ? (
                <BellRing className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              <span>Alerts</span>
              <span className="font-mono tabular-nums">
                {unreadAlertCount > 0 ? `(${unreadAlertCount})` : alerts.length > 0 ? `(${alerts.length})` : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Market Sessions Shown Strictly Above Ticker Cards */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-[11px]">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#4A4D57] dark:text-[#B4B8C4] shrink-0">
              <Clock className="w-3 h-3" />
              Sessions
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {sessionList.map((s) => {
                const dotColor =
                  s.tone === 'open'
                    ? 'bg-[#22C55E] dark:bg-[#4ADE80]'
                    : s.tone === 'extended' || s.tone === 'break'
                      ? 'bg-[#FF9F0A]'
                      : 'bg-[#8E8E93]';
                const badgeText =
                  s.tone === 'open'
                    ? 'text-[#0F7033] dark:text-[#4ADE80]'
                    : s.tone === 'extended' || s.tone === 'break'
                      ? 'text-[#9A4E00] dark:text-[#FFB340]'
                      : 'text-[#4A4D57] dark:text-[#B4B8C4]';

                return (
                  <div
                    key={s.id}
                    title={`${s.label}: ${s.stateLabel} (${s.detail})`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full liquid-glass-pill whitespace-nowrap"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    <span className="font-semibold text-[#1C1C1E] dark:text-white">{s.shortLabel}:</span>
                    <span className={`font-bold ${badgeText}`}>{s.stateLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {showVolHeatmap && (
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full liquid-glass-pill text-[10px] font-mono shrink-0">
              <span className="font-bold text-[#1C1C1E] dark:text-white">
                5m Active Med {(market5mStats.medianPct ?? market5mStats.meanPct) >= 0 ? '+' : ''}
                {(market5mStats.medianPct ?? market5mStats.meanPct).toFixed(2)}% · σ {market5mStats.stdPct.toFixed(2)}%:
              </span>
              <span className="inline-flex items-center gap-1 text-[#C41C16] dark:text-[#FF6B63] font-bold">
                <span className="w-2 h-2 rounded-sm bg-[#DC2626]" />
                -2σ
              </span>
              <span className="inline-flex items-center gap-1 text-[#6C6C70] dark:text-[#AEAEB2] font-semibold">
                <span className="w-2 h-2 rounded-sm bg-[#94A3B8]" />
                0σ
              </span>
              <span className="inline-flex items-center gap-1 text-[#0F7033] dark:text-[#4ADE80] font-bold">
                <span className="w-2 h-2 rounded-sm bg-[#16A34A]" />
                +2σ
              </span>
            </div>
          )}
        </div>

        {/* Simple Ticker Cards (Memoized per-tile for 1s live updates) */}
        <div className="flex xl:grid xl:grid-cols-6 gap-2.5 lg:gap-3 overflow-x-auto no-scrollbar pb-0.5">
          {snapshotAssets.map((tile) => (
            <DashboardTickerCard
              key={tile.id}
              tile={tile}
              isSelected={tile.id === activeAsset.id}
              tileFlash={flashMap[tile.id]}
              isCompactCards={isCompactCards}
              showVolHeatmap={showVolHeatmap}
              volInfo={volatility5mMap[tile.id]}
              themeMode={themeMode}
              onSelect={onSelectAsset}
            />
          ))}
        </div>
      </section>

      {/* Nerve-Inspired Asymmetric 2-Column Workspace (Primary Focal Stage + Right Insights Rail) */}
      <div className="max-w-[1440px] w-full mx-auto px-4 lg:px-6 py-5 pb-28 flex flex-col gap-5">
        <PriceAlertDrawer
          open={isAlertDrawerOpen}
          alerts={alerts}
          unreadCount={unreadAlertCount}
          activeAssetId={activeAsset?.id}
          onClose={() => setIsAlertDrawerOpen(false)}
          onSelectAlert={(alert) => {
            onMarkAlertRead?.(alert.id);
            if (alert.alertKind === 'bandarmology') {
              onInspectSymbol?.(alert.assetId);
            } else {
              onSelectAsset(alert.assetId);
            }
          }}
          onMarkAllRead={() => onMarkAllAlertsRead?.()}
          onClearAlerts={() => onClearAlerts?.()}
          onScanIct={(assetId) => onScanIct?.(assetId)}
          onScanBandar={onScanBandar}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
          {/* CHILD 1 (Order 1 on mobile, Col 1 Row 1 on desktop): Focal Asset Header + Chart + Key Stats + Market Depth */}
          <div className="order-1 xl:col-start-1 flex flex-col gap-5 min-w-0">
            {/* Asset Header */}
            <motion.div
              key={activeAsset.id}
              initial={{ opacity: 0.7, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#E5E5EA] dark:border-[#1E3142]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <AssetCategoryMiniIcon
                    category={activeAsset.category}
                    idOrSymbol={activeAsset.id}
                    size="md"
                  />
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white">
                    {activeAsset.symbol}
                  </h1>
                  <span className="text-xs font-medium text-[#6C6C70] dark:text-[#9EB5C8]">
                    {activeAsset.exchange}
                  </span>
                  <SignalBadge signal={activeSignal} showScore />
                  {activeAsset.liveStreamable && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16803C] dark:text-[#4ADE80]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                      Market Snapshot
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5">
                  {activeAsset.name}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div
                  className={`text-2xl sm:text-3xl font-extrabold tabular-nums font-mono tracking-tight transition-colors ${
                    flash === 'gain'
                      ? 'text-[#16803C] dark:text-[#4ADE80]'
                      : flash === 'loss'
                        ? 'text-[#D7261C] dark:text-[#FF6B63]'
                        : 'text-[#1C1C1E] dark:text-white'
                  }`}
                >
                  {formatAssetPrice(activeAsset)}
                </div>
                <div className="flex flex-wrap items-center sm:justify-end gap-2 mt-1">
                  <span
                    className={`inline-flex items-baseline gap-1 font-bold text-xs sm:text-sm tabular-nums font-mono ${
                      isGain
                        ? 'text-[#16803C] dark:text-[#4ADE80]'
                        : 'text-[#D7261C] dark:text-[#FF6B63]'
                    }`}
                  >
                    <span>{formatFullDelta(activeAsset)}</span>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-75">
                      Today
                    </span>
                  </span>

                  {(timeframe !== '1D' || timeframeReturn.isInspecting) && (
                    !timeframeReturn.hasSeries ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full liquid-glass-pill text-[11px] font-semibold text-[#52525A] dark:text-[#C2D4E2]">
                        <Loader2 className="w-3 h-3 animate-spin text-[#0071E3] dark:text-[#38BDF8]" />
                        {timeframe} %...
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-mono tabular-nums ${
                          timeframeReturn.isGain
                            ? 'bg-[#22C55E]/14 dark:bg-[#4ADE80]/16 border-[#16A34A]/35 text-[#0F7033] dark:text-[#4ADE80]'
                            : 'bg-[#EF4444]/14 dark:bg-[#FF6B63]/16 border-[#DC2626]/35 text-[#C41C16] dark:text-[#FF6B63]'
                        }`}
                      >
                        <span className="font-sans text-[10px] font-extrabold uppercase tracking-wider opacity-85">
                          {timeframeReturn.isInspecting ? `${timeframe} Pt` : timeframe}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-extrabold">
                          {timeframeReturn.isGain ? (
                            <ArrowUp className="w-3 h-3 stroke-[2.75]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 stroke-[2.75]" />
                          )}
                          {timeframeReturn.pct >= 0 ? '+' : ''}
                          {timeframeReturn.pct.toFixed(2)}%
                        </span>
                        <span className="font-semibold opacity-90 hidden sm:inline">
                          ({formatSignedAssetDelta(timeframeReturn.delta, activeAsset)})
                        </span>
                      </span>
                    )
                  )}
                </div>
              </div>
            </motion.div>

            {/* Focal Interactive Chart */}
            <InteractiveChart
              asset={activeAsset}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onInspectIndexChange={setInspectedChartIndex}
            />

            {/* Key Statistics Strip */}
            <div className="rounded-2xl liquid-glass-card p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 pb-2.5">
                <h2 className="text-sm sm:text-base font-bold text-[#1C1C1E] dark:text-white">
                  Key Statistics
                </h2>
                <span className="text-xs text-[#6C6C70] dark:text-[#9EB5C8] font-medium tabular-nums">
                  {activeAsset.updatedAtEpoch
                    ? `Updated ${new Intl.DateTimeFormat('en-GB', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      }).format(new Date(activeAsset.updatedAtEpoch))} WIB`
                    : 'Session Snapshot'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
                <div>
                  <span className="text-[#6C6C70] dark:text-[#9EB5C8]">Open</span>
                  <p className="font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5">
                    {activeAsset.open}
                  </p>
                </div>
                <div>
                  <span className="text-[#6C6C70] dark:text-[#9EB5C8]">Prev Close</span>
                  <p className="font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5">
                    {formatAssetPrevClose(activeAsset)}
                  </p>
                </div>
                <div>
                  <span className="text-[#6C6C70] dark:text-[#9EB5C8]">Day High</span>
                  <p className="font-bold text-sm text-[#16803C] dark:text-[#4ADE80] tabular-nums font-mono mt-0.5">
                    {activeAsset.dayHigh}
                  </p>
                </div>
                <div>
                  <span className="text-[#6C6C70] dark:text-[#9EB5C8]">Day Low</span>
                  <p className="font-bold text-sm text-[#D7261C] dark:text-[#FF6B63] tabular-nums font-mono mt-0.5">
                    {activeAsset.dayLow}
                  </p>
                </div>
                <div>
                  <span className="text-[#6C6C70] dark:text-[#9EB5C8]">Volume</span>
                  <p className="font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5">
                    {activeAsset.volume}
                  </p>
                </div>
                {extraStats.slice(0, 1).map((stat) => (
                  <div key={stat.label}>
                    <span className="text-[#6C6C70] dark:text-[#9EB5C8]">{stat.label}</span>
                    <p className="font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5 truncate">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {extraStats.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-black/6 dark:border-white/8">
                  {extraStats.slice(1).map((stat) => (
                    <div key={stat.label}>
                      <span className="text-[#6C6C70] dark:text-[#9EB5C8]">{stat.label}</span>
                      <p className="font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5 truncate">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 52-Week Range Progress Bar */}
              <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#1E3142]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#6C6C70] dark:text-[#9EB5C8] font-medium">
                    52-Week Range
                  </span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums font-mono">
                    {activeAsset.w52Low} — {activeAsset.w52High}
                  </span>
                </div>
                <div className="relative w-full h-2 rounded-full bg-[#E5E5EA] dark:bg-[#172838] overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#34D399]"
                    style={{ width: `${Number.isFinite(activeAsset.w52Pct) ? Math.max(0, Math.min(100, activeAsset.w52Pct)) : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mt-1.5 tabular-nums font-mono">
                  <span>52W Low: {activeAsset.w52Low}</span>
                  <span>52W High: {activeAsset.w52High}</span>
                </div>
              </div>
            </div>

            {/* ICT Smart Money Buy/Sell Radar for FX Majors, BTC/USD, & XAU/USD */}
            <IctSignalCard
              assets={assets}
              activeAsset={activeAsset}
              activeTimeframe={timeframe}
              onSelectAsset={onSelectAsset}
              onLoadTimeframe={onLoadTimeframe}
              onTriggerIctAlert={(sig) => {
                onPushIctAlert?.(sig);
                setIsAlertDrawerOpen(true);
              }}
            />

            {/* Lazy-Loaded Secondary Widget 1: Market Depth */}
            <WidgetErrorBoundary widgetName="Market Depth & Order Book">
              <Suspense
                fallback={
                  <DashboardWidgetSkeleton
                    label="Loading Market Depth & Order Book..."
                    minHeightClass="min-h-[280px]"
                  />
                }
              >
                <MarketDepthCard
                  activeAsset={activeAsset}
                  themeMode={themeMode}
                />
              </Suspense>
            </WidgetErrorBoundary>
          </div>

          {/* CHILD 2 (Order 2 on mobile — ABOVE Correlation Matrix, Col 2 spanning rows on desktop): Insights & Technical Sentiment Rail */}
          <aside className="order-2 xl:col-start-2 xl:row-start-1 xl:row-span-2 flex flex-col gap-4 min-w-0">
            {/* 1. Weighted Index & Sector Risk-On vs Risk-Off Sentiment Gauge */}
            <RiskRegimeGaugeCard regime={riskRegime} themeMode={themeMode} />

            {/* 2. Volatility-Driven Market Fear & Greed Sentiment Gauge */}
            <MarketFearGreedGaugeCard sentiment={volatilityFearGreed} themeMode={themeMode} />

            {/* 3. Overall Global Market Fear & Greed Composite */}
            <GlobalMarketFearGreedCard sentiment={overallFearGreed} compactRail />

            {/* 3. Live Headline Sentiment SVG Circular Gauge */}
            <HeadlineSentimentGaugeCard
              stories={newsStories}
              themeMode={themeMode}
              onOpenStory={onOpenStory}
              onNavigate={onNavigate}
            />

            {/* 4. Active Instrument Technicals, Fear & Greed, & S/R Levels */}
            <article
              data-testid="technicals-sentiment-card"
              className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-[#0071E3] dark:text-[#38BDF8]" />
                  <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                    Technicals &amp; Sentiment
                  </h2>
                </div>
                <SignalBadge signal={activeSignal} compact />
              </div>

              <FearGreedMeter
                fearGreed={activeFearGreed}
                instrumentLabel={activeAsset.symbol}
                compact
                showComponents
              />

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E5E5EA] dark:border-[#1E3142]">
                <div>
                  <span className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] font-semibold">
                    Key Support
                  </span>
                  <p className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5">
                    {activeAsset.support}
                  </p>
                  <span className="text-[10px] text-[#6C6C70] dark:text-[#9EB5C8] leading-tight block">
                    {activeAsset.supportNote}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] font-semibold">
                    Key Resistance
                  </span>
                  <p className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums font-mono mt-0.5">
                    {activeAsset.resistance}
                  </p>
                  <span className="text-[10px] text-[#6C6C70] dark:text-[#9EB5C8] leading-tight block">
                    {activeAsset.resistanceNote}
                  </span>
                </div>
              </div>

              {activeAsset.isYield && (
                <div className="p-3 rounded-xl liquid-glass-inset flex flex-col gap-1">
                  <>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#38BDF8]" />
                        30Y–10Y Spread
                      </span>
                      <span className={`font-bold font-mono tabular-nums ${
                        Number.isFinite(yieldCurveInfo.spreadBps)
                          ? yieldCurveInfo.spreadBps >= 0 ? 'text-[#16803C] dark:text-[#4ADE80]' : 'text-[#D7261C] dark:text-[#FF6B63]'
                          : 'text-[#6C6C70] dark:text-[#9EB5C8]'
                      }`}>
                        {Number.isFinite(yieldCurveInfo.spreadBps)
                          ? `${yieldCurveInfo.spreadBps >= 0 ? '+' : ''}${yieldCurveInfo.spreadBps.toFixed(1)} bps (${yieldCurveInfo.posture})`
                          : 'Unavailable'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8]">
                      US 30Y ({yieldCurveInfo.us30yVal}%) vs US 10Y ({yieldCurveInfo.us10yVal}%).
                    </p>
                  </>
                </div>
              )}

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] mb-1">
                  Session Technical Thesis
                </h3>
                <p className="text-xs text-[#1C1C1E] dark:text-[#D5E3EE] leading-relaxed">
                  {activeAsset.commentary}
                </p>
              </div>
            </article>

            {/* 3. Live 5m Volatility Leaders Widget */}
            <section className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
                  <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                    Live 5m Volatility Leaders
                  </h2>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
                  σ {market5mStats.stdPct.toFixed(2)}%
                </span>
              </div>

              {top5mVolMovers.length === 0 ? (
                <p className="text-xs text-[#6C6C70] dark:text-[#9EB5C8]">
                  No verified five-minute observations available yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {top5mVolMovers.map(({ vol, asset }) => {
                    const isPos = vol.pct5m >= 0;
                    const srcLabel =
                      vol.sampleSource === 'live-5m'
                        ? 'Live 5m'
                        : vol.sampleSource === 'server-5m'
                          ? 'Srv 5m'
                          : '1m Bars';
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => onSelectAsset(asset.id)}
                        className={`w-full text-left rounded-xl liquid-glass-inset px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                          asset.id === activeAsset.id
                            ? 'border-[#0071E3] dark:border-[#38BDF8]'
                            : 'hover:border-[#0071E3]/60 dark:hover:border-[#38BDF8]/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white">
                              {asset.symbol}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[#6C6C70] dark:text-[#9EB5C8]">
                              {srcLabel}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
                            5m Range: {vol.range5mPct.toFixed(2)}%
                          </div>
                        </div>

                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div
                            className={`text-xs font-extrabold ${
                              isPos
                                ? 'text-[#0F7033] dark:text-[#4ADE80]'
                                : 'text-[#C41C16] dark:text-[#FF6B63]'
                            }`}
                          >
                            {isPos ? '+' : ''}
                            {vol.pct5m.toFixed(2)}%
                          </div>
                          <div className="text-[10px] font-bold text-[#6C6C70] dark:text-[#9EB5C8]">
                            {vol.zScore >= 0 ? '+' : ''}
                            {vol.zScore.toFixed(1)}σ
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 4. Quick Workspace Shortcuts */}
            <section className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('watchlist')}
                className="p-3.5 rounded-2xl liquid-glass-card text-[#1C1C1E] dark:text-white hover:brightness-[0.98] dark:hover:brightness-110 flex items-center justify-between gap-3 text-left transition-transform"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 text-[#005BB8] dark:text-[#38BDF8] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1E] dark:text-white">Full Watchlist</p>
                    <p className="text-[11px] text-[#4A4D57] dark:text-[#9EB5C8]">
                      Browse all {assets.length} tracked assets
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#4A4D57] dark:text-[#9EB5C8] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('news')}
                className="p-3.5 rounded-2xl liquid-glass-card text-[#1C1C1E] dark:text-white hover:brightness-[0.98] dark:hover:brightness-110 flex items-center justify-between gap-3 text-left transition-transform"
              >
                <div className="flex items-center gap-3">
                  <Newspaper className="w-4 h-4 text-[#C41C16] dark:text-[#FF6B63] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1E] dark:text-white">Breaking News &amp; Summary</p>
                    <p className="text-[11px] text-[#4A4D57] dark:text-[#9EB5C8]">
                      24h recap &amp; live headlines
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#4A4D57] dark:text-[#9EB5C8] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="p-3.5 rounded-2xl liquid-glass-card text-[#1C1C1E] dark:text-white hover:brightness-[0.98] dark:hover:brightness-110 flex items-center justify-between gap-3 text-left transition-transform"
              >
                <div className="flex items-center gap-3">
                  <CalendarClock className="w-4 h-4 text-[#0F7033] dark:text-[#4ADE80] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1E] dark:text-white">Macro Calendar</p>
                    <p className="text-[11px] text-[#4A4D57] dark:text-[#9EB5C8]">
                      Market-moving economic releases
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#4A4D57] dark:text-[#9EB5C8] shrink-0" />
              </button>
            </section>
          </aside>

          {/* CHILD 3 (Order 3 on mobile — BELOW Technicals & Sentiment, Col 1 Row 2 on desktop): Correlation Matrix & Briefings */}
          <div
            data-testid="correlation-matrix-section"
            className="order-3 xl:col-start-1 flex flex-col gap-5 min-w-0"
          >
            <WidgetErrorBoundary widgetName="Watchlist Correlation Matrix">
              <Suspense
                fallback={
                  <DashboardWidgetSkeleton
                    label="Loading Watchlist Correlation Matrix..."
                    minHeightClass="min-w-0 min-h-[280px]"
                  />
                }
              >
                <CorrelationMatrixCard
                  assets={assets}
                  selectedAssetId={activeAsset.id}
                  onSelectAsset={onSelectAsset}
                  themeMode={themeMode}
                />
              </Suspense>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary widgetName="Session Briefings & Catalysts">
              <Suspense
                fallback={
                  <DashboardWidgetSkeleton
                    label="Loading Session Briefings & Catalysts..."
                    minHeightClass="min-h-[240px]"
                  />
                }
              >
                <MarketIntelligencePanel
                  intelligence={marketIntelligence}
                  loading={intelligenceLoading}
                  selectedAssetId={activeAsset.id}
                  assets={assets}
                  onSelectAsset={onSelectAsset}
                  onNavigate={onNavigate}
                  onRefresh={onRefreshIntelligence}
                />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};
