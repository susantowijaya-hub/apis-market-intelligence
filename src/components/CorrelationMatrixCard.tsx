import { apiUrl } from '../lib/api';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Grid, ShieldAlert } from 'lucide-react';
import {
  CorrelationMatrixResponse,
  MarketAsset,
  ThemeMode,
} from '../types/market';

interface CorrelationMatrixCardProps {
  assets: MarketAsset[];
  selectedAssetId: string;
  onSelectAsset: (id: string) => void;
  themeMode: ThemeMode;
}

type BasketKey = 'macro' | 'equities' | 'fx-real' | 'custom';

const BASKET_PRESETS: Record<Exclude<BasketKey, 'custom'>, { label: string; ids: string[] }> = {
  macro: {
    label: 'Macro & Hedges',
    ids: ['BTCUSD', 'USDIDR', 'XAUUSD', 'SPX', 'IHSG', 'DXY', 'WTI', 'US10Y'],
  },
  equities: {
    label: 'Global Indices',
    ids: ['SPX', 'IXIC', 'DJI', 'IHSG', 'EIDO', 'HSI', 'TAIEX', 'KOSPI'],
  },
  'fx-real': {
    label: 'Crypto, FX & Real',
    ids: ['BTCUSD', 'ETHUSD', 'XAUUSD', 'WTI', 'BRENT', 'USDIDR', 'EURUSD', 'DXY'],
  },
};

function shortTickerLabel(id: string): string {
  switch (id) {
    case 'BTCUSD':
      return 'BTC';
    case 'ETHUSD':
      return 'ETH';
    case 'XAUUSD':
      return 'XAU';
    case 'EURUSD':
      return 'EUR';
    default:
      return id;
  }
}

function computeClientFallbackMatrix(
  assets: MarketAsset[],
  timeframe: '1M' | '3M'
): CorrelationMatrixResponse {
  const usable = assets;
  const ids = usable.map((a) => a.id);
  const returnsList = usable.map((a) => {
    const raw =
      a.chartSeries[timeframe] && a.chartSeries[timeframe].length >= 5
        ? a.chartSeries[timeframe]
        : a.chartSeries['1D'] ?? [];
    const rets: number[] = [];
    for (let i = 1; i < raw.length; i++) {
      const prev = raw[i - 1];
      const curr = raw[i];
      if (prev > 0 && curr > 0) rets.push(Math.log(curr / prev));
    }
    return rets;
  });

  const n = ids.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const ra = returnsList[i];
      const rb = returnsList[j];
      const len = Math.min(ra.length, rb.length);
      if (len < 4) {
        matrix[i][j] = 0;
        matrix[j][i] = 0;
        continue;
      }
      const sa = ra.slice(-len);
      const sb = rb.slice(-len);
      const ma = sa.reduce((s, v) => s + v, 0) / len;
      const mb = sb.reduce((s, v) => s + v, 0) / len;
      let num = 0;
      let da2 = 0;
      let db2 = 0;
      for (let k = 0; k < len; k++) {
        const da = sa[k] - ma;
        const db = sb[k] - mb;
        num += da * db;
        da2 += da * da;
        db2 += db * db;
      }
      const den = Math.sqrt(da2 * db2);
      const r = den > 1e-12 ? Number(Math.max(-1, Math.min(1, num / den)).toFixed(2)) : 0;
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }

  return {
    timeframe,
    assetIds: ids,
    matrix,
    sampleDays: timeframe === '3M' ? 60 : 20,
    updatedAt: new Date().toISOString(),
  };
}

