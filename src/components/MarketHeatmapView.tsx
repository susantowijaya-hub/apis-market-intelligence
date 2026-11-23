import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';
import {
  HeatmapMarketFilter,
  HeatmapStockItem,
  MarketHeatmapResponse,
  ThemeMode,
} from '../types/market';
import { computeSquarifiedTreemap, TreemapRect } from '../utils/treemapLayout';

interface MarketHeatmapViewProps {
  heatmapData: MarketHeatmapResponse | null;
  loading: boolean;
  searchQuery: string;
  themeMode: ThemeMode;
  onRefresh: () => void;
  onInspectSymbol: (yahooSymbol: string) => void;
}

type GroupingMode = 'sector' | 'flat';

function getTileColors(
  changePercent: number,
  themeMode: ThemeMode
): { bg: string; text: string; subtext: string; border: string } {
  const isDarkSurface = themeMode === 'obsidian';
  const border = isDarkSurface
    ? 'rgba(8, 12, 20, 0.92)'
    : themeMode === 'parchment'
      ? 'rgba(244, 240, 230, 0.94)'
      : 'rgba(255, 255, 255, 0.94)';

  if (changePercent >= 3.0) {
    return { bg: '#096B31', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.92)', border };
  }
  if (changePercent >= 1.5) {
    return { bg: '#118842', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.90)', border };
  }
  if (changePercent >= 0.3) {
    return { bg: '#1A743E', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.88)', border };
  }
  if (changePercent > -0.3) {
    return {
      bg: isDarkSurface ? '#2E313B' : '#535866',
      text: '#FFFFFF',
      subtext: 'rgba(255,255,255,0.86)',
      border,
    };
  }
  if (changePercent > -1.5) {
    return { bg: '#AD2B26', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.88)', border };
  }
  if (changePercent > -3.0) {
    return { bg: '#C81E1A', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.90)', border };
  }
  return { bg: '#8E1311', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.94)', border };
}

