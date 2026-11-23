import {
  BandarmologyAnalysis,
  BandarmologyPhase,
  PriceAlertItem,
  StockMover,
  StocksMoversBucket,
} from '../types/market';

export const BANDAR_PHASE_STORAGE_KEY = 'stocks_idx_bandarmology_phases_v1';
export const BANDAR_SHIFT_COOLDOWN_MS = 10 * 60 * 1000;

export interface BandarmologyQuoteSnapshot {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  changePercent: number;
  bandarmology: BandarmologyAnalysis;
}

export interface BandarmologyShiftCooldown {
  triggeredAt: number;
  fromPhase: BandarmologyPhase;
  toPhase: BandarmologyPhase;
}

export function isAccumulationTargetPhase(
  phase: BandarmologyPhase | undefined
): phase is 'Early Accumulation' | 'Strong Accumulation' {
  return phase === 'Early Accumulation' || phase === 'Strong Accumulation';
}

export function extractUniqueIdxBandarmologyStocks(
  idxBucket?: StocksMoversBucket | null
): BandarmologyQuoteSnapshot[] {
  if (!idxBucket) return [];
  const allLists: StockMover[][] = [
    idxBucket.impact ?? [],
    idxBucket.gainers ?? [],
    idxBucket.losers ?? [],
    idxBucket.foreignBuy ?? [],
    idxBucket.foreignSell ?? [],
  ];
  const bySymbol = new Map<string, BandarmologyQuoteSnapshot>();

  for (const list of allLists) {
    for (const stock of list) {
      if (stock.market !== 'ID' || !stock.bandarmology) continue;
      const sym = stock.symbol.replace(/\.JK$/i, '').toUpperCase();
      if (!sym || bySymbol.has(sym)) continue;
      bySymbol.set(sym, {
        symbol: sym,
        name: stock.name,
        price: stock.price,
        prevClose: stock.prevClose,
        changePercent: stock.changePercent,
        bandarmology: stock.bandarmology,
      });
    }
  }
  return Array.from(bySymbol.values());
}

export function loadPersistedBandarPhases(): Record<string, BandarmologyPhase> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BANDAR_PHASE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const validPhases = new Set<BandarmologyPhase>([
      'Strong Accumulation',
      'Early Accumulation',
      'Neutral',
      'Early Distribution',
      'Strong Distribution',
    ]);
    const clean: Record<string, BandarmologyPhase> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && validPhases.has(v as BandarmologyPhase)) {
        clean[k.toUpperCase()] = v as BandarmologyPhase;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function savePersistedBandarPhases(phases: Record<string, BandarmologyPhase>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BANDAR_PHASE_STORAGE_KEY, JSON.stringify(phases));
  } catch {
    // ignore storage quota errors
  }
}

export function buildBandarmologyAlertItem(
  stock: BandarmologyQuoteSnapshot,
  fromPhase: BandarmologyPhase,
  toPhase: BandarmologyPhase,
  now = Date.now()
): PriceAlertItem {
  const isUpgrade =
    fromPhase === 'Early Accumulation' && toPhase === 'Strong Accumulation';
  const cleanSym = stock.symbol.replace(/\.JK$/i, '').toUpperCase();

  return {
    id: `bandar-${cleanSym}-${isUpgrade ? 'up' : 'mod'}-${now}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    assetId: `${cleanSym}.JK`,
    symbol: cleanSym,
    name: stock.name,
    direction: isUpgrade ? 'surge' : 'drop',
    movePercent: Number(stock.changePercent.toFixed(2)),
    windowMinutes: 1,
    fromPrice: stock.prevClose > 0 ? stock.prevClose : stock.price,
    toPrice: stock.price,
    decimals: 0,
    currencyPrefix: 'Rp ',
    triggeredAt: now,
    read: false,
    alertKind: 'bandarmology',
    bandarFromPhase: fromPhase,
    bandarToPhase: toPhase,
    bandarScore: stock.bandarmology.score,
    bandarVolumeRatio: stock.bandarmology.volumeRatio,
    bandarAccPressure: stock.bandarmology.accumulationPressure,
    bandarForeignBias: stock.bandarmology.foreignBias,
  };
}

export function detectBandarmologyAccumulationShifts(
  stocks: BandarmologyQuoteSnapshot[],
  prevPhases: Record<string, BandarmologyPhase>,
  cooldownMap: Record<string, BandarmologyShiftCooldown>,
  now = Date.now()
): {
  triggeredAlerts: PriceAlertItem[];
  nextPhases: Record<string, BandarmologyPhase>;
  nextCooldowns: Record<string, BandarmologyShiftCooldown>;
} {
  const triggeredAlerts: PriceAlertItem[] = [];
  const nextPhases: Record<string, BandarmologyPhase> = { ...prevPhases };
  const nextCooldowns: Record<string, BandarmologyShiftCooldown> = { ...cooldownMap };

  for (const stock of stocks) {
    const sym = stock.symbol.replace(/\.JK$/i, '').toUpperCase();
    const curPhase = stock.bandarmology.phase;
    const prevPhase = prevPhases[sym];

    if (
      prevPhase &&
      prevPhase !== curPhase &&
      isAccumulationTargetPhase(prevPhase) &&
      isAccumulationTargetPhase(curPhase)
    ) {
      const cd = cooldownMap[sym];
      const samePairWithinCooldown =
        cd &&
        now - cd.triggeredAt < BANDAR_SHIFT_COOLDOWN_MS &&
        cd.fromPhase === prevPhase &&
        cd.toPhase === curPhase;

      if (!samePairWithinCooldown) {
        nextCooldowns[sym] = {
          triggeredAt: now,
          fromPhase: prevPhase,
          toPhase: curPhase,
        };
        triggeredAlerts.push(
          buildBandarmologyAlertItem(stock, prevPhase, curPhase, now)
        );
      }
    }

    nextPhases[sym] = curPhase;
  }

  return { triggeredAlerts, nextPhases, nextCooldowns };
}
