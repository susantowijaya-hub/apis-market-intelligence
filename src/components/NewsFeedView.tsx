import { apiUrl } from '../lib/api';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Newspaper, Tag } from 'lucide-react';
import { EDITORIAL_INSIGHTS } from '../data/marketData';
import {
  AppRoute,
  DailyDigestMoverImpact,
  DailyDigestResponse,
  DailyMarketSummaryResponse,
  EconomicEvent,
  MarketAsset,
  MarketIntelligenceResponse,
  NewsStory,
  StocksMoversBucket,
} from '../types/market';
import { DailyDigestModal } from './DailyDigestModal';
import { DailyMarketSummary } from './DailyMarketSummary';

interface NewsFeedViewProps {
  stories: NewsStory[];
  searchQuery: string;
  onOpenStory: (story: NewsStory) => void;
  dailySummary?: DailyMarketSummaryResponse | null;
  dailySummaryLoading?: boolean;
  onRefreshDailySummary?: () => void;
  marketIntelligence?: MarketIntelligenceResponse | null;
  assets: MarketAsset[];
  economicEvents: EconomicEvent[];
  usBucket?: StocksMoversBucket;
  idxBucket?: StocksMoversBucket;
  onSelectAsset: (id: string) => void;
  onInspectSymbol?: (yahooSymbol: string, builtInAssetId?: string) => void;
  onNavigate: (route: AppRoute) => void;
}

type TopicFilter = 'all' | 'rates' | 'idx' | 'commodities' | 'crypto';

const TOPICS: { id: TopicFilter; label: string }[] = [
  { id: 'all', label: 'All Topics' },
  { id: 'rates', label: 'US Rates & Fed' },
  { id: 'idx', label: 'IDX & Rupiah' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'crypto', label: 'Crypto' },
];

