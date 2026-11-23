import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CandlestickChart, LineChart, RotateCcw } from 'lucide-react';
import { CandlePoint, MarketAsset, Timeframe } from '../types/market';
import { parseFormattedMarketNumber } from '../utils/marketSignals';

interface InteractiveChartProps {
  asset: MarketAsset;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onInspectIndexChange?: (idx: number | null) => void;
  compact?: boolean;
  forceGranularIntraday?: boolean;
  hideTimeframeTabs?: boolean;
}

type ChartDisplayMode = 'line' | 'candles';

interface BucketedCandle extends CandlePoint {
  x: number;
  width: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  isBull: boolean;
  isDoji: boolean;
  seriesIdx: number;
}

const STANDARD_TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'];
const GRANULAR_INTRADAY_TIMEFRAMES: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1D',
  '1W',
  '1M',
  '3M',
  'YTD',
  '1Y',
  'ALL',
];

const TIME_LABELS: Record<Timeframe, string[]> = {
  '1m': ['-35m', '-24m', '-12m', 'Now'],
  '5m': ['-3h', '-2h', '-1h', 'Now'],
  '15m': ['-10h', '-6h', '-3h', 'Now'],
  '30m': ['-20h', '-12h', '-6h', 'Now'],
  '1h': ['-42h', '-28h', '-14h', 'Now'],
  '4h': ['-6D', '-4D', '-2D', 'Now'],
  '1D': ['Open', 'Morning', 'Midday', 'Afternoon', 'Pre-Close', 'Close'],
  '1W': ['D1', 'D2', 'D3', 'D4', 'Now'],
  '1M': ['W1', 'W2', 'W3', 'W4', 'Now'],
  '3M': ['M1', 'M2', 'M3', 'Now'],
  YTD: ['Jan', 'Q1', 'Mid', 'Q3', 'Now'],
  '1Y': ['Q1', 'Q2', 'Q3', 'Q4', 'Now'],
  ALL: ['5Y', '4Y', '3Y', '2Y', '1Y', 'Now'],
};

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C${cx},${p0.y.toFixed(1)} ${cx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

function buildOhlcCandles(
  rawCandles: CandlePoint[] | undefined,
  series: number[],
  timestamps: number[] | undefined,
  decimals: number,
  maxBars = 42
): Array<CandlePoint & { seriesIdx: number }> {
  // 1. Prefer real OHLC bars from backend / Yahoo Finance when available
  if (Array.isArray(rawCandles) && rawCandles.length >= 2) {
    const valid = rawCandles.filter(
      (b) =>
        Number.isFinite(b.o) &&
        Number.isFinite(b.h) &&
        Number.isFinite(b.l) &&
        Number.isFinite(b.c)
    );
    if (valid.length >= 2) {
      if (valid.length <= maxBars) {
        return valid.map((b, idx) => ({
          ...b,
          seriesIdx: Math.min(
            series.length - 1,
            Math.round((idx / Math.max(1, valid.length - 1)) * (series.length - 1))
          ),
        }));
      }
      const step = Math.ceil(valid.length / maxBars);
      const grouped: Array<CandlePoint & { seriesIdx: number }> = [];
      for (let i = 0; i < valid.length; i += step) {
        const chunk = valid.slice(i, i + step);
        const o = chunk[0].o;
        const c = chunk[chunk.length - 1].c;
        const h = Math.max(...chunk.map((x) => x.h));
        const l = Math.min(...chunk.map((x) => x.l));
        const lastIdx = Math.min(valid.length - 1, i + chunk.length - 1);
        grouped.push({
          t: chunk[chunk.length - 1].t,
          o,
          h,
          l,
          c,
          seriesIdx: Math.min(
            series.length - 1,
            Math.round((lastIdx / Math.max(1, valid.length - 1)) * (series.length - 1))
          ),
        });
      }
      return grouped;
    }
  }

  // 2. Deterministic OHLC bucketing from close series
  const targetBars = Math.min(maxBars, Math.max(12, Math.floor(series.length / 2)));
  const chunkSize = Math.max(1, Math.floor(series.length / targetBars));
  const out: Array<CandlePoint & { seriesIdx: number }> = [];

  for (let i = 0; i < series.length; i += chunkSize) {
    const end = Math.min(series.length, i + chunkSize);
    const slice = series.slice(i, end);
    if (slice.length === 0) continue;

    const o = i > 0 ? series[i - 1] : slice[0];
    const c = slice[slice.length - 1];
    const rawH = Math.max(o, ...slice);
    const rawL = Math.min(o, ...slice);
    const pad =
      rawH === rawL ? Math.max(Math.pow(10, -decimals), Math.abs(c) * 0.00045) : 0;

    out.push({
      t: timestamps?.[end - 1] ?? Date.now() - (series.length - end) * 300_000,
      o: Number(o.toFixed(decimals)),
      h: Number((rawH + pad).toFixed(decimals)),
      l: Number((rawL - pad).toFixed(decimals)),
      c: Number(c.toFixed(decimals)),
      seriesIdx: end - 1,
    });
  }

  return out;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  asset,
  timeframe,
  onTimeframeChange,
  onInspectIndexChange,
  compact = false,
  forceGranularIntraday = false,
  hideTimeframeTabs = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('line');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const upperId = (asset.id || '').toUpperCase();
  const upperSym = (asset.symbol || '').toUpperCase();
  const isGranularIntradayAsset =
    forceGranularIntraday ||
    (asset.category === 'forex-yields' && !asset.isYield) ||
    upperId === 'BTCUSD' ||
    upperId === 'BTC-USD' ||
    upperSym === 'BTC/USD' ||
    upperId === 'XAUUSD' ||
    upperId === 'GC=F' ||
    upperSym === 'XAU/USD' ||
    upperId.endsWith('=X');
  // GitHub Pages receives scheduled public snapshots, not a private intraday API.
  const availableTimeframes = STANDARD_TIMEFRAMES;

  // Guard timeframe when switching from granular intraday interval to a non-intraday asset
  useEffect(() => {
    if (!availableTimeframes.includes(timeframe)) {
      onTimeframeChange('1D');
    }
  }, [availableTimeframes, timeframe, onTimeframeChange]);

  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [asset.id, timeframe, chartMode]);

  const rawSeries = asset.chartSeries[timeframe];
  const hasLoadedSeries =
    timeframe === '1D' || (Array.isArray(rawSeries) && rawSeries.length >= 2);
  const fallback1D = asset.chartSeries['1D'] ?? [];
  const baseSeries = hasLoadedSeries
    ? (rawSeries && rawSeries.length >= 2 ? rawSeries : fallback1D)
    : fallback1D;
  const series =
    baseSeries.length >= 2 ? baseSeries : [asset.prevClose || asset.price, asset.price];

  const isIntradayTf =
    timeframe === '1m' ||
    timeframe === '5m' ||
    timeframe === '15m' ||
    timeframe === '30m' ||
    timeframe === '1h' ||
    timeframe === '4h' ||
    timeframe === '1D';

  // Anchor split color & horizontal baseline on Opening Price for 1D, or Period Start for intraday/multi-day
  const openBaseline = useMemo(() => {
    if (timeframe === '1D') {
      const parsedOpen = parseFormattedMarketNumber(asset.open);
      if (Number.isFinite(parsedOpen) && parsedOpen > 0) return parsedOpen;
      if (Number.isFinite(asset.prevClose) && asset.prevClose > 0) return asset.prevClose;
    }
    return series[0];
  }, [timeframe, asset.open, asset.prevClose, series]);

  const effectiveProgress =
    timeframe === '1D' && typeof asset.sessionProgressRatio === 'number'
      ? Math.max(0.15, Math.min(1, asset.sessionProgressRatio))
      : 1;

  const maxBarsForAsset = isGranularIntradayAsset ? 46 : 38;
  const rawCandles = useMemo(
    () =>
      buildOhlcCandles(
        asset.chartCandles?.[timeframe],
        series,
        asset.chartTimestamps?.[timeframe],
        asset.decimals,
        maxBarsForAsset
      ),
    [asset.chartCandles, asset.chartTimestamps, asset.decimals, series, timeframe, maxBarsForAsset]
  );

  const {
    coords,
    candles,
    candleSlotW,
    linePath,
    baselineAreaPath,
    openingY,
    minVal,
    maxVal,
    midVal,
    lastCoord,
    splitPct,
  } = useMemo(() => {
    const width = 700;
    const height = 220;
    const padY = 18;
    const drawW = width * effectiveProgress;

    const candleVals =
      chartMode === 'candles'
        ? rawCandles.flatMap((b) => [b.h, b.l])
        : [];
    const allVals = [...series, openBaseline, ...candleVals];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const mid = (min + max) / 2;
    const span = max - min || Math.max(Math.abs(openBaseline) * 0.002, 1);
    const toY = (val: number) => padY + ((max - val) / span) * (height - padY * 2);

    const pts = series.map((val, idx) => {
      const x = (idx / Math.max(series.length - 1, 1)) * drawW;
      return { x, y: toY(val), val };
    });

    const slotW = drawW / Math.max(rawCandles.length, 1);
    const bodyW = Math.max(4, Math.min(16, slotW * 0.66));
    const dojiEps = Math.pow(10, -(asset.decimals + 1));
    const candleShapes: BucketedCandle[] = rawCandles.map((c, idx) => {
      const x = slotW * (idx + 0.5);
      return {
        ...c,
        x,
        width: bodyW,
        openY: toY(c.o),
        closeY: toY(c.c),
        highY: toY(c.h),
        lowY: toY(c.l),
        isBull: c.c >= c.o,
        isDoji: Math.abs(c.c - c.o) <= dojiEps,
      };
    });

    const rawOpenY = toY(openBaseline);
    const clampedOpenY = Math.max(8, Math.min(height - 8, rawOpenY));
    const line = buildSmoothPath(pts);
    const firstPt = pts[0] ?? { x: 0, y: clampedOpenY, val: openBaseline };
    const lastPt = pts[pts.length - 1] ?? { x: drawW, y: height / 2, val: asset.price };
    const baselineArea = `${line} L${lastPt.x.toFixed(1)},${clampedOpenY.toFixed(1)} L${firstPt.x.toFixed(1)},${clampedOpenY.toFixed(1)} Z`;

    return {
      coords: pts,
      candles: candleShapes,
      candleSlotW: slotW,
      linePath: line,
      baselineAreaPath: baselineArea,
      openingY: clampedOpenY,
      minVal: min,
      maxVal: max,
      midVal: mid,
      lastCoord: lastPt,
      splitPct: Math.max(0, Math.min(100, (clampedOpenY / height) * 100)),
    };
  }, [series, openBaseline, asset.price, asset.decimals, effectiveProgress, chartMode, rawCandles]);

  const activeCount = chartMode === 'candles' ? candles.length : coords.length;

  const resolveIndexFromClientX = (clientX: number): number | null => {
    const svg = svgRef.current;
    if (!svg || activeCount === 0) return null;
    const rect = svg.getBoundingClientRect();
    const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = relX / Math.max(rect.width * effectiveProgress, 1);
    const idx = Math.round(Math.min(1, ratio) * (activeCount - 1));
    return Math.max(0, Math.min(activeCount - 1, idx));
  };

  const inspectIndex = hoverIndex !== null ? hoverIndex : pinnedIndex;
  const activeCandle =
    chartMode === 'candles' && inspectIndex !== null ? candles[inspectIndex] ?? null : null;
  const activePoint =
    chartMode === 'candles'
      ? activeCandle
        ? { x: activeCandle.x, y: activeCandle.closeY, val: activeCandle.c }
        : null
      : inspectIndex !== null
        ? coords[inspectIndex] ?? null
        : null;

  useEffect(() => {
    if (inspectIndex === null) {
      onInspectIndexChange?.(null);
      return;
    }
    if (chartMode === 'candles') {
      const candle = candles[inspectIndex];
      onInspectIndexChange?.(candle ? candle.seriesIdx : null);
    } else {
      onInspectIndexChange?.(inspectIndex);
    }
  }, [inspectIndex, chartMode, candles, onInspectIndexChange]);

  const activeDelta = activePoint ? activePoint.val - openBaseline : 0;
  const activeDeltaPct = openBaseline ? (activeDelta / openBaseline) * 100 : 0;

  const timeframeSummary = useMemo(() => {
    const startVal =
      timeframe === '1D'
        ? asset.prevClose > 0
          ? asset.prevClose
          : openBaseline
        : series[0] || openBaseline;

    if (activePoint) {
      const refVal = timeframe === '1D' ? openBaseline : startVal;
      const delta = activePoint.val - refVal;
      const pct = refVal > 0 ? (delta / refVal) * 100 : 0;
      return {
        startVal: refVal,
        endVal: activePoint.val,
        delta,
        pct,
        isGain: delta >= 0,
        isInspecting: true,
      };
    }

    if (timeframe === '1D') {
      return {
        startVal,
        endVal: asset.price,
        delta: asset.changeValue,
        pct: asset.changePercent,
        isGain: asset.changePercent >= 0,
        isInspecting: false,
      };
    }

    const endVal = asset.price > 0 ? asset.price : lastCoord.val;
    const delta = endVal - startVal;
    const pct = startVal > 0 ? (delta / startVal) * 100 : 0;
    return {
      startVal,
      endVal,
      delta,
      pct,
      isGain: delta >= 0,
      isInspecting: false,
    };
  }, [
    timeframe,
    asset.prevClose,
    asset.price,
    asset.changeValue,
    asset.changePercent,
    openBaseline,
    series,
    activePoint,
    lastCoord.val,
  ]);

  const lastAboveOpen = lastCoord.val >= openBaseline;
  const activeAboveOpen = activePoint ? activePoint.val >= openBaseline : lastAboveOpen;

  const formatVal = (val: number) => {
    const formatted = val.toLocaleString('en-US', {
      minimumFractionDigits: asset.decimals,
      maximumFractionDigits: asset.decimals,
    });
    return `${asset.currencyPrefix ?? ''}${formatted}${asset.unitSuffix ?? ''}`;
  };

  const formatTimeHint = (idx: number) => {
    const seriesIdx =
      chartMode === 'candles' ? (candles[idx]?.seriesIdx ?? idx) : idx;
    const ts =
      chartMode === 'candles'
        ? candles[idx]?.t
        : asset.chartTimestamps?.[timeframe]?.[seriesIdx];
    if (typeof ts === 'number' && Number.isFinite(ts)) {
      const d = new Date(ts);
      if (isIntradayTf || timeframe === '1W') {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    }
    if (timeframe === '1D') {
      const totalMins = 9 * 60 + 30 + Math.round((seriesIdx / Math.max(coords.length - 1, 1)) * 390);
      const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
      const mm = String(totalMins % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const labels = TIME_LABELS[timeframe] ?? TIME_LABELS['1D'];
    const bucket = Math.min(
      labels.length - 1,
      Math.floor((idx / Math.max(activeCount, 1)) * labels.length)
    );
    return `${timeframe} · ${labels[bucket]}`;
  };

  // Compute dynamic bottom x-axis labels from real bar timestamps when available
  const axisLabels = useMemo(() => {
    const rawTs =
      chartMode === 'candles'
        ? candles.map((c) => c.t)
        : asset.chartTimestamps?.[timeframe];
    if (Array.isArray(rawTs) && rawTs.length >= 4) {
      const sampleCount = 5;
      const out: string[] = [];
      for (let i = 0; i < sampleCount; i++) {
        const idx = Math.min(
          rawTs.length - 1,
          Math.round((i / (sampleCount - 1)) * (rawTs.length - 1))
        );
        const ts = rawTs[idx];
        const d = new Date(ts);
        if (!Number.isFinite(d.getTime())) continue;
        if (
          timeframe === '1m' ||
          timeframe === '5m' ||
          timeframe === '15m' ||
          timeframe === '30m' ||
          timeframe === '1D'
        ) {
          out.push(
            new Intl.DateTimeFormat('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(d)
          );
        } else if (timeframe === '1h' || timeframe === '4h') {
          out.push(
            new Intl.DateTimeFormat('en-GB', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              hour12: false,
            }).format(d)
          );
        } else if (timeframe === '1W' || timeframe === '1M') {
          out.push(
            new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
            }).format(d)
          );
        } else {
          out.push(
            new Intl.DateTimeFormat('en-US', {
              month: 'short',
              year: '2-digit',
            }).format(d)
          );
        }
      }
      if (out.length >= 3) return out;
    }
    return TIME_LABELS[timeframe] ?? TIME_LABELS['1D'];
  }, [chartMode, candles, asset.chartTimestamps, timeframe]);

  const strokeGradId = `chartSplitStroke-${uid}`;
  const aboveFillId = `chartAboveFill-${uid}`;
  const belowFillId = `chartBelowFill-${uid}`;
  const aboveClipId = `chartAboveClip-${uid}`;
  const belowClipId = `chartBelowClip-${uid}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Segmented Timeframe Selector + Chart Type Toggle (Line / Candles) + Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {!hideTimeframeTabs && (
            <div
              role="tablist"
              aria-label="Chart Timeframes"
              className="liquid-glass-pill inline-flex p-1 rounded-full overflow-x-auto no-scrollbar max-w-full"
            >
              {availableTimeframes.map((tf) => {
                const active = tf === timeframe;
                return (
                  <button
                    key={tf}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onTimeframeChange(tf)}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#0066CC] dark:bg-[#0066CC] text-white shadow-sm'
                        : 'text-[#52525A] dark:text-[#AEAEB8] hover:text-[#1C1C1E] dark:hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          )}

          {/* Line vs Candlestick Display Toggle */}
          <div
            role="group"
            aria-label="Chart Display Mode"
            data-testid="chart-type-toggle"
            className="liquid-glass-pill inline-flex p-1 rounded-full shrink-0"
          >
            <button
              type="button"
              aria-pressed={chartMode === 'line'}
              onClick={() => setChartMode('line')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                chartMode === 'line'
                  ? 'bg-[#0066CC] text-white shadow-sm'
                  : 'text-[#52525A] dark:text-[#AEAEB8] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
              title="Line / Area Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>
            <button
              type="button"
              aria-pressed={chartMode === 'candles'}
              onClick={() => setChartMode('candles')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                chartMode === 'candles'
                  ? 'bg-[#0066CC] text-white shadow-sm'
                  : 'text-[#52525A] dark:text-[#AEAEB8] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
              title="OHLC Candlestick Chart"
            >
              <CandlestickChart className="w-3.5 h-3.5" />
              <span>Candles</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {pinnedIndex !== null && (
            <button
              type="button"
              onClick={() => {
                setPinnedIndex(null);
                setHoverIndex(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full liquid-glass-pill text-[11px] font-bold text-[#1C1C1E] dark:text-white hover:opacity-85 transition-opacity"
              title="Clear pinned chart point"
            >
              <RotateCcw className="w-3 h-3" />
              Reset point
            </button>
          )}

          {!compact && (
            <div className="hidden md:flex items-center gap-3 text-[11px] text-[#52525A] dark:text-[#B4B4BE] shrink-0">
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#30D158]" />
                <span className="font-semibold text-[#0F7033] dark:text-[#4ADE80]">
                  {chartMode === 'candles' ? 'Bull' : 'Above'}
                </span>
                <span className="text-[#8E8E93]">/</span>
                <span className="w-2 h-2 rounded-full bg-[#DC2626] dark:bg-[#FF453A]" />
                <span className="font-semibold text-[#C41C16] dark:text-[#FF5A52]">
                  {chartMode === 'candles' ? 'Bear' : 'Below'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 border-b-2 border-dashed border-[#6E6E78] dark:border-[#9898A2]" />
                <span>
                  {timeframe === '1D' ? 'Open' : `${timeframe} Start`}{' '}
                  <span className="tabular-nums font-bold font-mono text-[#1C1C1E] dark:text-white">
                    {formatVal(openBaseline)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive SVG Canvas with Liquid Glass Frame */}
      <div
        data-no-view-swipe="true"
        className={`liquid-glass-card relative w-full ${
          compact ? 'h-56 sm:h-64' : 'h-64 sm:h-72'
        } rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden select-none touch-pan-y`}
      >
        {/* Range Bounds + Timeframe Span Hint */}
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-semibold tabular-nums text-[#52525A] dark:text-[#B4B4BE] z-10 pointer-events-none">
          <span>High: {formatVal(maxVal)}</span>
          <span className="hidden sm:inline">
            {timeframe} Span: {formatVal(timeframeSummary.startVal)} → {formatVal(timeframeSummary.endVal)}
          </span>
          <span>Low: {formatVal(minVal)}</span>
        </div>

        {/* Floating Tooltip Overlay (visible on hover OR pinned click) */}
        {activePoint && inspectIndex !== null && (
          <div
            className="liquid-glass-strong absolute top-3 z-20 pointer-events-none px-3 py-1.5 rounded-xl shadow-lg text-xs flex flex-col"
            style={{
              left: `clamp(12px, calc(${(activePoint.x / 700) * 100}% - 72px), calc(100% - 220px))`,
            }}
          >
            <span className="text-[10px] text-[#52525A] dark:text-[#B4B4BE] font-semibold">
              {formatTimeHint(inspectIndex)} · vs {timeframe === '1D' ? 'Open' : `${timeframe} Start`}
            </span>
            <span className="font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums font-mono">
              {formatVal(activePoint.val)}
            </span>
            {activeCandle && (
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[10px] font-mono tabular-nums text-[#52525A] dark:text-[#B4B4BE] mt-0.5">
                <span>O: {formatVal(activeCandle.o)}</span>
                <span>H: {formatVal(activeCandle.h)}</span>
                <span>L: {formatVal(activeCandle.l)}</span>
                <span>C: {formatVal(activeCandle.c)}</span>
                <span className="col-span-2 text-[9.5px] opacity-85">
                  Rng: {formatVal(Math.max(0, activeCandle.h - activeCandle.l))}
                </span>
              </div>
            )}
            <span
              className={`text-[11px] font-extrabold tabular-nums font-mono ${
                activeDelta >= 0
                  ? 'text-[#0F7033] dark:text-[#4ADE80]'
                  : 'text-[#C41C16] dark:text-[#FF5A52]'
              }`}
            >
              {activeDelta >= 0 ? '+' : ''}
              {activeDelta.toFixed(asset.decimals >= 3 ? asset.decimals : 2)} (
              {activeDeltaPct >= 0 ? '+' : ''}
              {activeDeltaPct.toFixed(2)}%)
            </span>
          </div>
        )}

        <div className="relative flex-1 min-h-0 flex items-center">
          {/* Right-side Mid Reference Tick */}
          {chartMode === 'candles' && (
            <span className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-[9px] font-mono tabular-nums text-[#52525A]/80 dark:text-[#B4B4BE]/80 bg-white/55 dark:bg-black/40 px-1 rounded">
              {formatVal(midVal)}
            </span>
          )}

          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair overflow-visible"
            viewBox="0 0 700 220"
            preserveAspectRatio="none"
            data-chart-mode={chartMode}
            onPointerMove={(e) => {
              const idx = resolveIndexFromClientX(e.clientX);
              if (idx !== null) setHoverIndex(idx);
            }}
            onPointerDown={(e) => {
              const idx = resolveIndexFromClientX(e.clientX);
              if (idx !== null) {
                setHoverIndex(idx);
                setPinnedIndex((prev) => (prev === idx ? null : idx));
              }
            }}
            onPointerLeave={() => setHoverIndex(null)}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                const idx = resolveIndexFromClientX(e.touches[0].clientX);
                if (idx !== null) {
                  setHoverIndex(idx);
                  setPinnedIndex(idx);
                }
              }
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) {
                const idx = resolveIndexFromClientX(e.touches[0].clientX);
                if (idx !== null) {
                  setHoverIndex(idx);
                  setPinnedIndex(idx);
                }
              }
            }}
            onTouchEnd={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient
                id={strokeGradId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="0"
                y2="220"
              >
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset={`${splitPct}%`} stopColor="#22C55E" />
                <stop offset={`${splitPct}%`} stopColor="#EF4444" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>

              <linearGradient
                id={aboveFillId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="0"
                y2={String(Math.max(1, openingY))}
              >
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.05" />
              </linearGradient>

              <linearGradient
                id={belowFillId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1={String(openingY)}
                x2="0"
                y2="220"
              >
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.34" />
              </linearGradient>

              <clipPath id={aboveClipId}>
                <rect x="0" y="0" width="700" height={openingY} />
              </clipPath>
              <clipPath id={belowClipId}>
                <rect x="0" y={openingY} width="700" height={Math.max(0, 220 - openingY)} />
              </clipPath>
            </defs>

            {/* Technical Price Gridlines */}
            {[55, 110, 165].map((gy) => (
              <line
                key={gy}
                x1="0"
                y1={gy}
                x2="700"
                y2={gy}
                stroke="currentColor"
                className="text-black/8 dark:text-white/10"
                strokeWidth="0.75"
                strokeDasharray="2 4"
              />
            ))}

            {/* Horizontal Dashed Opening / Timeframe Start Reference Line */}
            <line
              x1="0"
              y1={openingY}
              x2="700"
              y2={openingY}
              stroke="#8E8E98"
              strokeWidth="1.5"
              strokeDasharray="3 5"
              strokeLinecap="round"
              opacity="0.75"
            />

            {chartMode === 'line' ? (
              <>
                <path
                  d={baselineAreaPath}
                  clipPath={`url(#${aboveClipId})`}
                  fill={`url(#${aboveFillId})`}
                />
                <path
                  d={baselineAreaPath}
                  clipPath={`url(#${belowClipId})`}
                  fill={`url(#${belowFillId})`}
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke={`url(#${strokeGradId})`}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {timeframe === '1D' && asset.marketSessionOpen && !activePoint && (
                  <circle
                    cx={lastCoord.x}
                    cy={lastCoord.y}
                    r="4.2"
                    fill={lastAboveOpen ? '#22C55E' : '#EF4444'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                  />
                )}
              </>
            ) : (
              <g data-testid="candlestick-series">
                {/* Active Candle Vertical Spotlight */}
                {activeCandle && (
                  <rect
                    x={activeCandle.x - candleSlotW * 0.45}
                    y="0"
                    width={candleSlotW * 0.9}
                    height="220"
                    fill="currentColor"
                    className="text-black/5 dark:text-white/6 pointer-events-none"
                    rx="2"
                  />
                )}
                {candles.map((c, idx) => {
                  const bodyTop = Math.min(c.openY, c.closeY);
                  const rawH = Math.abs(c.closeY - c.openY);
                  const bodyHeight = Math.max(2.5, rawH);
                  const fillColor = c.isBull ? '#22C55E' : '#EF4444';
                  const rimColor = c.isBull ? '#16A34A' : '#DC2626';
                  const isInspected = inspectIndex === idx;
                  return (
                    <g
                      key={`${c.t}-${idx}`}
                      opacity={inspectIndex !== null && !isInspected ? 0.68 : 1}
                    >
                      {/* High-Low Wick */}
                      <line
                        x1={c.x}
                        y1={c.highY}
                        x2={c.x}
                        y2={c.lowY}
                        stroke={rimColor}
                        strokeWidth={isInspected ? 2 : 1.35}
                        strokeLinecap="round"
                      />
                      {/* Open-Close Candle Body */}
                      <rect
                        x={c.x - c.width / 2}
                        y={c.isDoji ? bodyTop - 1 : bodyTop}
                        width={c.width}
                        height={bodyHeight}
                        rx="1.5"
                        fill={fillColor}
                        stroke={isInspected ? '#FFFFFF' : rimColor}
                        strokeWidth={isInspected ? 1.25 : 0.75}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Crosshair & Active Tracker Dot */}
            {activePoint && (
              <>
                <line
                  x1={activePoint.x}
                  y1="0"
                  x2={activePoint.x}
                  y2="220"
                  stroke="currentColor"
                  className="text-[#1C1C1E]/45 dark:text-white/55 pointer-events-none"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                {chartMode === 'line' && (
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5.5"
                    fill="#FFFFFF"
                    stroke={activeAboveOpen ? '#16A34A' : '#DC2626'}
                    strokeWidth="3"
                    className="pointer-events-none"
                  />
                )}
              </>
            )}
          </svg>
        </div>

        {/* Time Axis Labels */}
        <div className="flex items-center justify-between text-[10px] text-[#52525A] dark:text-[#B4B4BE] font-semibold pt-2 border-t border-black/10 dark:border-white/10 tabular-nums">
          {axisLabels.map((lbl, idx) => (
            <span key={`${lbl}-${idx}`}>{lbl}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
