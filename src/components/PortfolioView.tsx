import { apiUrl } from '../lib/api';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  BarChart2,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  FolderPlus,
  Loader2,
  MoreVertical,
  Newspaper,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CurrencyCode,
  MarketAsset,
  PortfolioAssetCategory,
  PortfolioGroup,
  PortfolioHolding,
  PortfolioMoverItem,
  PortfolioPurchaseLot,
  PortfolioQuoteItem,
  PortfolioTransaction,
  StockSearchResult,
  ThemeMode,
} from '../types/market';
import { computeTechnicalSignal } from '../utils/marketSignals';
import { GoogleFinanceDeltaPill } from './GoogleFinanceMiniChart';
import { AssetCategoryMiniIcon, BandarmologyBadge, SignalBadge } from './MarketUiPrimitives';
import { PortfolioSectorPieChart } from './PortfolioSectorPieChart';

interface PortfolioViewProps {
  assets: MarketAsset[];
  fxRates: Record<CurrencyCode, number>;
  searchQuery?: string;
  themeMode?: ThemeMode;
  onInspectSymbol?: (yahooSymbol: string) => void;
}

type PortfolioSubTab = 'holdings' | 'insights';
type PortfolioChartRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | 'MAX';

const STORAGE_KEY = 'stocks_gf_portfolio_state_v1';

interface StoredPortfolioState {
  portfolios: PortfolioGroup[];
  activePortfolioId: string;
  holdings: PortfolioHolding[];
  lots: PortfolioPurchaseLot[];
  transactions: PortfolioTransaction[];
}

const DEFAULT_STATE: StoredPortfolioState = {
  portfolios: [
    {
      id: 'default-saham',
      name: 'Saham',
      displayCurrency: 'IDR',
      createdAt: new Date().toISOString(),
    },
  ],
  activePortfolioId: 'default-saham',
  holdings: [],
  lots: [],
  transactions: [],
};

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function migratePortfolioLots(
  holdings: PortfolioHolding[],
  transactions: PortfolioTransaction[],
  existingLots: PortfolioPurchaseLot[]
): PortfolioPurchaseLot[] {
  const lots = [...existingLots];
  for (const h of holdings) {
    const matchingLots = lots.filter(
      (l) =>
        l.portfolioId === h.portfolioId &&
        l.yahooSymbol === h.yahooSymbol &&
        l.remainingUnits > 1e-6
    );
    if (matchingLots.length > 0) continue;

    // Try recovering lots from BUY transactions first
    const buys = transactions
      .filter(
        (t) =>
          t.portfolioId === h.portfolioId &&
          t.yahooSymbol === h.yahooSymbol &&
          t.type === 'BUY'
      )
      .sort((a, b) => Date.parse(a.dateIso) - Date.parse(b.dateIso));

    let remainingToAssign = h.units;
    const recovered: PortfolioPurchaseLot[] = [];

    if (buys.length > 0) {
      for (const b of buys) {
        if (remainingToAssign <= 1e-6) break;
        const alloc = Math.min(b.units, remainingToAssign);
        recovered.push({
          id: b.lotId || makeSafeId('lot'),
          portfolioId: h.portfolioId,
          symbol: h.symbol,
          yahooSymbol: h.yahooSymbol,
          name: h.name,
          category: h.category,
          currency: h.currency,
          units: b.units,
          remainingUnits: Number(alloc.toFixed(6)),
          pricePerUnit: b.pricePerUnit,
          purchaseDateIso: b.dateIso,
        });
        remainingToAssign = Number((remainingToAssign - alloc).toFixed(6));
      }
    }

    if (remainingToAssign > 1e-6) {
      recovered.push({
        id: makeSafeId('lot'),
        portfolioId: h.portfolioId,
        symbol: h.symbol,
        yahooSymbol: h.yahooSymbol,
        name: h.name,
        category: h.category,
        currency: h.currency,
        units: remainingToAssign,
        remainingUnits: remainingToAssign,
        pricePerUnit: h.avgCost,
        purchaseDateIso: h.createdAt || new Date().toISOString(),
      });
    }

    lots.push(...recovered);
  }
  return lots;
}

function recomputeHoldingsFromLots(
  holdings: PortfolioHolding[],
  lots: PortfolioPurchaseLot[]
): { holdings: PortfolioHolding[]; removedIds: string[] } {
  const removedIds: string[] = [];
  const nextHoldings: PortfolioHolding[] = [];

  for (const h of holdings) {
    const activeLots = lots.filter(
      (l) =>
        l.portfolioId === h.portfolioId &&
        l.yahooSymbol === h.yahooSymbol &&
        l.remainingUnits > 1e-6
    );
    const totalUnits = activeLots.reduce((acc, l) => acc + l.remainingUnits, 0);
    if (totalUnits <= 1e-6) {
      removedIds.push(h.id);
      continue;
    }
    const weightedCost =
      activeLots.reduce((acc, l) => acc + l.remainingUnits * l.pricePerUnit, 0) /
      totalUnits;
    nextHoldings.push({
      ...h,
      units: Number(totalUnits.toFixed(6)),
      avgCost: Number(weightedCost.toFixed(4)),
    });
  }

  return { holdings: nextHoldings, removedIds };
}

function loadInitialPortfolioState(): StoredPortfolioState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<StoredPortfolioState>;
    const portfolios =
      Array.isArray(parsed.portfolios) && parsed.portfolios.length > 0
        ? parsed.portfolios
        : DEFAULT_STATE.portfolios;
    const activeId =
      typeof parsed.activePortfolioId === 'string' &&
      portfolios.some((p) => p.id === parsed.activePortfolioId)
        ? parsed.activePortfolioId
        : portfolios[0].id;
    const holdings = Array.isArray(parsed.holdings) ? parsed.holdings : [];
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const existingLots = Array.isArray(parsed.lots) ? parsed.lots : [];
    const lots = migratePortfolioLots(holdings, transactions, existingLots);
    return {
      portfolios,
      activePortfolioId: activeId,
      holdings,
      lots,
      transactions,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

const CURRENCY_SYMBOL_MAP: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  CNY: '¥',
  SGD: 'S$',
  IDR: 'Rp ',
};

function formatMoney(amount: number, currency: CurrencyCode, compact = false): string {
  if (!Number.isFinite(amount)) return '—';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (currency === 'IDR') {
    if (compact) {
      if (abs >= 1e9) return `${sign}IDR ${(abs / 1e9).toFixed(2)}b`;
      if (abs >= 1e6) return `${sign}IDR ${(abs / 1e6).toFixed(2)}m`;
      return `${sign}Rp ${Math.round(abs).toLocaleString('en-US')}`;
    }
    return `${sign}Rp ${abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  const sym = CURRENCY_SYMBOL_MAP[currency] ?? `${currency} `;
  if (compact && abs >= 1e6) {
    return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`;
  }
  const decimals = currency === 'JPY' ? 0 : 2;
  return `${sign}${sym}${abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatUnitPrice(amount: number, currency: 'IDR' | 'USD'): string {
  if (currency === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('en-US')}`;
  }
  const decimals = amount < 2 ? 4 : 2;
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function toInputDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return new Date().toISOString().slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

