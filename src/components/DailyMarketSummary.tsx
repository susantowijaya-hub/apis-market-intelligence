import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Flame,
  Gauge,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  AppRoute,
  DailyMarketHighlight,
  DailyMarketSummaryResponse,
  DailySummaryCategory,
  EconomicEvent,
  MarketAsset,
  MarketIntelligenceResponse,
  NewsStory,
  StocksMoversBucket,
} from '../types/market';
import { formatAssetPrice } from '../utils/formatters';

interface DailyMarketSummaryProps {
  summaryData: DailyMarketSummaryResponse | null;
  summaryLoading?: boolean;
  onRefreshSummary?: () => void;
  marketIntelligence?: MarketIntelligenceResponse | null;
  assets: MarketAsset[];
  economicEvents: EconomicEvent[];
  newsStories: NewsStory[];
  usBucket?: StocksMoversBucket;
  idxBucket?: StocksMoversBucket;
  onSelectAsset: (id: string) => void;
  onInspectSymbol?: (yahooSymbol: string, builtInAssetId?: string) => void;
  onNavigate: (route: AppRoute) => void;
}

type SummaryFilter = 'all' | DailySummaryCategory;

/* Lightweight Inline SVG Category Icons */
const BullSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Bull horns & head geometry */}
    <path d="M4 5c0 3.2 2.2 5.2 4.5 5.6" />
    <path d="M20 5c0 3.2-2.2 5.2-4.5 5.6" />
    <path d="M7.5 10.2 9 18a3 3 0 0 0 6 0l1.5-7.8a4.5 4.5 0 0 0-9 0Z" />
    <circle cx="10.3" cy="13" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="13.7" cy="13" r="0.6" fill="currentColor" stroke="none" />
    <path d="M10.5 17.2h3" />
  </svg>
);

const BearSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Bear ears & snout geometry */}
    <circle cx="6.8" cy="7.2" r="2.2" />
    <circle cx="17.2" cy="7.2" r="2.2" />
    <path d="M6.2 10.5a5.8 5.8 0 0 1 11.6 0v3.2a5.8 5.8 0 0 1-11.6 0v-3.2Z" />
    <circle cx="9.8" cy="12" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="14.2" cy="12" r="0.6" fill="currentColor" stroke="none" />
    <path d="M10.5 15.2h3l-1.5 1.6-1.5-1.6Z" />
  </svg>
);

const CalendarSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3.2v3.2" />
    <path d="M16 3.2v3.2" />
    <path d="M3.5 9.8h17" />
    <path d="M8 14h2.5" />
    <path d="M13.5 14H16" />
    <path d="M8 17.2h2.5" />
  </svg>
);