function classifyCorrelation(r: number): {
  regime: string;
  toneClass: string;
  advice: string;
} {
  if (r <= -0.55) {
    return {
      regime: 'Strong Inverse Hedge',
      toneClass: 'text-[#C41C16] dark:text-[#FF6B63]',
      advice:
        'Strong negative co-movement: gains in one historically offset drawdowns in the other, providing high hedging utility.',
    };
  }
  if (r <= -0.25) {
    return {
      regime: 'Inverse Hedge Tilt',
      toneClass: 'text-[#B45309] dark:text-[#FBBF24]',
      advice:
        'Moderate inverse sensitivity: useful tactical counterweight when macro dollar or rate regimes shift.',
    };
  }
  if (r < 0.25) {
    return {
      regime: 'Uncorrelated Diversifier',
      toneClass: 'text-[#0071E3] dark:text-[#38BDF8]',
      advice:
        'Near-zero return coupling: combining both lowers aggregate portfolio variance without sacrificing return beta.',
    };
  }
  if (r < 0.55) {
    return {
      regime: 'Moderate Co-Movement',
      toneClass: 'text-[#0F7033] dark:text-[#4ADE80]',
      advice:
        'Shared directional macro sensitivity, though idiosyncratic drivers still preserve partial diversification.',
    };
  }
  return {
    regime: 'High Concentration Beta',
    toneClass: 'text-[#0B5D2A] dark:text-[#4ADE80]',
    advice:
      'Tight positive lockstep: holding heavy weights in both amplifies directional factor risk rather than diversifying.',
  };
}

