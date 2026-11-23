import React, { useMemo } from 'react';
import { arc as d3Arc, scaleLinear } from 'd3';
import { Activity, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { RiskRegimeInfo, ThemeMode } from '../types/market';

interface RiskRegimeGaugeCardProps {
  regime: RiskRegimeInfo;
  themeMode: ThemeMode;
}

export const RiskRegimeGaugeCard: React.FC<RiskRegimeGaugeCardProps> = React.memo(
  ({ regime, themeMode }) => {
    const isDark = themeMode === 'obsidian';
    if (!Number.isFinite(regime.score)) {
      return (
        <section data-testid="risk-regime-gauge" aria-label="Risk-On vs Risk-Off Weighted Market Regime Gauge" className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-2">
          <h2 className="text-sm font-bold text-[#151821] dark:text-white">Risk-On vs Risk-Off · Unavailable</h2>
          <p className="text-xs text-[#454954] dark:text-[#9EB5C8]">{regime.driver}</p>
        </section>
      );
    }
    const clampedScore = Math.max(0, Math.min(100, regime.score));

    const { backgroundPath, segmentPaths, needleCoords } = useMemo(() => {
      const innerR = 64;
      const outerR = 76;
      const angleScale = scaleLinear()
        .domain([0, 100])
        .range([-Math.PI / 2, Math.PI / 2]);

      const arcGen = d3Arc<void>()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .cornerRadius(4);

      const bg =
        arcGen.startAngle(-Math.PI / 2).endAngle(Math.PI / 2)() ?? '';

      const zones = [
        { from: 0, to: 34, color: isDark ? '#FF6B63' : '#DC2626' },
        { from: 36, to: 46, color: isDark ? '#FB923C' : '#EA580C' },
        { from: 48, to: 52, color: isDark ? '#FBBF24' : '#CA8A04' },
        { from: 54, to: 64, color: isDark ? '#34D399' : '#22C55E' },
        { from: 66, to: 100, color: isDark ? '#4ADE80' : '#15803D' },
      ];

      const paths = zones.map((z) => ({
        d:
          d3Arc<void>()
            .innerRadius(innerR + 1)
            .outerRadius(outerR - 1)
            .cornerRadius(3)
            .startAngle(angleScale(z.from))
            .endAngle(angleScale(z.to))() ?? '',
        color: z.color,
      }));

      // d3.arc 0 radians points up (12 o'clock); convert to SVG (x, y) around (110, 98)
      const theta = angleScale(clampedScore);
      const cx = 110;
      const cy = 98;
      const tipLen = innerR - 6;
      const tailLen = 10;
      const tipX = cx + tipLen * Math.sin(theta);
      const tipY = cy - tipLen * Math.cos(theta);
      const tailX = cx - tailLen * Math.sin(theta);
      const tailY = cy + tailLen * Math.cos(theta);

      return {
        backgroundPath: bg,
        segmentPaths: paths,
        needleCoords: { cx, cy, tipX, tipY, tailX, tailY },
      };
    }, [clampedScore, isDark]);

    const statusColorClass =
      regime.polarity === 'risk-on'
        ? 'text-[#0D6B31] dark:text-[#4ADE80]'
        : regime.polarity === 'risk-off'
          ? 'text-[#B91C1C] dark:text-[#FF6B63]'
          : 'text-[#9A4E00] dark:text-[#FBBF24]';

    const hubFill =
      regime.polarity === 'risk-on'
        ? isDark
          ? '#4ADE80'
          : '#16A34A'
        : regime.polarity === 'risk-off'
          ? isDark
            ? '#FF6B63'
            : '#DC2626'
          : isDark
            ? '#FBBF24'
            : '#D97706';

    return (
      <section
        data-testid="risk-regime-gauge"
        aria-label="Risk-On vs Risk-Off Weighted Market Regime Gauge"
        className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-[#0066CC] dark:text-[#38BDF8] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#151821] dark:text-white truncate">
                Risk-On vs Risk-Off
              </h2>
              <p className="text-[11px] text-[#454954] dark:text-[#9EB5C8] truncate">
                Weighted index &amp; sector composite
              </p>
            </div>
          </div>

          <span
            data-testid="risk-regime-weighted-move"
            className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-extrabold tabular-nums whitespace-nowrap shrink-0 ${
              regime.weightedMovePct > 0.02
                ? 'text-[#0D6B31] dark:text-[#4ADE80]'
                : regime.weightedMovePct < -0.02
                  ? 'text-[#B91C1C] dark:text-[#FF6B63]'
                  : 'text-[#454954] dark:text-[#CBD5E1]'
            }`}
          >
            {regime.weightedMovePct > 0.02 ? (
              <ArrowUp className="w-3 h-3 shrink-0" />
            ) : regime.weightedMovePct < -0.02 ? (
              <ArrowDown className="w-3 h-3 shrink-0" />
            ) : (
              <Minus className="w-3 h-3 shrink-0" />
            )}
            <span>
              {Number.isFinite(regime.weightedMovePct) ? `${regime.weightedMovePct >= 0 ? '+' : ''}${regime.weightedMovePct.toFixed(2)}%` : '—'}
            </span>
          </span>
        </div>

        {/* D3 Semicircular Risk-Off <-> Risk-On Dial */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 220 118"
            className="w-full max-w-[240px] h-auto overflow-visible"
            role="img"
            aria-label={`Weighted market regime score ${clampedScore} out of 100: ${regime.status}`}
          >
            <g transform="translate(110, 98)">
              <path
                d={backgroundPath}
                fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
              />
              {segmentPaths.map((seg, idx) => (
                <path key={idx} d={seg.d} fill={seg.color} opacity={0.92} />
              ))}
            </g>

            <line
              x1={needleCoords.tailX}
              y1={needleCoords.tailY}
              x2={needleCoords.tipX}
              y2={needleCoords.tipY}
              stroke={isDark ? '#F8FAFC' : '#151821'}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <circle
              cx={needleCoords.cx}
              cy={needleCoords.cy}
              r="5.5"
              fill={hubFill}
              stroke={isDark ? '#0B1019' : '#FFFFFF'}
              strokeWidth="2"
            />

            <text
              x="22"
              y="113"
              className="fill-[#454954] dark:fill-[#B4C6DA] text-[9px] font-bold"
            >
              Risk-Off
            </text>
            <text
              x="198"
              y="113"
              textAnchor="end"
              className="fill-[#454954] dark:fill-[#B4C6DA] text-[9px] font-bold"
            >
              Risk-On
            </text>
          </svg>

          <div className="-mt-2 flex items-baseline gap-2">
            <span
              data-testid="risk-regime-score"
              className="text-2xl font-extrabold font-mono tabular-nums text-[#151821] dark:text-white"
            >
              {clampedScore}
            </span>
            <span
              data-testid="risk-regime-status"
              className={`text-xs font-extrabold ${statusColorClass}`}
            >
              {regime.status}
            </span>
          </div>
          <p className="text-[11px] text-[#454954] dark:text-[#B4C6DA] text-center mt-0.5 tabular-nums">
            {regime.driver}
          </p>
        </div>

        {/* Weighted Cross-Sector Contribution Table */}
        <div className="pt-2.5 border-t border-black/8 dark:border-white/10 divide-y divide-black/6 dark:divide-white/8 text-xs">
          {regime.sectors.map((sec) => {
            const isPos = sec.avgMovePct >= 0;
            return (
              <div
                key={sec.id}
                className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[#151821] dark:text-white truncate">
                    {sec.label}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8] shrink-0">
                    {sec.weightPct}% wt
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span
                    className={`text-[10px] font-bold ${
                      sec.stance === 'Risk-On'
                        ? 'text-[#0D6B31] dark:text-[#4ADE80]'
                        : sec.stance === 'Risk-Off'
                          ? 'text-[#B91C1C] dark:text-[#FF6B63]'
                          : 'text-[#6C6C70] dark:text-[#9EB5C8]'
                    }`}
                  >
                    {sec.stance}
                  </span>
                  <span
                    className={`font-extrabold ${
                      isPos
                        ? 'text-[#0D6B31] dark:text-[#4ADE80]'
                        : 'text-[#B91C1C] dark:text-[#FF6B63]'
                    }`}
                  >
                    {isPos ? '+' : ''}
                    {sec.avgMovePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }
);
