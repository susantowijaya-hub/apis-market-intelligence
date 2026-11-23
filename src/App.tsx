/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BottomDock } from './components/BottomDock';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { MarketDashboardView } from './components/MarketDashboardView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PriceAlertToastStack } from './components/PriceAlertOverlay';
import { useLiveMarket } from './hooks/useLiveMarket';
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { useTheme } from './hooks/useTheme';
import { AppRoute, CalendarCatalyst, NewsStory, PriceAlertItem } from './types/market';
import { lazyWithRetry } from './utils/lazyWithRetry';

const WatchlistView = lazyWithRetry(() =>
  import('./components/WatchlistView').then((m) => ({ default: m.WatchlistView }))
);
const PortfolioView = lazyWithRetry(() =>
  import('./components/PortfolioView').then((m) => ({ default: m.PortfolioView }))
);
const TopStocksView = lazyWithRetry(() =>
  import('./components/TopStocksView').then((m) => ({ default: m.TopStocksView }))
);
const MarketHeatmapView = lazyWithRetry(() =>
  import('./components/MarketHeatmapView').then((m) => ({ default: m.MarketHeatmapView }))
);
const NewsFeedView = lazyWithRetry(() =>
  import('./components/NewsFeedView').then((m) => ({ default: m.NewsFeedView }))
);
const EconomicCalendarView = lazyWithRetry(() =>
  import('./components/EconomicCalendarView').then((m) => ({ default: m.EconomicCalendarView }))
);
const MarketExtractShareView = lazyWithRetry(() =>
  import('./components/MarketExtractShareView').then((m) => ({ default: m.MarketExtractShareView }))
);
const NewsModal = lazyWithRetry(() =>
  import('./components/NewsModal').then((m) => ({ default: m.NewsModal }))
);
const SymbolDetailModal = lazyWithRetry(() =>
  import('./components/SymbolDetailModal').then((m) => ({ default: m.SymbolDetailModal }))
);

const RouteLoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center py-20 text-xs font-semibold text-[#4A4D57] dark:text-[#B4B8C4] gap-2">
    <Loader2 className="w-4 h-4 animate-spin text-[#0071E3] dark:text-[#3898FF]" />
    <span>Loading terminal view...</span>
  </div>
);

const VALID_ROUTES: AppRoute[] = ['dashboard', 'watchlist', 'portfolio', 'stocks', 'heatmap', 'news', 'calendar', 'extract'];

const ROUTE_SHORT_LABELS: Record<AppRoute, string> = {
  dashboard: 'Markets',
  watchlist: 'Watchlist',
  portfolio: 'Portfolio',
  stocks: 'Stocks',
  heatmap: 'Heatmap',
  news: 'News',
  calendar: 'Calendar',
  extract: 'Share',
};

function hasHorizontalScrollAncestor(el: EventTarget | null, boundary: HTMLElement | null): boolean {
  let curr = el instanceof HTMLElement ? el : null;
  while (curr && curr !== boundary) {
    if (curr.dataset.noViewSwipe === 'true') return true;
    const tag = curr.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'CANVAS') {
      return true;
    }
    const style = window.getComputedStyle(curr);
    if (
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      curr.scrollWidth > curr.clientWidth + 6
    ) {
      return true;
    }
    curr = curr.parentElement;
  }
  return false;
}

function getInitialRoute(): AppRoute {
  if (typeof window === 'undefined') return 'dashboard';
  const hash = window.location.hash.replace('#', '') as AppRoute;
  return VALID_ROUTES.includes(hash) ? hash : 'dashboard';
}

