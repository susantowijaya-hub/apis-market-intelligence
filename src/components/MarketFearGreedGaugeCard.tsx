import React from 'react';
import { Gauge } from 'lucide-react';
import { ThemeMode, VolatilityFearGreedInfo } from '../types/market';

interface MarketFearGreedGaugeCardProps {
  sentiment: VolatilityFearGreedInfo;
  themeMode: ThemeMode;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg >= startDeg ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const MarketFearGreedGaugeCard: React.FC<MarketFearGreedGaugeCardProps> = React.memo(
  ({ sentiment, themeMode }) => {
    const isDark = themeMode === 'obsidian';
    if (!Number.isFinite(sentiment.score)) {
      return (
        <section data-testid="market-fear-greed-gauge" aria-label="Market Fear and Greed Volatility Gauge" className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-2">
          <h2 className="text-sm font-bold text-[#151821] dark:text-white">Market Fear &amp; Greed · Unavailable</h2>
          <p className="text-xs text-[#454954] dark:text-[#9EB5C8]">{sentiment.driver}</p>
        </section>
      );
    }

    // Semicircular dial geometry: 180 deg (left, score 0) -> 360 deg (right, score 100)
    const cx = 110;
    const cy = 98;
    const radius = 74;
    const clampedScore = Math.max(0, Math.min(100, sentiment.score));
    const needleAngle = 180 + (clampedScore / 100) * 180;
    const needleTip = polarToCartesian(cx, cy, radius - 13, needleAngle);
    const needleTail = polarToCartesian(cx, cy, 11, needleAngle + 180);

    const toneClass =
      clampedScore >= 60
        ? 'text-[#0D6B31] dark:text-[#4ADE80]'
        : clampedScore >= 52
          ? 'text-[#15803D] dark:text-[#86EFAC]'
          : clampedScore <= 34
            ? 'text-[#B91C1C] dark:text-[#FF6B63]'
            : clampedScore <= 45
              ? 'text-[#C2410C] dark:text-[#FBBF24]'
              : 'text-[#454954] dark:text-[#CBD5E1]';

    const needleColor =
      clampedScore >= 55
        ? isDark
          ? '#4ADE80'
          : '#16A34A'
        : clampedScore <= 44
          ? isDark
            ? '#FF6B63'
            : '#DC2626'
          : isDark
            ? '#FBBF24'
            : '#D97706';

    const segments = [
      { from: 180, to: 214, color: isDark ? '#FF6B63' : '#DC2626' },
      { from: 217, to: 251, color: isDark ? '#FB923C' : '#EA580C' },
      { from: 254, to: 286, color: isDark ? '#FBBF24' : '#CA8A04' },
      { from: 289, to: 323, color: isDark ? '#34D399' : '#22C55E' },
      { from: 326, to: 360, color: isDark ? '#4ADE80' : '#15803D' },
    ];

    const volRegimeTextClass =
      sentiment.volRegime === 'Panic'
        ? 'text-[#B91C1C] dark:text-[#FF6B63]'
        : sentiment.volRegime === 'Elevated'
          ? 'text-[#B45309] dark:text-[#FBBF24]'
          : sentiment.volRegime === 'Compressed'
            ? 'text-[#0D6B31] dark:text-[#4ADE80]'
            : 'text-[#151821] dark:text-white';

    return (
      <section
        data-testid="market-fear-greed-gauge"
        aria-label="Market Fear and Greed Volatility Gauge"
        className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Gauge className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#151821] dark:text-white truncate">
                Market Fear &amp; Greed
              </h2>
              <p className="text-[11px] text-[#454954] dark:text-[#9EB5C8] truncate">
                Asset volatility &amp; dispersion index
              </p>
            </div>
          </div>
          <span
            data-testid="market-fear-greed-regime"
            className={`text-[11px] font-extrabold font-mono whitespace-nowrap shrink-0 ${volRegimeTextClass}`}
          >
            {sentiment.volRegime} Vol
          </span>
        </div>

        {/* Semicircular SVG Volatility Dial */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 220 124"
            className="w-full max-w-[240px] h-auto overflow-visible"
            role="img"
            aria-label={`Volatility-based Market Fear and Greed score ${clampedScore} out of 100: ${sentiment.zone}`}
          >
            {/* Background Track */}
            <path
              d={describeArc(cx, cy, radius, 180, 360)}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* 5-Zone Segmented Arc */}
            {segments.map((seg, i) => (
              <path
                key={i}
                d={describeArc(cx, cy, radius, seg.from, seg.to)}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeLinecap="round"
                opacity={0.9}
              />
            ))}

            {/* Needle & Hub */}
            <line
              x1={needleTail.x}
              y1={needleTail.y}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke={isDark ? '#F8FAFC' : '#151821'}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <circle
              cx={cx}
              cy={cy}
              r="6"
              fill={needleColor}
              stroke={isDark ? '#0B1019' : '#FFFFFF'}
              strokeWidth="2"
            />

            {/* Scale Endpoints */}
            <text
              x="22"
              y="114"
              className="fill-[#454954] dark:fill-[#B4C6DA] text-[9px] font-bold"
            >
              Fear
            </text>
            <text
              x="198"
              y="114"
              textAnchor="end"
              className="fill-[#454954] dark:fill-[#B4C6DA] text-[9px] font-bold"
            >
              Greed
            </text>
          </svg>

          <div className="-mt-3 flex items-baseline gap-2">
            <span
              data-testid="market-fear-greed-score"
              className="text-2xl font-extrabold font-mono tabular-nums text-[#151821] dark:text-white"
            >
              {clampedScore}
            </span>
            <span className={`text-xs font-extrabold ${toneClass}`}>
              {sentiment.zone}
            </span>
          </div>
          <p className="text-[11px] text-[#454954] dark:text-[#B4C6DA] text-center mt-0.5 tabular-nums">
            {sentiment.driver}
          </p>
        </div>

        {/* Volatility Telemetry Breakdown */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2.5 border-t border-black/8 dark:border-white/10 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#454954] dark:text-[#9EB5C8]">Avg 5m Range</span>
            <span className="font-mono font-bold tabular-nums text-[#151821] dark:text-white">
              {sentiment.avg5mRangePct.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#454954] dark:text-[#9EB5C8]">5m Dispersion</span>
            <span className="font-mono font-bold tabular-nums text-[#151821] dark:text-white">
              {sentiment.dispersionSigma.toFixed(2)}σ
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#454954] dark:text-[#9EB5C8]">Intraday Band</span>
            <span className="font-mono font-bold tabular-nums text-[#151821] dark:text-white">
              {sentiment.intradayRangePct.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#454954] dark:text-[#9EB5C8]">Down Skew</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                sentiment.downsideSkewPct >= 60
                  ? 'text-[#B91C1C] dark:text-[#FF6B63]'
                  : sentiment.downsideSkewPct <= 35
                    ? 'text-[#0D6B31] dark:text-[#4ADE80]'
                    : 'text-[#151821] dark:text-white'
              }`}
            >
              {sentiment.downsideSkewPct}%
            </span>
          </div>
        </div>
      </section>
    );
  }
);
