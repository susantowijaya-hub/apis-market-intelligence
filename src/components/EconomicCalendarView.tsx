import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellRing, CalendarClock, Download, Flame, Gauge } from 'lucide-react';
import { CalendarCatalyst, EconomicEvent } from '../types/market';

interface EconomicCalendarViewProps {
  events: EconomicEvent[];
  nextCatalyst: CalendarCatalyst | null;
  searchQuery: string;
  countdownSeconds: number;
}

type DayFilter = 'all' | 'today' | 'tomorrow' | 'week';
type ImpactFilter = 'ALL' | 'HIGH' | 'MED';
type CurrencyFilter = 'ALL' | 'USD' | 'IDR' | 'CNY' | 'EUR' | 'JPY';

function formatCountdown(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const EconomicCalendarView: React.FC<EconomicCalendarViewProps> = ({
  events,
  nextCatalyst,
  searchQuery,
  countdownSeconds,
}) => {
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL');
  const [exportNotice, setExportNotice] = useState(false);
  const [alertSet, setAlertSet] = useState<boolean>(() => {
    try {
      return localStorage.getItem('stocks-catalyst-alert') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAlert = () => {
    setAlertSet((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stocks-catalyst-alert', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    []
  );
  const tomorrowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        month: 'short',
        day: 'numeric',
      }).format(new Date(Date.now() + 86400_000)),
    []
  );

  // Include both High and Mid-impact macroeconomic releases
  const marketImpactEvents = useMemo(
    () => events.filter((ev) => ev.impact === 'HIGH' || ev.impact === 'MED'),
    [events]
  );

  const impactCounts = useMemo(
    () => ({
      all: marketImpactEvents.length,
      high: marketImpactEvents.filter((e) => e.impact === 'HIGH').length,
      med: marketImpactEvents.filter((e) => e.impact === 'MED').length,
    }),
    [marketImpactEvents]
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return marketImpactEvents.filter((ev) => {
      const matchDay = dayFilter === 'all' || dayFilter === 'week' ? true : ev.day === dayFilter;
      const matchImpact = impactFilter === 'ALL' || ev.impact === impactFilter;
      const matchCur = currencyFilter === 'ALL' || ev.currency === currencyFilter;
      const matchSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.currency.toLowerCase().includes(q);
      return matchDay && matchImpact && matchCur && matchSearch;
    });
  }, [marketImpactEvents, dayFilter, impactFilter, currencyFilter, searchQuery]);

  const handleExportCsv = () => {
    const header = 'TimeWIB,Currency,Impact,Event,Actual,Forecast,Previous,Deviation\n';
    const rows = filteredEvents
      .map(
        (e) =>
          `"${e.timeWib}",${e.currency},${e.impact},"${e.title}","${e.actual}","${e.forecast}","${e.previous}","${e.deviationLabel}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-impact-macro-calendar-wib.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(true);
    window.setTimeout(() => setExportNotice(false), 2500);
  };

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 flex flex-col gap-5">
      {/* Header matching Market section Calendar styling */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#16803C] dark:text-[#30D158]" />
            <span className="text-xs font-bold text-[#16803C] dark:text-[#30D158] uppercase tracking-wider">
              High &amp; Mid-Impact Macro Releases
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white mt-1">
            Forex &amp; Macro Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
            High &amp; mid-impact macroeconomic data releases timed in WIB (Asia/Jakarta UTC+7)
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="min-h-[38px] px-4 py-1.5 rounded-xl liquid-glass-pill hover:brightness-95 dark:hover:brightness-110 text-xs font-semibold text-[#1C1C1E] dark:text-white transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exportNotice ? 'CSV Exported' : 'Export CSV'}</span>
        </button>
      </div>

      {/* Market-Section Style High Impact Countdown Banner */}
      <section className="p-4 sm:p-5 rounded-2xl liquid-glass-card !border-[#0071E3]/30 dark:!border-[#3898FF]/35 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#0071E3] dark:text-[#0A84FF] block">
            Next Market-Moving Macro Catalyst
          </span>
          <h2 className="text-base sm:text-xl font-extrabold text-[#1C1C1E] dark:text-white mt-0.5">
            {nextCatalyst
              ? `${nextCatalyst.currency} · ${nextCatalyst.title}`
              : 'Upcoming Macro Data Release'}
          </h2>
          <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
            {nextCatalyst
              ? `${nextCatalyst.description} · ${nextCatalyst.timeWib} WIB`
              : 'Live High & Mid-Impact Economic Calendar Feed · Timed in Asia/Jakarta (WIB)'}
          </p>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#0071E3]/20 dark:border-[#0A84FF]/25 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/60 font-mono text-sm sm:text-base font-extrabold text-[#16803C] dark:text-[#30D158] tabular-nums border border-[#E5E5EA] dark:border-[#2C2C2E]">
            {formatCountdown(countdownSeconds)}
          </div>

          <button
            type="button"
            onClick={handleToggleAlert}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              alertSet
                ? 'bg-[#30D158] text-black'
                : 'bg-[#0071E3] dark:bg-[#0A84FF] text-white hover:opacity-90'
            }`}
          >
            {alertSet ? (
              <>
                <BellRing className="w-3.5 h-3.5" />
                <span>Alert Active</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>Set Alert</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Filter Bar matching Market section controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="inline-flex rounded-xl liquid-glass-pill p-1 overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                { id: 'all', label: 'All Days' },
                { id: 'today', label: `Today (${todayLabel})` },
                { id: 'tomorrow', label: `Tomorrow (${tomorrowLabel})` },
                { id: 'week', label: 'This Week' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDayFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  dayFilter === t.id
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                    : 'text-[#4A4D57] dark:text-[#B4B8C4] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl liquid-glass-pill p-1">
            {(
              [
                { id: 'ALL', label: `All Impact (${impactCounts.all})`, icon: null },
                { id: 'HIGH', label: `High (${impactCounts.high})`, icon: Flame },
                { id: 'MED', label: `Mid (${impactCounts.med})`, icon: Gauge },
              ] as const
            ).map((imp) => {
              const Icon = imp.icon;
              const active = impactFilter === imp.id;
              return (
                <button
                  key={imp.id}
                  type="button"
                  onClick={() => setImpactFilter(imp.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? imp.id === 'HIGH'
                        ? 'bg-[#D7261C] text-white shadow-sm'
                        : imp.id === 'MED'
                          ? 'bg-[#B25E09] text-white shadow-sm'
                          : 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-sm'
                      : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3 shrink-0" />}
                  <span>{imp.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#6C6C70] dark:text-[#8E8E93] font-medium">Currency:</span>
          <select
            aria-label="Filter by currency"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as CurrencyFilter)}
            className="bg-white dark:bg-[#1C1C1E] border border-[#D1D1D6] dark:border-[#2C2C2E] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1C1C1E] dark:text-white focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF]"
          >
            <option value="ALL">All Currencies</option>
            <option value="USD">USD (United States)</option>
            <option value="IDR">IDR (Indonesia)</option>
            <option value="CNY">CNY (China)</option>
            <option value="EUR">EUR (Eurozone)</option>
            <option value="JPY">JPY (Japan)</option>
          </select>
        </div>
      </div>

      {/* Market-Section Style Compact Macro Release Cards Grid (Mobile + Tablet) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
        {filteredEvents.map((ev, idx) => {
          const isHigh = ev.impact === 'HIGH';
          return (
            <motion.article
              key={ev.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
              className="p-4 rounded-2xl liquid-glass-card flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#6C6C70] dark:text-[#8E8E93]">
                  <span className="font-bold text-[#1C1C1E] dark:text-white">{ev.currency}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-mono">{ev.timeWib}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      isHigh
                        ? 'text-[#D7261C] dark:text-[#FF453A]'
                        : 'text-[#B25E09] dark:text-[#FF9F0A]'
                    }`}
                  >
                    {isHigh ? <Flame className="w-3 h-3" /> : <Gauge className="w-3 h-3" />}
                    {isHigh ? 'High Impact' : 'Mid Impact'}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    ev.deviationType === 'beat'
                      ? 'text-[#16803C] dark:text-[#30D158]'
                      : ev.deviationType === 'miss'
                        ? 'text-[#D7261C] dark:text-[#FF453A]'
                        : 'text-[#6C6C70] dark:text-[#8E8E93]'
                  }`}
                >
                  {ev.deviationLabel}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white">{ev.title}</h3>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
                  {ev.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#E5E5EA] dark:border-[#2C2C2E]/60 text-xs text-center font-mono tabular-nums">
                <div>
                  <span className="text-[9px] text-[#6C6C70] dark:text-[#8E8E93] block font-sans uppercase">
                    Actual
                  </span>
                  <span
                    className={`font-bold ${
                      ev.deviationType === 'beat'
                        ? 'text-[#16803C] dark:text-[#30D158]'
                        : ev.deviationType === 'miss'
                          ? 'text-[#D7261C] dark:text-[#FF453A]'
                          : 'text-[#1C1C1E] dark:text-white'
                    }`}
                  >
                    {ev.actual}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#6C6C70] dark:text-[#8E8E93] block font-sans uppercase">
                    Forecast
                  </span>
                  <span className="font-semibold text-[#1C1C1E] dark:text-[#E5E5EA]">
                    {ev.forecast}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#6C6C70] dark:text-[#8E8E93] block font-sans uppercase">
                    Prev
                  </span>
                  <span className="text-[#6C6C70] dark:text-[#8E8E93]">{ev.previous}</span>
                </div>
              </div>
            </motion.article>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-center text-xs text-[#6C6C70] dark:text-[#8E8E93] flex flex-col items-center gap-2">
            <span>No high or mid-impact macro releases match this filter window.</span>
            <button
              type="button"
              onClick={() => {
                setDayFilter('all');
                setImpactFilter('ALL');
                setCurrencyFilter('ALL');
              }}
              className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline"
            >
              Show All Market-Moving Releases
            </button>
          </div>
        )}
      </section>

      {/* Desktop High & Mid-Impact Macro Table (lg+) */}
      <section className="hidden lg:flex rounded-2xl liquid-glass-card overflow-hidden flex-col">
        <div className="p-4 border-b border-black/8 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#16803C] dark:text-[#30D158]" />
            <div>
              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Market-Moving Macroeconomic Releases
              </h2>
              <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                High &amp; Mid-impact macro data releases · Timed in WIB (UTC+7)
              </p>
            </div>
          </div>
          <span className="text-xs text-[#6C6C70] dark:text-[#8E8E93] font-medium tabular-nums">
            {filteredEvents.length} Macro Releases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-black/40 text-[#6C6C70] dark:text-[#8E8E93] font-semibold">
                <th className="py-3 px-4 w-32">Time (WIB)</th>
                <th className="py-3 px-3 w-20">Cur</th>
                <th className="py-3 px-3 w-24">Impact</th>
                <th className="py-3 px-4">Macro Release &amp; Market Scope</th>
                <th className="py-3 px-4 w-24 text-right">Actual</th>
                <th className="py-3 px-4 w-24 text-right">Forecast</th>
                <th className="py-3 px-4 w-24 text-right">Prev</th>
                <th className="py-3 px-4 w-32 text-center">Surprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]/40">
              {filteredEvents.map((ev) => {
                const isHigh = ev.impact === 'HIGH';
                return (
                  <tr
                    key={ev.id}
                    className="hover:bg-[#E5E5EA]/40 dark:hover:bg-[#2C2C2E]/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#1C1C1E] dark:text-white tabular-nums font-mono">
                      {ev.timeWib}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#1C1C1E] dark:text-white">
                      {ev.currency}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isHigh
                            ? 'bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A]'
                            : 'bg-[#FF9F0A]/15 text-[#B25E09] dark:text-[#FF9F0A]'
                        }`}
                      >
                        {isHigh ? <Flame className="w-3 h-3" /> : <Gauge className="w-3 h-3" />}
                        {isHigh ? 'High' : 'Mid'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#1C1C1E] dark:text-white text-sm">
                        {ev.title}
                      </p>
                      <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
                        {ev.description}
                      </p>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-bold tabular-nums font-mono text-sm ${
                        ev.deviationType === 'beat'
                          ? 'text-[#16803C] dark:text-[#30D158]'
                          : ev.deviationType === 'miss'
                            ? 'text-[#D7261C] dark:text-[#FF453A]'
                            : 'text-[#1C1C1E] dark:text-white'
                      }`}
                    >
                      {ev.actual}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#1C1C1E] dark:text-[#E5E5EA] tabular-nums font-mono">
                      {ev.forecast}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#6C6C70] dark:text-[#8E8E93] tabular-nums font-mono">
                      {ev.previous}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          ev.deviationType === 'beat'
                            ? 'bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158]'
                            : ev.deviationType === 'miss'
                              ? 'bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A]'
                              : 'bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#6C6C70] dark:text-[#8E8E93]'
                        }`}
                      >
                        {ev.deviationLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="p-8 text-center text-xs text-[#6C6C70] dark:text-[#8E8E93] flex flex-col items-center gap-2">
            <span>No high or mid-impact macroeconomic releases match the selected filters.</span>
            <button
              type="button"
              onClick={() => {
                setDayFilter('all');
                setImpactFilter('ALL');
                setCurrencyFilter('ALL');
              }}
              className="text-[#0071E3] dark:text-[#0A84FF] font-semibold hover:underline"
            >
              Show All Market-Moving Releases
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