function StocksTerminalShell() {
  const { themeMode, setThemeMode, toggleTheme } = useTheme();
  const {
    assets,
    newsStories,
    economicEvents,
    nextCatalyst,
    fxRates,
    usMovers,
    idxMovers,
    usMoversBucket,
    idxMoversBucket,
    stocksUpdatedAt,
    stocksLoading,
    heatmapData,
    heatmapLoading,
    refreshHeatmap,
    dailySummary,
    dailySummaryLoading,
    refreshDailySummary,
    marketIntelligence,
    intelligenceLoading,
    refreshMarketIntelligence,
    isPulseActive,
    wsConnected,
    feedsLive,
    flashMap,
    serverDiagnostics,
    clientTransport,
    refreshDiagnostics,
    togglePulse,
    loadChartTimeframe,
    refreshStocks,
    refreshAll,
  } = useLiveMarket();

  const [activeRoute, setActiveRoute] = useState<AppRoute>(getInitialRoute);
  const [swipeSlideDir, setSwipeSlideDir] = useState<1 | -1 | 0>(0);
  const [swipeHint, setSwipeHint] = useState<{
    direction: 'prev' | 'next';
    targetRoute: AppRoute;
    progress: number;
  } | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('SPX');
  const [inspectedSymbol, setInspectedSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPercentMode, setIsPercentMode] = useState<boolean>(true);
  const [activeStory, setActiveStory] = useState<NewsStory | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3 * 3600 + 42 * 60 + 15);
  const lastRollRefreshRef = useRef<number>(0);
  const mainSwipeRef = useRef<HTMLElement | null>(null);
  const swipeSessionRef = useRef<{
    active: boolean;
    locked: 'horizontal' | 'vertical' | null;
    startX: number;
    startY: number;
    startAt: number;
    lastDx: number;
  }>({
    active: false,
    locked: null,
    startX: 0,
    startY: 0,
    startAt: 0,
    lastDx: 0,
  });

  const {
    alerts,
    toasts,
    unreadCount,
    volatility5mMap,
    market5mStats,
    dismissToast,
    markRead,
    markAllRead,
    clearAlerts,
    pushIctSignalAlert,
    scanIctAlerts,
    scanBandarmologyAlerts,
  } = usePriceAlerts(assets, idxMoversBucket);

  // Sync browser hash navigation (Back/Forward on Desktop, Android, and iOS Safari)
  useEffect(() => {
    const handleHashChange = () => {
      const next = window.location.hash.replace('#', '') as AppRoute;
      if (VALID_ROUTES.includes(next)) {
        setActiveRoute(next);
      } else {
        setActiveRoute('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Automatically pick the next non-expired catalyst if nextCatalyst's timestamp has elapsed
  const activeCatalyst = useMemo<CalendarCatalyst | null>(() => {
    const now = Date.now();
    if (nextCatalyst && nextCatalyst.targetEpochMs > now) {
      return nextCatalyst;
    }
    const futureEvents = economicEvents
      .map((ev) => ({
        ev,
        ts: ev.isoDate ? Date.parse(ev.isoDate) : NaN,
      }))
      .filter((x) => Number.isFinite(x.ts) && x.ts > now)
      .sort((a, b) => a.ts - b.ts);

    const picked =
      futureEvents.find((x) => x.ev.impact === 'HIGH') ?? futureEvents[0];
    if (picked) {
      return {
        title: picked.ev.title,
        currency: picked.ev.currency,
        timeWib: picked.ev.timeWib,
        targetEpochMs: picked.ts,
        description: picked.ev.description,
      };
    }
    return nextCatalyst;
  }, [nextCatalyst, economicEvents]);

  const activeTargetEpochMs = activeCatalyst?.targetEpochMs ?? null;
  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;

  // Live countdown ticker with automatic reset/roll-forward when hitting 00h 00m 00s
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (activeTargetEpochMs && activeTargetEpochMs > now) {
        const diff = Math.floor((activeTargetEpochMs - now) / 1000);
        setCountdownSeconds((prev) => (prev === diff ? prev : diff));
        return;
      }

      // If no future timestamped event is loaded yet, roll smoothly and refresh feeds
      setCountdownSeconds((prev) => {
        if (prev > 1) return prev - 1;
        if (now - lastRollRefreshRef.current > 60_000) {
          lastRollRefreshRef.current = now;
          refreshAllRef.current();
        }
        // Reset to next 4-hour macro window limit so timer never stalls at 00:00:00
        return 4 * 3600;
      });
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [activeTargetEpochMs]);

  const handleNavigate = useCallback((route: AppRoute, dir: 1 | -1 | 0 = 0) => {
    setSwipeSlideDir(dir);
    setActiveRoute(route);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      const nextHash = `#${route}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', nextHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleSwipeTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (activeStory || inspectedSymbol || e.touches.length !== 1) {
        swipeSessionRef.current.active = false;
        return;
      }
      if (hasHorizontalScrollAncestor(e.target, mainSwipeRef.current)) {
        swipeSessionRef.current.active = false;
        return;
      }
      const touch = e.touches[0];
      swipeSessionRef.current = {
        active: true,
        locked: null,
        startX: touch.clientX,
        startY: touch.clientY,
        startAt: Date.now(),
        lastDx: 0,
      };
    },
    [activeStory, inspectedSymbol]
  );

  const handleSwipeTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const sess = swipeSessionRef.current;
      if (!sess.active || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - sess.startX;
      const dy = touch.clientY - sess.startY;
      sess.lastDx = dx;

      if (sess.locked === null) {
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.45) {
          sess.locked = 'horizontal';
        } else {
          sess.locked = 'vertical';
          sess.active = false;
          setSwipeHint(null);
          return;
        }
      }

      if (sess.locked === 'horizontal') {
        const curIdx = VALID_ROUTES.indexOf(activeRoute);
        const targetIdx = dx < 0 ? curIdx + 1 : curIdx - 1;
        if (targetIdx < 0 || targetIdx >= VALID_ROUTES.length || Math.abs(dx) < 20) {
          setSwipeHint(null);
          return;
        }
        setSwipeHint({
          direction: dx < 0 ? 'next' : 'prev',
          targetRoute: VALID_ROUTES[targetIdx],
          progress: Math.min(1, Math.abs(dx) / 72),
        });
      }
    },
    [activeRoute]
  );

  const handleSwipeTouchEnd = useCallback(() => {
    const sess = swipeSessionRef.current;
    setSwipeHint(null);
    if (!sess.active || sess.locked !== 'horizontal') {
      sess.active = false;
      return;
    }
    sess.active = false;
    const dx = sess.lastDx;
    const elapsed = Date.now() - sess.startAt;
    const absDx = Math.abs(dx);
    const shouldSwitch = absDx >= 68 || (absDx >= 42 && elapsed < 260);
    if (!shouldSwitch) return;

    const curIdx = VALID_ROUTES.indexOf(activeRoute);
    const nextIdx = dx < 0 ? curIdx + 1 : curIdx - 1;
    if (nextIdx >= 0 && nextIdx < VALID_ROUTES.length) {
      handleNavigate(VALID_ROUTES[nextIdx], dx < 0 ? 1 : -1);
    }
  }, [activeRoute, handleNavigate]);

  const handleToggleBadgeMode = useCallback(() => {
    setIsPercentMode((prev) => !prev);
  }, []);

  const handleInspectSymbol = useCallback(
    (yahooSymbol: string, builtInAssetId?: string) => {
      if (builtInAssetId) {
        setSelectedAssetId(builtInAssetId);
      }
      setInspectedSymbol(yahooSymbol);
    },
    []
  );

  return (
    <div className="relative min-h-dvh flex flex-col text-[#1C1C1E] dark:text-white selection:bg-[#0066CC]/20 dark:selection:bg-[#F59E0B]/30">
      <div aria-hidden="true" data-testid="ambient-glass-backdrop" className="ambient-theme-canvas" />
      <div className="relative z-10 min-h-dvh flex flex-col">
      <Header
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onSelectTheme={setThemeMode}
        isPulseActive={isPulseActive}
        wsConnected={wsConnected || feedsLive}
        onTogglePulse={togglePulse}
        tickerStories={newsStories}
        onOpenStory={setActiveStory}
        assets={assets}
        usMovers={usMovers}
        idxMovers={idxMovers}
        marketIntelligence={marketIntelligence}
        economicEvents={economicEvents}
        onSelectAsset={setSelectedAssetId}
        onInspectSymbol={handleInspectSymbol}
        serverDiagnostics={serverDiagnostics}
        clientTransport={clientTransport}
        feedsLive={feedsLive}
        onRefreshAll={refreshAll}
        onRefreshDiagnostics={refreshDiagnostics}
      />

      <main
        ref={mainSwipeRef}
        onTouchStart={handleSwipeTouchStart}
        onTouchMove={handleSwipeTouchMove}
        onTouchEnd={handleSwipeTouchEnd}
        onTouchCancel={handleSwipeTouchEnd}
        className="flex-1 flex flex-col relative"
      >
        {/* Tactile Edge Swipe Indicator on Mobile */}
        {swipeHint && (
          <div
            aria-hidden="true"
            style={{
              opacity: Math.max(0.25, swipeHint.progress),
              transform: `translateY(-50%) scale(${0.92 + swipeHint.progress * 0.08})`,
            }}
            className={`fixed top-1/2 z-50 pointer-events-none px-3 py-2 rounded-full liquid-glass-strong shadow-lg flex items-center gap-1.5 text-xs font-bold text-[#1C1C1E] dark:text-white transition-transform duration-75 ${
              swipeHint.direction === 'next' ? 'right-3' : 'left-3'
            }`}
          >
            {swipeHint.direction === 'prev' && <ChevronLeft className="w-4 h-4" />}
            <span>{ROUTE_SHORT_LABELS[swipeHint.targetRoute]}</span>
            {swipeHint.direction === 'next' && <ChevronRight className="w-4 h-4" />}
          </div>
        )}

        <motion.div
          key={activeRoute}
          initial={
            swipeSlideDir !== 0
              ? { opacity: 0.72, x: swipeSlideDir * 16 }
              : false
          }
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col"
        >
        <Suspense fallback={<RouteLoadingFallback />}>
        {activeRoute === 'dashboard' && (
          <MarketDashboardView
            assets={assets}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
            searchQuery={searchQuery}
            flashMap={flashMap}
            onNavigate={handleNavigate}
            onLoadTimeframe={loadChartTimeframe}
            themeMode={themeMode}
            newsStories={newsStories}
            onOpenStory={setActiveStory}
            marketIntelligence={marketIntelligence}
            intelligenceLoading={intelligenceLoading}
            onRefreshIntelligence={refreshMarketIntelligence}
            alerts={alerts}
            unreadAlertCount={unreadCount}
            volatility5mMap={volatility5mMap}
            market5mStats={market5mStats}
            onMarkAllAlertsRead={markAllRead}
            onMarkAlertRead={markRead}
            onClearAlerts={clearAlerts}
            onScanIct={scanIctAlerts}
            onPushIctAlert={pushIctSignalAlert}
            onScanBandar={scanBandarmologyAlerts}
            onInspectSymbol={(sym) => handleInspectSymbol(sym)}
          />
        )}

        {activeRoute === 'watchlist' && (
          <WatchlistView
            assets={assets}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
            onNavigate={handleNavigate}
            onInspectSymbol={handleInspectSymbol}
            searchQuery={searchQuery}
            isPercentMode={isPercentMode}
            onToggleBadgeMode={handleToggleBadgeMode}
            flashMap={flashMap}
          />
        )}

        {activeRoute === 'portfolio' && (
          <PortfolioView
            assets={assets}
            fxRates={fxRates}
            searchQuery={searchQuery}
            themeMode={themeMode}
            onInspectSymbol={(sym) => handleInspectSymbol(sym)}
          />
        )}

        {activeRoute === 'stocks' && (
          <TopStocksView
            usBucket={usMoversBucket}
            idxBucket={idxMoversBucket}
            stocksUpdatedAt={stocksUpdatedAt}
            stocksLoading={stocksLoading}
            marketIntelligence={marketIntelligence}
            searchQuery={searchQuery}
            alerts={alerts}
            onRefresh={refreshStocks}
            onScanBandar={scanBandarmologyAlerts}
            onInspectSymbol={(sym) => handleInspectSymbol(sym)}
            onNavigate={handleNavigate}
            onClearSearch={() => setSearchQuery('')}
          />
        )}

        {activeRoute === 'heatmap' && (
          <MarketHeatmapView
            heatmapData={heatmapData}
            loading={heatmapLoading}
            searchQuery={searchQuery}
            themeMode={themeMode}
            onRefresh={refreshHeatmap}
            onInspectSymbol={(sym) => handleInspectSymbol(sym)}
          />
        )}

        {activeRoute === 'news' && (
          <NewsFeedView
            stories={newsStories}
            searchQuery={searchQuery}
            onOpenStory={setActiveStory}
            dailySummary={dailySummary}
            dailySummaryLoading={dailySummaryLoading}
            onRefreshDailySummary={refreshDailySummary}
            marketIntelligence={marketIntelligence}
            assets={assets}
            economicEvents={economicEvents}
            usBucket={usMoversBucket}
            idxBucket={idxMoversBucket}
            onSelectAsset={setSelectedAssetId}
            onInspectSymbol={handleInspectSymbol}
            onNavigate={handleNavigate}
          />
        )}

        {activeRoute === 'calendar' && (
          <EconomicCalendarView
            events={economicEvents}
            nextCatalyst={activeCatalyst}
            searchQuery={searchQuery}
            countdownSeconds={countdownSeconds}
          />
        )}

        {activeRoute === 'extract' && (
          <MarketExtractShareView
            assets={assets}
            marketIntelligence={marketIntelligence}
            usBucket={usMoversBucket}
            idxBucket={idxMoversBucket}
            feedsLive={feedsLive}
            onRefreshIntelligence={refreshMarketIntelligence}
          />
        )}
        </Suspense>
        </motion.div>
      </main>

      <BottomDock
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      <OfflineIndicator />
      <PriceAlertToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onSelectAlert={(alert: PriceAlertItem) => {
          markRead(alert.id);
          dismissToast(alert.id);
          if (alert.alertKind === 'bandarmology') {
            handleInspectSymbol(alert.assetId);
            return;
          }
          setSelectedAssetId(alert.assetId);
          if (activeRoute !== 'dashboard') {
            handleNavigate('dashboard');
          }
        }}
      />
      <Suspense fallback={null}>
        {activeStory && (
          <NewsModal story={activeStory} onClose={() => setActiveStory(null)} />
        )}
        {inspectedSymbol && (
          <SymbolDetailModal
            yahooSymbol={inspectedSymbol}
            onClose={() => setInspectedSymbol(null)}
          />
        )}
      </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StocksTerminalShell />
    </ErrorBoundary>
  );
}
