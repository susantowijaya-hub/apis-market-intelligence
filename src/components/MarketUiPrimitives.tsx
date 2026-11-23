import React, { useId } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Coins,
  DollarSign,
  Flame,
  Gauge,
  Gem,
  Globe2,
  Landmark,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  BandarmologyAnalysis,
  BandarmologyPhase,
  FearGreedInfo,
  FearGreedZone,
  MarketSignalInfo,
  WatchlistCategory,
} from '../types/market';
import type { OverallMarketFearGreed } from '../utils/marketSignals';

export function getBandarmologyToneClasses(phase: BandarmologyPhase): string {
  switch (phase) {
    case 'Strong Accumulation':
      return 'bg-[#16A34A]/18 dark:bg-[#22C55E]/22 text-[#0B5D2A] dark:text-[#4ADE80] border-[#16A34A]/45 dark:border-[#4ADE80]/45';
    case 'Early Accumulation':
      return 'bg-[#0D9488]/15 dark:bg-[#2DD4BF]/18 text-[#0F5E57] dark:text-[#5EEAD4] border-[#0D9488]/35 dark:border-[#2DD4BF]/38';
    case 'Early Distribution':
      return 'bg-[#EA580C]/16 dark:bg-[#FB923C]/18 text-[#9A3412] dark:text-[#FDBA74] border-[#EA580C]/38 dark:border-[#FB923C]/40';
    case 'Strong Distribution':
      return 'bg-[#DC2626]/18 dark:bg-[#EF4444]/22 text-[#B91C1C] dark:text-[#FF6B63] border-[#DC2626]/45 dark:border-[#FF6B63]/45';
    default:
      return 'bg-[#E5E5EA]/90 dark:bg-[#2C2C2E] text-[#45474F] dark:text-[#C5C8D2] border-[#C7C7CC] dark:border-[#48484E]';
  }
}

export const BandarmologyBadge: React.FC<{
  bandarmology?: BandarmologyAnalysis | null;
  compact?: boolean;
  showScore?: boolean;
  className?: string;
}> = React.memo(({ bandarmology, compact = false, showScore = false, className = '' }) => {
  if (!bandarmology) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap shrink-0 bg-[#E5E5EA]/60 dark:bg-[#2C2C2E]/60 text-[#6C6C70] dark:text-[#9EB5C8] border-[#D1D1D6] dark:border-[#38383A] ${className}`}
      >
        Neutral
      </span>
    );
  }

  const toneClasses = getBandarmologyToneClasses(bandarmology.phase);
  const shortText =
    bandarmology.phase === 'Strong Accumulation'
      ? compact
        ? 'Strong Acc'
        : 'Strong Accumulation'
      : bandarmology.phase === 'Early Accumulation'
        ? compact
          ? 'Early Acc'
          : 'Early Accumulation'
        : bandarmology.phase === 'Early Distribution'
          ? compact
            ? 'Early Dist'
            : 'Early Distribution'
          : bandarmology.phase === 'Strong Distribution'
            ? compact
              ? 'Strong Dist'
              : 'Strong Distribution'
            : 'Neutral';

  const isAcc = bandarmology.phase.includes('Accumulation');
  const isDist = bandarmology.phase.includes('Distribution');

  return (
    <span
      title={`${bandarmology.phase} (Score ${bandarmology.score > 0 ? '+' : ''}${bandarmology.score}) · ${bandarmology.volumeRatio}x 20D Vol · Flow ${bandarmology.accumulationPressure}% · ${bandarmology.foreignBias} — ${bandarmology.summary}`}
      className={`inline-flex items-center gap-1 rounded-md border font-bold whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
      } ${toneClasses} ${className}`}
    >
      {isAcc ? (
        <ArrowUp className="w-3 h-3 shrink-0" />
      ) : isDist ? (
        <ArrowDown className="w-3 h-3 shrink-0" />
      ) : (
        <Activity className="w-3 h-3 shrink-0" />
      )}
      <span>{shortText}</span>
      {showScore && (
        <span className="font-mono tabular-nums opacity-85 ml-0.5">
          ({bandarmology.score > 0 ? `+${bandarmology.score}` : bandarmology.score})
        </span>
      )}
    </span>
  );
});

