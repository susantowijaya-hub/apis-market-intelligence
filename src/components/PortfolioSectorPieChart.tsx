import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { PieChart as PieChartIcon, Plus } from 'lucide-react';
import { CurrencyCode, PortfolioAssetCategory, ThemeMode } from '../types/market';

export interface SectorPieHoldingInput {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  category: PortfolioAssetCategory;
  marketValue: number;
  dayChangePct: number;
}

interface PortfolioSectorPieChartProps {
  holdings: SectorPieHoldingInput[];
  displayCurrency: CurrencyCode;
  formatMoney: (amount: number, currency: CurrencyCode, compact?: boolean) => string;
  themeMode?: ThemeMode;
  onInspectSymbol?: (yahooSymbol: string) => void;
  onAddHolding?: () => void;
}

type BreakdownMode = 'sector' | 'asset-class';

interface SectorSliceData {
  key: string;
  label: string;
  value: number;
  pct: number;
  weightedDayPct: number;
  color: string;
  monoPattern?: string;
  holdingsCount: number;
  symbols: Array<{ symbol: string; yahooSymbol: string; pct: number }>;
}

const INDEX_ETF_SYMBOLS = new Set([
  '^GSPC',
  '^IXIC',
  '^DJI',
  '^JKSE',
  '^HSI',
  '^TWII',
  '^KS11',
  '000001.SS',
  '^NSEI',
  'EIDO',
  'SPY',
  'QQQ',
  'VOO',
  'VTI',
  'IVV',
  'DIA',
  'IWM',
  'EEM',
  'VT',
  'VXUS',
  'VWO',
  'SCHD',
  'JEPI',
  'LQ45.JK',
  'IDX30.JK',
  'SPX',
  'IXIC',
  'DJI',
  'IHSG',
]);

const FINANCIALS_SYMBOLS = new Set([
  'BBCA.JK',
  'BBRI.JK',
  'BMRI.JK',
  'BBNI.JK',
  'BRIS.JK',
  'BBTN.JK',
  'BNGA.JK',
  'ARTO.JK',
  'JPM',
  'BAC',
  'WFC',
  'GS',
  'MS',
  'C',
  'V',
  'MA',
  'AXP',
  'BLK',
  'BRK-B',
  'BRK-A',
  'SCHW',
]);

const TECH_SYMBOLS = new Set([
  'NVDA',
  'AAPL',
  'MSFT',
  'GOOG',
  'GOOGL',
  'META',
  'AVGO',
  'AMD',
  'TSM',
  'ORCL',
  'CRM',
  'ADBE',
  'INTC',
  'QCOM',
  'TXN',
  'NFLX',
  'PLTR',
  'ARM',
  'SNOW',
  'GOTO.JK',
  'BUKA.JK',
  'DCII.JK',
  'EMTK.JK',
]);

const ENERGY_MATERIALS_SYMBOLS = new Set([
  'UNTR.JK',
  'ADRO.JK',
  'PTBA.JK',
  'ITMG.JK',
  'BYAN.JK',
  'AMMN.JK',
  'ANTM.JK',
  'MDKA.JK',
  'INCO.JK',
  'ASII.JK',
  'PGAS.JK',
  'MEDC.JK',
  'BRPT.JK',
  'TPIA.JK',
  'MBMA.JK',
  'NCKL.JK',
  'PGEO.JK',
  'XOM',
  'CVX',
  'COP',
  'SLB',
  'CAT',
  'DE',
  'BA',
  'GE',
  'LIN',
  'FCX',
]);

const CONSUMER_TELECOM_SYMBOLS = new Set([
  'TLKM.JK',
  'ISAT.JK',
  'EXCL.JK',
  'ICBP.JK',
  'INDF.JK',
  'UNVR.JK',
  'AMRT.JK',
  'MAPI.JK',
  'MYOR.JK',
  'CPIN.JK',
  'JPFA.JK',
  'HMSP.JK',
  'GGRM.JK',
  'AMZN',
  'TSLA',
  'WMT',
  'COST',
  'HD',
  'PG',
  'KO',
  'PEP',
  'MCD',
  'NKE',
  'SBUX',
  'TMUS',
  'VZ',
  'T',
  'DIS',
]);

const HEALTHCARE_SYMBOLS = new Set([
  'KLBF.JK',
  'MIKA.JK',
  'HEAL.JK',
  'SILO.JK',
  'SIDO.JK',
  'LLY',
  'UNH',
  'JNJ',
  'ABBV',
  'MRK',
  'PFE',
  'TMO',
  'AMGN',
  'ISRG',
]);

