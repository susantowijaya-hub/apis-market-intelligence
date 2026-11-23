import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Building2,
  Clock,
  Compass,
  Flame,
  Globe2,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AppRoute,
  BandarmologyPhase,
  MarketIntelligenceResponse,
  PriceAlertItem,
  StockMover,
  StocksMoversBucket,
} from '../types/market';
import { getAllMarketSessions, MarketSessionStatus } from '../utils/marketSessions';
import { getStockFearGreed, getStockSignal } from '../utils/marketSignals';
import { GoogleFinanceDeltaPill, GoogleFinanceMiniChart } from './GoogleFinanceMiniChart';
import {
  BandarmologyBadge,
  FearGreedInlineBar,
  FearGreedTrendSparkline,
  getFearGreedTextTone,
  SignalBadge,
} from './MarketUiPrimitives';

interface TopStocksViewProps {
  usBucket: StocksMoversBucket;
  idxBucket: StocksMoversBucket;
  stocksUpdatedAt: string | null;
  stocksLoading?: boolean;
  marketIntelligence?: MarketIntelligenceResponse | null;
  searchQuery: string;
  alerts?: PriceAlertItem[];
  onRefresh: () => void;
  onScanBandar?: () => void;
  onInspectSymbol?: (yahooSymbol: string) => void;
  onNavigate?: (route: AppRoute) => void;
  onClearSearch?: () => void;
}

type MarketFilter = 'all' | 'us' | 'id';
type DirectionFilter = 'impact' | 'gainers' | 'losers' | 'foreignBuy' | 'foreignSell';
type BandarFilter = 'all' | BandarmologyPhase;

