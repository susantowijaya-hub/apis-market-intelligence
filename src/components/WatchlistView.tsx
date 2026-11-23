import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  LineChart,
  Maximize2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CATEGORY_META } from '../data/marketData';
import {
  AppRoute,
  MarketAsset,
  WatchlistCategory,
} from '../types/market';
import { formatAssetPrice } from '../utils/formatters';
import { getSessionProgressRatio } from '../utils/marketSessions';
import { getAssetFearGreed, getAssetSignal, parseFormattedMarketNumber } from '../utils/marketSignals';
import { GoogleFinanceDeltaPill, GoogleFinanceMiniChart } from './GoogleFinanceMiniChart';
import {
  AssetCategoryMiniIcon,
  FearGreedInlineBar,
  FearGreedTrendSparkline,
  getFearGreedTextTone,
  SignalBadge,
} from './MarketUiPrimitives';

interface WatchlistViewProps {
  assets: MarketAsset[];
  selectedAssetId: string;
  onSelectAsset: (id: string) => void;
  onNavigate: (route: AppRoute) => void;
  onInspectSymbol?: (yahooSymbol: string, builtInAssetId?: string) => void;
  searchQuery: string;
  isPercentMode: boolean;
  onToggleBadgeMode: () => void;
  flashMap: Record<string, 'gain' | 'loss'>;
}