const SECTOR_PALETTE: Record<string, string> = {
  'Indices & ETFs': '#0EA5E9',
  'Financials & Banking': '#2563EB',
  'Technology & AI': '#6366F1',
  'Energy & Materials': '#D97706',
  'Consumer & Telecom': '#EC4899',
  Healthcare: '#14B8A6',
  'Crypto & Digital': '#F59E0B',
  'Commodities & Gold': '#10B981',
  'Cash, FX & Bonds': '#8B5CF6',
  'Individual Equities': '#3B82F6',
  'Global Equities': '#64748B',
  Crypto: '#F59E0B',
  Commodities: '#10B981',
  'Cash & FX': '#8B5CF6',
};

const FALLBACK_COLORS = [
  '#0EA5E9',
  '#2563EB',
  '#10B981',
  '#D97706',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#64748B',
];

const MONO_SHADES = [
  '#1C1C1E',
  '#4B5563',
  '#6B7280',
  '#9CA3AF',
  '#374151',
  '#D1D5DB',
];

function classifyHoldingSector(
  h: SectorPieHoldingInput,
  mode: BreakdownMode
): string {
  const sym = h.yahooSymbol.toUpperCase();
  const baseSym = h.symbol.toUpperCase();
  const upperName = h.name.toUpperCase();

  const isIndexOrEtf =
    INDEX_ETF_SYMBOLS.has(sym) ||
    INDEX_ETF_SYMBOLS.has(baseSym) ||
    sym.startsWith('^') ||
    upperName.includes('ETF') ||
    upperName.includes('INDEX') ||
    upperName.includes('COMPOSITE');

  if (mode === 'asset-class') {
    if (isIndexOrEtf) return 'Indices & ETFs';
    if (h.category === 'Equities') return 'Individual Equities';
    return h.category;
  }

  if (isIndexOrEtf) return 'Indices & ETFs';
  if (h.category === 'Crypto' || sym.endsWith('-USD')) return 'Crypto & Digital';
  if (
    h.category === 'Commodities' ||
    sym.endsWith('=F') ||
    sym.includes('XAU')
  ) {
    return 'Commodities & Gold';
  }
  if (
    h.category === 'Cash & FX' ||
    sym.endsWith('=X') ||
    sym === '^TNX' ||
    sym === '^TYX'
  ) {
    return 'Cash, FX & Bonds';
  }

  if (FINANCIALS_SYMBOLS.has(sym) || FINANCIALS_SYMBOLS.has(baseSym) || upperName.includes('BANK')) {
    return 'Financials & Banking';
  }
  if (TECH_SYMBOLS.has(sym) || TECH_SYMBOLS.has(baseSym)) {
    return 'Technology & AI';
  }
  if (ENERGY_MATERIALS_SYMBOLS.has(sym) || ENERGY_MATERIALS_SYMBOLS.has(baseSym)) {
    return 'Energy & Materials';
  }
  if (CONSUMER_TELECOM_SYMBOLS.has(sym) || CONSUMER_TELECOM_SYMBOLS.has(baseSym)) {
    return 'Consumer & Telecom';
  }
  if (HEALTHCARE_SYMBOLS.has(sym) || HEALTHCARE_SYMBOLS.has(baseSym)) {
    return 'Healthcare';
  }
  return 'Global Equities';
}

