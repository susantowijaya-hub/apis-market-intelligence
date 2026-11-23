import { apiUrl } from '../lib/api';
import React, { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import {
  MarketAsset,
  MarketDepthLevel,
  MarketDepthSnapshot,
  ThemeMode,
} from '../types/market';

interface MarketDepthCardProps {
  activeAsset: MarketAsset;
  themeMode: ThemeMode;
}

type DepthViewMode = 'combined' | 'curve' | 'ladder';

function formatDepthPrice(
  value: number,
  decimals: number,
  prefix = '',
  suffix = ''
): string {
  if (!Number.isFinite(value)) return '—';
  return `${prefix}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

function formatCompactSize(size: number, decimals: number): string {
  if (!Number.isFinite(size)) return '—';
  if (size >= 1000) {
    return size.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  }
  if (size >= 10) {
    return size.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }
  return size.toLocaleString('en-US', {
    minimumFractionDigits: decimals >= 3 ? 2 : 3,
    maximumFractionDigits: 3,
  });
}

function buildUnavailableDepth(asset: MarketAsset): MarketDepthSnapshot {
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    decimals: asset.decimals,
    currencyPrefix: asset.currencyPrefix,
    unitSuffix: asset.unitSuffix,
    midPrice: asset.price > 0 ? asset.price : 0,
    bestBid: 0,
    bestAsk: 0,
    spreadAbs: 0,
    spreadPct: 0,
    bidRatioPct: 0,
    askRatioPct: 0,
    imbalanceLabel: 'Public order book unavailable',
    sourceKind: 'unavailable',
    sourceLabel: 'No verified free public L2 feed for this instrument',
    buyWallPrice: 0,
    buyWallSize: 0,
    sellWallPrice: 0,
    sellWallSize: 0,
    bids: [],
    asks: [],
    updatedAt: new Date().toISOString(),
  };
}

export const MarketDepthCard: React.FC<MarketDepthCardProps> = ({
  activeAsset,
  themeMode,
}) => {
  const [viewMode, setViewMode] = useState<DepthViewMode>('combined');
  const [depth, setDepth] = useState<MarketDepthSnapshot | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<{
    side: 'bid' | 'ask';
    level: MarketDepthLevel;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setHoveredLevel(null);

    const loadDepth = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/market/depth?id=${encodeURIComponent(activeAsset.id)}`)
        );
        if (!res.ok) return;
        const json = (await res.json()) as MarketDepthSnapshot;
        if (active && json && json.assetId === activeAsset.id) {
          setDepth(json);
        }
      } catch {
        // Retain current or fallback depth snapshot gracefully
      }
    };

    void loadDepth();
    const intervalMs = 5 * 60_000;
    const timer = window.setInterval(() => {
      void loadDepth();
    }, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeAsset.id, activeAsset.marketSessionOpen]);

  const activeDepth = useMemo(() => {
    if (depth && depth.assetId === activeAsset.id) return depth;
    return buildUnavailableDepth(activeAsset);
  }, [depth, activeAsset]);

  // SVG Cumulative Depth Curve geometry (bids left ascending price, asks right ascending price)
  const curveGeometry = useMemo(() => {
    const bidsAsc = [...activeDepth.bids].sort((a, b) => a.price - b.price);
    const asksAsc = [...activeDepth.asks].sort((a, b) => a.price - b.price);
    const allLevels = [
      ...bidsAsc.map((l) => ({ side: 'bid' as const, level: l })),
      ...asksAsc.map((l) => ({ side: 'ask' as const, level: l })),
    ];
    if (bidsAsc.length === 0 || asksAsc.length === 0) {
      return null;
    }

    const minPx = bidsAsc[0].price;
    const maxPx = asksAsc[asksAsc.length - 1].price;
    const pxSpan = Math.max(1e-6, maxPx - minPx);
    const maxTotal = Math.max(
      1e-6,
      bidsAsc[0].total,
      asksAsc[asksAsc.length - 1].total
    );

    const W = 680;
    const H = 172;
    const PAD_X = 12;
    const PAD_TOP = 14;
    const PAD_BOT = 24;
    const plotW = W - PAD_X * 2;
    const plotH = H - PAD_TOP - PAD_BOT;
    const baseY = PAD_TOP + plotH;

    const mapX = (px: number) =>
      PAD_X + Math.max(0, Math.min(1, (px - minPx) / pxSpan)) * plotW;
    const mapY = (tot: number) =>
      baseY - Math.max(0.03, Math.min(1, tot / maxTotal)) * plotH;

    // Build step-area path for Bids (from left/deepest to bestBid)
    const bidPoints = bidsAsc.map((b) => ({ x: mapX(b.price), y: mapY(b.total), level: b }));
    let bidLinePath = `M ${bidPoints[0].x.toFixed(1)} ${bidPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < bidPoints.length; i++) {
      bidLinePath += ` L ${bidPoints[i].x.toFixed(1)} ${bidPoints[i - 1].y.toFixed(1)}`;
      bidLinePath += ` L ${bidPoints[i].x.toFixed(1)} ${bidPoints[i].y.toFixed(1)}`;
    }
    const bidAreaPath = `${bidLinePath} L ${bidPoints[bidPoints.length - 1].x.toFixed(
      1
    )} ${baseY.toFixed(1)} L ${bidPoints[0].x.toFixed(1)} ${baseY.toFixed(1)} Z`;

    // Build step-area path for Asks (from bestAsk to right/deepest)
    const askPoints = asksAsc.map((a) => ({ x: mapX(a.price), y: mapY(a.total), level: a }));
    let askLinePath = `M ${askPoints[0].x.toFixed(1)} ${askPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < askPoints.length; i++) {
      askLinePath += ` L ${askPoints[i].x.toFixed(1)} ${askPoints[i - 1].y.toFixed(1)}`;
      askLinePath += ` L ${askPoints[i].x.toFixed(1)} ${askPoints[i].y.toFixed(1)}`;
    }
    const askAreaPath = `${askLinePath} L ${askPoints[askPoints.length - 1].x.toFixed(
      1
    )} ${baseY.toFixed(1)} L ${askPoints[0].x.toFixed(1)} ${baseY.toFixed(1)} Z`;

    const midX = mapX(activeDepth.midPrice);
    const buyWallX = mapX(activeDepth.buyWallPrice);
    const sellWallX = mapX(activeDepth.sellWallPrice);

    return {
      W,
      H,
      baseY,
      PAD_TOP,
      bidPoints,
      askPoints,
      bidLinePath,
      bidAreaPath,
      askLinePath,
      askAreaPath,
      midX,
      buyWallX,
      sellWallX,
      allPlotPoints: [
        ...bidPoints.map((p) => ({ side: 'bid' as const, ...p })),
        ...askPoints.map((p) => ({ side: 'ask' as const, ...p })),
      ],
      allLevels,
    };
  }, [activeDepth]);

  const dec = activeDepth.decimals;
  const pfx = activeDepth.currencyPrefix ?? '';
  const sfx = activeDepth.unitSuffix ?? '';
  const isMono = false;
  const isDarkSurface = themeMode === 'obsidian';

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!curveGeometry) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * curveGeometry.W;
    let nearest = curveGeometry.allPlotPoints[0];
    let minDist = Infinity;
    for (const pt of curveGeometry.allPlotPoints) {
      const d = Math.abs(pt.x - svgX);
      if (d < minDist) {
        minDist = d;
        nearest = pt;
      }
    }
    if (nearest) {
      setHoveredLevel({ side: nearest.side, level: nearest.level });
    }
  };

  const showCurve = viewMode === 'combined' || viewMode === 'curve';
  const showLadder = viewMode === 'combined' || viewMode === 'ladder';

  return (
    <section className="rounded-2xl liquid-glass-card p-4 sm:p-5 flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/8 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="w-4 h-4 text-[#0071E3] dark:text-[#38BDF8] shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-[#1C1C1E] dark:text-white">
              Market Depth &amp; Order Book
            </h2>
          </div>
          <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5 truncate">
            <span>{activeDepth.symbol}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span
              className={
                activeDepth.sourceKind === 'live-l2'
                  ? 'font-semibold text-[#0F7033] dark:text-[#4ADE80]'
                  : 'font-medium'
              }
            >
              {activeDepth.sourceLabel}
            </span>
            {activeDepth.isCachedFallback && (
              <>
                <span className="mx-1.5 opacity-50">·</span>
                <span className="font-semibold text-[#9A5B06] dark:text-[#FBBF24]">
                  Cached Snapshot
                </span>
              </>
            )}
            <span className="mx-1.5 opacity-50">·</span>
            <span className="font-mono tabular-nums">
              Spread {formatDepthPrice(activeDepth.spreadAbs, dec, pfx, sfx)} (
              {activeDepth.spreadPct.toFixed(3)}%)
            </span>
          </p>
        </div>

        {/* Interactive View Switcher */}
        <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/6 border border-black/8 dark:border-white/10 shrink-0">
          {(
            [
              { id: 'combined', label: 'Combined' },
              { id: 'curve', label: 'Depth Curve' },
              { id: 'ladder', label: 'Order Ladder' },
            ] as const
          ).map((tab) => {
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  active
                    ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] shadow-xs'
                    : 'text-[#4A4D57] dark:text-[#9EB5C8] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeDepth.sourceKind === 'unavailable' ? (
        <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 px-4 py-5 text-sm text-[#6C6C70] dark:text-[#9EB5C8]">
          Verified public order-book depth is not available for this instrument. No synthetic bid/ask levels are displayed.
        </div>
      ) : (
      <>
      {/* Buy vs Sell Liquidity Pressure Bar & Turning Point Readout */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
          <span className="font-bold text-[#0F7033] dark:text-[#4ADE80]">
            Bid {activeDepth.bidRatioPct.toFixed(1)}%
          </span>
          <span className="font-sans text-[11px] font-bold text-[#1C1C1E] dark:text-white">
            {activeDepth.imbalanceLabel}
          </span>
          <span className="font-bold text-[#C41C16] dark:text-[#FF6B63]">
            Ask {activeDepth.askRatioPct.toFixed(1)}%
          </span>
        </div>

        <div className="relative h-2 w-full rounded-full overflow-hidden flex bg-black/8 dark:bg-white/10">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${activeDepth.bidRatioPct}%`,
              backgroundColor: isMono ? '#1C1C1E' : '#16A34A',
            }}
          />
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${activeDepth.askRatioPct}%`,
              backgroundColor: isMono ? '#9CA3AF' : '#DC2626',
              backgroundImage: isMono
                ? 'repeating-linear-gradient(135deg, rgba(28,28,30,0.28) 0px, rgba(28,28,30,0.28) 3px, transparent 3px, transparent 6px)'
                : undefined,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-[#4A4D57] dark:text-[#9EB5C8]">
          <span>
            Buy Wall:{' '}
            <strong className="text-[#0F7033] dark:text-[#4ADE80]">
              {formatDepthPrice(activeDepth.buyWallPrice, dec, pfx, sfx)}
            </strong>{' '}
            ({formatCompactSize(activeDepth.buyWallSize, dec)})
          </span>
          <span>
            Mid:{' '}
            <strong className="text-[#1C1C1E] dark:text-white">
              {formatDepthPrice(activeDepth.midPrice, dec, pfx, sfx)}
            </strong>
          </span>
          <span>
            Sell Wall:{' '}
            <strong className="text-[#C41C16] dark:text-[#FF6B63]">
              {formatDepthPrice(activeDepth.sellWallPrice, dec, pfx, sfx)}
            </strong>{' '}
            ({formatCompactSize(activeDepth.sellWallSize, dec)})
          </span>
        </div>
      </div>

      {/* Cumulative Depth Curve SVG */}
      {showCurve && curveGeometry && (
        <div
          data-no-view-swipe="true"
          className="relative pt-1 border-t border-black/8 dark:border-white/10"
        >
          <div className="flex items-center justify-between text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mb-1.5 min-h-[18px]">
            <span>Cumulative Depth Curve</span>
            {hoveredLevel ? (
              <span className="font-mono tabular-nums font-semibold text-[#1C1C1E] dark:text-white">
                <span
                  className={
                    hoveredLevel.side === 'bid'
                      ? 'text-[#0F7033] dark:text-[#4ADE80]'
                      : 'text-[#C41C16] dark:text-[#FF6B63]'
                  }
                >
                  {hoveredLevel.side === 'bid' ? 'BID' : 'ASK'}
                </span>{' '}
                {formatDepthPrice(hoveredLevel.level.price, dec, pfx, sfx)}
                <span className="mx-1.5 opacity-50">·</span>
                Size {formatCompactSize(hoveredLevel.level.size, dec)}
                <span className="mx-1.5 opacity-50">·</span>
                Cum {formatCompactSize(hoveredLevel.level.total, dec)}
                {hoveredLevel.level.tag ? ` (${hoveredLevel.level.tag})` : ''}
              </span>
            ) : (
              <span className="text-[10px]">Hover curve to inspect liquidity walls</span>
            )}
          </div>

          <svg
            viewBox={`0 0 ${curveGeometry.W} ${curveGeometry.H}`}
            className="w-full h-[150px] sm:h-[168px] overflow-visible select-none cursor-crosshair"
            onPointerMove={handleSvgPointerMove}
            onPointerLeave={() => setHoveredLevel(null)}
          >
            <defs>
              <linearGradient id="bidDepthFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isMono ? '#1C1C1E' : '#16A34A'}
                  stopOpacity={isDarkSurface ? 0.38 : 0.26}
                />
                <stop
                  offset="100%"
                  stopColor={isMono ? '#1C1C1E' : '#16A34A'}
                  stopOpacity={0.03}
                />
              </linearGradient>
              <linearGradient id="askDepthFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isMono ? '#6B7280' : '#DC2626'}
                  stopOpacity={isDarkSurface ? 0.38 : 0.26}
                />
                <stop
                  offset="100%"
                  stopColor={isMono ? '#6B7280' : '#DC2626'}
                  stopOpacity={0.03}
                />
              </linearGradient>
            </defs>

            {/* Baseline */}
            <line
              x1={12}
              y1={curveGeometry.baseY}
              x2={curveGeometry.W - 12}
              y2={curveGeometry.baseY}
              stroke="currentColor"
              className="text-black/15 dark:text-white/15"
              strokeWidth={1}
            />

            {/* Bid Step Area & Line */}
            <path d={curveGeometry.bidAreaPath} fill="url(#bidDepthFill)" />
            <path
              d={curveGeometry.bidLinePath}
              fill="none"
              stroke={isMono ? '#1C1C1E' : isDarkSurface ? '#4ADE80' : '#16803C'}
              strokeWidth={2}
            />

            {/* Ask Step Area & Line */}
            <path d={curveGeometry.askAreaPath} fill="url(#askDepthFill)" />
            <path
              d={curveGeometry.askLinePath}
              fill="none"
              stroke={isMono ? '#6B7280' : isDarkSurface ? '#FF6B63' : '#C41C16'}
              strokeWidth={2}
              strokeDasharray={isMono ? '4 2' : undefined}
            />

            {/* Mid-Price Vertical Divider */}
            <line
              x1={curveGeometry.midX}
              y1={curveGeometry.PAD_TOP}
              x2={curveGeometry.midX}
              y2={curveGeometry.baseY}
              stroke="currentColor"
              className="text-[#4A4D57]/55 dark:text-[#9EB5C8]/55"
              strokeDasharray="3 3"
              strokeWidth={1.2}
            />
            <text
              x={curveGeometry.midX}
              y={curveGeometry.baseY + 14}
              textAnchor="middle"
              className="fill-[#1C1C1E] dark:fill-white text-[10px] font-mono font-bold"
            >
              Mid {formatDepthPrice(activeDepth.midPrice, dec, pfx, sfx)}
            </text>

            {/* Buy Wall & Sell Wall X-Axis Labels */}
            <text
              x={Math.max(54, curveGeometry.buyWallX)}
              y={curveGeometry.baseY + 14}
              textAnchor="middle"
              className="fill-[#0F7033] dark:fill-[#4ADE80] text-[9.5px] font-mono font-semibold"
            >
              Wall {formatDepthPrice(activeDepth.buyWallPrice, dec, pfx, sfx)}
            </text>
            <text
              x={Math.min(curveGeometry.W - 54, curveGeometry.sellWallX)}
              y={curveGeometry.baseY + 14}
              textAnchor="middle"
              className="fill-[#C41C16] dark:fill-[#FF6B63] text-[9.5px] font-mono font-semibold"
            >
              Wall {formatDepthPrice(activeDepth.sellWallPrice, dec, pfx, sfx)}
            </text>

            {/* Hovered Marker */}
            {hoveredLevel &&
              (() => {
                const match = curveGeometry.allPlotPoints.find(
                  (pt) =>
                    pt.side === hoveredLevel.side &&
                    pt.level.price === hoveredLevel.level.price
                );
                if (!match) return null;
                const dotColor =
                  hoveredLevel.side === 'bid'
                    ? isDarkSurface
                      ? '#4ADE80'
                      : '#16803C'
                    : isDarkSurface
                      ? '#FF6B63'
                      : '#C41C16';
                return (
                  <g>
                    <line
                      x1={match.x}
                      y1={curveGeometry.PAD_TOP}
                      x2={match.x}
                      y2={curveGeometry.baseY}
                      stroke={dotColor}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                    />
                    <circle
                      cx={match.x}
                      cy={match.y}
                      r={4.2}
                      fill={dotColor}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })()}
          </svg>
        </div>
      )}

      {/* Synchronized Bid / Ask Liquidity Ladder */}
      {showLadder && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-black/8 dark:border-white/10">
          {/* Bids Column */}
          <div>
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] pb-1.5 border-b border-black/8 dark:border-white/10">
              <span>Bid Price</span>
              <span className="text-right">Size</span>
              <span className="text-right">Cum Total</span>
            </div>
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {activeDepth.bids.map((lvl, idx) => {
                const isActive =
                  hoveredLevel?.side === 'bid' &&
                  hoveredLevel.level.price === lvl.price;
                return (
                  <div
                    key={`${lvl.price}-${idx}`}
                    onMouseEnter={() => setHoveredLevel({ side: 'bid', level: lvl })}
                    onMouseLeave={() => setHoveredLevel(null)}
                    className={`relative grid grid-cols-[1.2fr_0.9fr_0.9fr] items-center py-1.5 px-1.5 text-xs font-mono tabular-nums transition-colors ${
                      isActive ? 'bg-[#16A34A]/12 dark:bg-[#4ADE80]/14' : ''
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 right-0 pointer-events-none transition-all duration-300"
                      style={{
                        width: `${lvl.pctOfMax}%`,
                        backgroundColor: isMono
                          ? 'rgba(28, 28, 30, 0.09)'
                          : isDarkSurface
                            ? 'rgba(74, 222, 128, 0.13)'
                            : 'rgba(22, 163, 74, 0.11)',
                      }}
                    />
                    <div className="relative z-10 flex items-center gap-1.5 min-w-0">
                      <span
                        className={`font-bold ${
                          lvl.isWall
                            ? 'text-[#0B5D2A] dark:text-[#4ADE80]'
                            : 'text-[#0F7033] dark:text-[#4ADE80]'
                        }`}
                      >
                        {formatDepthPrice(lvl.price, dec, pfx, sfx)}
                      </span>
                      {lvl.tag && (
                        <span className="font-sans text-[9.5px] font-semibold text-[#4A4D57] dark:text-[#9EB5C8] truncate">
                          {lvl.tag}
                        </span>
                      )}
                    </div>
                    <span className="relative z-10 text-right font-semibold text-[#1C1C1E] dark:text-white">
                      {formatCompactSize(lvl.size, dec)}
                    </span>
                    <span className="relative z-10 text-right text-[#6C6C70] dark:text-[#9EB5C8]">
                      {formatCompactSize(lvl.total, dec)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asks Column */}
          <div>
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] pb-1.5 border-b border-black/8 dark:border-white/10">
              <span>Ask Price</span>
              <span className="text-right">Size</span>
              <span className="text-right">Cum Total</span>
            </div>
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {activeDepth.asks.map((lvl, idx) => {
                const isActive =
                  hoveredLevel?.side === 'ask' &&
                  hoveredLevel.level.price === lvl.price;
                return (
                  <div
                    key={`${lvl.price}-${idx}`}
                    onMouseEnter={() => setHoveredLevel({ side: 'ask', level: lvl })}
                    onMouseLeave={() => setHoveredLevel(null)}
                    className={`relative grid grid-cols-[1.2fr_0.9fr_0.9fr] items-center py-1.5 px-1.5 text-xs font-mono tabular-nums transition-colors ${
                      isActive ? 'bg-[#DC2626]/12 dark:bg-[#FF6B63]/14' : ''
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-300"
                      style={{
                        width: `${lvl.pctOfMax}%`,
                        backgroundColor: isMono
                          ? 'rgba(110, 110, 118, 0.12)'
                          : isDarkSurface
                            ? 'rgba(255, 107, 99, 0.13)'
                            : 'rgba(220, 38, 38, 0.10)',
                      }}
                    />
                    <div className="relative z-10 flex items-center gap-1.5 min-w-0">
                      <span
                        className={`font-bold ${
                          lvl.isWall
                            ? 'text-[#991B1B] dark:text-[#FF6B63]'
                            : 'text-[#C41C16] dark:text-[#FF6B63]'
                        }`}
                      >
                        {formatDepthPrice(lvl.price, dec, pfx, sfx)}
                      </span>
                      {lvl.tag && (
                        <span className="font-sans text-[9.5px] font-semibold text-[#4A4D57] dark:text-[#9EB5C8] truncate">
                          {lvl.tag}
                        </span>
                      )}
                    </div>
                    <span className="relative z-10 text-right font-semibold text-[#1C1C1E] dark:text-white">
                      {formatCompactSize(lvl.size, dec)}
                    </span>
                    <span className="relative z-10 text-right text-[#6C6C70] dark:text-[#9EB5C8]">
                      {formatCompactSize(lvl.total, dec)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </section>
  );
};
