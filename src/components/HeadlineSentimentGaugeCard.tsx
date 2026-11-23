import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Newspaper,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AppRoute, NewsStory, ThemeMode } from '../types/market';
import {
  analyzeHeadlineSentiment,
  HeadlinePolarity,
} from '../utils/headlineSentiment';

interface HeadlineSentimentGaugeCardProps {
  stories: NewsStory[];
  themeMode: ThemeMode;
  onOpenStory?: (story: NewsStory) => void;
  onNavigate?: (route: AppRoute) => void;
}

type FilterView = 'all' | 'bullish' | 'bearish';

function describeCircularArcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const span = Math.abs(endDeg - startDeg);
  if (span <= 0.1) return '';
  // SVG full circle needs two 180-deg arcs to avoid zero-length endpoint collapse
  if (span >= 359.9) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
    ].join(' ');
  }

  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const startRad = rad(startDeg);
  const endRad = rad(endDeg);
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArcFlag = span > 180 ? 1 : 0;
  const sweepFlag = endDeg >= startDeg ? 1 : 0;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function pointOnCircle(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export const HeadlineSentimentGaugeCard: React.FC<HeadlineSentimentGaugeCardProps> = React.memo(
  ({ stories, themeMode, onOpenStory, onNavigate }) => {
    const [filterView, setFilterView] = useState<FilterView>('all');

    const analysis = useMemo(() => analyzeHeadlineSentiment(stories), [stories]);

    const visibleHeadlines = useMemo(() => {
      if (filterView === 'all') {
        return analysis.scoredHeadlines.slice(0, 3);
      }
      const target: HeadlinePolarity = filterView;
      const filtered = analysis.scoredHeadlines.filter((h) => h.polarity === target);
      return filtered.slice(0, 3);
    }, [analysis.scoredHeadlines, filterView]);

    const isDarkSurface = themeMode === 'obsidian';

    // Circular SVG Geometry (360° circular ring centered at 64, 64 with radius 50)
    const cx = 64;
    const cy = 64;
    const radius = 50;

    // Split full 360° circular path proportionally:
    // Bullish sweeps clockwise from 0° (12 o'clock)
    // Bearish sweeps counter-clockwise from 360° (12 o'clock)
    // Neutral fills remaining arc at the bottom
    const total = Math.max(1, analysis.totalCount);
    const bullSweep = analysis.totalCount > 0 ? (analysis.bullishCount / total) * 360 : 0;
    const bearSweep = analysis.totalCount > 0 ? (analysis.bearishCount / total) * 360 : 0;

    const gapDeg = analysis.bullishCount > 0 && analysis.bearishCount > 0 ? 4 : 0;
    const bullPath =
      bullSweep > 2
        ? describeCircularArcPath(cx, cy, radius, gapDeg / 2, Math.max(gapDeg / 2 + 1, bullSweep - gapDeg / 2))
        : '';
    const bearPath =
      bearSweep > 2
        ? describeCircularArcPath(
            cx,
            cy,
            radius,
            360 - gapDeg / 2,
            Math.min(360 - gapDeg / 2 - 1, 360 - bearSweep + gapDeg / 2)
          )
        : '';

    const fullTrackPath = describeCircularArcPath(cx, cy, radius, 0, 360);

    // Directional score arc along an inner circular path (-145° to +145°, centered at 0° top)
    // Maps score 0..100 cleanly around the circle: 0 = -150° (bearish left), 50 = 0° (top neutral), 100 = +150° (bullish right)
    const innerRadius = 39;
    const indicatorDeg = ((analysis.score - 50) / 50) * 148;
    const innerActivePath =
      Math.abs(indicatorDeg) >= 2
        ? describeCircularArcPath(cx, cy, innerRadius, 0, indicatorDeg)
        : '';
    const markerPt = pointOnCircle(cx, cy, innerRadius, indicatorDeg);

    const bullStroke = isDarkSurface ? '#4ADE80' : '#16A34A';
    const bearStroke = isDarkSurface ? '#FF6B63' : '#DC2626';
    const neutralStroke = isDarkSurface
      ? 'rgba(148, 163, 184, 0.24)'
      : 'rgba(100, 116, 139, 0.22)';

    const directionToneClass =
      analysis.direction === 'bull'
        ? 'text-[#0F7033] dark:text-[#4ADE80]'
        : analysis.direction === 'bear'
          ? 'text-[#C41C16] dark:text-[#FF6B63]'
          : 'text-[#4A4D57] dark:text-[#C2D4E2]';

    const activeAccentStroke =
      analysis.direction === 'bull'
        ? bullStroke
        : analysis.direction === 'bear'
          ? bearStroke
          : isDarkSurface
            ? '#94A3B8'
            : '#4A4D57';

    return (
      <section
        data-testid="headline-sentiment-gauge"
        aria-label="Headline Sentiment Circular Gauge"
        className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-3.5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-4 h-4 text-[#005BB8] dark:text-[#38BDF8] shrink-0" />
              <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
                Headline Sentiment
              </h2>
            </div>
            <div className="text-[11px] text-[#4A4D57] dark:text-[#9EB5C8] mt-0.5 font-mono tabular-nums">
              {analysis.totalCount} live headlines
              <span className="mx-1.5 opacity-60">·</span>
              <span>NLP tape pulse</span>
            </div>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('news')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005BB8] dark:text-[#38BDF8] hover:underline whitespace-nowrap shrink-0"
            >
              <span>News Wire</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* SVG Circular Path Gauge + Bullish / Bearish Telemetry */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-[124px] h-[124px] shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 128 128"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label={`Headline sentiment score ${analysis.score} out of 100: ${analysis.regime}. ${analysis.bullishCount} bullish, ${analysis.bearishCount} bearish, ${analysis.neutralCount} neutral headlines.`}
            >
              {/* Outer 360° Circular Base Track Path */}
              <path
                d={fullTrackPath}
                fill="none"
                stroke={neutralStroke}
                strokeWidth="9"
              />

              {/* Outer Circular Bullish Segment Path */}
              {bullPath && (
                <path
                  d={bullPath}
                  fill="none"
                  stroke={bullStroke}
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              )}

              {/* Outer Circular Bearish Segment Path */}
              {bearPath && (
                <path
                  d={bearPath}
                  fill="none"
                  stroke={bearStroke}
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              )}

              {/* Inner Circular Net Directional Path */}
              <path
                d={describeCircularArcPath(cx, cy, innerRadius, -148, 148)}
                fill="none"
                stroke={neutralStroke}
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity={0.75}
              />
              {innerActivePath && (
                <path
                  d={innerActivePath}
                  fill="none"
                  stroke={activeAccentStroke}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )}

              {/* Top 50/Neutral Reference Tick & Indicator Marker */}
              <line
                x1={cx}
                y1={cy - innerRadius - 3}
                x2={cx}
                y2={cy - innerRadius + 3}
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[#4A4D57] dark:text-[#9EB5C8]"
              />
              <circle
                cx={markerPt.x}
                cy={markerPt.y}
                r="4.2"
                fill={activeAccentStroke}
                stroke={isDarkSurface ? '#0A141E' : '#FFFFFF'}
                strokeWidth="1.5"
              />
            </svg>

            {/* Center Score & Bullish/Bearish Indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <div className="flex items-center gap-0.5">
                {analysis.direction === 'bull' ? (
                  <TrendingUp className={`w-3.5 h-3.5 ${directionToneClass}`} />
                ) : analysis.direction === 'bear' ? (
                  <TrendingDown className={`w-3.5 h-3.5 ${directionToneClass}`} />
                ) : (
                  <Activity className={`w-3.5 h-3.5 ${directionToneClass}`} />
                )}
                <span
                  data-testid="headline-sentiment-score"
                  className="text-xl font-extrabold font-mono tabular-nums text-[#1C1C1E] dark:text-white leading-none"
                >
                  {analysis.score}
                </span>
              </div>
              <span
                data-testid="headline-sentiment-regime"
                className={`mt-1 text-[10px] font-extrabold leading-tight ${directionToneClass}`}
              >
                {analysis.regime}
              </span>
            </div>
          </div>

          {/* Breakdown & Drivers */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-1.5 text-left font-mono tabular-nums">
              <div>
                <div className="text-[10px] font-sans font-semibold text-[#4A4D57] dark:text-[#9EB5C8]">
                  Bullish
                </div>
                <div className="text-xs font-extrabold text-[#0F7033] dark:text-[#4ADE80]">
                  {analysis.bullishCount}
                  <span className="text-[10px] font-semibold opacity-80 ml-0.5">
                    ({analysis.bullishPct}%)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans font-semibold text-[#4A4D57] dark:text-[#9EB5C8]">
                  Bearish
                </div>
                <div className="text-xs font-extrabold text-[#C41C16] dark:text-[#FF6B63]">
                  {analysis.bearishCount}
                  <span className="text-[10px] font-semibold opacity-80 ml-0.5">
                    ({analysis.bearishPct}%)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans font-semibold text-[#4A4D57] dark:text-[#9EB5C8]">
                  Neutral
                </div>
                <div className="text-xs font-extrabold text-[#1C1C1E] dark:text-white">
                  {analysis.neutralCount}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#4A4D57] dark:text-[#B4B8C4] leading-snug">
              {analysis.direction === 'bull' && analysis.topBullTerms.length > 0 ? (
                <span>
                  Bull cues: <strong className="text-[#1C1C1E] dark:text-white">{analysis.topBullTerms.join(' · ')}</strong>
                </span>
              ) : analysis.direction === 'bear' && analysis.topBearTerms.length > 0 ? (
                <span>
                  Bear cues: <strong className="text-[#1C1C1E] dark:text-white">{analysis.topBearTerms.join(' · ')}</strong>
                </span>
              ) : (
                <span>
                  {analysis.topBullTerms[0] ?? 'balanced'} vs{' '}
                  {analysis.topBearTerms[0] ?? 'mixed flow'}
                </span>
              )}
            </div>

            {/* Interactive Headline Filter Tabs */}
            <div
              role="tablist"
              aria-label="Filter parsed headlines"
              className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-black/5 dark:bg-white/6 self-start"
            >
              {(
                [
                  { id: 'all', label: 'Top' },
                  { id: 'bullish', label: 'Bull' },
                  { id: 'bearish', label: 'Bear' },
                ] as const
              ).map((tab) => {
                const active = filterView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilterView(tab.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shrink-0 transition-transform ${
                      active
                        ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] shadow-xs'
                        : 'text-[#4A4D57] dark:text-[#B4B8C4] hover:text-[#1C1C1E] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Parsed Headline Samples */}
        <div className="border-t border-black/8 dark:border-white/10 pt-2.5 flex flex-col gap-1.5">
          {analysis.totalCount === 0 ? (
            <div className="text-xs text-[#4A4D57] dark:text-[#9EB5C8] py-1">
              Waiting for live headline feed...
            </div>
          ) : visibleHeadlines.length === 0 ? (
            <div className="text-[11px] text-[#4A4D57] dark:text-[#9EB5C8] py-1">
              No {filterView} headlines detected in the current wire batch.
            </div>
          ) : (
            visibleHeadlines.map((item) => {
              const toneLabel =
                item.polarity === 'bullish'
                  ? 'Bull'
                  : item.polarity === 'bearish'
                    ? 'Bear'
                    : 'Flat';
              const toneText =
                item.polarity === 'bullish'
                  ? 'text-[#0F7033] dark:text-[#4ADE80]'
                  : item.polarity === 'bearish'
                    ? 'text-[#C41C16] dark:text-[#FF6B63]'
                    : 'text-[#4A4D57] dark:text-[#9EB5C8]';

              return (
                <button
                  key={item.story.id}
                  type="button"
                  onClick={() => onOpenStory?.(item.story)}
                  className="w-full text-left py-1 rounded-lg hover:bg-black/4 dark:hover:bg-white/6 px-1.5 -mx-1.5 flex items-start justify-between gap-2 transition-transform"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-[#1C1C1E] dark:text-white line-clamp-1">
                      {item.story.headline}
                    </div>
                    <div className="text-[10px] text-[#4A4D57] dark:text-[#9EB5C8] truncate">
                      {item.story.publisher}
                      <span className="mx-1 opacity-60">·</span>
                      <span>{item.story.timeAgo}</span>
                      {item.matchedTerms.length > 0 && (
                        <>
                          <span className="mx-1 opacity-60">·</span>
                          <span className="font-mono">{item.matchedTerms[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-extrabold tabular-nums shrink-0 pt-0.5 ${toneText}`}
                  >
                    {toneLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  }
);
