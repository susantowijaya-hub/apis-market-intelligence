import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Compass,
  Flame,
  Gauge,
  Globe2,
  Moon,
  Newspaper,
  Radio,
  RefreshCw,
  Sunrise,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AppRoute,
  IndexSessionBrief,
  MarketAsset,
  MarketIntelligenceResponse,
  SessionPhaseKey,
} from '../types/market';
import { computeTechnicalSignal, parseFormattedMarketNumber } from '../utils/marketSignals';
import { SignalBadge } from './MarketUiPrimitives';

interface MarketIntelligencePanelProps {
  intelligence: MarketIntelligenceResponse | null;
  loading?: boolean;
  selectedAssetId: string;
  assets: MarketAsset[];
  onSelectAsset: (id: string) => void;
  onNavigate: (route: AppRoute) => void;
  onRefresh?: () => void;
}

const PHASE_META: {
  key: SessionPhaseKey;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'beforeOpen', label: 'Before Market Open', badge: 'Pre-Open Setup', icon: Sunrise },
  { key: 'duringSession', label: 'During Running Session', badge: 'Intraday Flow', icon: Activity },
  { key: 'afterClose', label: 'After Market Close', badge: 'Close & Prediction', icon: Moon },
];

export const MarketIntelligencePanel: React.FC<MarketIntelligencePanelProps> = ({
  intelligence,
  loading = false,
  selectedAssetId,
  assets,
  onSelectAsset,
  onNavigate,
  onRefresh,
}) => {
  const [manualIndexId, setManualIndexId] = useState<string>('SPX');

  const indexList = useMemo<IndexSessionBrief[]>(() => {
    if (intelligence && intelligence.indexSessions.length > 0) {
      return intelligence.indexSessions;
    }
    // Instant client fallback while backend summary finishes on first paint
    const indexIds = ['SPX', 'IXIC', 'DJI', 'IHSG', 'HSI', 'TAIEX', 'KOSPI', 'SSEC', 'NIFTY'];
    return assets
      .filter((a) => indexIds.includes(a.id))
      .map((a) => {
        const sig = computeTechnicalSignal({
          price: a.price,
          prevClose: a.prevClose,
          changePercent: a.changePercent,
          open: parseFormattedMarketNumber(a.open),
          dayHigh: parseFormattedMarketNumber(a.dayHigh),
          dayLow: parseFormattedMarketNumber(a.dayLow),
          series: a.chartSeries['1D']?.length ? a.chartSeries['1D'] : a.sparklinePoints,
          w52Pct: a.w52Pct,
          isYield: a.isYield,
          assetId: a.id,
          category: a.category,
        });
        const phase: SessionPhaseKey = a.marketSessionOpen ? 'duringSession' : 'afterClose';
        return {
          assetId: a.id,
          symbol: a.symbol,
          name: a.name,
          region: a.id === 'IHSG' ? 'Indonesia' : a.category === 'us-indices' ? 'US' : 'Asia-Pacific',
          activePhase: phase,
          sessionStateLabel: a.sessionStateLabel || (a.marketSessionOpen ? 'Open' : 'Closed'),
          priceFormatted: a.price.toLocaleString('en-US', {
            minimumFractionDigits: a.decimals,
            maximumFractionDigits: a.decimals,
          }),
          changePercent: a.changePercent,
          signalTier: sig.tier,
          beforeOpen: `Pre-Open Setup: Watch ${a.symbol} pivot zone between ${a.support} support and ${a.resistance} resistance ahead of the cash open.`,
          duringSession: `Live Session Flow: ${a.commentary}`,
          afterClose: `Post-Close Recap & Prediction: Settled near ${a.price.toLocaleString('en-US')} (${a.changePercent >= 0 ? '+' : ''}${a.changePercent.toFixed(2)}%) with ${sig.tier} technical posture.`,
          keyLevels: `S1 ${a.support} · R1 ${a.resistance}`,
        };
      });
  }, [intelligence, assets]);

  const activeIndexId = useMemo(() => {
    if (indexList.some((i) => i.assetId === selectedAssetId)) return selectedAssetId;
    if (indexList.some((i) => i.assetId === manualIndexId)) return manualIndexId;
    return indexList[0]?.assetId || 'SPX';
  }, [indexList, selectedAssetId, manualIndexId]);

  const activeIndexBrief = useMemo(
    () => indexList.find((i) => i.assetId === activeIndexId) ?? indexList[0],
    [indexList, activeIndexId]
  );

  const bullRatio = useMemo(() => {
    if (!intelligence) return 50;
    const total =
      intelligence.signalTally.bullCount +
      intelligence.signalTally.bearCount +
      intelligence.signalTally.neutralCount;
    if (total === 0) return 50;
    return Math.round((intelligence.signalTally.bullCount / total) * 100);
  }, [intelligence]);

  return (
    <section
      aria-label="Index Session Summaries & Multi-Source Market Intelligence"
      className="flex flex-col gap-5"
    >
      {/* 1. 3-Phase Index Session Market Summary (Before Open / During Session / After Close) */}
      <div className="rounded-2xl liquid-glass-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/8 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Index 3-Phase Session Briefings
              </h2>
            </div>
            <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
              Before open, live running session, and after close recaps synced across major global &amp; IDX benchmarks
            </p>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-xs font-semibold text-[#1C1C1E] dark:text-white hover:border-[#0071E3] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Briefs</span>
            </button>
          )}
        </div>

        {/* Index Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {indexList.map((idxItem) => {
            const active = idxItem.assetId === activeIndexBrief?.assetId;
            const isGain = idxItem.changePercent >= 0;
            return (
              <button
                key={idxItem.assetId}
                type="button"
                onClick={() => {
                  setManualIndexId(idxItem.assetId);
                  onSelectAsset(idxItem.assetId);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-[#1C1C1E] dark:bg-[#2C2C2E] text-white border-[#1C1C1E] dark:border-[#0A84FF] shadow-sm'
                    : 'bg-[#F2F2F7]/80 dark:bg-[#141416] text-[#6C6C70] dark:text-[#AEAEB2] border-[#E5E5EA] dark:border-[#2C2C2E] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                <span className="font-bold">{idxItem.symbol}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active
                      ? isGain
                        ? 'text-[#30D158]'
                        : 'text-[#FF453A]'
                      : isGain
                        ? 'text-[#16803C] dark:text-[#30D158]'
                        : 'text-[#D7261C] dark:text-[#FF453A]'
                  }`}
                >
                  {isGain ? '+' : ''}
                  {idxItem.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Index 3-Column Phase Cards */}
        {activeIndexBrief && (
          <motion.div
            key={activeIndexBrief.assetId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
              <div className="flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#8AB4F8]" />
                <span className="font-bold text-[#1C1C1E] dark:text-white">
                  {activeIndexBrief.name} ({activeIndexBrief.symbol})
                </span>
                <span className="font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                  {activeIndexBrief.priceFormatted}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#6C6C70] dark:text-[#8E8E93]">
                  {activeIndexBrief.keyLevels}
                </span>
                <SignalBadge
                  signal={{
                    tier: activeIndexBrief.signalTier,
                    direction: activeIndexBrief.signalTier.includes('Bull')
                      ? 'bull'
                      : activeIndexBrief.signalTier.includes('Bear')
                        ? 'bear'
                        : 'neutral',
                    score: 0,
                    shortLabel: activeIndexBrief.signalTier,
                    reason: `${activeIndexBrief.symbol} ${activeIndexBrief.sessionStateLabel}`,
                  }}
                  compact
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PHASE_META.map((phase) => {
                const Icon = phase.icon;
                const isActivePhase = activeIndexBrief.activePhase === phase.key;
                const body = activeIndexBrief[phase.key];

                return (
                  <div
                    key={phase.key}
                    className={`rounded-xl p-3.5 border flex flex-col gap-2 transition-colors ${
                      isActivePhase
                        ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/14 border-[#0071E3]/40 dark:border-[#3898FF]/45'
                        : 'liquid-glass-inset'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1C1E] dark:text-white">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isActivePhase
                              ? 'text-[#0071E3] dark:text-[#0A84FF]'
                              : 'text-[#6C6C70] dark:text-[#8E8E93]'
                          }`}
                        />
                        {phase.label}
                      </span>
                      {isActivePhase ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158] text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
                          {phase.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-[#3A3A3C] dark:text-[#D1D1D6]">
                      {body}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* 2. Multi-Source Compiled Market & Stocks Intelligence + Prediction */}
      {intelligence && (
        <div className="rounded-2xl liquid-glass-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-black/8 dark:border-white/10">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Compass className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Compiled Multi-Source Market &amp; Stocks Summary
                </h2>
                <span className="text-[11px] font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
                  · {intelligence.sourcesCount} live sources
                </span>
              </div>
              <p className="text-sm font-bold text-[#1C1C1E] dark:text-white mt-1.5 leading-snug">
                {intelligence.headline}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158] text-[11px] font-bold tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                {intelligence.signalTally.bullCount} Bull
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A] text-[11px] font-bold tabular-nums">
                <TrendingDown className="w-3.5 h-3.5" />
                {intelligence.signalTally.bearCount} Bear
              </span>
            </div>
          </div>

          {/* Deep-Thought Session Condition, Movement Triggers & 1-Sentence Executive Summary */}
          {(intelligence.sessionConditionAndTrigger || intelligence.oneSentenceSummary) && (
            <div className="rounded-xl p-3.5 bg-[#0071E3]/[0.07] dark:bg-[#0A84FF]/[0.1] border border-[#0071E3]/25 dark:border-[#0A84FF]/30 flex flex-col gap-2">
              {intelligence.oneSentenceSummary && (
                <p className="text-xs sm:text-[13px] font-semibold text-[#1C1C1E] dark:text-white leading-snug">
                  <span className="text-[#0071E3] dark:text-[#64D2FF] font-bold uppercase tracking-wider text-[10px] mr-2">
                    Executive Takeaway
                  </span>
                  {intelligence.oneSentenceSummary}
                </p>
              )}
              {intelligence.sessionConditionAndTrigger && (
                <p className="text-xs text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed">
                  <span className="font-bold text-[#1C1C1E] dark:text-white mr-1.5">
                    Session Condition &amp; Trigger:
                  </span>
                  {intelligence.sessionConditionAndTrigger}
                </p>
              )}
            </div>
          )}

          {/* Signal Sentiment Breadth Meter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
              <span>Cross-Market Bull / Bear Signal Ratio ({bullRatio}% Bullish Bias)</span>
              <span className="truncate max-w-[60%] text-right">
                Sources: {intelligence.sourceNames.slice(0, 4).join(', ')}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#FF453A]/25 dark:bg-[#FF453A]/20 overflow-hidden flex">
              <div
                className="h-full bg-[#16803C] dark:bg-[#30D158] transition-all duration-500"
                style={{ width: `${bullRatio}%` }}
              />
            </div>
          </div>

          {/* 3-Column Connected Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Cross-Asset Commentary & Stocks Flow */}
            <div className="rounded-xl liquid-glass-inset p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1C1E] dark:text-white">
                  <BarChart3 className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#8AB4F8]" />
                  Data &amp; Stocks Flow Commentary
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('stocks')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005BB8] dark:text-[#8AB4F8] hover:underline"
                >
                  <span>Top Stocks</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <ul className="flex flex-col gap-2 text-xs text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed">
                {intelligence.commentaryPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#0071E3] dark:text-[#8AB4F8] font-bold">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]/70 text-xs text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed">
                <span className="font-bold text-[#1C1C1E] dark:text-white">Equities &amp; Foreign Flow: </span>
                {intelligence.stocksAndFlowSummary}
              </div>
            </div>

            {/* Column 2: Rumor, Narrative & Wire Watch */}
            <div className="rounded-xl liquid-glass-inset p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1C1E] dark:text-white">
                  <Newspaper className="w-3.5 h-3.5 text-[#D7261C] dark:text-[#FF453A]" />
                  Headline, Rumor &amp; Sentiment Watch
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('news')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005BB8] dark:text-[#8AB4F8] hover:underline"
                >
                  <span>News Wire</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {intelligence.rumorAndCatalystThemes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-[#0071E3] dark:text-[#8AB4F8]">{item.tag}</span>
                      <span
                        className={
                          item.tone === 'bull'
                            ? 'text-[#16803C] dark:text-[#30D158]'
                            : item.tone === 'bear'
                              ? 'text-[#D7261C] dark:text-[#FF453A]'
                              : 'text-[#6C6C70] dark:text-[#8E8E93]'
                        }
                      >
                        {item.tone === 'bull' ? 'Bullish Cue' : item.tone === 'bear' ? 'Bearish Cue' : 'Developing'}
                      </span>
                    </div>
                    <p className="text-xs text-[#1C1C1E] dark:text-[#E5E5EA] leading-snug">
                      {item.theme}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Data Release Implications + Forward Prediction */}
            <div className="rounded-xl liquid-glass-inset p-3.5 flex flex-col gap-2.5 justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1C1E] dark:text-white">
                    <CalendarClock className="w-3.5 h-3.5 text-[#16803C] dark:text-[#30D158]" />
                    Macro Data Implications (High &amp; Mid)
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005BB8] dark:text-[#8AB4F8] hover:underline"
                  >
                    <span>Calendar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {intelligence.dataReleaseImplications.slice(0, 3).map((ev, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs"
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-[#1C1C1E] dark:text-white truncate">
                          {ev.currency} · {ev.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold shrink-0 ${
                            ev.impact === 'HIGH'
                              ? 'text-[#D7261C] dark:text-[#FF453A]'
                              : 'text-[#B25E09] dark:text-[#FF9F0A]'
                          }`}
                        >
                          {ev.impact === 'HIGH' ? (
                            <Flame className="w-3 h-3" />
                          ) : (
                            <Gauge className="w-3 h-3" />
                          )}
                          {ev.impact}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6C6C70] dark:text-[#AEAEB2] leading-relaxed">
                        {ev.implication}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0071E3]/10 dark:bg-[#0A84FF]/12 border border-[#0071E3]/25 dark:border-[#0A84FF]/30">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0071E3] dark:text-[#8AB4F8] mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Forward Market Prediction
                </div>
                <p className="text-xs text-[#1C1C1E] dark:text-[#E5E5EA] leading-relaxed">
                  {intelligence.forwardPrediction}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