export const NewsFeedView: React.FC<NewsFeedViewProps> = ({
  stories,
  searchQuery,
  onOpenStory,
  dailySummary = null,
  dailySummaryLoading = false,
  onRefreshDailySummary,
  marketIntelligence = null,
  assets,
  economicEvents,
  usBucket,
  idxBucket,
  onSelectAsset,
  onInspectSymbol,
  onNavigate,
}) => {
  const [activeTopic, setActiveTopic] = useState<TopicFilter>('all');
  const [digestOpen, setDigestOpen] = useState<boolean>(false);
  const [digestLoading, setDigestLoading] = useState<boolean>(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [activeDigest, setActiveDigest] = useState<DailyDigestResponse | null>(null);
  const digestCacheRef = useRef<Partial<Record<TopicFilter, DailyDigestResponse>>>({});

  const activeTopicLabel = useMemo(
    () => TOPICS.find((t) => t.id === activeTopic)?.label ?? 'All Topics',
    [activeTopic]
  );

  const loadDailyDigest = useCallback(
    async (topic: TopicFilter, force = false) => {
      if (!force && digestCacheRef.current[topic]) {
        setActiveDigest(digestCacheRef.current[topic] ?? null);
        setDigestError(null);
        return;
      }

      setDigestLoading(true);
      setDigestError(null);
      const topicStories = stories.filter((story) => topic === 'all' || story.topic === topic).slice(0, 8);
      const movers = [
        ...(topic === 'all' || topic === 'idx' ? (idxBucket?.impact ?? []).map((item) => ({ ...item, market: 'Indonesia' })) : []),
        ...(topic === 'all' || topic === 'rates' || topic === 'commodities' ? (usBucket?.impact ?? []).map((item) => ({ ...item, market: 'US' })) : []),
      ].slice(0, 6);
      const up = movers.filter((item) => item.changePercent > 0).length;
      const down = movers.filter((item) => item.changePercent < 0).length;
      const mood = up > down ? 'Positive breadth' : down > up ? 'Negative breadth' : 'Mixed / limited breadth';
      const topicLabel = TOPICS.find((item) => item.id === topic)?.label ?? 'All Topics';
      const moverImpacts = movers.map((item) => {
        const linked = topicStories.find((story) => story.headline.toLowerCase().includes(item.symbol.toLowerCase()));
        return {
          symbol: item.symbol,
          yahooSymbol: (item as typeof item & { yahooSymbol?: string }).yahooSymbol,
          name: item.name,
          market: item.market,
          movePercent: `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`,
          direction: item.changePercent > 0.05 ? 'up' as const : item.changePercent < -0.05 ? 'down' as const : 'flat' as const,
          associatedHeadline: linked?.headline ?? 'No directly matched headline in the current public news feed.',
          impactAnalysis: `${item.name} is ${item.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(item.changePercent).toFixed(2)}% in the available snapshot. This describes observed price movement only; it does not establish a news cause.`,
        };
      });
      const response: DailyDigestResponse = {
        sessionHeadline: movers.length ? `Market snapshot: ${up} advancing and ${down} declining in the selected movers` : 'Market recap from available public headlines',
        marketMood: mood,
        executiveBrief: `${topicStories.length} public headlines and ${movers.length} market movers are included. This recap is rule-based and uses only the displayed feed data; it does not generate causal claims or forecasts.`,
        topicLabel,
        moverImpacts,
        sessionWatchpoints: [
          ...economicEvents.slice(0, 3).map((event) => `${event.currency} · ${event.title} · ${event.timeWib}`),
          ...topicStories.slice(0, 3).map((story) => `${story.publisher}: ${story.headline}`),
        ].slice(0, 6),
        model: 'Deterministic public-data recap',
        generatedAt: new Date().toISOString(),
      };
      digestCacheRef.current[topic] = response;
      setActiveDigest(response);
      setDigestLoading(false);
    },
    [stories, economicEvents, usBucket, idxBucket]
  );

  const handleOpenDigest = useCallback(() => {
    setDigestOpen(true);
    void loadDailyDigest(activeTopic, false);
  }, [activeTopic, loadDailyDigest]);

  const handleInspectDigestMover = useCallback(
    (item: DailyDigestMoverImpact) => {
      if (!item.yahooSymbol) return;
      const isCoreAsset = assets.some((a) => a.id === item.yahooSymbol);
      setDigestOpen(false);
      if (isCoreAsset) {
        onSelectAsset(item.yahooSymbol);
        onNavigate('dashboard');
        return;
      }
      onInspectSymbol?.(item.yahooSymbol);
    },
    [assets, onInspectSymbol, onNavigate, onSelectAsset]
  );

  const filteredStories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return stories.filter((s) => {
      const matchTopic = activeTopic === 'all' || s.topic === activeTopic;
      const matchSearch =
        !q ||
        s.headline.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.publisher.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      return matchTopic && matchSearch;
    });
  }, [stories, activeTopic, searchQuery]);

  const topBreaking = useMemo(
    () => filteredStories.filter((s) => Boolean(s.isBreaking)).slice(0, 6),
    [filteredStories]
  );

  const remainingStories = useMemo(() => {
    const topIds = new Set(topBreaking.map((s) => s.id));
    return filteredStories.filter((s) => !topIds.has(s.id));
  }, [filteredStories, topBreaking]);

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 flex flex-col gap-6">
      {/* Header matching Market section Breaking News style */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#D7261C] dark:text-[#FF453A]" />
            <span className="text-xs font-bold text-[#D7261C] dark:text-[#FF453A] uppercase tracking-wider">
              Live Wire · Market Impact Filter
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white mt-1">
            Breaking &amp; Recent News
          </h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
            Impact-scored separation between market-moving breaking shocks and recent market dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {TOPICS.map((t) => {
              const active = activeTopic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTopic(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                    active
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent'
                      : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleOpenDigest}
            data-testid="daily-digest-trigger"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066CC] dark:bg-[#0EA5E9] text-white text-xs font-bold shadow-sm hover:brightness-110 transition-all whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Daily Digest</span>
          </button>
        </div>
      </section>

      {/* Verified High-Impact Breaking Wire */}
      <section data-testid="breaking-wire-section" className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#D7261C] dark:text-[#FF453A]" />
            <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
              High-Impact Breaking Alerts
            </h2>
          </div>
          <span className="text-xs font-medium text-[#6C6C70] dark:text-[#8E8E93] tabular-nums">
            {topBreaking.length} Verified {topBreaking.length === 1 ? 'Alert' : 'Alerts'}
          </span>
        </div>

        {topBreaking.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topBreaking.map((story) => (
              <article
                key={story.id}
                onClick={() => onOpenStory(story)}
                className="p-4 rounded-2xl liquid-glass-card hover:brightness-[0.98] dark:hover:brightness-110 cursor-pointer transition-all flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-[#FF453A] text-white">
                        BREAKING
                      </span>
                      <span className="font-bold text-[#1C1C1E] dark:text-white">
                        {story.publisher}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
                      {story.timeAgo}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white leading-snug">
                    {story.headline}
                  </h3>
                  <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-1.5 line-clamp-2 leading-relaxed">
                    {story.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-[11px]">
                  <span className="text-[#6C6C70] dark:text-[#8E8E93] truncate">
                    {typeof story.impactScore === 'number'
                      ? `Impact ${story.impactScore}/100 · `
                      : ''}
                    {story.tags.slice(0, 2).join(' · ')}
                  </span>
                  <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF] inline-flex items-center gap-1 shrink-0">
                    <span>Read</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-3.5 rounded-2xl liquid-glass-inset text-xs text-[#6C6C70] dark:text-[#9EB5C8] flex items-center justify-between gap-2">
            <span>
              No verified high-impact market shocks for this filter within the past 4 hours. Recent market dispatches are separated below.
            </span>
          </div>
        )}
      </section>

      {/* 24-Hour Daily Market Summary inside News Tab */}
      <DailyMarketSummary
        summaryData={dailySummary}
        summaryLoading={dailySummaryLoading}
        onRefreshSummary={onRefreshDailySummary}
        marketIntelligence={marketIntelligence}
        assets={assets}
        economicEvents={economicEvents}
        newsStories={stories}
        usBucket={usBucket}
        idxBucket={idxBucket}
        onSelectAsset={(id) => {
          onSelectAsset(id);
          onNavigate('dashboard');
        }}
        onInspectSymbol={onInspectSymbol}
        onNavigate={onNavigate}
      />

      {/* Recent Market News Grid */}
      {remainingStories.length > 0 ? (
        <section data-testid="recent-news-section" className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
            <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
              Recent Market News
            </h2>
            <span className="text-xs text-[#6C6C70] dark:text-[#8E8E93] font-medium tabular-nums">
              {remainingStories.length} Recent Stories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {remainingStories.map((story) => (
              <article
                key={story.id}
                onClick={() => onOpenStory(story)}
                className="p-4 rounded-2xl liquid-glass-card hover:brightness-[0.98] dark:hover:brightness-110 flex flex-col justify-between gap-3 cursor-pointer transition-all"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {story.isBreaking && (
                        <span className="px-1.5 py-0.5 rounded font-black tracking-wider uppercase bg-[#FF453A] text-white text-[10px] shrink-0">
                          BREAKING
                        </span>
                      )}
                      <span className="font-bold text-[#1C1C1E] dark:text-white truncate">
                        {story.publisher}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] shrink-0">
                      {story.timeAgo}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white leading-snug">
                    {story.headline}
                  </h3>

                  <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] leading-relaxed line-clamp-3">
                    {story.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#6C6C70] dark:text-[#8E8E93] truncate">
                    <Tag className="w-3 h-3 shrink-0" />
                    <span className="truncate">{story.tags.join(' · ')}</span>
                  </div>
                  {story.badgeMetric && (
                    <span
                      className={`font-semibold shrink-0 font-mono tabular-nums ${
                        story.badgePositive === true
                          ? 'text-[#16803C] dark:text-[#30D158]'
                          : story.badgePositive === false
                            ? 'text-[#D7261C] dark:text-[#FF453A]'
                            : 'text-[#0071E3] dark:text-[#0A84FF]'
                      }`}
                    >
                      {story.badgeMetric}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : filteredStories.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-center text-sm text-[#6C6C70] dark:text-[#8E8E93]">
          No news dispatches match your current filters.
        </div>
      ) : null}

      {/* Editorial Analysis & Macro Insights */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div>
            <h2 className="text-xl font-bold text-[#1C1C1E] dark:text-white">
              Editorial Analysis &amp; Macro Insights
            </h2>
            <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
              Research notes from senior macro &amp; fixed income strategists
            </p>
          </div>
          <span className="text-xs font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
            {EDITORIAL_INSIGHTS.length} Active Briefings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EDITORIAL_INSIGHTS.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-2xl liquid-glass-card flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-bold ${
                    note.isPositive
                      ? 'text-[#16803C] dark:text-[#30D158]'
                      : 'text-[#6C6C70] dark:text-[#8E8E93]'
                  }`}
                >
                  {note.sentiment}
                </span>
                <span className="text-[#6C6C70] dark:text-[#8E8E93]">{note.desk}</span>
              </div>
              <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white">{note.title}</h3>
              <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] leading-relaxed">
                {note.summary}
              </p>
            </div>
          ))}
        </div>
      </section>

      <DailyDigestModal
        open={digestOpen}
        topicLabel={activeTopicLabel}
        digest={activeDigest}
        loading={digestLoading}
        error={digestError}
        onClose={() => setDigestOpen(false)}
        onRegenerate={() => void loadDailyDigest(activeTopic, true)}
        onInspectMover={handleInspectDigestMover}
      />
    </div>
  );
};