export const PortfolioSectorPieChart: React.FC<PortfolioSectorPieChartProps> = ({
  holdings,
  displayCurrency,
  formatMoney,
  themeMode = 'arctic',
  onInspectSymbol,
  onAddHolding,
}) => {
  const [mode, setMode] = useState<BreakdownMode>('sector');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const slices = useMemo<SectorSliceData[]>(() => {
    const validHoldings = holdings.filter((h) => h.marketValue > 0);
    const total = validHoldings.reduce((sum, h) => sum + h.marketValue, 0);
    if (total <= 0) return [];

    const grouped = new Map<
      string,
      {
        value: number;
        weightedDayNumerator: number;
        items: SectorPieHoldingInput[];
      }
    >();

    for (const h of validHoldings) {
      const bucket = classifyHoldingSector(h, mode);
      const curr = grouped.get(bucket) ?? {
        value: 0,
        weightedDayNumerator: 0,
        items: [],
      };
      curr.value += h.marketValue;
      curr.weightedDayNumerator += h.marketValue * h.dayChangePct;
      curr.items.push(h);
      grouped.set(bucket, curr);
    }

    const sorted = Array.from(grouped.entries()).sort(
      (a, b) => b[1].value - a[1].value
    );

    return sorted.map(([label, bucket], idx) => ({
      key: label,
      label,
      value: bucket.value,
      pct: (bucket.value / total) * 100,
      weightedDayPct:
        bucket.value > 0 ? bucket.weightedDayNumerator / bucket.value : 0,
      color: SECTOR_PALETTE[label] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      holdingsCount: bucket.items.length,
      symbols: [...bucket.items]
        .sort((a, b) => b.marketValue - a.marketValue)
        .map((item) => ({
          symbol: item.symbol,
          yahooSymbol: item.yahooSymbol,
          pct: (item.marketValue / total) * 100,
        })),
    }));
  }, [holdings, mode, themeMode]);

  const totalValue = useMemo(
    () => slices.reduce((sum, s) => sum + s.value, 0),
    [slices]
  );

  // D3 Pie & Arc geometry
  const d3Arcs = useMemo(() => {
    if (slices.length === 0) return [];

    const pieGen = d3
      .pie<SectorSliceData>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(slices.length > 1 ? 0.025 : 0);

    const restArcGen = d3
      .arc<d3.PieArcDatum<SectorSliceData>>()
      .innerRadius(60)
      .outerRadius(94)
      .cornerRadius(4);

    const activeArcGen = d3
      .arc<d3.PieArcDatum<SectorSliceData>>()
      .innerRadius(58)
      .outerRadius(101)
      .cornerRadius(5);

    const pieData = pieGen(slices);
    return pieData.map((datum) => ({
      datum,
      restPath: restArcGen(datum) ?? '',
      activePath: activeArcGen(datum) ?? '',
    }));
  }, [slices]);

  const activeSlice = useMemo(
    () => slices.find((s) => s.key === activeKey) ?? null,
    [slices, activeKey]
  );

  return (
    <div className="rounded-3xl liquid-glass-card p-5 sm:p-6 flex flex-col gap-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/8 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#0071E3] dark:text-[#38BDF8]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1C1C1E] dark:text-white">
              Sector &amp; Asset Allocation
            </h2>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5">
            {mode === 'sector'
              ? 'Exposure across equity sectors, indices, crypto, commodities & cash'
              : 'Portfolio weight grouped across broad asset classes & index ETFs'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/6 border border-black/8 dark:border-white/10 shrink-0">
          {(
            [
              { id: 'sector', label: 'By Sector' },
              { id: 'asset-class', label: 'Asset Classes' },
            ] as const
          ).map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setActiveKey(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] shadow-xs'
                    : 'text-[#4A4D57] dark:text-[#9EB5C8] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {slices.length === 0 ? (
        <div className="py-6 flex flex-col items-center text-center gap-2.5">
          <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] max-w-sm">
            Add stocks, index ETFs, crypto, or commodities to visualize your D3 sector and asset-class exposure breakdown.
          </p>
          {onAddHolding && (
            <button
              type="button"
              onClick={onAddHolding}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold shadow-xs hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Add holding
            </button>
          )}
        </div>
      ) : (
        <>
          {/* D3 Donut Chart + Interactive Breakdown Legend */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* D3 SVG Donut */}
            <div className="relative w-[220px] h-[220px] shrink-0 flex items-center justify-center">
              <svg
                viewBox="-110 -110 220 220"
                className="w-full h-full overflow-visible"
                role="img"
                aria-label="Portfolio sector allocation pie chart"
              >
                {d3Arcs.map(({ datum, restPath, activePath }) => {
                  const isSelected = activeKey === datum.data.key;
                  const isDimmed = activeKey !== null && !isSelected;
                  return (
                    <path
                      key={datum.data.key}
                      d={isSelected ? activePath : restPath}
                      fill={datum.data.color}
                      fillOpacity={isDimmed ? 0.36 : 0.96}
                      stroke={
                        themeMode === 'obsidian'
                          ? '#0A0F18'
                          : themeMode === 'parchment'
                            ? '#FBF8F0'
                            : '#FFFFFF'
                      }
                      strokeWidth={isSelected ? 2 : 1.2}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveKey(datum.data.key)}
                      onMouseLeave={() => setActiveKey(null)}
                      onClick={() =>
                        setActiveKey((prev) =>
                          prev === datum.data.key ? null : datum.data.key
                        )
                      }
                    >
                      <title>
                        {`${datum.data.label}: ${datum.data.pct.toFixed(1)}% (${formatMoney(
                          datum.data.value,
                          displayCurrency,
                          true
                        )})`}
                      </title>
                    </path>
                  );
                })}
              </svg>

              {/* Center Interactive Metric Readout */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center px-6">
                {activeSlice ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] line-clamp-1 max-w-[106px]">
                      {activeSlice.label}
                    </span>
                    <span className="text-xl font-extrabold font-mono tabular-nums text-[#1C1C1E] dark:text-white leading-tight mt-0.5">
                      {activeSlice.pct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[#4A4D57] dark:text-[#C2D4E2] mt-0.5 truncate max-w-[108px]">
                      {formatMoney(activeSlice.value, displayCurrency, true)}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold tabular-nums ${
                        activeSlice.weightedDayPct >= 0
                          ? 'text-[#0F7033] dark:text-[#4ADE80]'
                          : 'text-[#C41C16] dark:text-[#FF6B63]'
                      }`}
                    >
                      {activeSlice.weightedDayPct >= 0 ? '+' : ''}
                      {activeSlice.weightedDayPct.toFixed(2)}% 1D
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8]">
                      {slices.length} {mode === 'sector' ? 'Sectors' : 'Classes'}
                    </span>
                    <span className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-[#1C1C1E] dark:text-white leading-tight mt-0.5 truncate max-w-[110px]">
                      {formatMoney(totalValue, displayCurrency, true)}
                    </span>
                    <span className="text-[10px] text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
                      Hover or tap slice
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Sector Legend List */}
            <div className="flex-1 w-full flex flex-col divide-y divide-black/6 dark:divide-white/8">
              {slices.map((slice) => {
                const isSelected = activeKey === slice.key;
                return (
                  <div
                    key={slice.key}
                    onMouseEnter={() => setActiveKey(slice.key)}
                    onMouseLeave={() => setActiveKey(null)}
                    onClick={() =>
                      setActiveKey((prev) =>
                        prev === slice.key ? null : slice.key
                      )
                    }
                    className={`py-2 px-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-black/5 dark:bg-white/8' : ''
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
                            {slice.label}
                          </span>
                          <span className="text-[10px] font-mono text-[#6C6C70] dark:text-[#8E8E93] shrink-0">
                            ({slice.holdingsCount})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-[#6C6C70] dark:text-[#9EB5C8] truncate">
                          {slice.symbols.slice(0, 3).map((sym, idx) => (
                            <React.Fragment key={sym.yahooSymbol}>
                              {idx > 0 && <span className="opacity-40">·</span>}
                              {onInspectSymbol ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInspectSymbol(sym.yahooSymbol);
                                  }}
                                  className="hover:text-[#0071E3] dark:hover:text-[#38BDF8] hover:underline font-semibold"
                                >
                                  {sym.symbol}
                                </button>
                              ) : (
                                <span>{sym.symbol}</span>
                              )}
                            </React.Fragment>
                          ))}
                          {slice.symbols.length > 3 && (
                            <span>+{slice.symbols.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="text-xs sm:text-sm font-extrabold text-[#1C1C1E] dark:text-white">
                        {slice.pct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-[#6C6C70] dark:text-[#9EB5C8]">
                        {formatMoney(slice.value, displayCurrency, true)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Portfolio Composition Summary Line */}
          <div className="pt-3 border-t border-black/8 dark:border-white/10 text-xs sm:text-sm text-[#6C6C70] dark:text-[#AEAEB2] leading-relaxed">
            <strong className="text-[#1C1C1E] dark:text-white">
              Exposure Summary:
            </strong>{' '}
            {slices[0].pct >= 99.5
              ? `100% of tracked capital is allocated to ${slices[0].label}. Adding uncorrelated assets (such as Index ETFs, Gold, or Sovereign FX) can reduce single-sector drawdown risk.`
              : `${slices[0].label} leads at ${slices[0].pct.toFixed(
                  1
                )}%, complemented by ${slices
                  .slice(1, 4)
                  .map((s) => `${s.label} (${s.pct.toFixed(1)}%)`)
                  .join(', ')}.`}
          </div>
        </>
      )}
    </div>
  );
};