export function getFearGreedTextTone(zone: FearGreedZone): string {
  switch (zone) {
    case 'Extreme Greed':
      return 'text-[#0F7033] dark:text-[#4ADE80]';
    case 'Greed':
      return 'text-[#15803D] dark:text-[#22C55E]';
    case 'Extreme Fear':
      return 'text-[#C41C16] dark:text-[#FF6B63]';
    case 'Fear':
      return 'text-[#C2410C] dark:text-[#FB923C]';
    case 'Unavailable':
    default:
      return 'text-[#4A4D57] dark:text-[#B4B8C4]';
  }
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const FearGreedTrendSparkline: React.FC<{
  history7d: number[];
  score: number;
  zone: FearGreedZone;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}> = React.memo(({ history7d, score, zone, compact = false, showLabel = true, className = '' }) => {
  const series = history7d.length >= 2 ? history7d : [score, score];
  const width = compact ? 44 : 64;
  const height = compact ? 16 : 22;
  const padX = 2;
  const padY = 2.5;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = series.map((val, idx) => {
    const x = padX + (series.length <= 1 ? 0 : (idx / (series.length - 1)) * innerW);
    const clamped = Math.max(0, Math.min(100, val));
    const y = padY + (1 - clamped / 100) * innerH;
    return { x, y };
  });

  const linePath = coords
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const lastPt = coords[coords.length - 1];
  const areaPath = `${linePath} L ${lastPt.x.toFixed(1)} ${(height - padY).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - padY).toFixed(1)} Z`;

  const midY = padY + 0.5 * innerH;
  const delta7d = Math.round(series[series.length - 1] - series[0]);
  const strokeColor =
    zone === 'Extreme Greed' || zone === 'Greed'
      ? '#16A34A'
      : zone === 'Extreme Fear' || zone === 'Fear'
        ? '#DC2626'
        : '#64748B';
  const deltaTone =
    delta7d > 0
      ? 'text-[#0F7033] dark:text-[#4ADE80]'
      : delta7d < 0
        ? 'text-[#C41C16] dark:text-[#FF6B63]'
        : 'text-[#6C6C70] dark:text-[#8E8E93]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}
      title={`7-Day Fear & Greed Trend: ${series.join(' → ')} (${delta7d >= 0 ? '+' : ''}${delta7d} pts over 7d)`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible shrink-0"
        aria-label={`7-day sentiment trend ${delta7d >= 0 ? 'up' : 'down'} ${Math.abs(delta7d)} points`}
      >
        <line
          x1={padX}
          y1={midY}
          x2={width - padX}
          y2={midY}
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="0.75"
          strokeDasharray="2 2"
          className="text-[#6C6C70] dark:text-[#8E8E93]"
        />
        <path d={areaPath} fill={strokeColor} fillOpacity="0.14" />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={compact ? '1.5' : '1.75'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastPt.x} cy={lastPt.y} r={compact ? '2' : '2.4'} fill={strokeColor} />
      </svg>
      {showLabel && (
        <span
          className={`font-mono tabular-nums font-bold leading-none ${
            compact ? 'text-[9px]' : 'text-[10px]'
          } ${deltaTone}`}
        >
          {delta7d > 0 ? `+${delta7d}` : delta7d}
        </span>
      )}
    </span>
  );
});

export const FearGreedMeter: React.FC<{
  fearGreed: FearGreedInfo;
  instrumentLabel?: string;
  compact?: boolean;
  showComponents?: boolean;
}> = React.memo(({ fearGreed, instrumentLabel, compact = false, showComponents = true }) => {
  const available = Number.isFinite(fearGreed.score);
  const score = available ? Math.max(0, Math.min(100, fearGreed.score)) : 0;
  const toneText = getFearGreedTextTone(fearGreed.zone);
  if (!available) {
    return (
      <div className={`border-y border-[#E5E5EA] dark:border-[#2C2C2E]/70 ${compact ? 'py-3' : 'py-3.5'}`}>
        <div className="text-sm font-bold text-[#6C6C70] dark:text-[#9EB5C8]">Fear &amp; Greed · Unavailable</div>
        <p className="text-xs text-[#6C6C70] dark:text-[#9EB5C8] mt-1">{fearGreed.driver}</p>
      </div>
    );
  }

  // Semicircle gauge geometry (0 = left 0deg, 100 = right 180deg)
  const cx = 100;
  const cy = 94;
  const radius = 72;
  const needleAngle = (score / 100) * 180;
  const needleTip = polarToCartesian(cx, cy, radius - 10, needleAngle);

  const segments: Array<{ from: number; to: number; color: string; active: boolean }> = [
    { from: 0, to: 43, color: '#DC2626', active: score <= 24 },
    { from: 46, to: 79, color: '#EA580C', active: score >= 25 && score <= 44 },
    { from: 82, to: 98, color: '#64748B', active: score >= 45 && score <= 54 },
    { from: 101, to: 134, color: '#16A34A', active: score >= 55 && score <= 74 },
    { from: 137, to: 180, color: '#15803D', active: score >= 75 },
  ];

  const subMetrics = [
    { label: 'Momentum', value: fearGreed.components.momentum },
    { label: 'Tape Strength', value: fearGreed.components.intradayStrength },
    { label: '52W Position', value: fearGreed.components.range52w },
  ];

  return (
    <div
      className={`border-y border-[#E5E5EA] dark:border-[#2C2C2E]/70 ${
        compact ? 'py-3' : 'py-3.5'
      } flex flex-col gap-3`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Semicircular SVG Gauge */}
          <div className="shrink-0 w-[132px] h-[74px] flex items-center justify-center">
            <svg
              viewBox="0 0 200 110"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label={`${instrumentLabel ?? 'Instrument'} Fear and Greed Index: ${score} out of 100 (${fearGreed.zone})`}
            >
              {segments.map((seg, i) => (
                <path
                  key={i}
                  d={describeArc(cx, cy, radius, seg.from, seg.to)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={seg.active ? 13 : 9}
                  strokeLinecap="round"
                  opacity={seg.active ? 1 : 0.34}
                />
              ))}

              {/* Scale endpoints */}
              <text
                x="18"
                y="107"
                fontSize="11"
                fontWeight="700"
                fill="currentColor"
                className="text-[#6C6C70] dark:text-[#8E8E93]"
                textAnchor="middle"
              >
                0
              </text>
              <text
                x="182"
                y="107"
                fontSize="11"
                fontWeight="700"
                fill="currentColor"
                className="text-[#6C6C70] dark:text-[#8E8E93]"
                textAnchor="middle"
              >
                100
              </text>

              {/* Needle */}
              <line
                x1={cx}
                y1={cy}
                x2={needleTip.x}
                y2={needleTip.y}
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="text-[#1C1C1E] dark:text-white transition-all duration-300"
              />
              <circle
                cx={cx}
                cy={cy}
                r="5.5"
                fill="currentColor"
                className="text-[#1C1C1E] dark:text-white"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93]">
              {instrumentLabel ? `${instrumentLabel} Fear & Greed` : 'Fear & Greed Index'}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-[#1C1C1E] dark:text-white leading-none">
                {score}
              </span>
              <span className="text-xs font-mono text-[#6C6C70] dark:text-[#8E8E93]">/ 100</span>
              <span className={`text-sm font-extrabold tracking-tight ${toneText}`}>
                {fearGreed.zone}
              </span>
            </div>
            <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] mt-1 leading-snug">
              {fearGreed.driver}
            </p>
          </div>
        </div>

        {/* 7-Day Historical Sentiment Trend Sparkline & Regime Scale */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-1 sm:pt-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93]">
              7D Trend
            </span>
            <FearGreedTrendSparkline
              history7d={fearGreed.history7d}
              score={score}
              zone={fearGreed.zone}
            />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#8E8E93]">
            <span>0–24 Ex.Fear</span>
            <span>·</span>
            <span>45–54 Neut</span>
            <span>·</span>
            <span>75+ Ex.Greed</span>
          </div>
        </div>
      </div>

      {showComponents && (
        <div className="grid grid-cols-3 gap-3 pt-1">
          {subMetrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <div className="flex items-center justify-between gap-1 text-[10px] mb-1">
                <span className="font-semibold text-[#6C6C70] dark:text-[#8E8E93] truncate">
                  {m.label}
                </span>
                <span className="font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                  {m.value}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${m.value}%`,
                    backgroundColor:
                      m.value >= 55 ? '#16A34A' : m.value <= 44 ? '#DC2626' : '#64748B',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const FearGreedInlineBar: React.FC<{
  fearGreed: FearGreedInfo;
  compact?: boolean;
  showTrend?: boolean;
  className?: string;
}> = React.memo(({ fearGreed, compact = false, showTrend = true, className = '' }) => {
  const available = Number.isFinite(fearGreed.score);
  const score = available ? Math.max(0, Math.min(100, fearGreed.score)) : 0;
  const toneText = getFearGreedTextTone(fearGreed.zone);
  if (!available) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] ${toneText} ${className}`} title={fearGreed.driver}>
        <span className="font-mono font-bold">—</span><span>Unavailable</span>
      </span>
    );
  }

  return (
    <div
      title={`Fear & Greed: ${score}/100 (${fearGreed.zone}) — 7D: ${fearGreed.history7d.join(' → ')} — ${fearGreed.driver}`}
      className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}
    >
      <div className={`inline-flex flex-col gap-1 ${compact ? 'w-[76px]' : 'w-[92px]'}`}>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="font-mono text-[11px] font-extrabold tabular-nums text-[#1C1C1E] dark:text-white">
            {score}
          </span>
          <span className={`text-[10px] font-bold truncate ${toneText}`}>
            {fearGreed.shortLabel}
          </span>
        </div>
        <div className="relative h-1.5 w-full rounded-full fear-greed-track bg-gradient-to-r from-[#DC2626] via-[#64748B] to-[#16A34A] opacity-85">
          <span
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white dark:bg-[#111318] border-2 border-[#1C1C1E] dark:border-white shadow-sm transition-all duration-300"
            style={{ left: `${score}%` }}
          />
        </div>
      </div>

      {showTrend && (
        <FearGreedTrendSparkline
          history7d={fearGreed.history7d}
          score={score}
          zone={fearGreed.zone}
          compact
        />
      )}
    </div>
  );
});

export const SignalBadge: React.FC<{
  signal: MarketSignalInfo;
  compact?: boolean;
  showScore?: boolean;
  className?: string;
}> = React.memo(({ signal, compact = false, showScore = false, className = '' }) => {
  const isBull = signal.direction === 'bull';
  const isBear = signal.direction === 'bear';
  const isStrong = signal.tier === 'Strong Bull' || signal.tier === 'Strong Bear';

  const toneClasses = isBull
    ? 'bg-[#22C55E]/16 dark:bg-[#4ADE80]/18 text-[#0F7033] dark:text-[#4ADE80] border-[#22C55E]/40 dark:border-[#4ADE80]/40'
    : isBear
      ? 'bg-[#EF4444]/16 dark:bg-[#FF5A52]/18 text-[#C41C16] dark:text-[#FF6B63] border-[#EF4444]/40 dark:border-[#FF5A52]/40'
      : 'bg-[#E5E5EA]/90 dark:bg-[#2C2C2E] text-[#45474F] dark:text-[#C5C8D2] border-[#C7C7CC] dark:border-[#48484E]';

  return (
    <motion.span
      key={signal.tier}
      initial={{ opacity: 0.78, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      title={signal.reason}
      className={`inline-flex items-center gap-1 rounded-full border font-bold whitespace-nowrap shrink-0 backdrop-blur-sm ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${toneClasses} ${className}`}
    >
      {isBull ? (
        <TrendingUp className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
      ) : isBear ? (
        <TrendingDown className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
      ) : (
        <Activity className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
      )}
      <span>{compact ? signal.shortLabel : signal.tier}</span>
      {isStrong && !compact && (
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            isBull ? 'bg-[#0F7033] dark:bg-[#4ADE80]' : 'bg-[#C41C16] dark:bg-[#FF6B63]'
          }`}
        />
      )}
      {showScore && (
        <span className="font-mono tabular-nums opacity-85 ml-0.5">
          ({signal.score > 0 ? `+${signal.score}` : signal.score})
        </span>
      )}
    </motion.span>
  );
});

export const AssetCategoryMiniIcon: React.FC<{
  category: WatchlistCategory | 'Equities' | 'Crypto' | 'Commodities' | 'Cash & FX';
  idOrSymbol?: string;
  size?: 'sm' | 'md';
}> = React.memo(({ category, idOrSymbol = '', size = 'sm' }) => {
  const upper = idOrSymbol.toUpperCase();
  const dim = size === 'sm' ? 'w-6 h-6 rounded-lg' : 'w-7 h-7 rounded-xl';
  const iconDim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (upper.includes('BTC') || upper.includes('ETH') || category === 'Crypto') {
    return (
      <span
        className={`${dim} bg-[#FF9F0A]/18 border border-[#FF9F0A]/30 text-[#9A4E00] dark:text-[#FFB340] flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <Coins className={iconDim} />
      </span>
    );
  }

  if (upper.includes('XAU') || upper.includes('GC=F')) {
    return (
      <span
        className={`${dim} bg-[#EAB308]/18 border border-[#EAB308]/35 text-[#854D0E] dark:text-[#FACC15] flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <Gem className={iconDim} />
      </span>
    );
  }

  if (
    upper.includes('WTI') ||
    upper.includes('BRENT') ||
    upper.includes('CL=F') ||
    category === 'Commodities'
  ) {
    return (
      <span
        className={`${dim} bg-[#F97316]/18 border border-[#F97316]/30 text-[#9A3412] dark:text-[#FB923C] flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <Flame className={iconDim} />
      </span>
    );
  }

  if (
    upper.includes('10Y') ||
    upper.includes('30Y') ||
    upper.includes('TNX') ||
    upper.includes('TYX')
  ) {
    return (
      <span
        className={`${dim} bg-[#0071E3]/15 border border-[#0071E3]/28 text-[#0058B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <Landmark className={iconDim} />
      </span>
    );
  }

  if (
    upper.includes('USD') ||
    upper.includes('EUR') ||
    upper.includes('GBP') ||
    upper.includes('JPY') ||
    upper.includes('CHF') ||
    upper.includes('CAD') ||
    upper.includes('AUD') ||
    upper.includes('NZD') ||
    upper.includes('CNY') ||
    upper.includes('SGD') ||
    upper.includes('IDR') ||
    upper.includes('DXY') ||
    category === 'forex-yields' ||
    category === 'Cash & FX'
  ) {
    return (
      <span
        className={`${dim} bg-[#22C55E]/16 border border-[#22C55E]/30 text-[#0F7033] dark:text-[#4ADE80] flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <DollarSign className={iconDim} />
      </span>
    );
  }

  if (category === 'asia-indices' || upper.includes('IHSG') || upper.includes('EIDO')) {
    return (
      <span
        className={`${dim} bg-[#0071E3]/15 border border-[#0071E3]/28 text-[#0058B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <Globe2 className={iconDim} />
      </span>
    );
  }

  return (
    <span
      className={`${dim} bg-[#0071E3]/15 border border-[#0071E3]/28 text-[#0058B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <BarChart3 className={iconDim} />
    </span>
  );
});

export const GlobalMarketFearGreedCard: React.FC<{
  sentiment: OverallMarketFearGreed;
  compactRail?: boolean;
}> = React.memo(({ sentiment, compactRail = false }) => {
  const uid = useId().replace(/:/g, '');
  if (!Number.isFinite(sentiment.score)) {
    return (
      <section aria-label="Global Market Fear and Greed Index" className={`rounded-2xl liquid-glass-card ${compactRail ? 'p-4 flex flex-col gap-3.5' : 'p-4 sm:p-5 flex flex-col gap-4'}`}>
        <div className="text-sm font-bold text-[#1C1C1E] dark:text-white">Global Fear &amp; Greed · Unavailable</div>
        <p className="text-xs text-[#6C6C70] dark:text-[#9EB5C8]">{sentiment.driver}</p>
      </section>
    );
  }
  const score = Math.max(0, Math.min(100, sentiment.score));
  const toneText = getFearGreedTextTone(sentiment.zone);

  const cx = 100;
  const cy = 94;
  const radius = 72;
  const needleAngle = (score / 100) * 180;
  const needleTip = polarToCartesian(cx, cy, radius - 10, needleAngle);

  const segments: Array<{ from: number; to: number; color: string; active: boolean }> = [
    { from: 0, to: 43, color: '#DC2626', active: score <= 24 },
    { from: 46, to: 79, color: '#EA580C', active: score >= 25 && score <= 44 },
    { from: 82, to: 98, color: '#64748B', active: score >= 45 && score <= 54 },
    { from: 101, to: 134, color: '#16A34A', active: score >= 55 && score <= 74 },
    { from: 137, to: 180, color: '#15803D', active: score >= 75 },
  ];

  const totalCount = Math.max(1, sentiment.totalAssets);
  const greedPct = (sentiment.greedCount / totalCount) * 100;
  const neutralPct = (sentiment.neutralCount / totalCount) * 100;
  const fearPct = (sentiment.fearCount / totalCount) * 100;

  return (
    <section
      aria-label="Global Market Fear and Greed Index"
      className={`rounded-2xl liquid-glass-card ${
        compactRail
          ? 'p-4 flex flex-col gap-3.5'
          : 'p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6'
      }`}
    >
      {/* Semicircular Gauge + Composite Score */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`shrink-0 flex items-center justify-center ${
            compactRail ? 'w-[104px] h-[60px]' : 'w-[124px] h-[70px]'
          }`}
        >
          <svg
            key={uid}
            viewBox="0 0 200 110"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label={`Overall Market Fear and Greed Index: ${score} out of 100 (${sentiment.zone})`}
          >
            {segments.map((seg, i) => (
              <path
                key={i}
                d={describeArc(cx, cy, radius, seg.from, seg.to)}
                fill="none"
                stroke={seg.color}
                strokeWidth={seg.active ? 13 : 9}
                strokeLinecap="round"
                opacity={seg.active ? 1 : 0.3}
              />
            ))}
            <text
              x="18"
              y="107"
              fontSize="11"
              fontWeight="700"
              fill="currentColor"
              className="text-[#6C6C70] dark:text-[#8E8E93]"
              textAnchor="middle"
            >
              0
            </text>
            <text
              x="182"
              y="107"
              fontSize="11"
              fontWeight="700"
              fill="currentColor"
              className="text-[#6C6C70] dark:text-[#8E8E93]"
              textAnchor="middle"
            >
              100
            </text>
            <line
              x1={cx}
              y1={cy}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              className="text-[#1C1C1E] dark:text-white transition-all duration-300"
            />
            <circle
              cx={cx}
              cy={cy}
              r="5.5"
              fill="currentColor"
              className="text-[#1C1C1E] dark:text-white"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8]">
            <Gauge className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#38BDF8] shrink-0" />
            <span>Global Fear &amp; Greed</span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
            <span
              className={`font-extrabold font-mono tabular-nums text-[#1C1C1E] dark:text-white leading-none ${
                compactRail ? 'text-2xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {score}
            </span>
            <span className="text-xs font-mono text-[#6C6C70] dark:text-[#8E8E93]">/ 100</span>
            <span className={`text-xs sm:text-sm font-extrabold tracking-tight ${toneText}`}>
              {sentiment.zone}
            </span>
            {sentiment.delta1d !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                  sentiment.delta1d > 0
                    ? 'bg-[#22C55E]/14 text-[#0F7033] dark:text-[#4ADE80]'
                    : 'bg-[#EF4444]/14 text-[#C41C16] dark:text-[#FF6B63]'
                }`}
              >
                {sentiment.delta1d > 0 ? (
                  <ArrowUp className="w-2.5 h-2.5" />
                ) : (
                  <ArrowDown className="w-2.5 h-2.5" />
                )}
                {sentiment.delta1d > 0 ? `+${sentiment.delta1d}` : sentiment.delta1d} vs 1D
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mt-1 leading-snug">
            {sentiment.driver}
          </p>
        </div>
      </div>

      {/* Sector Breakdown + 7-Day Trend + Breadth Bar */}
      <div className={`flex-1 flex flex-col gap-2.5 min-w-0 ${compactRail ? '' : 'lg:max-w-[540px]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
            <span className="font-bold text-[#0F7033] dark:text-[#4ADE80]">
              {sentiment.greedCount} Greed
            </span>
            <span className="text-[#8E8E93]">·</span>
            <span className="font-semibold text-[#52525A] dark:text-[#C2D4E2]">
              {sentiment.neutralCount} Neutral
            </span>
            <span className="text-[#8E8E93]">·</span>
            <span className="font-bold text-[#C41C16] dark:text-[#FF6B63]">
              {sentiment.fearCount} Fear
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8]">
              7D
            </span>
            <FearGreedTrendSparkline
              history7d={sentiment.history7d}
              score={score}
              zone={sentiment.zone}
              compact
            />
          </div>
        </div>

        {/* Cross-Asset Sentiment Breadth Strip */}
        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-[#E5E5EA] dark:bg-[#1A2A3B]">
          {fearPct > 0 && (
            <div
              className="h-full bg-[#DC2626] dark:bg-[#FF5A52] transition-all duration-300"
              style={{ width: `${fearPct}%` }}
            />
          )}
          {neutralPct > 0 && (
            <div
              className="h-full bg-[#94A3B8] transition-all duration-300"
              style={{ width: `${neutralPct}%` }}
            />
          )}
          {greedPct > 0 && (
            <div
              className="h-full bg-[#16A34A] dark:bg-[#30D158] transition-all duration-300"
              style={{ width: `${greedPct}%` }}
            />
          )}
        </div>

        {/* 4 Live Sector Sentiment Meters */}
        {sentiment.sectors.length > 0 && (
          <div className={`grid gap-2 ${compactRail ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {sentiment.sectors.map((sec) => {
              const secTone = getFearGreedTextTone(sec.zone);
              const barColor =
                sec.score >= 55 ? '#16A34A' : sec.score <= 44 ? '#DC2626' : '#64748B';
              return (
                <div
                  key={sec.id}
                  className="liquid-glass-inset rounded-xl px-2.5 py-1.5 flex flex-col gap-1 min-w-0"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="font-semibold text-[#52525A] dark:text-[#C2D4E2] truncate">
                      {sec.label}
                    </span>
                    <span className={`font-mono font-extrabold tabular-nums ${secTone}`}>
                      {sec.score}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${sec.score}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
});

