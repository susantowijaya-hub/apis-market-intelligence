import React, { useId, useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface GoogleFinanceMiniChartProps {
  points: number[];
  prevClose?: number;
  openPrice?: number;
  isGain?: boolean;
  progressRatio?: number;
  className?: string;
  showEndDot?: boolean;
  strokeWidth?: number;
}

export const GoogleFinanceMiniChart: React.FC<GoogleFinanceMiniChartProps> = React.memo(({
  points,
  prevClose,
  openPrice,
  progressRatio = 1,
  className = 'w-full h-12',
  showEndDot = false,
  strokeWidth = 1.75,
}) => {
  const uid = useId().replace(/:/g, '');
  const strokeGradId = `gfSplit-${uid}`;
  const aboveFillId = `gfAbove-${uid}`;
  const belowFillId = `gfBelow-${uid}`;
  const aboveClipId = `gfClipA-${uid}`;
  const belowClipId = `gfClipB-${uid}`;

  const { linePath, areaPath, baselineY, splitPct, endPoint, lastAboveBase } = useMemo(() => {
    const w = 160;
    const h = 52;
    const padTop = 4;
    const padBottom = 3;
    const usableH = h - padTop - padBottom;

    const safePts = points.length >= 2 ? points : [1, 1];
    const refVal =
      typeof openPrice === 'number' && Number.isFinite(openPrice) && openPrice > 0
        ? openPrice
        : typeof prevClose === 'number' && Number.isFinite(prevClose) && prevClose > 0
          ? prevClose
          : safePts[0];

    const allVals = [...safePts, refVal];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const span = max - min || Math.max(Math.abs(refVal) * 0.002, 1);

    const clampedProgress = Math.max(0.15, Math.min(1, progressRatio));
    const drawW = w * clampedProgress;

    const mapY = (val: number) => {
      const norm = (val - min) / span;
      return padTop + (1 - norm) * usableH;
    };

    const coords = safePts.map((val, idx) => {
      const x = (idx / Math.max(safePts.length - 1, 1)) * drawW;
      const y = mapY(val);
      return { x, y, val };
    });

    const line = coords
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');

    const firstPt = coords[0];
    const lastPt = coords[coords.length - 1];
    const baseY = Math.max(2, Math.min(h - 2, mapY(refVal)));
    const area = `${line} L${lastPt.x.toFixed(1)},${baseY.toFixed(1)} L${firstPt.x.toFixed(1)},${baseY.toFixed(1)} Z`;

    return {
      linePath: line,
      areaPath: area,
      baselineY: baseY,
      splitPct: Math.max(0, Math.min(100, (baseY / h) * 100)),
      endPoint: lastPt,
      lastAboveBase: lastPt.val >= refVal,
    };
  }, [points, prevClose, openPrice, progressRatio]);

  return (
    <svg
      className={className}
      viewBox="0 0 160 52"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={strokeGradId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="52"
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
          y2={String(Math.max(1, baselineY))}
        >
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0.04" />
        </linearGradient>

        <linearGradient
          id={belowFillId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={String(baselineY)}
          x2="0"
          y2="52"
        >
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.32" />
        </linearGradient>

        <clipPath id={aboveClipId}>
          <rect x="0" y="0" width="160" height={baselineY} />
        </clipPath>
        <clipPath id={belowClipId}>
          <rect x="0" y={baselineY} width="160" height={Math.max(0, 52 - baselineY)} />
        </clipPath>
      </defs>

      {/* Horizontal Dotted Open/Prev Close Baseline */}
      <line
        x1="0"
        y1={baselineY}
        x2="160"
        y2={baselineY}
        stroke="#8E8E98"
        strokeWidth="1.4"
        strokeDasharray="1.5 4"
        strokeLinecap="round"
        opacity="0.72"
      />

      {/* Split Green/Red Area Fill anchored at baseline */}
      <path d={areaPath} clipPath={`url(#${aboveClipId})`} fill={`url(#${aboveFillId})`} />
      <path d={areaPath} clipPath={`url(#${belowClipId})`} fill={`url(#${belowFillId})`} />

      {/* Crisp Split Price Curve */}
      <path
        d={linePath}
        fill="none"
        stroke={`url(#${strokeGradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showEndDot && (
        <circle
          cx={endPoint.x}
          cy={endPoint.y}
          r="2.4"
          fill={lastAboveBase ? '#22C55E' : '#EF4444'}
        />
      )}
    </svg>
  );
});

interface GoogleFinanceDeltaPillProps {
  changePercent: number;
  label?: string;
  compact?: boolean;
}

export const GoogleFinanceDeltaPill: React.FC<GoogleFinanceDeltaPillProps> = React.memo(({
  changePercent,
  label,
  compact = false,
}) => {
  const isGain = changePercent >= 0;
  const text = label ?? `${isGain ? '+' : ''}${changePercent.toFixed(2)}%`;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
      <span
        className={`${compact ? 'text-[11px]' : 'text-xs sm:text-sm'} font-extrabold ${
          isGain
            ? 'text-[#0F7033] dark:text-[#4ADE80]'
            : 'text-[#C41C16] dark:text-[#FF6B63]'
        }`}
      >
        {text}
      </span>
      <span
        className={`inline-flex items-center justify-center rounded-full ${
          compact ? 'w-4 h-4' : 'w-6 h-4'
        } ${
          isGain
            ? 'bg-[#22C55E]/22 dark:bg-[#4ADE80] text-[#0B4F24] dark:text-[#052E14]'
            : 'bg-[#EF4444]/20 dark:bg-[#FF6B63] text-[#7F1D1D] dark:text-[#2D0606]'
        }`}
      >
        {isGain ? (
          <ArrowUp className={compact ? 'w-2.5 h-2.5 stroke-[2.75]' : 'w-3 h-3 stroke-[2.75]'} />
        ) : (
          <ArrowDown className={compact ? 'w-2.5 h-2.5 stroke-[2.75]' : 'w-3 h-3 stroke-[2.75]'} />
        )}
      </span>
    </span>
  );
});