function formatTilePrice(item: HeatmapStockItem): string {
  if (item.currency === 'IDR') {
    return `Rp ${Math.round(item.price).toLocaleString('en-US')}`;
  }
  return `$${item.price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const MarketHeatmapView: React.FC<MarketHeatmapViewProps> = ({
  heatmapData,
  loading,
  searchQuery,
  themeMode,
  onRefresh,
  onInspectSymbol,
}) => {
  const [marketFilter, setMarketFilter] = useState<HeatmapMarketFilter>('us');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('sector');
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [hoveredTile, setHoveredTile] = useState<HeatmapStockItem | null>(null);

  const rawItems = useMemo(() => {
    if (!heatmapData) return [];
    if (marketFilter === 'us') return heatmapData.us;
    if (marketFilter === 'indonesia') return heatmapData.indonesia;
    return [...heatmapData.us.slice(0, 32), ...heatmapData.indonesia.slice(0, 24)];
  }, [heatmapData, marketFilter]);

  const availableSectors = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of rawItems) {
      map.set(item.sector, (map.get(item.sector) ?? 0) + item.marketCap);
    }
    return [
      'All',
      ...Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([s]) => s),
    ];
  }, [rawItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rawItems.filter((item) => {
      const matchSector = selectedSector === 'All' || item.sector === selectedSector;
      const matchSearch =
        !q ||
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q);
      return matchSector && matchSearch;
    });
  }, [rawItems, selectedSector, searchQuery]);

  // Summary analytics across visible stocks
  const breadthStats = useMemo(() => {
    let adv = 0;
    let dec = 0;
    let flat = 0;
    let totalCapUsd = 0;
    const sectorPerf = new Map<string, { weightedSum: number; totalWeight: number }>();

    for (const item of filteredItems) {
      if (item.changePercent > 0.05) adv++;
      else if (item.changePercent < -0.05) dec++;
      else flat++;
      totalCapUsd += item.marketCap;

      const cur = sectorPerf.get(item.sector) ?? { weightedSum: 0, totalWeight: 0 };
      cur.weightedSum += item.changePercent * item.marketCap;
      cur.totalWeight += item.marketCap;
      sectorPerf.set(item.sector, cur);
    }

    const rankedSectors = Array.from(sectorPerf.entries())
      .map(([sector, s]) => ({
        sector,
        avgPct: s.totalWeight > 0 ? s.weightedSum / s.totalWeight : 0,
      }))
      .sort((a, b) => b.avgPct - a.avgPct);

    return {
      adv,
      dec,
      flat,
      total: filteredItems.length,
      totalCapUsd,
      topSector: rankedSectors[0] ?? null,
      lagSector: rankedSectors[rankedSectors.length - 1] ?? null,
    };
  }, [filteredItems]);

  // Compute squarified treemap geometry (either grouped into sector macro-containers or flat by cap)
  const layoutGeometry = useMemo(() => {
    if (filteredItems.length === 0) {
      return {
        sectorContainers: [] as Array<{
          sector: string;
          x: number;
          y: number;
          w: number;
          h: number;
          avgPct: number;
        }>,
        tiles: [] as Array<TreemapRect<HeatmapStockItem>>,
      };
    }

    if (groupingMode === 'flat' || selectedSector !== 'All') {
      const tiles = computeSquarifiedTreemap(
        filteredItems.map((item) => ({
          id: `${item.market}-${item.symbol}`,
          weight: item.marketCap,
          data: item,
        })),
        { x: 0, y: 0, w: 100, h: 100 }
      );
      return { sectorContainers: [], tiles };
    }

    // Group items by sector, squarify sectors first, then squarify stocks inside each sector
    const bySector = new Map<string, HeatmapStockItem[]>();
    for (const item of filteredItems) {
      const list = bySector.get(item.sector) ?? [];
      list.push(item);
      bySector.set(item.sector, list);
    }

    const sectorNodes = Array.from(bySector.entries()).map(([sector, stocks]) => {
      const weight = stocks.reduce((acc, s) => acc + s.marketCap, 0);
      const weightedPerf = stocks.reduce((acc, s) => acc + s.changePercent * s.marketCap, 0);
      return {
        id: sector,
        weight,
        data: {
          sector,
          stocks,
          avgPct: weight > 0 ? weightedPerf / weight : 0,
        },
      };
    });

    const sectorRects = computeSquarifiedTreemap(sectorNodes, { x: 0, y: 0, w: 100, h: 100 });
    const tiles: Array<TreemapRect<HeatmapStockItem>> = [];
    const sectorContainers: Array<{
      sector: string;
      x: number;
      y: number;
      w: number;
      h: number;
      avgPct: number;
    }> = [];

    for (const sRect of sectorRects) {
      sectorContainers.push({
        sector: sRect.data.sector,
        x: sRect.x,
        y: sRect.y,
        w: sRect.w,
        h: sRect.h,
        avgPct: sRect.data.avgPct,
      });

      const headerReserveH = sRect.h > 14 && sRect.w > 11 ? 4.3 : 0;
      const innerRects = computeSquarifiedTreemap(
        sRect.data.stocks.map((st) => ({
          id: `${st.market}-${st.symbol}`,
          weight: st.marketCap,
          data: st,
        })),
        {
          x: sRect.x,
          y: sRect.y + headerReserveH,
          w: sRect.w,
          h: Math.max(0.5, sRect.h - headerReserveH),
        }
      );
      tiles.push(...innerRects);
    }

    return { sectorContainers, tiles };
  }, [filteredItems, groupingMode, selectedSector]);

  const activePreview = hoveredTile ?? filteredItems[0] ?? null;
  const activeWeightPct =
    activePreview && breadthStats.totalCapUsd > 0
      ? (activePreview.marketCap / breadthStats.totalCapUsd) * 100
      : 0;

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-6 pt-4 pb-28 sm:pb-32 space-y-4">
      {/* Control Header */}
      <section className="liquid-glass-card rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
              <h1 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white tracking-tight">
                Market Cap &amp; Sector Heatmap
              </h1>
            </div>
            <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
              Box area scaled proportionally by market capitalization · Color coded by session % change · Tap any block for full chart
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Market Selector */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-black/40 border border-[#E5E5EA] dark:border-[#2C2C2E]">
              {(
                [
                  { id: 'us', label: 'United States' },
                  { id: 'indonesia', label: 'Indonesia IDX' },
                  { id: 'all', label: 'US + IDX' },
                ] as { id: HeatmapMarketFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMarketFilter(opt.id);
                    setSelectedSector('All');
                    setHoveredTile(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    marketFilter === opt.id
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white shadow-sm'
                      : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Grouping Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-black/40 border border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setGroupingMode('sector')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  groupingMode === 'sector'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                    : 'text-[#6C6C70] dark:text-[#8E8E93]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                By Sector
              </button>
              <button
                type="button"
                onClick={() => setGroupingMode('flat')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  groupingMode === 'flat'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                    : 'text-[#6C6C70] dark:text-[#8E8E93]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cap Grid
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]/80 hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-semibold text-[#1C1C1E] dark:text-white whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Sector Filter Row + Color Scale Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {availableSectors.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSector(sec)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                  selectedSector === sec
                    ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] border-[#1C1C1E] dark:border-white'
                    : 'bg-[#F2F2F7] dark:bg-[#141416] text-[#6C6C70] dark:text-[#AEAEB2] border-[#E5E5EA] dark:border-[#2C2C2E] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6C6C70] dark:text-[#8E8E93] shrink-0">
            <span>-3%</span>
            {([-3.5, -2.0, -0.7, 0, 0.7, 2.0, 3.5] as number[]).map((pct) => {
              const col = getTileColors(pct, themeMode);
              return (
                <span
                  key={pct}
                  className="w-4 h-2.5 rounded-sm border border-black/10 dark:border-white/10"
                  style={{ backgroundColor: col.bg }}
                  title={`${pct > 0 ? '+' : ''}${pct}%`}
                />
              );
            })}
            <span>+3%</span>
          </div>
        </div>
      </section>

      {/* Summary Breadth & Active Hover Inspector Bar */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 liquid-glass-card rounded-2xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525A] dark:text-[#B4B4BE]">
              Constituents
            </p>
            <p className="text-sm font-bold font-mono tabular-nums text-[#1C1C1E] dark:text-white mt-0.5">
              {breadthStats.total} equities
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525A] dark:text-[#B4B4BE]">
              Session Breadth
            </p>
            <div className="flex items-center gap-2 text-xs font-mono font-bold tabular-nums mt-0.5">
              <span className="text-[#0F7033] dark:text-[#4ADE80]">{breadthStats.adv} Up</span>
              <span className="text-[#8E8E93]">·</span>
              <span className="text-[#C41C16] dark:text-[#FF5A52]">{breadthStats.dec} Down</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525A] dark:text-[#B4B4BE]">
              Leading Sector
            </p>
            <p className="text-xs font-bold text-[#0F7033] dark:text-[#4ADE80] truncate mt-0.5 tabular-nums">
              {breadthStats.topSector
                ? `${breadthStats.topSector.sector} (${breadthStats.topSector.avgPct >= 0 ? '+' : ''}${breadthStats.topSector.avgPct.toFixed(2)}%)`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525A] dark:text-[#B4B4BE]">
              Lagging Sector
            </p>
            <p className="text-xs font-bold text-[#C41C16] dark:text-[#FF5A52] truncate mt-0.5 tabular-nums">
              {breadthStats.lagSector
                ? `${breadthStats.lagSector.sector} (${breadthStats.lagSector.avgPct >= 0 ? '+' : ''}${breadthStats.lagSector.avgPct.toFixed(2)}%)`
                : '—'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 liquid-glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          {activePreview ? (
            <>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#1C1C1E] dark:text-white">
                    {activePreview.symbol}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#52525A] dark:text-[#D1D1D6]">
                    {activePreview.sector}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#0066CC] dark:text-[#4DA3FF] tabular-nums">
                    {activeWeightPct.toFixed(1)}% wt
                  </span>
                </div>
                <p className="text-xs text-[#52525A] dark:text-[#B4B4BE] truncate mt-0.5">
                  {activePreview.name} · Cap {activePreview.marketCapLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onInspectSymbol(activePreview.yahooSymbol)}
                className="text-right shrink-0 px-2.5 py-1 rounded-xl hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <div className="text-sm font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                  {formatTilePrice(activePreview)}
                </div>
                <div
                  className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold tabular-nums ${
                    activePreview.changePercent >= 0
                      ? 'text-[#16803C] dark:text-[#30D158]'
                      : 'text-[#D7261C] dark:text-[#FF453A]'
                  }`}
                >
                  {activePreview.changePercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {activePreview.changePercent >= 0 ? '+' : ''}
                  {activePreview.changePercent.toFixed(2)}%
                </div>
              </button>
            </>
          ) : (
            <span className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
              Hover or tap any equity block to inspect market-cap weight &amp; latest public change.
            </span>
          )}
        </div>
      </section>

      {/* Proportional Treemap Canvas */}
      <section className="liquid-glass-card rounded-2xl p-2.5 sm:p-3">
        {layoutGeometry.tiles.length === 0 ? (
          <div className="h-[420px] flex flex-col items-center justify-center text-center gap-2 text-sm text-[#52525A] dark:text-[#B4B4BE]">
            <LayoutGrid className="w-7 h-7 opacity-45" />
            <p>
              {loading
                ? 'Loading latest public market-cap snapshot...'
                : 'No matching stocks for the current filter.'}
            </p>
          </div>
        ) : (
          <div className="relative w-full h-[460px] sm:h-[560px] lg:h-[620px] rounded-xl overflow-hidden bg-[#D9DBE0] dark:bg-[#090A0E]">
            {/* Sector Label Headers */}
            {layoutGeometry.sectorContainers.map((sec) => {
              if (sec.w < 11 || sec.h < 14) return null;
              return (
                <div
                  key={`sec-${sec.sector}`}
                  style={{
                    left: `${sec.x}%`,
                    top: `${sec.y}%`,
                    width: `${sec.w}%`,
                    height: '4.3%',
                  }}
                  className="absolute z-10 px-2 flex items-center justify-between bg-[#141519]/95 text-white border-b border-r border-white/20 pointer-events-none overflow-hidden"
                >
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider truncate">
                    {sec.sector}
                  </span>
                  {sec.w > 19 && (
                    <span
                      className={`text-[9px] sm:text-[10px] font-mono font-bold tabular-nums shrink-0 ml-1.5 ${
                        sec.avgPct >= 0 ? 'text-[#4ADE80]' : 'text-[#FF6B63]'
                      }`}
                    >
                      {sec.avgPct >= 0 ? '+' : ''}
                      {sec.avgPct.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}

            {/* Individual Stock Tiles Sized Proportionally by Market Cap */}
            {layoutGeometry.tiles.map((rect) => {
              const item = rect.data;
              const colors = getTileColors(item.changePercent, themeMode);
              const areaPct = rect.w * rect.h;
              const isLarge = areaPct >= 34 && rect.w >= 7 && rect.h >= 6.5;
              const isMedium = !isLarge && areaPct >= 11 && rect.w >= 4.2 && rect.h >= 4.2;
              const isSmall = !isLarge && !isMedium && rect.w >= 2.8 && rect.h >= 2.8;
              const isHovered =
                hoveredTile?.symbol === item.symbol && hoveredTile?.market === item.market;

              return (
                <button
                  key={rect.id}
                  type="button"
                  onMouseEnter={() => setHoveredTile(item)}
                  onFocus={() => setHoveredTile(item)}
                  onClick={() => onInspectSymbol(item.yahooSymbol)}
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.w}%`,
                    height: `${rect.h}%`,
                    backgroundColor: colors.bg,
                    borderColor: isHovered ? '#FFFFFF' : colors.border,
                    color: colors.text,
                  }}
                  title={`${item.symbol} · ${item.name} · ${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}% · Cap ${item.marketCapLabel}`}
                  className={`absolute border transition-transform duration-150 flex flex-col items-center justify-center text-center overflow-hidden select-none focus:outline-none ${
                    isHovered ? 'z-20 ring-2 ring-white/90 brightness-110' : 'z-0 hover:brightness-110'
                  }`}
                >
                  {isLarge && (
                    <div className="px-1.5 leading-tight max-w-full">
                      <div className="font-extrabold tracking-tight text-xs sm:text-sm md:text-base truncate">
                        {item.symbol}
                      </div>
                      <div className="font-mono font-bold tabular-nums text-[11px] sm:text-xs md:text-sm mt-0.5">
                        {item.changePercent >= 0 ? '+' : ''}
                        {item.changePercent.toFixed(2)}%
                      </div>
                      {areaPct >= 75 && (
                        <div
                          className="text-[10px] font-mono tabular-nums mt-0.5 truncate"
                          style={{ color: colors.subtext }}
                        >
                          {formatTilePrice(item)} · {item.marketCapLabel}
                        </div>
                      )}
                    </div>
                  )}

                  {isMedium && (
                    <div className="px-1 leading-none max-w-full">
                      <div className="font-bold text-[10px] sm:text-xs truncate">{item.symbol}</div>
                      <div className="font-mono font-semibold tabular-nums text-[9px] sm:text-[10px] mt-0.5">
                        {item.changePercent >= 0 ? '+' : ''}
                        {item.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {isSmall && (
                    <span className="font-bold text-[8px] sm:text-[9px] leading-none truncate px-0.5">
                      {item.symbol}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Compact Ranked Cap Table Below Treemap for Mobile Accessibility & Tail Precision */}
      <section className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
            Market Cap Weight &amp; Performance Matrix
          </h2>
          <span className="text-[11px] font-mono text-[#6C6C70] dark:text-[#8E8E93] tabular-nums">
            Sorted by Market Cap
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px bg-[#E5E5EA]/60 dark:bg-[#2C2C2E]/60">
          {filteredItems.slice(0, 18).map((item) => {
            const isGain = item.changePercent >= 0;
            return (
              <button
                key={`row-${item.market}-${item.symbol}`}
                type="button"
                onClick={() => onInspectSymbol(item.yahooSymbol)}
                className="bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]/60 px-4 py-2.5 flex items-center justify-between gap-2 text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#1C1C1E] dark:text-white">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] text-[#6C6C70] dark:text-[#8E8E93] truncate">
                      {item.sector}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] truncate">
                    {item.name} · Cap {item.marketCapLabel}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-semibold tabular-nums text-[#1C1C1E] dark:text-white">
                    {formatTilePrice(item)}
                  </div>
                  <div
                    className={`text-[11px] font-mono font-bold tabular-nums ${
                      isGain ? 'text-[#16803C] dark:text-[#30D158]' : 'text-[#D7261C] dark:text-[#FF453A]'
                    }`}
                  >
                    {isGain ? '+' : ''}
                    {item.changePercent.toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