export const CorrelationMatrixCard: React.FC<CorrelationMatrixCardProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  themeMode,
}) => {
  const [timeframe, setTimeframe] = useState<'1M' | '3M'>('1M');
  const [basket, setBasket] = useState<BasketKey>('macro');
  const [customIds, setCustomIds] = useState<string[]>([
    'BTCUSD',
    'USDIDR',
    'XAUUSD',
    'SPX',
    'IHSG',
    'DXY',
  ]);
  const [serverData, setServerData] = useState<CorrelationMatrixResponse | null>(null);
  const [inspectedPair, setInspectedPair] = useState<[string, string]>(['BTCUSD', 'USDIDR']);

  useEffect(() => {
    let active = true;
    const loadCorrelations = async () => {
      try {
        const res = await fetch(apiUrl(`/api/market/correlations?timeframe=${timeframe}`));
        if (!res.ok) return;
        const json = (await res.json()) as CorrelationMatrixResponse;
        if (active && Array.isArray(json.assetIds) && json.assetIds.length > 0) {
          setServerData(json);
        }
      } catch {
        // Fallback computed below
      }
    };
    void loadCorrelations();
    return () => {
      active = false;
    };
  }, [timeframe]);

  const correlationSource = useMemo(() => {
    if (serverData && serverData.timeframe === timeframe) return serverData;
    return computeClientFallbackMatrix(assets, timeframe);
  }, [serverData, assets, timeframe]);

  const activeBasketIds = useMemo(() => {
    const availableSet = new Set(correlationSource.assetIds);
    const chosen =
      basket === 'custom'
        ? customIds
        : BASKET_PRESETS[basket].ids;
    const filtered = chosen.filter((id) => availableSet.has(id));
    if (filtered.length >= 3) return filtered;
    return correlationSource.assetIds.slice(0, 8);
  }, [basket, customIds, correlationSource.assetIds]);

  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets]
  );

  // Extract submatrix for activeBasketIds
  const subMatrix = useMemo(() => {
    const idxMap = new Map(correlationSource.assetIds.map((id, i) => [id, i]));
    return activeBasketIds.map((rowId) => {
      const rIdx = idxMap.get(rowId);
      return activeBasketIds.map((colId) => {
        if (rowId === colId) return 1;
        const cIdx = idxMap.get(colId);
        if (rIdx === undefined || cIdx === undefined) return 0;
        return correlationSource.matrix[rIdx]?.[cIdx] ?? 0;
      });
    });
  }, [activeBasketIds, correlationSource]);

  // Keep inspectedPair valid inside active basket
  useEffect(() => {
    const setIds = new Set(activeBasketIds);
    const [a, b] = inspectedPair;
    if (!setIds.has(a) || !setIds.has(b) || a === b) {
      if (setIds.has(selectedAssetId)) {
        const other = activeBasketIds.find((id) => id !== selectedAssetId) ?? activeBasketIds[0];
        if (other) setInspectedPair([selectedAssetId, other]);
      } else if (activeBasketIds.length >= 2) {
        setInspectedPair([activeBasketIds[0], activeBasketIds[1]]);
      }
    }
  }, [activeBasketIds, selectedAssetId, inspectedPair]);

  const activeAssetPairExtremes = useMemo(() => {
    const focusId = activeBasketIds.includes(selectedAssetId)
      ? selectedAssetId
      : activeBasketIds[0];
    const rowIdx = activeBasketIds.indexOf(focusId);
    if (rowIdx < 0) return null;

    let lowestId = '';
    let lowestVal = 2;
    let highestId = '';
    let highestVal = -2;

    activeBasketIds.forEach((otherId, colIdx) => {
      if (otherId === focusId) return;
      const val = subMatrix[rowIdx]?.[colIdx] ?? 0;
      if (val < lowestVal) {
        lowestVal = val;
        lowestId = otherId;
      }
      if (val > highestVal) {
        highestVal = val;
        highestId = otherId;
      }
    });

    if (!lowestId || !highestId) return null;
    return { focusId, lowestId, lowestVal, highestId, highestVal };
  }, [activeBasketIds, selectedAssetId, subMatrix]);

  const inspectedValue = useMemo(() => {
    const [a, b] = inspectedPair;
    const i = activeBasketIds.indexOf(a);
    const j = activeBasketIds.indexOf(b);
    if (i < 0 || j < 0) return 0;
    return subMatrix[i]?.[j] ?? 0;
  }, [inspectedPair, activeBasketIds, subMatrix]);

  const inspectedMeta = useMemo(
    () => classifyCorrelation(inspectedValue),
    [inspectedValue]
  );

  const toggleCustomAsset = (id: string) => {
    setCustomIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 3 ? prev.filter((item) => item !== id) : prev;
      }
      if (prev.length >= 8) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const isDarkSurface = themeMode === 'obsidian';

  const getCellStyle = (val: number, isDiagonal: boolean): React.CSSProperties => {
    if (isDiagonal) {
      return {
        backgroundColor: isDarkSurface
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(28,28,30,0.05)',
      };
    }
    const mag = Math.min(1, Math.abs(val));

    if (val >= 0.15) {
      const alpha = isDarkSurface ? 0.12 + mag * 0.36 : 0.09 + mag * 0.30;
      return {
        backgroundColor: `rgba(22, 163, 74, ${alpha.toFixed(2)})`,
      };
    }
    if (val <= -0.15) {
      const alpha = isDarkSurface ? 0.12 + mag * 0.38 : 0.09 + mag * 0.32;
      return {
        backgroundColor: `rgba(220, 38, 38, ${alpha.toFixed(2)})`,
      };
    }
    return {
      backgroundColor: isDarkSurface
        ? 'rgba(148, 163, 184, 0.09)'
        : 'rgba(148, 163, 184, 0.10)',
    };
  };

  const assetA = assetById.get(inspectedPair[0]);
  const assetB = assetById.get(inspectedPair[1]);

  return (
    <section className="rounded-2xl liquid-glass-card p-4 sm:p-5 flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/8 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#0071E3] dark:text-[#38BDF8] shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-[#1C1C1E] dark:text-white">
              Watchlist Correlation Matrix
            </h2>
          </div>
          <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5">
            <span>
              {basket === 'custom' ? 'Custom Watchlist' : BASKET_PRESETS[basket].label}
            </span>
            <span className="mx-1.5 opacity-50">·</span>
            <span className="font-mono tabular-nums">
              {timeframe} Aligned Daily Returns ({correlationSource.sampleDays}d)
            </span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>Click cell to analyze hedge</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-black/5 dark:bg-white/6 border border-black/8 dark:border-white/10">
            {(['1M', '3M'] as const).map((tf) => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] shadow-xs'
                      : 'text-[#4A4D57] dark:text-[#9EB5C8] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          {/* Basket Preset Switcher */}
          <div className="inline-flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'macro', label: 'Macro & Hedges' },
                { id: 'equities', label: 'Indices' },
                { id: 'fx-real', label: 'FX & Real' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((tab) => {
              const active = basket === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBasket(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all ${
                    active
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#111318] border-transparent'
                      : 'liquid-glass-pill text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optional Custom Watchlist Selector */}
      {basket === 'custom' && (
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-black/8 dark:border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] mr-1">
            Pick 3–8 Assets:
          </span>
          {correlationSource.assetIds.map((id) => {
            const selected = customIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCustomAsset(id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                  selected
                    ? 'bg-[#0071E3] dark:bg-[#38BDF8] text-white dark:text-[#0B141E] border-transparent'
                    : 'bg-black/4 dark:bg-white/6 text-[#4A4D57] dark:text-[#9EB5C8] border-black/10 dark:border-white/10 hover:border-[#0071E3]/50'
                }`}
              >
                {shortTickerLabel(id)}
              </button>
            );
          })}
        </div>
      )}

      {/* Symmetric Heatmap Matrix */}
      <div className="overflow-x-auto no-scrollbar">
        <div
          className="grid gap-1 min-w-[540px]"
          style={{
            gridTemplateColumns: `76px repeat(${activeBasketIds.length}, minmax(52px, 1fr))`,
          }}
        >
          {/* Top-Left Corner Legend */}
          <div className="flex items-end pb-1.5 pr-2 text-[10px] font-mono text-[#6C6C70] dark:text-[#9EB5C8]">
            Pair r
          </div>

          {/* Column Headers */}
          {activeBasketIds.map((colId) => {
            const isSelected = colId === selectedAssetId;
            return (
              <button
                key={`col-${colId}`}
                type="button"
                onClick={() => onSelectAsset(colId)}
                title={`Focus ${assetById.get(colId)?.name ?? colId}`}
                className={`pb-1.5 text-center text-[11px] font-mono font-extrabold tracking-tight transition-colors ${
                  isSelected
                    ? 'text-[#0071E3] dark:text-[#38BDF8] underline underline-offset-4'
                    : 'text-[#1C1C1E] dark:text-white hover:text-[#0071E3] dark:hover:text-[#38BDF8]'
                }`}
              >
                {shortTickerLabel(colId)}
              </button>
            );
          })}

          {/* Matrix Rows */}
          {activeBasketIds.map((rowId, rIdx) => {
            const isRowSelected = rowId === selectedAssetId;
            return (
              <React.Fragment key={`row-${rowId}`}>
                <button
                  type="button"
                  onClick={() => onSelectAsset(rowId)}
                  title={`Focus ${assetById.get(rowId)?.name ?? rowId}`}
                  className={`text-left pr-2 py-2 text-[11px] font-mono font-extrabold tracking-tight truncate transition-colors ${
                    isRowSelected
                      ? 'text-[#0071E3] dark:text-[#38BDF8]'
                      : 'text-[#1C1C1E] dark:text-white hover:text-[#0071E3] dark:hover:text-[#38BDF8]'
                  }`}
                >
                  {shortTickerLabel(rowId)}
                </button>

                {activeBasketIds.map((colId, cIdx) => {
                  const val = subMatrix[rIdx]?.[cIdx] ?? 0;
                  const isDiagonal = rIdx === cIdx;
                  const isInspected =
                    !isDiagonal &&
                    ((inspectedPair[0] === rowId && inspectedPair[1] === colId) ||
                      (inspectedPair[0] === colId && inspectedPair[1] === rowId));

                  return (
                    <button
                      key={`cell-${rowId}-${colId}`}
                      type="button"
                      disabled={isDiagonal}
                      onClick={() => !isDiagonal && setInspectedPair([rowId, colId])}
                      style={getCellStyle(val, isDiagonal)}
                      title={
                        isDiagonal
                          ? rowId
                          : `${rowId} vs ${colId}: r = ${val >= 0 ? '+' : ''}${val.toFixed(2)}`
                      }
                      className={`h-9 rounded-lg flex items-center justify-center text-[11px] font-mono tabular-nums font-bold transition-transform border ${
                        isDiagonal
                          ? 'text-[#4A4D57] dark:text-[#A2B7CC] border-transparent cursor-default'
                          : isInspected
                            ? 'ring-2 ring-[#0071E3] dark:ring-[#38BDF8] border-transparent text-[#1C1C1E] dark:text-white scale-[1.03] z-10'
                            : 'border-black/6 dark:border-white/6 text-[#1C1C1E] dark:text-white hover:border-[#0071E3]/60 dark:hover:border-[#38BDF8]/60'
                      }`}
                    >
                      {isDiagonal
                        ? '1.00'
                        : `${val >= 0 ? '+' : ''}${val.toFixed(2)}`}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Color Scale + Focus Asset Quick Extremes */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[#C41C16] dark:text-[#FF6B63] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]/60" />
            -1.0 Hedge
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#94A3B8]/35" />
            0.0 Neutral
          </span>
          <span className="inline-flex items-center gap-1 text-[#0F7033] dark:text-[#4ADE80] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]/60" />
            +1.0 Lockstep
          </span>
        </div>

        {activeAssetPairExtremes && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setInspectedPair([
                  activeAssetPairExtremes.focusId,
                  activeAssetPairExtremes.lowestId,
                ])
              }
              className="hover:underline text-left"
            >
              Best Hedge for {shortTickerLabel(activeAssetPairExtremes.focusId)}:{' '}
              <strong className="text-[#C41C16] dark:text-[#FF6B63]">
                {shortTickerLabel(activeAssetPairExtremes.lowestId)} (
                {activeAssetPairExtremes.lowestVal >= 0 ? '+' : ''}
                {activeAssetPairExtremes.lowestVal.toFixed(2)})
              </strong>
            </button>
            <button
              type="button"
              onClick={() =>
                setInspectedPair([
                  activeAssetPairExtremes.focusId,
                  activeAssetPairExtremes.highestId,
                ])
              }
              className="hover:underline text-left"
            >
              Top Co-Mover:{' '}
              <strong className="text-[#0F7033] dark:text-[#4ADE80]">
                {shortTickerLabel(activeAssetPairExtremes.highestId)} (
                {activeAssetPairExtremes.highestVal >= 0 ? '+' : ''}
                {activeAssetPairExtremes.highestVal.toFixed(2)})
              </strong>
            </button>
          </div>
        )}
      </div>

      {/* Selected Pair Hedging & Diversification Insight Strip */}
      <div className="pt-3 border-t border-black/8 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#38BDF8] shrink-0" />
            <span className="font-extrabold text-[#1C1C1E] dark:text-white">
              {assetA?.symbol ?? inspectedPair[0]} vs {assetB?.symbol ?? inspectedPair[1]}
            </span>
            <span className={`font-mono tabular-nums font-extrabold ${inspectedMeta.toneClass}`}>
              r = {inspectedValue >= 0 ? '+' : ''}
              {inspectedValue.toFixed(2)}
            </span>
            <span className="text-[11px] font-semibold text-[#6C6C70] dark:text-[#9EB5C8]">
              · {inspectedMeta.regime}
            </span>
          </div>
          <p className="text-xs text-[#4A4D57] dark:text-[#C2D4E2] mt-1 leading-relaxed">
            {inspectedMeta.advice}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectAsset(inspectedPair[0])}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-glass-pill text-[11px] font-bold text-[#1C1C1E] dark:text-white hover:border-[#0071E3]/60"
          >
            <span>{shortTickerLabel(inspectedPair[0])}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSelectAsset(inspectedPair[1])}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-glass-pill text-[11px] font-bold text-[#1C1C1E] dark:text-white hover:border-[#0071E3]/60"
          >
            <span>{shortTickerLabel(inspectedPair[1])}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
};