type CategoryFilter = 'all' | WatchlistCategory;
type SignalFilter = 'all' | 'bull' | 'bear';

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  onNavigate,
  onInspectSymbol,
  searchQuery,
  isPercentMode,
  onToggleBadgeMode,
  flashMap,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [openGroups, setOpenGroups] = useState<Record<WatchlistCategory, boolean>>({
    'us-indices': true,
    'asia-indices': true,
    'commodities-crypto': true,
    'forex-yields': true,
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const signalCounts = useMemo(() => {
    let bull = 0;
    let bear = 0;
    for (const a of assets) {
      const sig = getAssetSignal(a);
      if (sig.direction === 'bull') bull += 1;
      else if (sig.direction === 'bear') bear += 1;
    }
    return { bull, bear };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assets.filter((a) => {
      const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
      const sig = getAssetSignal(a);
      const matchSignal =
        signalFilter === 'all' ||
        (signalFilter === 'bull' && sig.direction === 'bull') ||
        (signalFilter === 'bear' && sig.direction === 'bear');
      const matchSearch =
        !q ||
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchSignal && matchSearch;
    });
  }, [assets, categoryFilter, signalFilter, searchQuery]);

  const activeAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? assets[0],
    [assets, selectedAssetId]
  );

  const visibleCategories = useMemo(
    () =>
      CATEGORY_META.filter(
        (cat) => categoryFilter === 'all' || cat.id === categoryFilter
      ),
    [categoryFilter]
  );

  const allCollapsed = visibleCategories.every((cat) => !openGroups[cat.id]);

  const toggleAllGroups = () => {
    const next = allCollapsed;
    setOpenGroups({
      'us-indices': next,
      'asia-indices': next,
      'commodities-crypto': next,
      'forex-yields': next,
    });
  };

  const handleOpenChart = (assetId: string) => {
    onSelectAsset(assetId);
    onNavigate('dashboard');
  };

  const openCount = useMemo(
    () => assets.filter((a) => a.marketSessionOpen).length,
    [assets]
  );

  const avgFearGreed = useMemo(() => {
    const target = filteredAssets.length > 0 ? filteredAssets : assets;
    if (target.length === 0) return { score: 50, zone: 'Neutral' as const };
    const total = target.reduce((sum, item) => sum + getAssetFearGreed(item).score, 0);
    const avg = Math.round(total / target.length);
    const zone =
      avg >= 75
        ? 'Extreme Greed'
        : avg >= 55
          ? 'Greed'
          : avg <= 24
            ? 'Extreme Fear'
            : avg <= 44
              ? 'Fear'
              : 'Neutral';
    return { score: avg, zone };
  }, [filteredAssets, assets]);

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 flex flex-col gap-5">
      {/* Header matching Market section styling */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#16803C] dark:text-[#30D158]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#16803C] dark:text-[#30D158]">
              Market Watchlist · {openCount} Open Sessions
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white mt-1">
            Global Markets Watchlist
          </h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
            {filteredAssets.length} tracked benchmarks across indices, commodities, crypto, FX, and sovereign yields. Tap any asset to view its interactive chart.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleBadgeMode}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl liquid-glass-pill text-xs font-semibold text-[#1C1C1E] dark:text-white hover:brightness-95 dark:hover:brightness-110 transition-all"
          >
            Delta: {isPercentMode ? '% Change' : 'Points'}
          </button>
          <button
            type="button"
            onClick={toggleAllGroups}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl liquid-glass-pill text-xs font-semibold text-[#0071E3] dark:text-[#3898FF] hover:brightness-95 dark:hover:brightness-110 transition-all"
          >
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
        </div>
      </section>

      {/* Category & Bull/Bear Signal Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
              categoryFilter === 'all'
                ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent'
                : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
            }`}
          >
            All Categories ({assets.length})
          </button>
          {CATEGORY_META.map((cat) => {
            const active = categoryFilter === cat.id;
            const count = assets.filter((a) => a.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent'
                    : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Signal Filter Strip */}
        <div className="inline-flex rounded-xl liquid-glass-pill p-1 shrink-0">
          <button
            type="button"
            onClick={() => setSignalFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              signalFilter === 'all'
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                : 'text-[#4A4D57] dark:text-[#B4B8C4] hover:text-[#1C1C1E] dark:hover:text-white'
            }`}
          >
            All Signals
          </button>
          <button
            type="button"
            onClick={() => setSignalFilter('bull')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              signalFilter === 'bull'
                ? 'bg-[#0F7033] text-white shadow-sm'
                : 'text-[#0F7033] dark:text-[#4ADE80] hover:bg-[#22C55E]/12'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Bull ({signalCounts.bull})
          </button>
          <button
            type="button"
            onClick={() => setSignalFilter('bear')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              signalFilter === 'bear'
                ? 'bg-[#C41C16] text-white shadow-sm'
                : 'text-[#C41C16] dark:text-[#FF6B63] hover:bg-[#EF4444]/12'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Bear ({signalCounts.bear})
          </button>
        </div>
      </div>

      {/* Grouped Watchlist Card */}
      <section className="rounded-2xl liquid-glass-card overflow-hidden">
        <div className="px-4 py-3.5 border-b border-black/8 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">Watchlist</h2>
            <p className="text-xs text-[#4A4D57] dark:text-[#B4B8C4]">
              {filteredAssets.length} tracked assets · Avg Fear &amp; Greed{' '}
              <span className="font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {avgFearGreed.score}
              </span>{' '}
              ({avgFearGreed.zone})
            </p>
          </div>
          {activeAsset && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Active: {activeAsset.symbol}</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]/60">
          {visibleCategories.map((cat) => {
            const rows = filteredAssets.filter((a) => a.category === cat.id);
            if (rows.length === 0) return null;
            const isOpen = searchQuery.trim() || signalFilter !== 'all' ? true : openGroups[cat.id];

            return (
              <div key={cat.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                  }
                  className="w-full px-4 py-2.5 bg-[#E5E5EA]/40 dark:bg-[#1C1C1E]/50 hover:bg-[#E5E5EA]/80 dark:hover:bg-[#1C1C1E] flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span>{cat.label}</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums">{rows.length}</span>
                </button>

                {isOpen && (
                  <div className="divide-y divide-[#E5E5EA]/70 dark:divide-[#2C2C2E]/30">
                    {rows.map((asset) => {
                      const isActive = asset.id === activeAsset?.id;
                      const isGain = asset.changePercent >= 0;
                      const flash = flashMap[asset.id];
                      const signal = getAssetSignal(asset);
                      const fearGreed = getAssetFearGreed(asset);

                      return (
                        <motion.div
                          key={asset.id}
                          initial={{ opacity: 0.85 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.18 }}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenChart(asset.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenChart(asset.id);
                            }
                          }}
                          className={`cursor-pointer px-4 py-3 flex items-center justify-between gap-2.5 sm:gap-3 transition-colors min-h-[60px] ${
                            isActive
                              ? 'bg-[#0071E3]/10 dark:bg-[#2C2C2E]/70'
                              : 'hover:bg-[#E5E5EA]/50 dark:hover:bg-[#2C2C2E]/40'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <AssetCategoryMiniIcon
                                category={asset.category}
                                idOrSymbol={asset.id}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">
                                    {asset.symbol}
                                  </p>
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      asset.marketSessionOpen
                                        ? 'bg-[#30D158]'
                                        : 'bg-[#8E8E93]/50'
                                    }`}
                                    title={
                                      asset.marketSessionOpen
                                        ? 'Session Open (Latest Snapshot)'
                                        : 'Session Closed'
                                    }
                                  />
                                  <SignalBadge signal={signal} compact />
                                  {isActive && (
                                    <span className="text-[10px] font-bold text-[#0071E3] dark:text-[#0A84FF]">
                                      · Selected
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] truncate flex items-center gap-1 flex-wrap">
                                  <span>{asset.shortName} · {asset.exchange}</span>
                                  <span className="md:hidden inline-flex items-center gap-1">
                                    <span>· F&amp;G</span>
                                    <span className={`font-mono font-bold tabular-nums ${getFearGreedTextTone(fearGreed.zone)}`}>
                                      {fearGreed.score}
                                    </span>
                                    <FearGreedTrendSparkline
                                      history7d={fearGreed.history7d}
                                      score={fearGreed.score}
                                      zone={fearGreed.zone}
                                      compact
                                      showLabel={false}
                                    />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center justify-end shrink-0">
                            <FearGreedInlineBar fearGreed={fearGreed} />
                          </div>

                          <div className="hidden lg:block text-right text-[11px] text-[#6C6C70] dark:text-[#8E8E93] font-mono tabular-nums shrink-0">
                            <div>H {asset.dayHigh}</div>
                            <div>L {asset.dayLow}</div>
                          </div>

                          <div className="hidden sm:block w-20 sm:w-24 h-8 shrink-0">
                            <GoogleFinanceMiniChart
                              points={asset.chartSeries['1D'] ?? asset.sparklinePoints}
                              prevClose={asset.prevClose}
                              openPrice={parseFormattedMarketNumber(asset.open)}
                              isGain={isGain}
                              progressRatio={
                                asset.sessionProgressRatio ??
                                getSessionProgressRatio(asset.id, now)
                              }
                              className="w-full h-8"
                              showEndDot={asset.marketSessionOpen}
                              strokeWidth={1.6}
                            />
                          </div>

                          <div className="text-right shrink-0 min-w-[88px]">
                            <p
                              className={`text-xs sm:text-sm font-bold tabular-nums font-mono transition-colors ${
                                flash === 'gain'
                                  ? 'text-[#16803C] dark:text-[#30D158]'
                                  : flash === 'loss'
                                    ? 'text-[#D7261C] dark:text-[#FF453A]'
                                    : 'text-[#1C1C1E] dark:text-white'
                              }`}
                            >
                              {formatAssetPrice(asset)}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleBadgeMode();
                              }}
                              className="mt-0.5 inline-flex items-center justify-end"
                              title="Tap to toggle % / points"
                            >
                              <GoogleFinanceDeltaPill
                                changePercent={asset.changePercent}
                                label={
                                  isPercentMode
                                    ? `${asset.changePercent >= 0 ? '+' : ''}${asset.changePercent.toFixed(2)}%`
                                    : `${asset.changeValue >= 0 ? '+' : '-'}${Math.abs(asset.changeValue).toFixed(
                                        asset.decimals >= 3 ? asset.decimals : 2
                                      )}`
                                }
                                compact
                              />
                            </button>
                          </div>

                          {onInspectSymbol && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectSymbol(asset.symbol, asset.id);
                              }}
                              className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white hover:bg-[#E5E5EA]/70 dark:hover:bg-[#3A3A3C]/50 transition-colors shrink-0"
                              title={`Inspect ${asset.symbol}`}
                              aria-label={`Inspect ${asset.symbol}`}
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div className="p-8 text-center text-xs text-[#6C6C70] dark:text-[#8E8E93] flex flex-col items-center gap-2">
              <span>
                {searchQuery.trim()
                  ? `No watchlist assets match "${searchQuery}".`
                  : 'No watchlist assets match the selected signal filter.'}
              </span>
              {signalFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSignalFilter('all')}
                  className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline"
                >
                  Show All Signals
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
