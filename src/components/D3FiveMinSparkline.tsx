import React, { useId, useMemo } from 'react';
import { area, curveMonotoneX, extent, line, scaleLinear } from 'd3';

interface D3FiveMinSparklineProps {
  points: number[];
  deltaPct: number;
  width?: number;
  height?: number;
  className?: string;
}

export const D3FiveMinSparkline: React.FC<D3FiveMinSparklineProps> = React.memo(
  ({ points, deltaPct, width = 88, height = 22, className = '' }) => {
    const uid = useId().replace(/:/g, '');
    const gradId = `d35m-${uid}`;

    const geometry = useMemo(() => {
      const valid = points.filter((v) => typeof v === 'number' && Number.isFinite(v));
      const safePts = valid.length >= 2 ? valid : [];
      if (safePts.length < 2) {
        return { lineD: '', areaD: '', baselineY: height / 2, endX: 0, endY: height / 2, trend: 'flat' as const };
      }
      const padX = 2.5;
      const padY = 2.5;

      const xScale = scaleLinear()
        .domain([0, Math.max(1, safePts.length - 1)])
        .range([padX, width - padX]);

      const [rawMin, rawMax] = extent(safePts);
      const minVal = rawMin ?? safePts[0];
      const maxVal = rawMax ?? safePts[0];
      const spread = maxVal - minVal;
      const domainPad = spread > 0 ? spread * 0.14 : Math.max(Math.abs(minVal) * 0.001, 1);

      const yScale = scaleLinear()
        .domain([minVal - domainPad, maxVal + domainPad])
        .range([height - padY, padY]);

      const lineGen = line<number>()
        .x((_, idx) => xScale(idx))
        .y((d) => yScale(d))
        .curve(curveMonotoneX);

      const baselineY = yScale(safePts[0]);
      const areaGen = area<number>()
        .x((_, idx) => xScale(idx))
        .y0(baselineY)
        .y1((d) => yScale(d))
        .curve(curveMonotoneX);

      const lineD = lineGen(safePts) ?? '';
      const areaD = areaGen(safePts) ?? '';
      const endX = xScale(safePts.length - 1);
      const endY = yScale(safePts[safePts.length - 1]);

      const first = safePts[0];
      const last = safePts[safePts.length - 1];
      const trend: 'up' | 'down' | 'flat' =
        deltaPct > 0.005 || (Math.abs(deltaPct) <= 0.005 && last > first)
          ? 'up'
          : deltaPct < -0.005 || (Math.abs(deltaPct) <= 0.005 && last < first)
            ? 'down'
            : 'flat';

      return { lineD, areaD, baselineY, endX, endY, trend };
    }, [points, deltaPct, width, height]);

    const strokeColor =
      geometry.trend === 'up'
        ? '#16A34A'
        : geometry.trend === 'down'
          ? '#DC2626'
          : '#64748B';

    return (
      <svg
        data-testid="d3-5m-sparkline"
        viewBox={`0 0 ${width} ${height}`}
        className={className || 'w-full h-[22px] overflow-visible'}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={2}
          y1={geometry.baselineY}
          x2={width - 2}
          y2={geometry.baselineY}
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeDasharray="1.5 2.5"
          strokeWidth="1"
        />

        {geometry.areaD && (
          <path d={geometry.areaD} fill={`url(#${gradId})`} />
        )}

        {geometry.lineD && (
          <path
            d={geometry.lineD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <circle
          cx={geometry.endX}
          cy={geometry.endY}
          r="2"
          fill={strokeColor}
        />
      </svg>
    );
  }
);