function formatStockPrice(stock: StockMover): string {
  if (stock.price <= 0) return '—';
  if (stock.currency === 'IDR') {
    return `Rp ${Math.round(stock.price).toLocaleString('en-US')}`;
  }
  return `$${stock.price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStockDelta(stock: StockMover): string {
  if (stock.price <= 0) return '—';
  const sign = stock.changeValue >= 0 ? '+' : '-';
  const absVal = Math.abs(stock.changeValue);
  if (stock.currency === 'IDR') {
    return `${sign}Rp ${Math.round(absVal).toLocaleString('en-US')}`;
  }
  return `${sign}$${absVal.toFixed(2)}`;
}

function formatStockRange(stock: StockMover): string {
  if (stock.dayHigh <= 0 && stock.dayLow <= 0) return '—';
  if (stock.currency === 'IDR') {
    return `${Math.round(stock.dayLow).toLocaleString('en-US')} – ${Math.round(
      stock.dayHigh
    ).toLocaleString('en-US')}`;
  }
  return `$${stock.dayLow.toFixed(2)} – $${stock.dayHigh.toFixed(2)}`;
}

function SessionStatusCard({
  session,
  count,
}: {
  session: MarketSessionStatus;
  count: number;
}) {
  const toneStyles =
    session.tone === 'open'
      ? 'bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158] border-[#30D158]/30'
      : session.tone === 'extended' || session.tone === 'break'
        ? 'bg-[#FF9F0A]/15 text-[#B25E09] dark:text-[#FF9F0A] border-[#FF9F0A]/30'
        : 'bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#6C6C70] dark:text-[#8E8E93] border-[#D1D1D6] dark:border-[#38383A]';

  const dotColor =
    session.tone === 'open'
      ? 'bg-[#30D158] animate-pulse'
      : session.tone === 'extended' || session.tone === 'break'
        ? 'bg-[#FF9F0A]'
        : 'bg-[#8E8E93]';

  return (
    <div className="rounded-2xl liquid-glass-card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {session.id === 'idx' ? (
            <Globe2 className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#8AB4F8] shrink-0" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#8AB4F8] shrink-0" />
          )}
          <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
            {session.label}
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
            Top {count}
          </span>
        </div>
        <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] mt-0.5 truncate">
          {session.isLiveRunning ? 'Running Session Movers · ' : 'Last Session Movers · '}
          {session.detail}
        </p>
      </div>
      <span
        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${toneStyles}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {session.stateLabel}
      </span>
    </div>
  );
}

function MarketMoversSection({
  title,
  subtitle,
  session,
  stocks,
  isForeignFlow = false,
  foreignSide,
  loading = false,
  searchQuery = '',
  onRefresh,
  onClearSearch,
  onInspectSymbol,
}: {
  title: string;
  subtitle: string;
  session: MarketSessionStatus;
  stocks: StockMover[];
  isForeignFlow?: boolean;
  foreignSide?: 'BUY' | 'SELL';
  loading?: boolean;
  searchQuery?: string;
  onRefresh?: () => void;
  onClearSearch?: () => void;
  onInspectSymbol?: (yahooSymbol: string) => void;
}) {
  const isIdMarket = stocks.some((s) => s.market === 'ID');

  const openChartForStock = (stock: StockMover) => {
    if (!onInspectSymbol) return;
    const sym = stock.market === 'ID' ? `${stock.symbol}.JK` : stock.symbol;
    onInspectSymbol(sym);
  };

  return (
    <motion.section
      initial={{ opacity: 0.85, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl liquid-glass-card overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-black/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#1C1C1E] dark:text-white">{title}</h2>
          <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
          <Clock className="w-3.5 h-3.5" />
          {session.isLiveRunning
            ? `Running Session (${session.stateLabel})`
            : `Last Completed Session (${session.stateLabel})`}
        </span>
      </div>

      {stocks.length === 0 ? (
        loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-xs text-[#6C6C70] dark:text-[#8E8E93]">
            <Loader2 className="w-5 h-5 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
            <span>Loading live equity movers &amp; institutional liquidity ranking...</span>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#6C6C70] dark:text-[#8E8E93] flex flex-col items-center gap-2.5">
            <span>
              {searchQuery.trim()
                ? `No equity tickers match "${searchQuery.trim()}".`
                : isForeignFlow
                  ? 'Syncing latest IDX Foreign Flow report...'
                  : 'No live movers available right now.'}
            </span>
            <div className="flex items-center gap-2">
              {searchQuery.trim() && onClearSearch && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="px-3 py-1 rounded-lg bg-[#0071E3] text-white font-semibold"
                >
                  Clear search filter
                </button>
              )}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3 py-1 rounded-lg border border-[#D1D1D6] dark:border-[#2C2C2E] font-semibold text-[#1C1C1E] dark:text-white"
                >
                  Retry Live Sync
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93]">
                  <th className="py-3 pl-5 pr-2 w-12">Rank</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-3">Signal</th>
                  {isIdMarket && <th className="py-3 px-3">Bandarmology</th>}
                  <th className="py-3 px-3">Fear &amp; Greed</th>
                  <th className="py-3 px-3">Trend</th>
                  {isForeignFlow && (
                    <th className="py-3 px-3 text-right">
                      {foreignSide === 'BUY' ? 'Foreign Net Buy' : 'Foreign Net Sell'}
                    </th>
                  )}
                  <th className="py-3 px-3 text-right">Last Price</th>
                  <th className="py-3 px-3 text-right">Session Chg</th>
                  <th className="py-3 px-3 text-right">Change %</th>
                  <th className="py-3 px-3 text-right">Day Range</th>
                  <th className="py-3 pl-3 pr-5 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]/70 dark:divide-[#2C2C2E]/60 text-xs">
                {stocks.map((stock, idx) => {
                  const isGain = stock.changePercent >= 0;
                  const isForeignBuy = (stock.foreignNetAmount ?? 0) >= 0;
                  const signal = getStockSignal(stock);
                  const fearGreed = getStockFearGreed(stock);
                  return (
                    <tr
                      key={`${stock.market}-${stock.symbol}-${idx}`}
                      onClick={() => openChartForStock(stock)}
                      className={`hover:bg-[#E5E5EA]/35 dark:hover:bg-[#2C2C2E]/40 transition-colors ${
                        onInspectSymbol ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="py-3 pl-5 pr-2 font-mono font-bold text-[#6C6C70] dark:text-[#8E8E93]">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">
                            {stock.symbol}
                          </span>
                          {idx < 3 && (
                            <Flame
                              className="w-3.5 h-3.5 text-[#FF9F0A] shrink-0"
                              aria-label="Top mover"
                            />
                          )}
                        </div>
                        <div className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] truncate max-w-[200px]">
                          {stock.name} · {stock.exchange}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <SignalBadge signal={signal} compact />
                      </td>
                      {isIdMarket && (
                        <td className="py-3 px-3">
                          <div className="flex flex-col items-start gap-0.5">
                            <BandarmologyBadge bandarmology={stock.bandarmology} compact />
                            {stock.bandarmology && (
                              <span className="text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
                                {stock.bandarmology.volumeRatio.toFixed(1)}x vol · Flow {stock.bandarmology.accumulationPressure}%
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-3">
                        <FearGreedInlineBar fearGreed={fearGreed} compact />
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-20 h-8">
                          <GoogleFinanceMiniChart
                            points={stock.sparklinePoints}
                            prevClose={stock.prevClose}
                            isGain={isGain}
                            progressRatio={session.isLiveRunning ? 0.85 : 1}
                            className="w-20 h-8"
                            showEndDot={session.isLiveRunning}
                          />
                        </div>
                      </td>
                      {isForeignFlow && (
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-bold text-xs tabular-nums ${
                              isForeignBuy
                                ? 'bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158]'
                                : 'bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A]'
                            }`}
                          >
                            {isForeignBuy ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            )}
                            {stock.foreignNetLabel || '—'}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-[#1C1C1E] dark:text-white tabular-nums">
                        {formatStockPrice(stock)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-semibold tabular-nums ${
                          isGain
                            ? 'text-[#16803C] dark:text-[#30D158]'
                            : 'text-[#D7261C] dark:text-[#FF453A]'
                        }`}
                      >
                        {formatStockDelta(stock)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex justify-end">
                          <GoogleFinanceDeltaPill changePercent={stock.changePercent} />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[#6C6C70] dark:text-[#8E8E93] tabular-nums">
                        {formatStockRange(stock)}
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right font-mono font-semibold text-[#1C1C1E] dark:text-[#E5E5EA] tabular-nums">
                        {stock.volume}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]/70">
            {stocks.map((stock, idx) => {
              const isGain = stock.changePercent >= 0;
              const isForeignBuy = (stock.foreignNetAmount ?? 0) >= 0;
              const signal = getStockSignal(stock);
              const fearGreed = getStockFearGreed(stock);
              return (
                <div
                  key={`${stock.market}-${stock.symbol}-m-${idx}`}
                  onClick={() => openChartForStock(stock)}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    onInspectSymbol ? 'cursor-pointer active:bg-[#E5E5EA]/40 dark:active:bg-[#2C2C2E]/40' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-[#6C6C70] dark:text-[#8E8E93]">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-extrabold text-[#1C1C1E] dark:text-white">
                        {stock.symbol}
                      </span>
                      <SignalBadge signal={signal} compact />
                      {stock.market === 'ID' && (
                        <BandarmologyBadge bandarmology={stock.bandarmology} compact />
                      )}
                    </div>
                    <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] truncate mt-0.5">
                      {stock.name} · Vol {stock.volume}
                      {stock.market === 'ID' && stock.bandarmology
                        ? ` · ${stock.bandarmology.volumeRatio.toFixed(1)}x Vol`
                        : ''}
                    </p>
                    {isForeignFlow && stock.foreignNetLabel ? (
                      <div
                        className={`text-[11px] font-mono font-bold mt-1 tabular-nums flex items-center gap-1.5 flex-wrap ${
                          isForeignBuy
                            ? 'text-[#16803C] dark:text-[#30D158]'
                            : 'text-[#D7261C] dark:text-[#FF453A]'
                        }`}
                      >
                        <span>
                          {isForeignBuy ? 'Foreign Buy: ' : 'Foreign Sell: '}
                          {stock.foreignNetLabel}
                        </span>
                        <span className={`inline-flex items-center gap-1 ${getFearGreedTextTone(fearGreed.zone)}`}>
                          <span>· F&amp;G {fearGreed.score}</span>
                          <FearGreedTrendSparkline
                            history7d={fearGreed.history7d}
                            score={fearGreed.score}
                            zone={fearGreed.zone}
                            compact
                            showLabel={false}
                          />
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-[#6C6C70] dark:text-[#8E8E93] mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                        <span>Range: {formatStockRange(stock)} ·</span>
                        <span className={`inline-flex items-center gap-1 font-bold ${getFearGreedTextTone(fearGreed.zone)}`}>
                          <span>F&amp;G {fearGreed.score}</span>
                          <FearGreedTrendSparkline
                            history7d={fearGreed.history7d}
                            score={fearGreed.score}
                            zone={fearGreed.zone}
                            compact
                            showLabel={false}
                          />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-16 h-7 shrink-0">
                    <GoogleFinanceMiniChart
                      points={stock.sparklinePoints}
                      prevClose={stock.prevClose}
                      isGain={isGain}
                      progressRatio={session.isLiveRunning ? 0.85 : 1}
                      className="w-16 h-7"
                      showEndDot={session.isLiveRunning}
                    />
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-[#1C1C1E] dark:text-white tabular-nums">
                      {formatStockPrice(stock)}
                    </div>
                    <div className="mt-0.5 flex justify-end">
                      <GoogleFinanceDeltaPill changePercent={stock.changePercent} compact />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.section>
  );
}

export const TopStocksView: React.FC<TopStocksViewProps> = ({
  usBucket,
  idxBucket,
  stocksUpdatedAt,
  stocksLoading = false,
  marketIntelligence = null,
  searchQuery,
  alerts = [],
  onRefresh,
  onScanBandar,
  onInspectSymbol,
  onNavigate,
  onClearSearch,
}) => {
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('impact');
  const [bandarFilter, setBandarFilter] = useState<BandarFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bandarShiftAlerts = useMemo(
    () => alerts.filter((a) => a.alertKind === 'bandarmology').slice(0, 4),
    [alerts]
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const sessions = getAllMarketSessions(now);

  // If user switches to US-only while a Foreign Flow tab is active, snap cleanly to Highest Impact
  useEffect(() => {
    if (marketFilter === 'us' && (directionFilter === 'foreignBuy' || directionFilter === 'foreignSell')) {
      setDirectionFilter('impact');
    }
  }, [marketFilter, directionFilter]);

  const filterSearch = (list: StockMover[]) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list.slice(0, 10);
    return list.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.exchange.toLowerCase().includes(q)
    );
  };

  const activeUsList = useMemo(() => {
    const raw =
      directionFilter === 'gainers'
        ? usBucket.gainers
        : directionFilter === 'losers'
          ? usBucket.losers
          : usBucket.impact;
    return filterSearch(raw);
  }, [usBucket, directionFilter, searchQuery]);

  const activeIdxList = useMemo(() => {
    const raw =
      directionFilter === 'gainers'
        ? idxBucket.gainers
        : directionFilter === 'losers'
          ? idxBucket.losers
          : directionFilter === 'foreignBuy'
            ? idxBucket.foreignBuy ?? []
            : directionFilter === 'foreignSell'
              ? idxBucket.foreignSell ?? []
              : idxBucket.impact;
    const searched = filterSearch(raw);
    if (bandarFilter === 'all') return searched;
    return searched.filter((s) => (s.bandarmology?.phase ?? 'Neutral') === bandarFilter);
  }, [idxBucket, directionFilter, searchQuery, bandarFilter]);

  const combinedSignalTally = useMemo(() => {
    let bull = 0;
    let bear = 0;
    for (const s of [...activeUsList, ...activeIdxList]) {
      const sig = getStockSignal(s);
      if (sig.direction === 'bull') bull += 1;
      else if (sig.direction === 'bear') bear += 1;
    }
    return { bull, bear };
  }, [activeUsList, activeIdxList]);

  const idxBandarSummary = useMemo(() => {
    let acc = 0;
    let dist = 0;
    for (const s of idxBucket.impact) {
      const ph = s.bandarmology?.phase;
      if (ph === 'Strong Accumulation' || ph === 'Early Accumulation') acc += 1;
      else if (ph === 'Strong Distribution' || ph === 'Early Distribution') dist += 1;
    }
    return { acc, dist };
  }, [idxBucket.impact]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    window.setTimeout(() => setIsRefreshing(false), 750);
  };

  const updatedWib = stocksUpdatedAt
    ? `${new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(stocksUpdatedAt))} WIB`
    : 'Syncing...';

  const isForeignTab = directionFilter === 'foreignBuy' || directionFilter === 'foreignSell';

  const directionTitleSuffix =
    directionFilter === 'gainers'
      ? 'Top 10 Gainers'
      : directionFilter === 'losers'
        ? 'Top 10 Losers'
        : directionFilter === 'foreignBuy'
          ? 'Top 10 Foreign Buy'
          : directionFilter === 'foreignSell'
            ? 'Top 10 Foreign Sell'
            : 'Top 10 High-Impact Stocks';

  const showUsSection = !isForeignTab && (marketFilter === 'all' || marketFilter === 'us');
  const showIdxSection = isForeignTab || marketFilter === 'all' || marketFilter === 'id';

  return (
    <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 py-5 sm:py-7 pb-28 flex flex-col gap-5">
      {/* Page Title & Live Sync Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white">
              Top 10 Session Stock Movers
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#8E8E93] mt-1">
            Always 10 institutional-weighted equities across US (NYSE/NASDAQ) &amp; Indonesia (IDX), plus daily IDX Foreign Buy &amp; Foreign Sell flow.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-[#6C6C70] dark:text-[#8E8E93]">
            Updated {updatedWib}
          </span>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-pill hover:border-[#0071E3] text-xs font-semibold text-[#1C1C1E] dark:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || stocksLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Market Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SessionStatusCard session={sessions.us} count={activeUsList.length || 10} />
        <SessionStatusCard session={sessions.idx} count={activeIdxList.length || 10} />
      </div>

      {/* Connected Equity & Foreign Flow Intelligence Summary Banner */}
      <section className="rounded-2xl liquid-glass-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Compass className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
              Stocks &amp; Foreign Flow Briefing
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158] text-[10px] font-bold tabular-nums">
              <TrendingUp className="w-3 h-3" />
              {combinedSignalTally.bull} Bull Signals
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A] text-[10px] font-bold tabular-nums">
              <TrendingDown className="w-3 h-3" />
              {combinedSignalTally.bear} Bear Signals
            </span>
            <span className="text-[11px] font-semibold text-[#4A4D57] dark:text-[#C7CBD6] tabular-nums">
              IDX Bandarmology: {idxBandarSummary.acc} Accumulation · {idxBandarSummary.dist} Distribution
            </span>
          </div>
          <p className="text-xs text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed mt-1.5">
            {marketIntelligence?.stocksAndFlowSummary ||
              'Synchronizing US institutional capitalization leaders, Jakarta IDX liquidity movers, and foreign net buy/sell flows across active sessions.'}
          </p>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-semibold text-[#1C1C1E] dark:text-white hover:opacity-85 transition-opacity"
            >
              <span>Indices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('news')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-xs font-semibold text-[#0071E3] dark:text-[#8AB4F8] hover:opacity-85 transition-opacity"
            >
              <span>News &amp; Recap</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </section>

      {/* Market & Category Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl liquid-glass-pill p-1">
          {(
            [
              {
                id: 'all',
                label: `All Markets (${(showUsSection ? activeUsList.length : 0) + activeIdxList.length})`,
              },
              { id: 'us', label: `United States (${activeUsList.length})` },
              { id: 'id', label: `Indonesia IDX (${activeIdxList.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMarketFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                marketFilter === tab.id
                  ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white shadow-sm'
                  : 'text-[#4A4D57] dark:text-[#B4B8C4] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="inline-flex flex-wrap rounded-xl liquid-glass-pill p-1 gap-0.5">
          {(
            [
              { id: 'impact', label: 'Highest Impact', idxOnly: false },
              { id: 'gainers', label: 'Top Gainers', idxOnly: false },
              { id: 'losers', label: 'Top Losers', idxOnly: false },
              { id: 'foreignBuy', label: 'IDX Foreign Buy', idxOnly: true },
              { id: 'foreignSell', label: 'IDX Foreign Sell', idxOnly: true },
            ] as const
          )
            .filter((item) => (marketFilter === 'us' ? !item.idxOnly : true))
            .map((dir) => (
              <button
                key={dir.id}
                type="button"
                onClick={() => {
                  setDirectionFilter(dir.id);
                  if (dir.idxOnly && marketFilter === 'all') {
                    setMarketFilter('id');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  directionFilter === dir.id
                    ? dir.id === 'foreignBuy'
                      ? 'bg-[#16803C] text-white shadow-sm'
                      : dir.id === 'foreignSell'
                        ? 'bg-[#D7261C] text-white shadow-sm'
                        : 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                    : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {dir.label}
              </button>
            ))}
        </div>
      </div>

      {showIdxSection && (
        <div className="flex flex-col gap-2.5">
          <div
            data-testid="idx-bandarmology-filter"
            className="flex flex-wrap items-center gap-1.5 text-xs"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] mr-1">
              IDX Bandarmology:
            </span>
            {(
              [
                { id: 'all', label: 'All Phases' },
                { id: 'Strong Accumulation', label: 'Strong Accumulation' },
                { id: 'Early Accumulation', label: 'Early Accumulation' },
                { id: 'Early Distribution', label: 'Early Distribution' },
                { id: 'Strong Distribution', label: 'Strong Distribution' },
              ] as const
            ).map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => setBandarFilter(phase.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                  bandarFilter === phase.id
                    ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent shadow-sm'
                    : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {phase.label}
              </button>
            ))}
          </div>

          <div
            data-testid="idx-bandar-shift-monitor"
            className="rounded-xl liquid-glass-inset px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <BellRing className="w-3.5 h-3.5 text-[#0F7033] dark:text-[#4ADE80] shrink-0" />
              <span className="font-bold text-[#1C1C1E] dark:text-white">
                Accumulation Shift Monitor
              </span>
              <span className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8]">
                Auto-alerts when IDX stocks shift Early ↔ Strong Accumulation ({bandarShiftAlerts.length} recent)
              </span>
              {bandarShiftAlerts.map((sh) => {
                const isUp = sh.bandarToPhase === 'Strong Accumulation';
                return (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => onInspectSymbol?.(sh.assetId)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-opacity hover:opacity-85 ${
                      isUp
                        ? 'bg-[#16A34A]/15 text-[#0F7033] dark:text-[#4ADE80]'
                        : 'bg-[#D97706]/15 text-[#9A5A0A] dark:text-[#FBBF24]'
                    }`}
                  >
                    {sh.symbol}: {isUp ? 'Early → Strong Acc' : 'Strong → Early Acc'}
                  </button>
                );
              })}
            </div>
            {onScanBandar && (
              <button
                type="button"
                data-testid="stocks-scan-bandar-btn"
                onClick={onScanBandar}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg liquid-glass-pill text-[11px] font-bold text-[#0F7033] dark:text-[#4ADE80] hover:brightness-95 dark:hover:brightness-110 transition-all whitespace-nowrap shrink-0"
              >
                <Activity className="w-3 h-3" />
                Scan IDX Shifts
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tables */}
      {showUsSection && (
        <MarketMoversSection
          title={`United States · ${directionTitleSuffix}`}
          subtitle="Ranked by institutional market-cap weight, dollar turnover, relative volume, and price displacement"
          session={sessions.us}
          stocks={activeUsList}
          loading={stocksLoading}
          searchQuery={searchQuery}
          onRefresh={handleManualRefresh}
          onClearSearch={onClearSearch}
          onInspectSymbol={onInspectSymbol}
        />
      )}

      {showIdxSection && (
        <MarketMoversSection
          title={`Indonesia (IDX / BEI) · ${directionTitleSuffix}`}
          subtitle={
            directionFilter === 'foreignBuy'
              ? 'Top 10 Indonesian equities by net foreign institutional buy value (IDR)'
              : directionFilter === 'foreignSell'
                ? 'Top 10 Indonesian equities by net foreign institutional sell value (IDR)'
                : 'Top 10 institutional IDX/LQ45 equities ranked by market-cap impact, turnover & relative volume'
          }
          session={sessions.idx}
          stocks={activeIdxList}
          isForeignFlow={isForeignTab}
          foreignSide={directionFilter === 'foreignBuy' ? 'BUY' : directionFilter === 'foreignSell' ? 'SELL' : undefined}
          loading={stocksLoading}
          searchQuery={searchQuery}
          onRefresh={handleManualRefresh}
          onClearSearch={onClearSearch}
          onInspectSymbol={onInspectSymbol}
        />
      )}
    </div>
  );
};