const QUICK_POPULAR_PICKS: StockSearchResult[] = [
  { symbol: 'UNTR', yahooSymbol: 'UNTR.JK', name: 'United Tractors Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'BBCA', yahooSymbol: 'BBCA.JK', name: 'Bank Central Asia Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'BBRI', yahooSymbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'BMRI', yahooSymbol: 'BMRI.JK', name: 'Bank Mandiri Tbk PT', exchange: 'IDX', typeDisp: 'Equity', currency: 'IDR', category: 'Equities' },
  { symbol: 'NVDA', yahooSymbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', typeDisp: 'Equity', currency: 'USD', category: 'Equities' },
  { symbol: 'AAPL', yahooSymbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', typeDisp: 'Equity', currency: 'USD', category: 'Equities' },
  { symbol: 'BTC-USD', yahooSymbol: 'BTC-USD', name: 'Bitcoin USD', exchange: 'CRYPTO', typeDisp: 'Cryptocurrency', currency: 'USD', category: 'Crypto' },
  { symbol: 'GC=F', yahooSymbol: 'GC=F', name: 'Gold Spot Futures', exchange: 'COMEX', typeDisp: 'Commodity', currency: 'USD', category: 'Commodities' },
];

const CATEGORY_COLORS: Record<PortfolioAssetCategory, string> = {
  Equities: '#F2B863',
  Crypto: '#60A5FA',
  Commodities: '#34D399',
  'Cash & FX': '#A78BFA',
};

const PORTFOLIO_RANGES: PortfolioChartRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', 'MAX'];

/* -------------------- Treemap Layout Helper -------------------- */
interface TreemapInputItem {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  value: number;
  weightPct: number;
  dayChangePct: number;
}

interface TreemapRect extends TreemapInputItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

function buildTreemapRects(items: TreemapInputItem[]): TreemapRect[] {
  const valid = items
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  if (valid.length === 0) return [];

  const rects: TreemapRect[] = [];

  const splitSlice = (
    subset: TreemapInputItem[],
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    if (subset.length === 0 || w <= 0 || h <= 0) return;
    if (subset.length === 1) {
      rects.push({ ...subset[0], x, y, w, h });
      return;
    }

    const total = subset.reduce((s, item) => s + item.value, 0);
    // Find balanced split near half of subset total value for near-square aspect ratios
    let acc = 0;
    let splitIdx = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < subset.length; i++) {
      acc += subset[i - 1].value;
      const diff = Math.abs(acc / total - 0.5);
      if (diff < bestDiff) {
        bestDiff = diff;
        splitIdx = i;
      }
    }

    const firstHalf = subset.slice(0, splitIdx);
    const secondHalf = subset.slice(splitIdx);
    const firstRatio =
      firstHalf.reduce((s, item) => s + item.value, 0) / Math.max(total, 1e-9);

    if (w >= h) {
      const w1 = w * firstRatio;
      splitSlice(firstHalf, x, y, w1, h);
      splitSlice(secondHalf, x + w1, y, w - w1, h);
    } else {
      const h1 = h * firstRatio;
      splitSlice(firstHalf, x, y, w, h1);
      splitSlice(secondHalf, x, y + h1, w, h - h1);
    }
  };

  splitSlice(valid, 0, 0, 100, 100);
  return rects;
}

function getTreemapTileColor(dayChangePct: number): string {
  if (Math.abs(dayChangePct) < 0.05) return '#3C4043';
  if (dayChangePct >= 3) return '#137333';
  if (dayChangePct >= 1) return '#188038';
  if (dayChangePct > 0) return '#2B8A4E';
  if (dayChangePct <= -3) return '#991B1B';
  if (dayChangePct <= -1) return '#C5221F';
  return '#B33939';
}

/* -------------------- Swipeable Holding Row -------------------- */
interface SwipeableHoldingRowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEditHolding: () => void;
  onDeleteHolding: () => void;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

const SWIPE_ACTION_WIDTH = 104;

const SwipeableHoldingRow: React.FC<SwipeableHoldingRowProps> = ({
  isOpen,
  onOpenChange,
  onEditHolding,
  onDeleteHolding,
  onToggleExpand,
  children,
}) => {
  const [dragX, setDragX] = useState<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const horizontalLockedRef = useRef<boolean | null>(null);
  const movedRef = useRef(false);

  const offset = dragX !== null ? dragX : isOpen ? -SWIPE_ACTION_WIDTH : 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    draggingRef.current = true;
    horizontalLockedRef.current = null;
    movedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;

    if (horizontalLockedRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        horizontalLockedRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }
    if (!horizontalLockedRef.current) return;

    movedRef.current = true;
    const base = isOpen ? -SWIPE_ACTION_WIDTH : 0;
    const next = Math.max(-SWIPE_ACTION_WIDTH - 12, Math.min(0, base + dx));
    setDragX(next);
  };

  const handleTouchEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragX !== null) {
      onOpenChange(dragX <= -48);
      setDragX(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if ((e.target as HTMLElement).closest('button')) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    draggingRef.current = true;
    movedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !draggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 10) {
      movedRef.current = true;
      const base = isOpen ? -SWIPE_ACTION_WIDTH : 0;
      const next = Math.max(-SWIPE_ACTION_WIDTH - 12, Math.min(0, base + dx));
      setDragX(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !draggingRef.current) return;
    draggingRef.current = false;
    if (dragX !== null) {
      onOpenChange(dragX <= -48);
      setDragX(null);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (isOpen) {
      onOpenChange(false);
      return;
    }
    onToggleExpand();
  };

  return (
    <div data-no-view-swipe="true" className="relative overflow-hidden group touch-pan-y">
      {/* Revealed Swipe Action Tray (Right Side) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-3 bg-[#F2F2F7] dark:bg-[#141416]"
        style={{ width: `${SWIPE_ACTION_WIDTH}px` }}
        aria-hidden={!isOpen && dragX === null}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
            onEditHolding();
          }}
          className="w-9 h-9 rounded-full bg-[#0071E3] dark:bg-[#8AB4F8] text-white dark:text-[#0B1F3A] flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
          title="Edit holding"
          aria-label="Edit holding"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
            onDeleteHolding();
          }}
          className="w-9 h-9 rounded-full bg-[#D7261C] dark:bg-[#F28B82] text-white dark:text-[#3C0D0B] flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
          title="Delete holding"
          aria-label="Delete holding"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Foreground Row Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleRowClick}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragX !== null ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="relative z-10 bg-white dark:bg-[#1C1C1E]"
      >
        {children}
      </div>
    </div>
  );
};

/* ==================== Main PortfolioView ==================== */
export const PortfolioView: React.FC<PortfolioViewProps> = ({
  assets,
  fxRates,
  searchQuery = '',
  themeMode = 'arctic',
  onInspectSymbol,
}) => {
  const chartUid = useId().replace(/:/g, '');

  const [state, setState] = useState<StoredPortfolioState>(loadInitialPortfolioState);
  const [subTab, setSubTab] = useState<PortfolioSubTab>('holdings');
  const [chartRange, setChartRange] = useState<PortfolioChartRange>('1D');
  const [expandedHoldingId, setExpandedHoldingId] = useState<string | null>(null);
  const [swipedHoldingId, setSwipedHoldingId] = useState<string | null>(null);
  const [openLotMenuId, setOpenLotMenuId] = useState<string | null>(null);

  // Live quotes keyed by yahooSymbol
  const [liveQuotes, setLiveQuotes] = useState<Record<string, PortfolioQuoteItem>>({});
  const [chartSeriesMap, setChartSeriesMap] = useState<
    Record<string, { points: number[]; timestamps: number[]; prevClose: number }>
  >({});
  const [lastFeedUpdatedAt, setLastFeedUpdatedAt] = useState<number>(() => Date.now());
  const quotesInFlightRef = useRef(false);

  // Daily movers analysis for Insights tab
  const [dailyMovers, setDailyMovers] = useState<PortfolioMoverItem[]>([]);
  const [moversLoading, setMoversLoading] = useState(false);

  // Modals / Drawers state
  const [showAddModal, setShowAddModal] = useState(false);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolioName, setEditingPortfolioName] = useState('');
  const [editingPortfolioCurrency, setEditingPortfolioCurrency] = useState<CurrencyCode>('IDR');
  const [confirmDeletePortfolio, setConfirmDeletePortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioCurrency, setNewPortfolioCurrency] = useState<CurrencyCode>('IDR');

  // Edit Holding Modal (multi-lot editor)
  const [editingHoldingTarget, setEditingHoldingTarget] = useState<PortfolioHolding | null>(null);
  const [lotDrafts, setLotDrafts] = useState<
    Array<{ id: string; units: string; price: string; date: string }>
  >([]);
  const [editHoldingError, setEditHoldingError] = useState<string | null>(null);

  // Edit Single Purchase Lot Modal
  const [editingLot, setEditingLot] = useState<PortfolioPurchaseLot | null>(null);
  const [editLotUnits, setEditLotUnits] = useState('');
  const [editLotPrice, setEditLotPrice] = useState('');
  const [editLotDate, setEditLotDate] = useState('');
  const [editLotError, setEditLotError] = useState<string | null>(null);

  // Record a Sale Modal (per lot or holding)
  const [saleLotTarget, setSaleLotTarget] = useState<PortfolioPurchaseLot | null>(null);
  const [saleAllChecked, setSaleAllChecked] = useState(false);
  const [saleUnitsInput, setSaleUnitsInput] = useState('');
  const [salePriceInput, setSalePriceInput] = useState('');
  const [saleDateInput, setSaleDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [saleError, setSaleError] = useState<string | null>(null);

  // Add Holding / Quick Trade Form State
  const [symbolSearch, setSymbolSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>(QUICK_POPULAR_PICKS);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<StockSearchResult | null>(null);
  const [unitsInput, setUnitsInput] = useState('100');
  const [priceInput, setPriceInput] = useState('');
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [fetchingSelectedQuote, setFetchingSelectedQuote] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Portfolio interactive chart scrub
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  // Persist to localStorage automatically
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  // Close lot popover menu on outside click
  useEffect(() => {
    if (!openLotMenuId) return;
    const close = () => setOpenLotMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openLotMenuId]);

  const activePortfolio = useMemo(
    () => state.portfolios.find((p) => p.id === state.activePortfolioId) ?? state.portfolios[0],
    [state.portfolios, state.activePortfolioId]
  );

  const activeHoldings = useMemo(
    () => state.holdings.filter((h) => h.portfolioId === activePortfolio.id),
    [state.holdings, activePortfolio.id]
  );

  const activeTransactions = useMemo(
    () =>
      state.transactions
        .filter((t) => t.portfolioId === activePortfolio.id)
        .sort((a, b) => Date.parse(b.dateIso) - Date.parse(a.dateIso)),
    [state.transactions, activePortfolio.id]
  );

  const filteredHoldings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeHoldings;
    return activeHoldings.filter(
      (h) =>
        h.symbol.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        h.yahooSymbol.toLowerCase().includes(q)
    );
  }, [activeHoldings, searchQuery]);

  // Multi-currency FX conversion helper via USD base
  const convertAmount = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode): number => {
      if (from === to) return amount;
      const fromRate = fxRates[from];
      const toRate = fxRates[to];
      if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) return Number.NaN;
      const usdAmount = amount / fromRate;
      return usdAmount * toRate;
    },
    [fxRates]
  );

  const holdingYahooSymbols = useMemo(
    () => Array.from(new Set(activeHoldings.map((h) => h.yahooSymbol))).sort(),
    [activeHoldings]
  );
  const symbolsKey = holdingYahooSymbols.join(',');

  const fetchQuotesNow = useCallback(async (syms: string[]) => {
    if (syms.length === 0 || quotesInFlightRef.current) return;
    quotesInFlightRef.current = true;
    try {
      const res = await fetch(
        apiUrl(`/api/portfolio/quotes?symbols=${encodeURIComponent(syms.join(','))}`)
      );
      if (!res.ok) return;
      const data = (await res.json()) as { quotes?: PortfolioQuoteItem[] };
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setLiveQuotes((prev) => {
          const next = { ...prev };
          for (const q of data.quotes!) {
            next[q.yahooSymbol] = q;
          }
          return next;
        });
        const idxSnapshots = data.quotes
          .filter((q) => q.bandarmology && q.yahooSymbol.toUpperCase().endsWith('.JK'))
          .map((q) => ({
            symbol: q.symbol.replace(/\.JK$/i, '').toUpperCase(),
            name: q.name,
            price: q.price,
            prevClose: q.prevClose,
            changePercent: q.changePercent,
            bandarmology: q.bandarmology!,
          }));
        if (idxSnapshots.length > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('stocks:idx-bandar-quotes', {
              detail: { snapshots: idxSnapshots },
            })
          );
        }
        setLastFeedUpdatedAt(Date.now());
      }
    } catch {
      // retain existing quotes
    } finally {
      quotesInFlightRef.current = false;
    }
  }, []);

  const liveQuotesRef = useRef(liveQuotes);
  liveQuotesRef.current = liveQuotes;
  const holdingYahooSymbolsRef = useRef(holdingYahooSymbols);
  holdingYahooSymbolsRef.current = holdingYahooSymbols;

  useEffect(() => {
    const syms = holdingYahooSymbolsRef.current;
    if (syms.length === 0) return;
    void fetchQuotesNow(syms);

    let lastClosedCheck = 0;
    const timer = window.setInterval(() => {
      const currentSyms = holdingYahooSymbolsRef.current;
      if (currentSyms.length === 0) return;
      const anyOpen = currentSyms.some(
        (sym) => liveQuotesRef.current[sym]?.sessionOpen !== false
      );
      if (anyOpen) {
        void fetchQuotesNow(currentSyms);
      } else {
        const now = Date.now();
        if (now - lastClosedCheck >= 60_000) {
          lastClosedCheck = now;
          void fetchQuotesNow(currentSyms);
        }
      }
    }, 15 * 60_000);

    return () => window.clearInterval(timer);
  }, [symbolsKey, fetchQuotesNow]);

  const chartSeriesMapRef = useRef(chartSeriesMap);
  chartSeriesMapRef.current = chartSeriesMap;

  // Fetch historical chart series per holding for selected Portfolio Chart Range + 1M (for header 30D trend)
  useEffect(() => {
    if (holdingYahooSymbols.length === 0) return;
    let cancelled = false;

    const loadAllSeries = async () => {
      const timeframesToLoad = Array.from(new Set<PortfolioChartRange>([chartRange, '1M']));
      const requests: Array<
        Promise<{
          key: string;
          data: { points: number[]; timestamps: number[]; prevClose: number };
        } | null>
      > = [];

      for (const tf of timeframesToLoad) {
        for (const sym of holdingYahooSymbols) {
          const cacheKey = `${sym}:${tf}`;
          if (tf !== chartRange && chartSeriesMapRef.current[cacheKey]) {
            continue;
          }
          requests.push(
            (async () => {
              try {
                const res = await fetch(
                  apiUrl(`/api/portfolio/chart?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}`)
                );
                if (!res.ok) return null;
                const json = (await res.json()) as {
                  points: number[];
                  timestamps: number[];
                  prevClose: number;
                };
                return { key: cacheKey, data: json };
              } catch {
                return null;
              }
            })()
          );
        }
      }

      const entries = await Promise.all(requests);
      if (cancelled) return;
      setChartSeriesMap((prev) => {
        const next = { ...prev };
        for (const item of entries) {
          if (item) {
            next[item.key] = item.data;
          }
        }
        return next;
      });
    };

    void loadAllSeries();
    return () => {
      cancelled = true;
    };
  }, [symbolsKey, holdingYahooSymbols, chartRange]);

  // Fetch Daily Movers brief when Insights tab is opened
  const fetchMoversBrief = useCallback(async (syms: string[]) => {
    if (syms.length === 0) {
      setDailyMovers([]);
      return;
    }
    setMoversLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/portfolio/movers-brief?symbols=${encodeURIComponent(syms.join(','))}`)
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        items?: PortfolioMoverItem[];
        movers?: PortfolioMoverItem[];
      };
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.movers)
          ? data.movers
          : [];
      setDailyMovers(list);
    } catch {
      // ignore transient error
    } finally {
      setMoversLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab !== 'insights') return;
    void fetchMoversBrief(holdingYahooSymbols);
  }, [subTab, symbolsKey, holdingYahooSymbols, fetchMoversBrief]);

  // Portfolios are stored locally on this device; no account or remote database is used.

  // Live Symbol Search Handler
  useEffect(() => {
    if (!showAddModal) return;
    const trimmed = symbolSearch.trim();
    if (!trimmed) {
      setSearchResults(QUICK_POPULAR_PICKS);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/stocks/search?q=${encodeURIComponent(trimmed)}`));
        if (res.ok) {
          const data = (await res.json()) as { results?: StockSearchResult[] };
          if (Array.isArray(data.results)) {
            const query = trimmed.toLowerCase();
            setSearchResults(data.results.filter((item) => !query || [item.symbol, item.yahooSymbol, item.name].some((value) => value.toLowerCase().includes(query))).slice(0, 15));
          }
        }
      } catch {
        // retain current results
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [symbolSearch, showAddModal]);

  const handleSelectSymbolToAdd = async (item: StockSearchResult) => {
    setSelectedSymbol(item);
    setFormError(null);
    setFetchingSelectedQuote(true);
    try {
      const res = await fetch(
        apiUrl(`/api/portfolio/quotes?symbols=${encodeURIComponent(item.yahooSymbol)}`)
      );
      if (res.ok) {
        const data = (await res.json()) as { quotes?: PortfolioQuoteItem[] };
        const q = data.quotes?.find((quote) => quote.yahooSymbol === item.yahooSymbol);
        if (q) {
          setLiveQuotes((prev) => ({ ...prev, [q.yahooSymbol]: q }));
          setPriceInput(String(q.price));
          return;
        }
      }
    } catch {
      // user can still enter manual purchase price
    } finally {
      setFetchingSelectedQuote(false);
    }
  };

  // Enrich holdings + attach their active purchase lots
  const enrichedHoldings = useMemo(() => {
    const targetCurr = activePortfolio.displayCurrency;
    return filteredHoldings.map((h) => {
      const quote = liveQuotes[h.yahooSymbol];
      const matchedAsset = assets.find((a) => a.id === h.linkedAssetId || a.symbol === h.symbol);

      const liveNativePrice = quote?.price ?? matchedAsset?.price ?? h.avgCost;
      const prevNativeClose = quote?.prevClose ?? matchedAsset?.prevClose ?? liveNativePrice;

      const marketValue = convertAmount(h.units * liveNativePrice, h.currency, targetCurr);
      const prevCloseValue = convertAmount(h.units * prevNativeClose, h.currency, targetCurr);
      const costBasis = convertAmount(h.units * h.avgCost, h.currency, targetCurr);

      const dayChangeVal = marketValue - prevCloseValue;
      const dayChangePct = prevCloseValue > 0 ? (dayChangeVal / prevCloseValue) * 100 : 0;

      const totalReturnVal = marketValue - costBasis;
      const totalReturnPct = costBasis > 0 ? (totalReturnVal / costBasis) * 100 : 0;

      const holdingLots = state.lots
        .filter(
          (l) =>
            l.portfolioId === h.portfolioId &&
            l.yahooSymbol === h.yahooSymbol &&
            l.remainingUnits > 1e-6
        )
        .sort((a, b) => Date.parse(b.purchaseDateIso) - Date.parse(a.purchaseDateIso));

      const signal = computeTechnicalSignal({
        price: liveNativePrice,
        prevClose: prevNativeClose,
        changePercent: dayChangePct,
        dayHigh: quote?.dayHigh,
        dayLow: quote?.dayLow,
        series: quote?.chart1D,
        assetId: h.symbol,
        category: h.category,
      });

      return {
        ...h,
        lots: holdingLots,
        quote,
        bandarmology: quote?.bandarmology,
        liveNativePrice,
        prevNativeClose,
        marketValue,
        prevCloseValue,
        costBasis,
        dayChangeVal,
        dayChangePct,
        totalReturnVal,
        totalReturnPct,
        signal,
        sessionOpen: quote?.sessionOpen ?? matchedAsset?.marketSessionOpen ?? false,
        sessionStateLabel: quote?.sessionStateLabel ?? matchedAsset?.sessionStateLabel ?? 'Syncing',
      };
    });
  }, [filteredHoldings, state.lots, liveQuotes, assets, activePortfolio.displayCurrency, convertAmount]);

  const portfolioSignalTally = useMemo(() => {
    let bull = 0;
    let bear = 0;
    let idxAcc = 0;
    let idxDist = 0;
    let idxTotal = 0;
    for (const h of enrichedHoldings) {
      if (h.signal.direction === 'bull') bull += 1;
      else if (h.signal.direction === 'bear') bear += 1;
      if (h.currency === 'IDR' || h.yahooSymbol.toUpperCase().endsWith('.JK')) {
        idxTotal += 1;
        const ph = h.bandarmology?.phase;
        if (ph === 'Strong Accumulation' || ph === 'Early Accumulation') idxAcc += 1;
        else if (ph === 'Strong Distribution' || ph === 'Early Distribution') idxDist += 1;
      }
    }
    return { bull, bear, idxAcc, idxDist, idxTotal };
  }, [enrichedHoldings]);

  // Portfolio Summary Totals
  const summary = useMemo(() => {
    const totalValue = enrichedHoldings.reduce((acc, h) => acc + h.marketValue, 0);
    const totalPrevClose = enrichedHoldings.reduce((acc, h) => acc + h.prevCloseValue, 0);
    const totalCost = enrichedHoldings.reduce((acc, h) => acc + h.costBasis, 0);

    const dayDelta = totalValue - totalPrevClose;
    const dayPct = totalPrevClose > 0 ? (dayDelta / totalPrevClose) * 100 : 0;

    const totalReturn = totalValue - totalCost;
    const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    const anyOpen = enrichedHoldings.some((h) => h.sessionOpen);

    return {
      totalValue,
      totalPrevClose,
      totalCost,
      dayDelta,
      dayPct,
      totalReturn,
      totalReturnPct,
      anyOpen,
    };
  }, [enrichedHoldings]);

  // Build Aggregated Interactive Portfolio Value Curve
  const portfolioChartData = useMemo(() => {
    if (enrichedHoldings.length === 0) {
      return {
        points: [0, 0],
        timestamps: [Date.now() - 3600_000, Date.now()],
        prevClose: 0,
      };
    }

    const bucketCount = 36;
    const targetCurr = activePortfolio.displayCurrency;
    const points: number[] = new Array(bucketCount).fill(0);
    let timestamps: number[] = [];

    for (const h of enrichedHoldings) {
      const storedSeries = chartSeriesMap[`${h.yahooSymbol}:${chartRange}`];
      const rawPts =
        storedSeries?.points && storedSeries.points.length >= 2
          ? storedSeries.points
          : h.quote?.chart1D && h.quote.chart1D.length >= 2
            ? h.quote.chart1D
            : [h.prevNativeClose, h.liveNativePrice];

      if (timestamps.length === 0 && storedSeries?.timestamps?.length) {
        const tsArr = storedSeries.timestamps;
        timestamps = Array.from({ length: bucketCount }, (_, i) => {
          const idx = Math.min(
            tsArr.length - 1,
            Math.round((i / (bucketCount - 1)) * (tsArr.length - 1))
          );
          return tsArr[idx];
        });
      }

      for (let i = 0; i < bucketCount; i++) {
        const idx = Math.min(
          rawPts.length - 1,
          Math.round((i / (bucketCount - 1)) * (rawPts.length - 1))
        );
        const unitPrice = i === bucketCount - 1 ? h.liveNativePrice : rawPts[idx];
        points[i] += convertAmount(h.units * unitPrice, h.currency, targetCurr);
      }
    }

    if (timestamps.length === 0) {
      const now = Date.now();
      timestamps = Array.from({ length: bucketCount }, (_, i) =>
        now - (bucketCount - 1 - i) * 600_000
      );
    }

    const baseline =
      chartRange === '1D'
        ? summary.totalPrevClose
        : chartRange === 'MAX'
          ? summary.totalCost
          : points[0] || summary.totalPrevClose;

    return {
      points,
      timestamps,
      prevClose: baseline,
    };
  }, [
    enrichedHoldings,
    chartSeriesMap,
    chartRange,
    activePortfolio.displayCurrency,
    convertAmount,
    summary.totalPrevClose,
    summary.totalCost,
  ]);

  // Dedicated 30-Day Portfolio Value Trend Mini Line Chart for Portfolio Header
  const portfolio30DayTrend = useMemo(() => {
    if (enrichedHoldings.length === 0) return null;
    const bucketCount = 30;
    const targetCurr = activePortfolio.displayCurrency;
    const points: number[] = new Array(bucketCount).fill(0);
    let hasAny1M = false;

    for (const h of enrichedHoldings) {
      const stored1M = chartSeriesMap[`${h.yahooSymbol}:1M`];
      if (stored1M?.points && stored1M.points.length >= 2) {
        hasAny1M = true;
      }
      const rawPts =
        stored1M?.points && stored1M.points.length >= 2
          ? stored1M.points
          : h.quote?.chart1D && h.quote.chart1D.length >= 2
            ? h.quote.chart1D
            : [h.prevNativeClose, h.liveNativePrice];

      for (let i = 0; i < bucketCount; i++) {
        const idx = Math.min(
          rawPts.length - 1,
          Math.round((i / (bucketCount - 1)) * (rawPts.length - 1))
        );
        const unitPrice = i === bucketCount - 1 ? h.liveNativePrice : rawPts[idx];
        points[i] += convertAmount(h.units * unitPrice, h.currency, targetCurr);
      }
    }

    if (!hasAny1M) {
      return {
        ready: false as const,
        points: [] as number[],
        startVal: summary.totalValue,
        endVal: summary.totalValue,
        delta: 0,
        pct: 0,
        linePath: '',
        areaPath: '',
        baselineY: 22,
        lastPt: { x: 180, y: 22 },
      };
    }

    const startVal = points[0] || summary.totalValue;
    const endVal = summary.totalValue;
    const delta = endVal - startVal;
    const pct = startVal > 0 ? (delta / startVal) * 100 : 0;

    const w = 180;
    const h = 44;
    const padY = 5;
    const min = Math.min(...points, startVal);
    const max = Math.max(...points, startVal);
    const span = max - min || Math.max(Math.abs(startVal) * 0.01, 1);

    const coords = points.map((v, i) => ({
      x: (i / Math.max(points.length - 1, 1)) * w,
      y: padY + ((max - v) / span) * (h - padY * 2),
    }));
    const linePath = coords
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const baselineY = Math.max(
      4,
      Math.min(h - 4, padY + ((max - startVal) / span) * (h - padY * 2))
    );
    const lastPt = coords[coords.length - 1] ?? { x: w, y: h / 2 };
    const areaPath = `${linePath} L${lastPt.x.toFixed(1)},${h} L0,${h} Z`;

    return {
      ready: true as const,
      points,
      startVal,
      endVal,
      delta,
      pct,
      linePath,
      areaPath,
      baselineY,
      lastPt,
    };
  }, [
    enrichedHoldings,
    chartSeriesMap,
    activePortfolio.displayCurrency,
    convertAmount,
    summary.totalValue,
  ]);

  // Asset Allocation, Concentration, and Treemap Insights
  const insights = useMemo(() => {
    const total = summary.totalValue || 1;
    const byCategory = new Map<PortfolioAssetCategory, number>();
    for (const h of enrichedHoldings) {
      byCategory.set(h.category, (byCategory.get(h.category) ?? 0) + h.marketValue);
    }
    const allocation = Array.from(byCategory.entries())
      .map(([category, value]) => ({
        category,
        value,
        pct: (value / total) * 100,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.pct - a.pct);

    const concentration = [...enrichedHoldings]
      .map((h) => ({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        value: h.marketValue,
        pct: (h.marketValue / total) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);

    const treemapRects = buildTreemapRects(
      enrichedHoldings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        yahooSymbol: h.yahooSymbol,
        name: h.name,
        value: h.marketValue,
        weightPct: (h.marketValue / total) * 100,
        dayChangePct: h.dayChangePct,
      }))
    );

    return { allocation, concentration, treemapRects };
  }, [enrichedHoldings, summary.totalValue]);

  // Add Purchase / Sell Transaction Handler (Lot-aware!)
  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol) {
      setFormError('Select a ticker symbol first.');
      return;
    }
    const units = Number(unitsInput);
    const price = Number(priceInput);
    if (!Number.isFinite(units) || units <= 0) {
      setFormError('Enter a valid positive share/unit quantity.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Enter a valid positive execution price.');
      return;
    }

    const existing = state.holdings.find(
      (h) => h.portfolioId === activePortfolio.id && h.yahooSymbol === selectedSymbol.yahooSymbol
    );

    if (tradeMode === 'SELL') {
      if (!existing || existing.units < units) {
        setFormError(
          `Insufficient units to sell (${existing?.units ?? 0} ${selectedSymbol.symbol} held).`
        );
        return;
      }
    }

    const dateIso = new Date(`${dateInput}T10:00:00+07:00`).toISOString();
    const lotId = tradeMode === 'BUY' ? makeSafeId('lot') : undefined;
    const newTx: PortfolioTransaction = {
      id: makeSafeId('tx'),
      portfolioId: activePortfolio.id,
      lotId,
      symbol: selectedSymbol.symbol,
      yahooSymbol: selectedSymbol.yahooSymbol,
      name: selectedSymbol.name,
      type: tradeMode,
      units,
      pricePerUnit: price,
      currency: selectedSymbol.currency,
      dateIso,
    };

    let updatedHolding: PortfolioHolding | null = null;
    let deletedHoldingId: string | null = null;

    setState((prev) => {
      let nextHoldings = [...prev.holdings];
      let nextLots = [...prev.lots];

      if (tradeMode === 'BUY') {
        const newLot: PortfolioPurchaseLot = {
          id: lotId!,
          portfolioId: activePortfolio.id,
          symbol: selectedSymbol.symbol,
          yahooSymbol: selectedSymbol.yahooSymbol,
          name: selectedSymbol.name,
          category: selectedSymbol.category,
          currency: selectedSymbol.currency,
          units,
          remainingUnits: units,
          pricePerUnit: price,
          purchaseDateIso: dateIso,
        };
        nextLots.push(newLot);

        if (existing) {
          const totalUnits = existing.units + units;
          const nextAvg =
            (existing.units * existing.avgCost + units * price) / Math.max(totalUnits, 1e-9);
          updatedHolding = {
            ...existing,
            units: totalUnits,
            avgCost: Number(nextAvg.toFixed(4)),
          };
          nextHoldings = nextHoldings.map((h) => (h.id === existing.id ? updatedHolding! : h));
        } else {
          updatedHolding = {
            id: makeSafeId('pos'),
            portfolioId: activePortfolio.id,
            symbol: selectedSymbol.symbol,
            yahooSymbol: selectedSymbol.yahooSymbol,
            name: selectedSymbol.name,
            category: selectedSymbol.category,
            currency: selectedSymbol.currency,
            units,
            avgCost: price,
            createdAt: new Date().toISOString(),
          };
          nextHoldings.push(updatedHolding);
        }
      } else if (existing) {
        // FIFO deduction across lots
        let toSell = units;
        const holdingLotIds = nextLots
          .filter(
            (l) =>
              l.portfolioId === activePortfolio.id &&
              l.yahooSymbol === selectedSymbol.yahooSymbol &&
              l.remainingUnits > 1e-6
          )
          .sort((a, b) => Date.parse(a.purchaseDateIso) - Date.parse(b.purchaseDateIso));

        const dedMap = new Map<string, number>();
        for (const lot of holdingLotIds) {
          if (toSell <= 1e-6) break;
          const deduct = Math.min(lot.remainingUnits, toSell);
          dedMap.set(lot.id, Number((lot.remainingUnits - deduct).toFixed(6)));
          toSell = Number((toSell - deduct).toFixed(6));
        }

        nextLots = nextLots.map((l) =>
          dedMap.has(l.id) ? { ...l, remainingUnits: dedMap.get(l.id)! } : l
        );

        const recomputed = recomputeHoldingsFromLots(nextHoldings, nextLots);
        nextHoldings = recomputed.holdings;
        if (recomputed.removedIds.includes(existing.id)) {
          deletedHoldingId = existing.id;
        } else {
          updatedHolding = nextHoldings.find((h) => h.id === existing.id) ?? null;
        }
      }

      return {
        ...prev,
        holdings: nextHoldings,
        lots: nextLots,
        transactions: [newTx, ...prev.transactions],
      };
    });

    

    setShowAddModal(false);
    setSelectedSymbol(null);
    setSymbolSearch('');
    setFormError(null);
  };

  // Delete entire holding (Swipe-to-delete / Trash button)
  const handleRemoveHolding = (holding: PortfolioHolding) => {
    setState((prev) => ({
      ...prev,
      holdings: prev.holdings.filter((h) => h.id !== holding.id),
      lots: prev.lots.filter(
        (l) => !(l.portfolioId === holding.portfolioId && l.yahooSymbol === holding.yahooSymbol)
      ),
    }));
    if (expandedHoldingId === holding.id) setExpandedHoldingId(null);
    
  };

  // Open Edit Holding Modal (Swipe Blue Pencil / Desktop Pencil)
  const handleOpenEditHolding = (
    holding: PortfolioHolding & { lots: PortfolioPurchaseLot[]; liveNativePrice: number }
  ) => {
    const activeLots = holding.lots.length > 0
      ? holding.lots
      : [
          {
            id: makeSafeId('lot'),
            portfolioId: holding.portfolioId,
            symbol: holding.symbol,
            yahooSymbol: holding.yahooSymbol,
            name: holding.name,
            category: holding.category,
            currency: holding.currency,
            units: holding.units,
            remainingUnits: holding.units,
            pricePerUnit: holding.avgCost,
            purchaseDateIso: holding.createdAt || new Date().toISOString(),
          },
        ];

    setEditingHoldingTarget(holding);
    setLotDrafts(
      activeLots.map((l) => ({
        id: l.id,
        units: String(l.remainingUnits),
        price: String(l.pricePerUnit),
        date: toInputDate(l.purchaseDateIso),
      }))
    );
    setEditHoldingError(null);
  };

  const handleSaveEditHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoldingTarget) return;

    if (lotDrafts.length === 0) {
      // Deleting all lots deletes the holding
      handleRemoveHolding(editingHoldingTarget);
      setEditingHoldingTarget(null);
      return;
    }

    const parsedLots: PortfolioPurchaseLot[] = [];
    for (const draft of lotDrafts) {
      const u = Number(draft.units);
      const p = Number(draft.price);
      if (!Number.isFinite(u) || u <= 0 || !Number.isFinite(p) || p <= 0) {
        setEditHoldingError('All purchase lots must have positive quantity and price.');
        return;
      }
      parsedLots.push({
        id: draft.id,
        portfolioId: editingHoldingTarget.portfolioId,
        symbol: editingHoldingTarget.symbol,
        yahooSymbol: editingHoldingTarget.yahooSymbol,
        name: editingHoldingTarget.name,
        category: editingHoldingTarget.category,
        currency: editingHoldingTarget.currency,
        units: u,
        remainingUnits: u,
        pricePerUnit: p,
        purchaseDateIso: new Date(`${draft.date}T10:00:00+07:00`).toISOString(),
      });
    }

    let nextSyncedHolding: PortfolioHolding | null = null;
    setState((prev) => {
      const untouchedLots = prev.lots.filter(
        (l) =>
          !(
            l.portfolioId === editingHoldingTarget.portfolioId &&
            l.yahooSymbol === editingHoldingTarget.yahooSymbol
          )
      );
      const nextLots = [...untouchedLots, ...parsedLots];
      const { holdings: nextHoldings } = recomputeHoldingsFromLots(prev.holdings, nextLots);
      nextSyncedHolding =
        nextHoldings.find((h) => h.id === editingHoldingTarget.id) ?? null;
      return {
        ...prev,
        lots: nextLots,
        holdings: nextHoldings,
      };
    });

    
    setEditingHoldingTarget(null);
  };

  // Open Single Lot Edit Modal
  const handleOpenEditLot = (lot: PortfolioPurchaseLot) => {
    setOpenLotMenuId(null);
    setEditingLot(lot);
    setEditLotUnits(String(lot.remainingUnits));
    setEditLotPrice(String(lot.pricePerUnit));
    setEditLotDate(toInputDate(lot.purchaseDateIso));
    setEditLotError(null);
  };

  const handleSaveEditLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot) return;
    const units = Number(editLotUnits);
    const price = Number(editLotPrice);
    if (!Number.isFinite(units) || units <= 0 || !Number.isFinite(price) || price <= 0) {
      setEditLotError('Enter valid positive quantity and purchase price.');
      return;
    }

    const nextDateIso = new Date(`${editLotDate}T10:00:00+07:00`).toISOString();
    let updatedHolding: PortfolioHolding | null = null;

    setState((prev) => {
      const nextLots = prev.lots.map((l) =>
        l.id === editingLot.id
          ? {
              ...l,
              units,
              remainingUnits: units,
              pricePerUnit: price,
              purchaseDateIso: nextDateIso,
            }
          : l
      );
      const { holdings: nextHoldings } = recomputeHoldingsFromLots(prev.holdings, nextLots);
      updatedHolding =
        nextHoldings.find(
          (h) => h.portfolioId === editingLot.portfolioId && h.yahooSymbol === editingLot.yahooSymbol
        ) ?? null;
      const nextTransactions = prev.transactions.map((t) =>
        t.lotId === editingLot.id
          ? { ...t, units, pricePerUnit: price, dateIso: nextDateIso }
          : t
      );
      return {
        ...prev,
        lots: nextLots,
        holdings: nextHoldings,
        transactions: nextTransactions,
      };
    });

    
    setEditingLot(null);
  };

  // Delete Single Purchase Lot
  const handleDeleteLot = (lot: PortfolioPurchaseLot, holdingId: string) => {
    setOpenLotMenuId(null);
    let holdingRemoved = false;

    setState((prev) => {
      const nextLots = prev.lots.filter((l) => l.id !== lot.id);
      const { holdings: nextHoldings, removedIds } = recomputeHoldingsFromLots(
        prev.holdings,
        nextLots
      );
      holdingRemoved = removedIds.includes(holdingId);
      return {
        ...prev,
        lots: nextLots,
        holdings: nextHoldings,
      };
    });

    if (holdingRemoved && expandedHoldingId === holdingId) {
      setExpandedHoldingId(null);
    }
  };

  // Open Record a Sale Modal for a specific lot
  const handleOpenRecordSaleForLot = (lot: PortfolioPurchaseLot, livePrice: number) => {
    setOpenLotMenuId(null);
    setSaleLotTarget(lot);
    setSaleAllChecked(false);
    setSaleUnitsInput(String(lot.remainingUnits));
    setSalePriceInput(String(livePrice));
    setSaleDateInput(new Date().toISOString().slice(0, 10));
    setSaleError(null);
  };

  const handleConfirmRecordSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleLotTarget) return;
    const qtyToSell = saleAllChecked ? saleLotTarget.remainingUnits : Number(saleUnitsInput);
    const salePrice = Number(salePriceInput);

    if (!Number.isFinite(qtyToSell) || qtyToSell <= 0) {
      setSaleError('Enter a valid positive quantity sold.');
      return;
    }
    if (qtyToSell > saleLotTarget.remainingUnits + 1e-6) {
      setSaleError(
        `Cannot exceed ${saleLotTarget.remainingUnits.toLocaleString('en-US')} shares in this purchase lot.`
      );
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      setSaleError('Enter a valid positive sale price.');
      return;
    }

    const saleTx: PortfolioTransaction = {
      id: makeSafeId('tx'),
      portfolioId: saleLotTarget.portfolioId,
      lotId: saleLotTarget.id,
      symbol: saleLotTarget.symbol,
      yahooSymbol: saleLotTarget.yahooSymbol,
      name: saleLotTarget.name,
      type: 'SELL',
      units: qtyToSell,
      pricePerUnit: salePrice,
      currency: saleLotTarget.currency,
      dateIso: new Date(`${saleDateInput}T10:00:00+07:00`).toISOString(),
    };

    let deletedHoldingId: string | null = null;

    setState((prev) => {
      const targetHolding = prev.holdings.find(
        (h) =>
          h.portfolioId === saleLotTarget.portfolioId &&
          h.yahooSymbol === saleLotTarget.yahooSymbol
      );
      const nextLots = prev.lots.map((l) => {
        if (l.id !== saleLotTarget.id) return l;
        const rem = Math.max(0, Number((l.remainingUnits - qtyToSell).toFixed(6)));
        return { ...l, remainingUnits: rem };
      });
      const { holdings: nextHoldings, removedIds } = recomputeHoldingsFromLots(
        prev.holdings,
        nextLots
      );
      if (targetHolding && removedIds.includes(targetHolding.id)) {
        deletedHoldingId = targetHolding.id;
      }
      return {
        ...prev,
        lots: nextLots,
        holdings: nextHoldings,
        transactions: [saleTx, ...prev.transactions],
      };
    });

    if (deletedHoldingId && expandedHoldingId === deletedHoldingId) {
      setExpandedHoldingId(null);
    }
    setSaleLotTarget(null);
  };

  const handleOpenQuickTrade = (
    holding: PortfolioHolding,
    mode: 'BUY' | 'SELL',
    livePrice: number
  ) => {
    setTradeMode(mode);
    setSelectedSymbol({
      symbol: holding.symbol,
      yahooSymbol: holding.yahooSymbol,
      name: holding.name,
      exchange: holding.yahooSymbol.endsWith('.JK') ? 'IDX' : 'Global',
      typeDisp: holding.category,
      currency: holding.currency,
      category: holding.category,
    });
    setUnitsInput(mode === 'SELL' ? String(holding.units) : '100');
    setPriceInput(String(livePrice));
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPortfolioName.trim();
    if (!name) return;
    const id = makeSafeId('pf');
    setState((prev) => ({
      ...prev,
      portfolios: [
        ...prev.portfolios,
        { id, name: name.slice(0, 40), displayCurrency: newPortfolioCurrency, createdAt: new Date().toISOString() },
      ],
      activePortfolioId: id,
    }));
    setNewPortfolioName('');
    setShowPortfolioModal(false);
  };

  const handleSaveActivePortfolioEdits = () => {
    const trimmed = editingPortfolioName.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      portfolios: prev.portfolios.map((p) =>
        p.id === activePortfolio.id
          ? { ...p, name: trimmed.slice(0, 40), displayCurrency: editingPortfolioCurrency }
          : p
      ),
    }));
    setShowPortfolioModal(false);
    setConfirmDeletePortfolio(false);
  };

  const handleDeleteActivePortfolio = () => {
    if (state.portfolios.length <= 1) return;
    const delId = activePortfolio.id;
    const removedHoldingIds = state.holdings
      .filter((h) => h.portfolioId === delId)
      .map((h) => h.id);

    setState((prev) => {
      const remainingPortfolios = prev.portfolios.filter((p) => p.id !== delId);
      return {
        portfolios: remainingPortfolios,
        activePortfolioId: remainingPortfolios[0].id,
        holdings: prev.holdings.filter((h) => h.portfolioId !== delId),
        lots: prev.lots.filter((l) => l.portfolioId !== delId),
        transactions: prev.transactions.filter((t) => t.portfolioId !== delId),
      };
    });

    
    setConfirmDeletePortfolio(false);
    setShowPortfolioModal(false);
  };

  const handleSelectDisplayCurrency = (nextCurr: CurrencyCode) => {
    setState((prev) => ({
      ...prev,
      portfolios: prev.portfolios.map((p) =>
        p.id === activePortfolio.id ? { ...p, displayCurrency: nextCurr } : p
      ),
    }));
  };

  // Interactive SVG Chart Geometry for Portfolio Curve
  const chartGeometry = useMemo(() => {
    const w = 680;
    const h = 210;
    const padY = 18;
    const pts = portfolioChartData.points;
    const refClose = portfolioChartData.prevClose;
    const all = [...pts, refClose].filter((v) => Number.isFinite(v));
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || Math.max(max * 0.02, 1);

    const coords = pts.map((val, idx) => {
      const x = (idx / Math.max(pts.length - 1, 1)) * w;
      const y = padY + ((max - val) / span) * (h - padY * 2);
      return { x, y, val };
    });

    const line = coords
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');
    const firstX = coords[0]?.x ?? 0;
    const lastX = coords[coords.length - 1]?.x ?? w;
    const prevY = Math.max(10, Math.min(h - 10, padY + ((max - refClose) / span) * (h - padY * 2)));
    const area = `${line} L${lastX.toFixed(1)},${prevY.toFixed(1)} L${firstX.toFixed(1)},${prevY.toFixed(1)} Z`;
    const splitPct = Math.max(0, Math.min(100, (prevY / h) * 100));

    const yTicks = [max, max - span * 0.33, max - span * 0.66, min];
    return { coords, line, area, prevY, splitPct, yTicks, width: w, height: h };
  }, [portfolioChartData]);

  const handleChartPointer = (clientX: number, togglePin = false) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const idx = Math.round((relX / Math.max(rect.width, 1)) * (chartGeometry.coords.length - 1));
    const clamped = Math.max(0, Math.min(chartGeometry.coords.length - 1, idx));
    setHoverIdx(clamped);
    if (togglePin) {
      setPinnedIdx((prev) => (prev === clamped ? null : clamped));
    }
  };

  const inspectIdx = hoverIdx !== null ? hoverIdx : pinnedIdx;
  const activeChartPoint = inspectIdx !== null ? chartGeometry.coords[inspectIdx] : null;
  const activeTimestamp =
    inspectIdx !== null ? portfolioChartData.timestamps[inspectIdx] : lastFeedUpdatedAt;

  const { displayPct, displayDelta } = useMemo(() => {
    const base = portfolioChartData.prevClose;
    if (activeChartPoint) {
      const d = activeChartPoint.val - base;
      const p = base > 0 ? (d / base) * 100 : 0;
      return { displayDelta: d, displayPct: p };
    }
    if (chartRange === '1D') {
      return { displayDelta: summary.dayDelta, displayPct: summary.dayPct };
    }
    if (chartRange === 'MAX') {
      return { displayDelta: summary.totalReturn, displayPct: summary.totalReturnPct };
    }
    const startVal = portfolioChartData.points[0] ?? base;
    const endVal = summary.totalValue;
    const d = endVal - startVal;
    const p = startVal > 0 ? (d / startVal) * 100 : 0;
    return { displayDelta: d, displayPct: p };
  }, [activeChartPoint, chartRange, portfolioChartData, summary]);

  const formattedUpdatedWib = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(lastFeedUpdatedAt));

  return (
    <div className="max-w-5xl mx-auto w-full px-4 lg:px-6 py-5 sm:py-7 pb-28 flex flex-col gap-5">
      {/* Top Portfolio Switcher & Cloud Sync Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {state.portfolios.map((pf) => {
            const active = pf.id === activePortfolio.id;
            return (
              <button
                key={pf.id}
                type="button"
                onClick={() =>
                  setState((prev) => ({ ...prev, activePortfolioId: pf.id }))
                }
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white border-transparent shadow-sm'
                    : 'bg-white dark:bg-[#1C1C1E] text-[#6C6C70] dark:text-[#AEAEB2] border-[#E5E5EA] dark:border-[#2C2C2E] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {pf.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setEditingPortfolioName(activePortfolio.name);
              setEditingPortfolioCurrency(activePortfolio.displayCurrency);
              setConfirmDeletePortfolio(false);
              setShowPortfolioModal(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white border border-[#D1D1D6] dark:border-[#2C2C2E] hover:border-[#0071E3] transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Manage / New List
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select portfolio display currency"
            value={activePortfolio.displayCurrency}
            onChange={(e) => handleSelectDisplayCurrency(e.target.value as CurrencyCode)}
            className="px-3 py-1.5 rounded-full text-xs font-bold font-mono bg-white dark:bg-[#141B28] border border-[#D1D1D6] dark:border-white/15 text-[#1C1C1E] dark:text-white hover:border-[#0071E3] focus:outline-none transition-colors cursor-pointer"
            title="Switch portfolio display currency across major G10 & Asian FX"
          >
            <option value="IDR">IDR (Rp)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CHF">CHF (Fr)</option>
            <option value="CAD">CAD (C$)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="NZD">NZD (NZ$)</option>
            <option value="CNY">CNY (¥)</option>
            <option value="SGD">SGD (S$)</option>
          </select>

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#30D158]/10 text-[#16803C] dark:text-[#30D158] border border-[#30D158]/25 whitespace-nowrap"
            title="Portfolio data is saved in this browser on this device. Export a backup before clearing browser data."
          >
            <span aria-hidden="true">●</span>
            <span className="hidden sm:inline">Saved on this device</span>
            <span className="sm:hidden">Local</span>
          </span>
        </div>
      </div>

      {/* Main Portfolio Summary & Interactive Chart Card */}
      <section className="rounded-3xl liquid-glass-card p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#6C6C70] dark:text-[#AEAEB2]">
                {activePortfolio.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingPortfolioName(activePortfolio.name);
                  setEditingPortfolioCurrency(activePortfolio.displayCurrency);
                  setConfirmDeletePortfolio(false);
                  setShowPortfolioModal(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[11px] font-semibold text-[#1C1C1E] dark:text-[#E5E5EA] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]"
              >
                <Edit3 className="w-3 h-3" />
                Edit portfolio
              </button>
            </div>

            <div className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums font-mono text-[#1C1C1E] dark:text-white">
              {activeChartPoint
                ? formatMoney(activeChartPoint.val, activePortfolio.displayCurrency)
                : formatMoney(summary.totalValue, activePortfolio.displayCurrency)}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <GoogleFinanceDeltaPill changePercent={summary.dayPct} />
              <span className="font-mono font-semibold tabular-nums text-[#6C6C70] dark:text-[#AEAEB2]">
                ({summary.dayDelta >= 0 ? '+' : ''}
                {formatMoney(summary.dayDelta, activePortfolio.displayCurrency)})
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6C6C70] dark:text-[#8E8E93]">
                Today
              </span>

              {(chartRange !== '1D' || Boolean(activeChartPoint)) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-mono tabular-nums ${
                    displayPct >= 0
                      ? 'bg-[#22C55E]/14 dark:bg-[#4ADE80]/16 border-[#16A34A]/35 text-[#0F7033] dark:text-[#4ADE80]'
                      : 'bg-[#EF4444]/14 dark:bg-[#FF6B63]/16 border-[#DC2626]/35 text-[#C41C16] dark:text-[#FF6B63]'
                  }`}
                >
                  <span className="font-sans text-[10px] font-extrabold uppercase tracking-wider opacity-85">
                    {activeChartPoint ? `${chartRange} Pt` : chartRange}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-extrabold">
                    {displayPct >= 0 ? (
                      <ArrowUp className="w-3 h-3 stroke-[2.75]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 stroke-[2.75]" />
                    )}
                    {displayPct >= 0 ? '+' : ''}
                    {displayPct.toFixed(2)}%
                  </span>
                  <span className="font-semibold opacity-90 hidden sm:inline">
                    ({displayDelta >= 0 ? '+' : ''}
                    {formatMoney(displayDelta, activePortfolio.displayCurrency)})
                  </span>
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  summary.anyOpen ? 'bg-[#30D158] animate-pulse' : 'bg-[#8E8E93]'
                }`}
              />
              <span className="tabular-nums font-mono">
                {activeChartPoint
                  ? new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date(activeTimestamp))
                  : formattedUpdatedWib}{' '}
                WIB
              </span>
              <span>·</span>
              <span>{activePortfolio.displayCurrency}</span>
              <span>·</span>
              <span>
                {activeHoldings.length === 0
                  ? 'Add holdings to track live valuation'
                  : summary.anyOpen
                    ? 'Public market snapshot'
                    : 'Last available public close'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            {/* 30-Day Portfolio Value Trend Mini Line Chart */}
            {portfolio30DayTrend && (
              <div
                className="liquid-glass-inset rounded-2xl px-3.5 py-2.5 w-full sm:w-[238px] flex flex-col gap-1.5"
                title={
                  portfolio30DayTrend.ready
                    ? `30-Day Portfolio Value Trend: ${formatMoney(portfolio30DayTrend.startVal, activePortfolio.displayCurrency)} → ${formatMoney(portfolio30DayTrend.endVal, activePortfolio.displayCurrency)}`
                    : 'Loading 30-day portfolio trend...'
                }
              >
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#AEAEB2]">
                    30D Value Trend
                  </span>
                  {portfolio30DayTrend.ready ? (
                    <span
                      className={`font-mono font-extrabold tabular-nums ${
                        portfolio30DayTrend.delta >= 0
                          ? 'text-[#0F7033] dark:text-[#4ADE80]'
                          : 'text-[#C41C16] dark:text-[#FF6B63]'
                      }`}
                    >
                      {portfolio30DayTrend.pct >= 0 ? '+' : ''}
                      {portfolio30DayTrend.pct.toFixed(2)}%
                    </span>
                  ) : (
                    <Loader2 className="w-3 h-3 animate-spin text-[#0071E3]" />
                  )}
                </div>

                {portfolio30DayTrend.ready ? (
                  <svg
                    viewBox="0 0 180 44"
                    className="w-full h-11 overflow-visible"
                    role="img"
                    aria-label={`30-day portfolio trend ${portfolio30DayTrend.pct >= 0 ? 'up' : 'down'} ${Math.abs(portfolio30DayTrend.pct).toFixed(2)} percent`}
                  >
                    <defs>
                      <linearGradient id={`pf30d-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={portfolio30DayTrend.delta >= 0 ? '#16A34A' : '#DC2626'}
                          stopOpacity="0.28"
                        />
                        <stop
                          offset="100%"
                          stopColor={portfolio30DayTrend.delta >= 0 ? '#16A34A' : '#DC2626'}
                          stopOpacity="0.02"
                        />
                      </linearGradient>
                    </defs>
                    <line
                      x1="0"
                      y1={portfolio30DayTrend.baselineY}
                      x2="180"
                      y2={portfolio30DayTrend.baselineY}
                      stroke="#8E8E98"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                      strokeDasharray="2.5 2.5"
                    />
                    <path d={portfolio30DayTrend.areaPath} fill={`url(#pf30d-${chartUid})`} />
                    <path
                      d={portfolio30DayTrend.linePath}
                      fill="none"
                      stroke={portfolio30DayTrend.delta >= 0 ? '#16A34A' : '#DC2626'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={portfolio30DayTrend.lastPt.x}
                      cy={portfolio30DayTrend.lastPt.y}
                      r="2.6"
                      fill={portfolio30DayTrend.delta >= 0 ? '#16A34A' : '#DC2626'}
                    />
                  </svg>
                ) : (
                  <div className="h-11 flex items-center justify-center text-[10px] text-[#6C6C70] dark:text-[#8E8E93]">
                    Syncing 30D history...
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#8E8E93]">
                  <span>30D Net</span>
                  <span
                    className={`font-bold truncate ${
                      portfolio30DayTrend.delta >= 0
                        ? 'text-[#0F7033] dark:text-[#4ADE80]'
                        : 'text-[#C41C16] dark:text-[#FF6B63]'
                    }`}
                  >
                    {portfolio30DayTrend.delta >= 0 ? '+' : ''}
                    {formatMoney(portfolio30DayTrend.delta, activePortfolio.displayCurrency)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchQuotesNow(holdingYahooSymbols)}
                className="p-2 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
                title="Refresh quotes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTradeMode('BUY');
                  setSelectedSymbol(null);
                  setFormError(null);
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-90 text-white text-xs font-bold shadow-sm transition-opacity whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add holding
              </button>
            </div>
          </div>
        </div>

        {/* Portfolio Performance Area Chart */}
        {activeHoldings.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div
              data-no-view-swipe="true"
              className="relative flex items-stretch gap-2 h-52 sm:h-60 select-none"
            >
              <div className="relative flex-1 h-full rounded-2xl bg-[#F2F2F7]/50 dark:bg-[#141416] border border-[#E5E5EA] dark:border-[#2C2C2E]/80 overflow-hidden">
                <div
                  className="absolute left-2.5 z-10 pointer-events-none px-2.5 py-1 rounded-lg bg-white/95 dark:bg-[#2C2C2E]/95 border border-[#E5E5EA] dark:border-[#3A3A3C] shadow text-[10px] font-mono"
                  style={{
                    top: `clamp(8px, calc(${(chartGeometry.prevY / chartGeometry.height) * 100}% + 6px), calc(100% - 46px))`,
                  }}
                >
                  <span className="text-[#6C6C70] dark:text-[#AEAEB2] block leading-tight">
                    {chartRange === '1D' ? 'Prev. close' : 'Baseline'}
                  </span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                    {formatMoney(portfolioChartData.prevClose, activePortfolio.displayCurrency)}
                  </span>
                </div>

                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full cursor-crosshair"
                  onPointerMove={(e) => handleChartPointer(e.clientX, false)}
                  onPointerDown={(e) => handleChartPointer(e.clientX, true)}
                  onPointerLeave={() => setHoverIdx(null)}
                  onTouchStart={(e) => {
                    if (e.touches[0]) handleChartPointer(e.touches[0].clientX, true);
                  }}
                  onTouchMove={(e) => {
                    if (e.touches[0]) handleChartPointer(e.touches[0].clientX, false);
                  }}
                  onTouchEnd={() => setHoverIdx(null)}
                >
                  <defs>
                    <linearGradient
                      id={`pfStroke-${chartUid}`}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2={String(chartGeometry.height)}
                    >
                      <stop offset="0%" stopColor="#16A34A" />
                      <stop offset={`${chartGeometry.splitPct}%`} stopColor="#16A34A" />
                      <stop offset={`${chartGeometry.splitPct}%`} stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>

                    <linearGradient
                      id={`pfAreaAbove-${chartUid}`}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2={String(Math.max(1, chartGeometry.prevY))}
                    >
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.34" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.04" />
                    </linearGradient>

                    <linearGradient
                      id={`pfAreaBelow-${chartUid}`}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1={String(chartGeometry.prevY)}
                      x2="0"
                      y2={String(chartGeometry.height)}
                    >
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.34" />
                    </linearGradient>

                    <clipPath id={`pfClipAbove-${chartUid}`}>
                      <rect x="0" y="0" width={chartGeometry.width} height={chartGeometry.prevY} />
                    </clipPath>
                    <clipPath id={`pfClipBelow-${chartUid}`}>
                      <rect
                        x="0"
                        y={chartGeometry.prevY}
                        width={chartGeometry.width}
                        height={Math.max(0, chartGeometry.height - chartGeometry.prevY)}
                      />
                    </clipPath>
                  </defs>

                  <line
                    x1="0"
                    y1={chartGeometry.prevY}
                    x2={chartGeometry.width}
                    y2={chartGeometry.prevY}
                    stroke="#8E8E98"
                    strokeWidth="1.5"
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    opacity="0.72"
                  />

                  <path
                    d={chartGeometry.area}
                    clipPath={`url(#pfClipAbove-${chartUid})`}
                    fill={`url(#pfAreaAbove-${chartUid})`}
                  />
                  <path
                    d={chartGeometry.area}
                    clipPath={`url(#pfClipBelow-${chartUid})`}
                    fill={`url(#pfAreaBelow-${chartUid})`}
                  />
                  <path
                    d={chartGeometry.line}
                    fill="none"
                    stroke={`url(#pfStroke-${chartUid})`}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {activeChartPoint && (
                    <>
                      <line
                        x1={activeChartPoint.x}
                        y1="0"
                        x2={activeChartPoint.x}
                        y2={chartGeometry.height}
                        stroke="#8E8E93"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <circle
                        cx={activeChartPoint.x}
                        cy={activeChartPoint.y}
                        r="5"
                        fill="#FFFFFF"
                        stroke="#4C8DF6"
                        strokeWidth="2.5"
                      />
                    </>
                  )}
                </svg>
              </div>

              <div className="hidden sm:flex flex-col justify-between py-2 text-[11px] font-mono tabular-nums text-[#6C6C70] dark:text-[#AEAEB2] min-w-[92px] text-right">
                {chartGeometry.yTicks.map((tick, idx) => (
                  <span key={idx}>
                    {activePortfolio.displayCurrency === 'IDR'
                      ? Math.round(tick).toLocaleString('en-US')
                      : `$${tick.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {PORTFOLIO_RANGES.map((range) => {
                  const active = chartRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setChartRange(range);
                        setPinnedIdx(null);
                        setHoverIdx(null);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                        active
                          ? 'bg-[#0071E3] dark:bg-[#1D4ED8] text-white'
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E]/70 text-[#6C6C70] dark:text-[#AEAEB2] hover:text-[#1C1C1E] dark:hover:text-white'
                      }`}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
              {pinnedIdx !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setPinnedIdx(null);
                    setHoverIdx(null);
                  }}
                  className="text-[11px] font-semibold text-[#0071E3] dark:text-[#8AB4F8] hover:underline"
                >
                  Reset point
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#F2F2F7]/70 dark:bg-[#141416] border border-dashed border-[#D1D1D6] dark:border-[#2C2C2E] p-6 sm:p-8 text-center flex flex-col items-center gap-3">
            <Briefcase className="w-8 h-8 text-[#0071E3] dark:text-[#0A84FF]" />
            <div>
              <h3 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Build your live {activePortfolio.name} portfolio
              </h3>
              <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-1 max-w-md mx-auto">
                Track Indonesian IDX equities (UNTR, BBCA, BBRI), US tech stocks (NVDA, AAPL), Crypto, and Commodities with 1-second live updates during open market sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTradeMode('BUY');
                setSelectedSymbol(null);
                setShowAddModal(true);
              }}
              className="mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold shadow-sm hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Add your first holding
            </button>
          </div>
        )}
      </section>

      {/* Sub-Tabs: Holdings | Insights */}
      <div className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] grid grid-cols-2 text-center">
        {(
          [
            { id: 'holdings', label: 'Holdings', icon: Briefcase },
            { id: 'insights', label: 'Insights', icon: PieChart },
          ] as const
        ).map((tab) => {
          const active = subTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`relative py-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-colors ${
                active
                  ? 'text-[#0071E3] dark:text-[#8AB4F8]'
                  : 'text-[#6C6C70] dark:text-[#AEAEB2] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-[#0071E3] dark:bg-[#8AB4F8]" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: HOLDINGS (with Swipe-to-Edit/Delete + Expandable Lots with ⋮ menu) */}
      {subTab === 'holdings' && (
        <section className="flex flex-col gap-3">
          <div className="rounded-2xl liquid-glass-card overflow-hidden">
            {enrichedHoldings.length > 0 && (
              <div className="px-4 sm:px-5 py-2.5 border-b border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#1C1C1E] dark:text-white">
                  Position Technical Signals ({enrichedHoldings.length})
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#30D158]/15 text-[#16803C] dark:text-[#30D158] text-[10px] font-bold tabular-nums">
                    <TrendingUp className="w-3 h-3" />
                    {portfolioSignalTally.bull} Bull
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A] text-[10px] font-bold tabular-nums">
                    <TrendingDown className="w-3 h-3" />
                    {portfolioSignalTally.bear} Bear
                  </span>
                  {portfolioSignalTally.idxTotal > 0 && (
                    <span className="text-[11px] font-semibold text-[#4A4D57] dark:text-[#C7CBD6] tabular-nums">
                      IDX Bandarmology: {portfolioSignalTally.idxAcc} Acc · {portfolioSignalTally.idxDist} Dist
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="px-4 sm:px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] grid grid-cols-12 items-center text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]">
              <div className="col-span-5 sm:col-span-4">Symbol</div>
              <div className="col-span-3 sm:col-span-3 text-right">Value</div>
              <div className="hidden sm:block sm:col-span-2 text-right">Day chg</div>
              <div className="col-span-4 sm:col-span-3 text-right">Total return</div>
            </div>

            {enrichedHoldings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                No holdings in &ldquo;{activePortfolio.name}&rdquo; yet. Click <strong>+ Add holding</strong> to record a position.
              </div>
            ) : (
              <div data-testid="portfolio-holdings-list" className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]/70">
                <AnimatePresence initial={false} mode="popLayout">
                  {enrichedHoldings.map((h) => {
                    const isExpanded = expandedHoldingId === h.id;
                    const isSwiped = swipedHoldingId === h.id;

                    return (
                      <motion.div
                        key={h.id}
                        layout="position"
                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.98 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        data-testid={`portfolio-holding-row-${h.symbol}`}
                        className="group"
                      >
                        <SwipeableHoldingRow
                          isOpen={isSwiped}
                          onOpenChange={(open) => setSwipedHoldingId(open ? h.id : null)}
                          onEditHolding={() => handleOpenEditHolding(h)}
                          onDeleteHolding={() => handleRemoveHolding(h)}
                          onToggleExpand={() =>
                            setExpandedHoldingId(isExpanded ? null : h.id)
                          }
                        >
                          <div className="px-4 sm:px-5 py-3.5 grid grid-cols-12 items-center gap-2 hover:bg-[#F2F2F7]/60 dark:hover:bg-[#2C2C2E]/40 cursor-pointer transition-colors">
                            <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                              <AssetCategoryMiniIcon
                                category={h.category}
                                idOrSymbol={h.symbol}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">
                                    {h.symbol}
                                  </span>
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      h.sessionOpen ? 'bg-[#30D158]' : 'bg-[#8E8E93]/60'
                                    }`}
                                    title={h.sessionStateLabel}
                                  />
                                  <SignalBadge signal={h.signal} compact />
                                  {(h.currency === 'IDR' || h.yahooSymbol.toUpperCase().endsWith('.JK')) && (
                                    <BandarmologyBadge bandarmology={h.bandarmology} compact />
                                  )}
                                </div>
                                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] tabular-nums truncate">
                                  {h.units.toLocaleString('en-US')} shares
                                  {h.bandarmology
                                    ? ` · ${h.bandarmology.volumeRatio.toFixed(1)}x Vol · Flow ${h.bandarmology.accumulationPressure}%`
                                    : ''}
                                </p>
                              </div>
                            </div>

                            <div className="col-span-3 sm:col-span-3 text-right font-mono text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                              <motion.span
                                key={`${h.id}-${h.marketValue.toFixed(2)}`}
                                initial={{ opacity: 0.65, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.22 }}
                                className="inline-block"
                              >
                                {formatMoney(h.marketValue, activePortfolio.displayCurrency, true)}
                              </motion.span>
                            </div>

                            <div
                              className={`hidden sm:block sm:col-span-2 text-right font-mono text-xs font-semibold tabular-nums ${
                                h.dayChangePct >= 0
                                  ? 'text-[#16803C] dark:text-[#6EE7B7]'
                                  : 'text-[#D7261C] dark:text-[#FCA5A5]'
                              }`}
                            >
                              {h.dayChangePct >= 0 ? '+' : ''}
                              {h.dayChangePct.toFixed(2)}%
                            </div>

                            <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-1.5">
                              <GoogleFinanceDeltaPill changePercent={h.totalReturnPct} compact />
                              {/* Quick desktop edit/delete triggers (complement touch swipe left) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditHolding(h);
                                }}
                                className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-[#0071E3]/15 text-[#0071E3] dark:text-[#8AB4F8] transition-opacity"
                                title="Edit holding"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveHolding(h);
                                }}
                                className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-[#D7261C]/15 text-[#D7261C] dark:text-[#F28B82] transition-opacity"
                                title="Delete holding"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#8E8E93] shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#8E8E93] shrink-0" />
                              )}
                            </div>
                          </div>
                        </SwipeableHoldingRow>

                      {/* Expanded Position Breakdown + Individual Purchase Lots */}
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 pt-3 bg-[#F2F2F7]/50 dark:bg-[#141416] border-t border-[#E5E5EA]/70 dark:border-[#2C2C2E]/60 flex flex-col gap-3 text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[#6C6C70] dark:text-[#8E8E93]">Live / Last Price</span>
                              <p className="font-mono font-bold text-[#1C1C1E] dark:text-white tabular-nums mt-0.5">
                                {formatUnitPrice(h.liveNativePrice, h.currency)}
                              </p>
                              <span className="text-[10px] text-[#6C6C70] dark:text-[#8E8E93]">
                                {h.sessionStateLabel}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#6C6C70] dark:text-[#8E8E93]">Avg Buy Cost</span>
                              <p className="font-mono font-bold text-[#1C1C1E] dark:text-white tabular-nums mt-0.5">
                                {formatUnitPrice(h.avgCost, h.currency)}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#6C6C70] dark:text-[#8E8E93]">Today P&amp;L</span>
                              <p
                                className={`font-mono font-bold tabular-nums mt-0.5 ${
                                  h.dayChangeVal >= 0
                                    ? 'text-[#16803C] dark:text-[#30D158]'
                                    : 'text-[#D7261C] dark:text-[#FF453A]'
                                }`}
                              >
                                {h.dayChangeVal >= 0 ? '+' : ''}
                                {formatMoney(h.dayChangeVal, activePortfolio.displayCurrency)}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#6C6C70] dark:text-[#8E8E93]">Total Unrealized P&amp;L</span>
                              <p
                                className={`font-mono font-bold tabular-nums mt-0.5 ${
                                  h.totalReturnVal >= 0
                                    ? 'text-[#16803C] dark:text-[#30D158]'
                                    : 'text-[#D7261C] dark:text-[#FF453A]'
                                }`}
                              >
                                {h.totalReturnVal >= 0 ? '+' : ''}
                                {formatMoney(h.totalReturnVal, activePortfolio.displayCurrency)}
                              </p>
                            </div>
                          </div>

                          {/* IDX Bandarmology Accumulation / Distribution Breakdown */}
                          {h.bandarmology && (
                            <div className="rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8]">
                                  IDX Bandarmology Position
                                </span>
                                <p className="text-[11px] text-[#4A4D57] dark:text-[#C7CBD6] mt-0.5">
                                  {h.bandarmology.summary}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <BandarmologyBadge bandarmology={h.bandarmology} showScore />
                                <span className="text-[11px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
                                  {h.bandarmology.volumeRatio.toFixed(2)}x Vol · {h.bandarmology.accumulationPressure}% Flow
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Individual Purchase Lots List (Google Finance style + ⋮ menu) */}
                          <div className="rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]/70">
                            <div className="px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-[#6C6C70] dark:text-[#AEAEB2]">
                              <span>Purchase lots ({h.lots.length})</span>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickTrade(h, 'BUY', h.liveNativePrice)}
                                className="inline-flex items-center gap-1 text-[#0071E3] dark:text-[#8AB4F8] font-bold hover:underline"
                              >
                                <Plus className="w-3 h-3" />
                                Add purchase
                              </button>
                            </div>

                            {h.lots.map((lot) => {
                              const lotValue = convertAmount(
                                lot.remainingUnits * h.liveNativePrice,
                                lot.currency,
                                activePortfolio.displayCurrency
                              );
                              const lotCost = convertAmount(
                                lot.remainingUnits * lot.pricePerUnit,
                                lot.currency,
                                activePortfolio.displayCurrency
                              );
                              const lotReturnPct =
                                lotCost > 0 ? ((lotValue - lotCost) / lotCost) * 100 : 0;
                              const dateStr = new Intl.DateTimeFormat('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }).format(new Date(lot.purchaseDateIso));
                              const isMenuOpen = openLotMenuId === lot.id;

                              return (
                                <div
                                  key={lot.id}
                                  className="px-3 py-2.5 flex items-center justify-between gap-2 relative"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#1C1C1E] dark:text-white">
                                      {dateStr} · {lot.remainingUnits.toLocaleString('en-US')} shares
                                    </p>
                                    <p className="text-[11px] font-mono text-[#6C6C70] dark:text-[#8E8E93] tabular-nums">
                                      Buy @ {formatUnitPrice(lot.pricePerUnit, lot.currency)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                      <p className="font-mono font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                                        {formatMoney(lotValue, activePortfolio.displayCurrency, true)}
                                      </p>
                                      <span
                                        className={`text-[11px] font-mono font-bold tabular-nums ${
                                          lotReturnPct >= 0
                                            ? 'text-[#16803C] dark:text-[#6EE7B7]'
                                            : 'text-[#D7261C] dark:text-[#FCA5A5]'
                                        }`}
                                      >
                                        {lotReturnPct >= 0 ? '+' : ''}
                                        {lotReturnPct.toFixed(2)}%
                                      </span>
                                    </div>

                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenLotMenuId(isMenuOpen ? null : lot.id);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] text-[#6C6C70] dark:text-[#AEAEB2]"
                                        aria-label="Purchase lot actions"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>

                                      {isMenuOpen && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute right-0 bottom-8 z-30 w-44 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] shadow-xl py-1.5 text-xs"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditLot(lot)}
                                            className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#1C1C1E] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Edit purchase
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenRecordSaleForLot(lot, h.liveNativePrice)
                                            }
                                            className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#1C1C1E] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]"
                                          >
                                            <ArrowDownRight className="w-3.5 h-3.5" />
                                            Record a sale
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteLot(lot, h.id)}
                                            className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#D7261C] dark:text-[#F28B82] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete purchase
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
                              {h.name} · {h.yahooSymbol}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {onInspectSymbol && (
                                <button
                                  type="button"
                                  onClick={() => onInspectSymbol(h.yahooSymbol)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-[#8AB4F8] font-bold hover:bg-[#0071E3]/20"
                                >
                                  <BarChart2 className="w-3 h-3" />
                                  Chart
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditHolding(h)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white font-semibold"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit lots
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickTrade(h, 'SELL', h.liveNativePrice)}
                                className="px-3 py-1 rounded-full bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A] font-bold hover:bg-[#FF453A]/25"
                              >
                                Sell
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setTradeMode('BUY');
                setSelectedSymbol(null);
                setFormError(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-sm transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add holding
            </button>
            {enrichedHoldings.length > 0 && (
              <span className="text-[11px] text-[#8E8E93] sm:hidden">
                Tip: Swipe left on a holding to edit or delete
              </span>
            )}
          </div>

          {enrichedHoldings.length > 0 && (
            <PortfolioSectorPieChart
              holdings={enrichedHoldings}
              displayCurrency={activePortfolio.displayCurrency}
              formatMoney={formatMoney}
              themeMode={themeMode}
              onInspectSymbol={onInspectSymbol}
              onAddHolding={() => {
                setTradeMode('BUY');
                setSelectedSymbol(null);
                setFormError(null);
                setShowAddModal(true);
              }}
            />
          )}
        </section>
      )}

      {/* TAB 2: INSIGHTS (Your investments visualized Treemap + Daily movers analysis + Asset Allocation + Concentration) */}
      {subTab === 'insights' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card A: Your investments visualized (Google Finance Proportional Treemap) */}
          <div className="lg:col-span-2 rounded-3xl liquid-glass-card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-white">
                  Your investments visualized
                </h2>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                  Tile area reflects portfolio weight; color indicates session performance
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#6C6C70] dark:text-[#8E8E93]">
                {enrichedHoldings.length} positions
              </span>
            </div>

            {insights.treemapRects.length === 0 ? (
              <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                Add holdings to visualize your portfolio treemap.
              </p>
            ) : (
              <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-[#141416] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                {insights.treemapRects.map((rect) => {
                  const bg = getTreemapTileColor(rect.dayChangePct);
                  const showDetails = rect.w >= 14 && rect.h >= 16;
                  return (
                    <button
                      key={rect.id}
                      type="button"
                      onClick={() => onInspectSymbol?.(rect.yahooSymbol)}
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.w}%`,
                        height: `${rect.h}%`,
                        backgroundColor: bg,
                      }}
                      title={`${rect.symbol} (${rect.name}) · Weight: ${rect.weightPct.toFixed(1)}% · Today: ${
                        rect.dayChangePct >= 0 ? '+' : ''
                      }${rect.dayChangePct.toFixed(2)}%`}
                      className="absolute border border-white/20 dark:border-black/50 flex flex-col items-center justify-center p-1 text-white hover:brightness-110 transition-all overflow-hidden"
                    >
                      <span
                        className={`font-extrabold tracking-tight leading-tight truncate max-w-full ${
                          rect.w > 28 && rect.h > 28 ? 'text-sm sm:text-base' : 'text-[11px] sm:text-xs'
                        }`}
                      >
                        {rect.symbol}
                      </span>
                      {showDetails && (
                        <span className="text-[11px] font-mono font-bold tabular-nums opacity-95">
                          {rect.dayChangePct >= 0 ? '+' : ''}
                          {rect.dayChangePct.toFixed(2)}%
                        </span>
                      )}
                      {rect.w >= 26 && rect.h >= 30 && (
                        <span className="text-[10px] font-mono opacity-80 mt-0.5 tabular-nums">
                          {rect.weightPct.toFixed(1)}% wt
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card B: Daily movers analysis about portfolio holdings */}
          <div className="lg:col-span-2 rounded-3xl liquid-glass-card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-[#0071E3] dark:text-[#8AB4F8]" />
                <div>
                  <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-white">
                    Daily movers
                  </h2>
                  <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                    Live intraday catalyst &amp; news analysis for your portfolio holdings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void fetchMoversBrief(holdingYahooSymbols)}
                disabled={moversLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-semibold text-[#1C1C1E] dark:text-white hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${moversLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {holdingYahooSymbols.length === 0 ? (
              <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                Add holdings to receive live daily movers analysis on your positions.
              </p>
            ) : moversLoading && dailyMovers.length === 0 ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                <Loader2 className="w-4 h-4 animate-spin text-[#0071E3]" />
                Analyzing daily movers across your holdings...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dailyMovers.map((mover) => (
                  <div
                    key={mover.yahooSymbol}
                    className="rounded-2xl bg-[#F2F2F7]/60 dark:bg-[#141416] border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#1C1C1E] dark:text-white">
                            {mover.symbol}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#6C6C70] dark:text-[#AEAEB2] tabular-nums">
                            {formatUnitPrice(mover.price, mover.currency)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] truncate">
                          {mover.name}
                        </p>
                      </div>
                      <GoogleFinanceDeltaPill changePercent={mover.changePercent} compact />
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white leading-snug">
                      {mover.headline}
                    </p>
                    <p className="text-xs text-[#6C6C70] dark:text-[#AEAEB2] leading-relaxed line-clamp-3">
                      {mover.summary}
                    </p>

                    <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
                      <span className="truncate">{mover.source}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {onInspectSymbol && (
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(mover.yahooSymbol)}
                            className="font-bold text-[#0071E3] dark:text-[#8AB4F8] hover:underline"
                          >
                            Chart
                          </button>
                        )}
                        {mover.url && (
                          <a
                            href={mover.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold hover:text-[#1C1C1E] dark:hover:text-white"
                          >
                            Source
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card C: D3 Sector & Asset Class Allocation Pie Chart */}
          <PortfolioSectorPieChart
            holdings={enrichedHoldings}
            displayCurrency={activePortfolio.displayCurrency}
            formatMoney={formatMoney}
            themeMode={themeMode}
            onInspectSymbol={onInspectSymbol}
            onAddHolding={() => {
              setTradeMode('BUY');
              setSelectedSymbol(null);
              setFormError(null);
              setShowAddModal(true);
            }}
          />

          {/* Card D: Concentration Risk */}
          <div className="rounded-3xl liquid-glass-card p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-white">
              Concentration risk
            </h2>

            {insights.concentration.length === 0 ? (
              <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                No holdings tracked yet.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {insights.concentration.slice(0, 6).map((row) => (
                    <div key={row.id} className="flex items-center gap-3">
                      <span className="w-16 text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
                        {row.symbol}
                      </span>
                      <div className="flex-1 h-7 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden relative flex items-center">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-[#5B7CFA] to-[#8BA3FF] transition-all duration-300"
                          style={{ width: `${Math.max(4, row.pct)}%` }}
                        />
                        <span className="absolute right-2.5 text-xs font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                          {row.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {insights.concentration[0] && (
                  <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] text-xs sm:text-sm text-[#6C6C70] dark:text-[#AEAEB2] leading-relaxed flex items-start gap-2.5">
                    {insights.concentration[0].pct >= 50 && (
                      <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0 mt-0.5" />
                    )}
                    <p>
                      <strong className="text-[#1C1C1E] dark:text-white">
                        {insights.concentration[0].pct >= 80
                          ? 'Single Asset Concentration Risk:'
                          : 'Top Position Exposure:'}
                      </strong>{' '}
                      Your largest holding is {insights.concentration[0].name} (
                      {insights.concentration[0].symbol}) at{' '}
                      {insights.concentration[0].pct.toFixed(1)}% of total portfolio value (
                      {formatMoney(insights.concentration[0].value, activePortfolio.displayCurrency)}
                      ).
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Modal 1: Add Holding / Quick Buy-Sell Transaction */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  {tradeMode === 'BUY' ? 'Add holding / Purchase' : 'Record Sale'}
                </h2>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                  Portfolio: {activePortfolio.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="p-5 overflow-y-auto flex flex-col gap-4">
              {!selectedSymbol ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                    <input
                      type="search"
                      autoFocus
                      value={symbolSearch}
                      onChange={(e) => setSymbolSearch(e.target.value)}
                      placeholder="Search IDX (UNTR.JK, BBCA.JK) or US (NVDA, AAPL, BTC-USD)..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs sm:text-sm text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    />
                  </div>

                  <div className="flex flex-col divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl max-h-64 overflow-y-auto">
                    {searchLoading && (
                      <div className="p-4 text-center text-xs text-[#8E8E93] flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Searching live symbols...
                      </div>
                    )}
                    {searchResults.map((item) => (
                      <button
                        key={item.yahooSymbol}
                        type="button"
                        onClick={() => void handleSelectSymbolToAdd(item)}
                        className="px-4 py-2.5 text-left hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">
                              {item.symbol}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#6C6C70] dark:text-[#D1D1D6]">
                              {item.exchange} · {item.currency}
                            </span>
                          </div>
                          <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] truncate">
                            {item.name}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">
                          {selectedSymbol.symbol}
                        </span>
                        <span className="text-[11px] font-mono text-[#6C6C70] dark:text-[#AEAEB2]">
                          {selectedSymbol.yahooSymbol} · {selectedSymbol.currency}
                        </span>
                      </div>
                      <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] truncate">
                        {selectedSymbol.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSymbol(null)}
                      className="text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF] shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                        Quantity / Shares
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.000001"
                        required
                        value={unitsInput}
                        onChange={(e) => setUnitsInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] font-mono text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                        {tradeMode === 'BUY' ? 'Purchase Price' : 'Sale Price'} ({selectedSymbol.currency})
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0.000001"
                          required
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder={fetchingSelectedQuote ? 'Loading...' : '0'}
                          className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] font-mono text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                        />
                        {fetchingSelectedQuote && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                      {tradeMode === 'BUY' ? 'Purchase Date' : 'Sale Date'}
                    </label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    />
                  </div>

                  {formError && (
                    <p className="text-xs font-semibold text-[#D7261C] dark:text-[#FF453A]">
                      {formError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {tradeMode === 'BUY' ? 'Save Holding' : 'Confirm Sale'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit / Manage / Create Portfolio */}
      {showPortfolioModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPortfolioModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5 flex flex-col gap-5 max-h-[88dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Edit Portfolio
              </h2>
              <button
                type="button"
                onClick={() => setShowPortfolioModal(false)}
                className="p-1.5 rounded-full hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={editingPortfolioName}
                  onChange={(e) => setEditingPortfolioName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Display Currency
                </label>
                <select
                  value={editingPortfolioCurrency}
                  onChange={(e) => setEditingPortfolioCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm font-semibold text-[#1C1C1E] dark:text-white focus:outline-none"
                >
                  <option value="IDR">Indonesian Rupiah (IDR)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">British Pound (GBP)</option>
                  <option value="JPY">Japanese Yen (JPY)</option>
                  <option value="CHF">Swiss Franc (CHF)</option>
                  <option value="CAD">Canadian Dollar (CAD)</option>
                  <option value="AUD">Australian Dollar (AUD)</option>
                  <option value="NZD">New Zealand Dollar (NZD)</option>
                  <option value="CNY">Chinese Yuan (CNY)</option>
                  <option value="SGD">Singapore Dollar (SGD)</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {state.portfolios.length > 1 ? (
                  confirmDeletePortfolio ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteActivePortfolio}
                        className="px-3 py-1.5 rounded-full bg-[#D7261C] text-white text-xs font-bold"
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePortfolio(false)}
                        className="text-xs font-semibold text-[#6C6C70]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePortfolio(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#D7261C] dark:text-[#F28B82] hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete portfolio
                    </button>
                  )
                ) : (
                  <span className="text-[11px] text-[#8E8E93]">Default portfolio</span>
                )}

                <button
                  type="button"
                  onClick={handleSaveActivePortfolioEdits}
                  className="px-4 py-2 rounded-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black text-xs font-bold"
                >
                  Save changes
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreatePortfolio}
              className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col gap-3"
            >
              <label className="text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]">
                Create New Portfolio List
              </label>
              <input
                type="text"
                placeholder="e.g. US Tech, Dividends, Crypto..."
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newPortfolioCurrency}
                  onChange={(e) => setNewPortfolioCurrency(e.target.value as CurrencyCode)}
                  className="px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white"
                >
                  <option value="IDR">IDR (Rp)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF (Fr)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="NZD">NZD (NZ$)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="SGD">SGD (S$)</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold"
                >
                  + Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Holding (All purchase lots in one editor, matching Google Finance) */}
      {editingHoldingTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingHoldingTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Edit holding · {editingHoldingTarget.symbol}
                </h2>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                  {editingHoldingTarget.name} ({editingHoldingTarget.currency})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingHoldingTarget(null)}
                className="p-1.5 rounded-full hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditHolding} className="p-5 overflow-y-auto flex flex-col gap-3">
              {lotDrafts.map((draft, idx) => (
                <div
                  key={draft.id}
                  className="p-3.5 rounded-2xl bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 border border-[#E5E5EA] dark:border-[#3A3A3C] flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6C6C70] dark:text-[#AEAEB2]">
                      Purchase lot #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLotDrafts((prev) => prev.filter((item) => item.id !== draft.id))
                      }
                      className="text-xs font-semibold text-[#D7261C] dark:text-[#F28B82] hover:underline"
                    >
                      Remove lot
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.000001"
                        required
                        value={draft.units}
                        onChange={(e) =>
                          setLotDrafts((prev) =>
                            prev.map((item) =>
                              item.id === draft.id ? { ...item, units: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1C1E] font-mono text-xs sm:text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                        Purchase price ({editingHoldingTarget.currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.000001"
                        required
                        value={draft.price}
                        onChange={(e) =>
                          setLotDrafts((prev) =>
                            prev.map((item) =>
                              item.id === draft.id ? { ...item, price: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1C1E] font-mono text-xs sm:text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                        Purchase date
                      </label>
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) =>
                          setLotDrafts((prev) =>
                            prev.map((item) =>
                              item.id === draft.id ? { ...item, date: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1C1E] text-xs sm:text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const liveP =
                    liveQuotes[editingHoldingTarget.yahooSymbol]?.price ??
                    editingHoldingTarget.avgCost;
                  setLotDrafts((prev) => [
                    ...prev,
                    {
                      id: makeSafeId('lot'),
                      units: '100',
                      price: String(liveP),
                      date: new Date().toISOString().slice(0, 10),
                    },
                  ]);
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-[#0071E3] text-[#0071E3] dark:text-[#8AB4F8] text-xs font-bold hover:bg-[#0071E3]/5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another purchase
              </button>

              {editHoldingError && (
                <p className="text-xs font-semibold text-[#D7261C] dark:text-[#FF453A]">
                  {editHoldingError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHoldingTarget(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Single Purchase Lot */}
      {editingLot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingLot(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Edit purchase · {editingLot.symbol}
                </h2>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                  {editingLot.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLot(null)}
                className="p-1.5 rounded-full hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLot} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={editLotUnits}
                  onChange={(e) => setEditLotUnits(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] font-mono text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Purchase date
                </label>
                <input
                  type="date"
                  required
                  value={editLotDate}
                  onChange={(e) => setEditLotDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Purchase price ({editingLot.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={editLotPrice}
                  onChange={(e) => setEditLotPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] font-mono text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              {editLotError && (
                <p className="text-xs font-semibold text-[#D7261C] dark:text-[#FF453A]">
                  {editLotError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLot(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Record a Sale (Google Finance lot sale dialog) */}
      {saleLotTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSaleLotTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Record a sale · {saleLotTarget.symbol}
                </h2>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                  Available in lot: {saleLotTarget.remainingUnits.toLocaleString('en-US')} shares
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaleLotTarget(null)}
                className="p-1.5 rounded-full hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRecordSale} className="flex flex-col gap-3">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#1C1C1E] dark:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saleAllChecked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSaleAllChecked(checked);
                    if (checked) {
                      setSaleUnitsInput(String(saleLotTarget.remainingUnits));
                    }
                  }}
                  className="w-4 h-4 rounded accent-[#0071E3]"
                />
                Record all as sold ({saleLotTarget.remainingUnits.toLocaleString('en-US')} shares)
              </label>

              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Quantity sold
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  max={saleLotTarget.remainingUnits}
                  disabled={saleAllChecked}
                  required
                  value={saleUnitsInput}
                  onChange={(e) => setSaleUnitsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] font-mono text-sm text-[#1C1C1E] dark:text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Sale date
                </label>
                <input
                  type="date"
                  required
                  value={saleDateInput}
                  onChange={(e) => setSaleDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2] mb-1">
                  Sale price ({saleLotTarget.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={salePriceInput}
                  onChange={(e) => setSalePriceInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] font-mono text-sm text-[#1C1C1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              {saleError && (
                <p className="text-xs font-semibold text-[#D7261C] dark:text-[#FF453A]">
                  {saleError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleLotTarget(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