function CategoryIcon({ category }: { category: DailySummaryCategory }) {
  if (category === 'gainer') {
    return (
      <span
        className="w-7 h-7 rounded-lg bg-[#30D158]/12 text-[#16803C] dark:text-[#30D158] flex items-center justify-center shrink-0"
        title="Gainer / Positive Mover"
      >
        <BullSvgIcon className="w-4 h-4" />
      </span>
    );
  }
  if (category === 'loser') {
    return (
      <span
        className="w-7 h-7 rounded-lg bg-[#FF453A]/12 text-[#D7261C] dark:text-[#FF453A] flex items-center justify-center shrink-0"
        title="Loser / Pullback"
      >
        <BearSvgIcon className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span
      className="w-7 h-7 rounded-lg bg-[#0071E3]/12 text-[#0071E3] dark:text-[#8AB4F8] flex items-center justify-center shrink-0"
      title="Economic Event"
    >
      <CalendarSvgIcon className="w-4 h-4" />
    </span>
  );
}

export const DailyMarketSummary: React.FC<DailyMarketSummaryProps> = ({
  summaryData,
  summaryLoading = false,
  onRefreshSummary,
  marketIntelligence = null,
  assets,
  economicEvents,
  newsStories,
  usBucket,
  idxBucket,
  onSelectAsset,
  onInspectSymbol,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<SummaryFilter>('all');
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fallback synthesis from live props when /api/market/daily-summary is still loading on first frame
  const fallbackHighlights = useMemo<DailyMarketHighlight[]>(() => {
    const items: DailyMarketHighlight[] = [];
    const sorted = [...assets]
      .filter((a) => Number.isFinite(a.changePercent))
      .sort((a, b) => b.changePercent - a.changePercent);

    if (sorted[0]) {
      const top = sorted[0];
      items.push({
        id: `fb-gain-${top.id}`,
        category: top.changePercent >= 0 ? 'gainer' : 'loser',
        title: `${top.name} (${top.symbol})`,
        metricText: `${top.changePercent >= 0 ? '+' : ''}${top.changePercent.toFixed(2)}%`,
        summaryText: `Led global benchmarks at ${formatAssetPrice(top)}, trading between ${top.dayLow} and ${top.dayHigh}.`,
        metaText: `${top.categoryLabel} · ${top.exchange}`,
        symbol: top.symbol,
        assetId: top.id,
        routeTarget: 'dashboard',
      });
    }

    const usTop = usBucket?.gainers?.[0] ?? usBucket?.impact?.[0];
    if (usTop) {
      items.push({
        id: `fb-us-${usTop.symbol}`,
        category: usTop.changePercent >= 0 ? 'gainer' : 'loser',
        title: `${usTop.name} (${usTop.symbol})`,
        metricText: `${usTop.changePercent >= 0 ? '+' : ''}${usTop.changePercent.toFixed(2)}%`,
        summaryText: `Paced US equities at $${usTop.price.toFixed(2)} on ${usTop.volume} volume.`,
        metaText: `US Equities · ${usTop.exchange}`,
        symbol: usTop.symbol,
        yahooSymbol: usTop.symbol,
        routeTarget: 'stocks',
      });
    }

    const idxTop = idxBucket?.gainers?.[0] ?? idxBucket?.impact?.[0];
    if (idxTop) {
      items.push({
        id: `fb-idx-${idxTop.symbol}`,
        category: idxTop.changePercent >= 0 ? 'gainer' : 'loser',
        title: `${idxTop.name} (${idxTop.symbol})`,
        metricText: `${idxTop.changePercent >= 0 ? '+' : ''}${idxTop.changePercent.toFixed(2)}%`,
        summaryText: `Led IDX movers at Rp ${Math.round(idxTop.price).toLocaleString('en-US')} (${idxTop.volume} shares).`,
        metaText: 'Indonesia IDX · Equities',
        symbol: idxTop.symbol,
        yahooSymbol: `${idxTop.symbol}.JK`,
        routeTarget: 'stocks',
      });
    }

    const bottom = sorted[sorted.length - 1];
    if (bottom && bottom.changePercent < 0) {
      items.push({
        id: `fb-loss-${bottom.id}`,
        category: 'loser',
        title: `${bottom.name} (${bottom.symbol})`,
        metricText: `${bottom.changePercent.toFixed(2)}%`,
        summaryText: `Eased to ${formatAssetPrice(bottom)} near key support at ${bottom.support}.`,
        metaText: `${bottom.categoryLabel} · Laggard`,
        symbol: bottom.symbol,
        assetId: bottom.id,
        routeTarget: 'dashboard',
      });
    }

    for (const ev of economicEvents.slice(0, 2)) {
      const hasActual = ev.actual && ev.actual !== 'Pending' && ev.actual !== '—';
      items.push({
        id: `fb-ev-${ev.id}`,
        category: 'event',
        title: `${ev.currency} · ${ev.title}`,
        metricText: hasActual ? `${ev.actual} (${ev.deviationLabel})` : `${ev.impact} Impact`,
        summaryText: hasActual
          ? `Printed ${ev.actual} vs. ${ev.forecast} consensus (prior ${ev.previous}).`
          : `Scheduled ${ev.timeWib} with forecast ${ev.forecast} vs. ${ev.previous} prior.`,
        metaText: `${ev.timeWib} · Economic Release`,
        routeTarget: 'calendar',
      });
    }

    if (items.every((i) => i.category !== 'event') && newsStories[0]) {
      items.push({
        id: `fb-news-${newsStories[0].id}`,
        category: 'event',
        title: newsStories[0].headline,
        metricText: newsStories[0].badgeMetric || 'Macro Update',
        summaryText: newsStories[0].summary,
        metaText: `${newsStories[0].publisher} · ${newsStories[0].timeAgo}`,
        routeTarget: 'news',
      });
    }

    return items;
  }, [assets, economicEvents, newsStories, usBucket, idxBucket]);

  const allHighlights =
    summaryData && summaryData.highlights.length > 0
      ? summaryData.highlights
      : fallbackHighlights;

  const visibleHighlights = useMemo(() => {
    if (filter === 'all') return allHighlights;
    return allHighlights.filter((h) => h.category === filter);
  }, [allHighlights, filter]);

  const counts = useMemo(
    () => ({
      gainer: allHighlights.filter((h) => h.category === 'gainer').length,
      loser: allHighlights.filter((h) => h.category === 'loser').length,
      event: allHighlights.filter((h) => h.category === 'event').length,
    }),
    [allHighlights]
  );

  const dateLabel =
    summaryData?.dateLabel ||
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

  const handleBulletAction = (item: DailyMarketHighlight) => {
    if (item.assetId) {
      onSelectAsset(item.assetId);
      return;
    }
    if (item.yahooSymbol && onInspectSymbol) {
      onInspectSymbol(item.yahooSymbol);
      return;
    }
    if (item.routeTarget) {
      onNavigate(item.routeTarget);
    }
  };

  const handleCopy = async () => {
    const text = [
      `Daily Market Summary · ${summaryData?.windowLabel || 'Last 24 hours'} (${dateLabel})`,
      '',
      ...visibleHighlights.map(
        (h) => `• ${h.title} (${h.metricText}): ${h.summaryText}`
      ),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <section
      aria-label="Daily Market Summary"
      className="rounded-2xl liquid-glass-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#1C1C1E] dark:text-white">
                Daily Market Summary
              </h2>
              <span className="text-xs text-[#6C6C70] dark:text-[#8E8E93] tabular-nums hidden sm:inline">
                <span aria-hidden="true">·</span> {summaryData?.windowLabel || 'Last 24 hours'}{' '}
                <span aria-hidden="true">·</span> {dateLabel}
              </span>
            </div>
            <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] tabular-nums">
              <span>{counts.gainer} gainers</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{counts.loser} decliners</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{counts.event} economic events</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category Filter Tabs */}
            <div
              role="tablist"
              aria-label="Filter 24-hour market highlights"
              className="inline-flex items-center p-0.5 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-semibold"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'gainer', label: 'Gainers' },
                  { id: 'loser', label: 'Losers' },
                  { id: 'event', label: 'Events' },
                ] as const
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setFilter(tab.id);
                      if (collapsed) setCollapsed(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                        : 'text-[#6C6C70] dark:text-[#AEAEB2] hover:text-[#1C1C1E] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {onRefreshSummary && (
              <button
                type="button"
                onClick={onRefreshSummary}
                disabled={summaryLoading}
                className="p-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#6C6C70] dark:text-[#AEAEB2] hover:text-[#1C1C1E] dark:hover:text-white transition-colors"
                title="Refresh 24-hour summary"
                aria-label="Refresh 24-hour summary"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${summaryLoading ? 'animate-spin' : ''}`}
                />
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-semibold text-[#1C1C1E] dark:text-[#E5E5EA] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] whitespace-nowrap shrink-0 transition-colors"
              title="Copy bulleted recap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16803C] dark:text-[#30D158]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-semibold text-[#6C6C70] dark:text-[#AEAEB2] hover:text-[#1C1C1E] dark:hover:text-white whitespace-nowrap shrink-0 transition-colors"
              aria-expanded={!collapsed}
            >
              <span>{collapsed ? 'Show' : 'Hide'}</span>
              {collapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Grid of Bulleted Market Highlights */}
        {!collapsed && (
          visibleHighlights.length === 0 ? (
            <p className="py-3 text-xs text-[#6C6C70] dark:text-[#8E8E93]">
              No 24-hour market highlights match this category filter.
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {visibleHighlights.map((item) => {
                const metricToneClass =
                  item.category === 'gainer'
                    ? 'text-[#16803C] dark:text-[#30D158]'
                    : item.category === 'loser'
                      ? 'text-[#D7261C] dark:text-[#FF453A]'
                      : 'text-[#0071E3] dark:text-[#8AB4F8]';

                return (
                  <li
                    key={item.id}
                    className="rounded-xl liquid-glass-inset p-3 flex items-start gap-2.5"
                  >
                    <CategoryIcon category={item.category} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
                          {item.title}
                        </span>
                        {item.metricText && (
                          <span
                            className={`text-xs font-mono font-bold tabular-nums shrink-0 ${metricToneClass}`}
                          >
                            {item.metricText}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-[#3A3A3C] dark:text-[#D1D1D6]">
                        <span aria-hidden="true" className="mr-1.5 text-[#8E8E93]">
                          •
                        </span>
                        {item.summaryText}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
                        <span className="truncate">{item.metaText}</span>
                        {(item.assetId || item.yahooSymbol || item.routeTarget) && (
                          <button
                            type="button"
                            onClick={() => handleBulletAction(item)}
                            className="inline-flex items-center gap-0.5 font-semibold text-[#0071E3] dark:text-[#8AB4F8] hover:underline whitespace-nowrap shrink-0"
                          >
                            <span>
                              {item.category === 'event' ? 'Calendar' : 'Chart'}
                            </span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {/* Connected Cross-Source Synthesis, Rumor Watch & Forward Market Outlook */}
        {!collapsed && marketIntelligence && (
          <div className="mt-2 pt-3.5 border-t border-black/8 dark:border-white/10 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-xl liquid-glass-inset p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1C1C1E] dark:text-white">
                  <Compass className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#8AB4F8]" />
                  Rumor &amp; Catalyst Synthesis ({marketIntelligence.sourcesCount} Sources)
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0071E3] dark:text-[#8AB4F8] hover:underline shrink-0"
                >
                  <span>Markets</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs font-semibold text-[#1C1C1E] dark:text-white leading-snug">
                {marketIntelligence.headline}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {marketIntelligence.rumorAndCatalystThemes.slice(0, 2).map((item, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.tone === 'bull'
                        ? 'bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158]'
                        : item.tone === 'bear'
                          ? 'bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A]'
                          : 'bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#6C6C70] dark:text-[#AEAEB2]'
                    }`}
                  >
                    {item.tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl liquid-glass-inset p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#1C1C1E] dark:text-white">
                  Data Release Implications
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('calendar')}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0071E3] dark:text-[#8AB4F8] hover:underline shrink-0"
                >
                  <span>Calendar</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {marketIntelligence.dataReleaseImplications.slice(0, 2).map((ev, i) => (
                  <p key={i} className="text-[11px] text-[#3A3A3C] dark:text-[#D1D1D6] leading-snug">
                    <span className="inline-flex items-center gap-1 font-bold text-[#1C1C1E] dark:text-white mr-1">
                      {ev.impact === 'HIGH' ? (
                        <Flame className="w-3 h-3 text-[#D7261C] dark:text-[#FF453A]" />
                      ) : (
                        <Gauge className="w-3 h-3 text-[#B25E09] dark:text-[#FF9F0A]" />
                      )}
                      {ev.currency}:
                    </span>
                    {ev.implication}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#0071E3]/8 dark:bg-[#0A84FF]/10 border border-[#0071E3]/25 dark:border-[#0A84FF]/30 p-3 flex flex-col justify-between gap-1.5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0071E3] dark:text-[#8AB4F8]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Forward Prediction &amp; Flows
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('stocks')}
                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0071E3] dark:text-[#8AB4F8] hover:underline shrink-0"
                  >
                    <span>Stocks</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-[#1C1C1E] dark:text-[#E5E5EA] leading-relaxed mt-1">
                  {marketIntelligence.forwardPrediction}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
