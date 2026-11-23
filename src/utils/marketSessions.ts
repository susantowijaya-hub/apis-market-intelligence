import { WatchlistCategory } from '../types/market';

export type SessionStateTone = 'open' | 'extended' | 'break' | 'closed';

export interface MarketSessionStatus {
  id: 'us' | 'idx' | 'asia' | 'crypto';
  label: string;
  shortLabel: string;
  stateLabel: string;
  detail: string;
  tone: SessionStateTone;
  isLiveRunning: boolean;
}

function getTzClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const totalMin = hour * 60 + minute;
  return { weekday, hour, minute, isWeekend, totalMin };
}

function getSingleIndexSession(assetId: string, now: Date): MarketSessionStatus | null {
  if (assetId === 'SPX' || assetId === 'IXIC' || assetId === 'DJI' || assetId === 'EIDO') {
    const ny = getTzClock(now, 'America/New_York');
    const isEtf = assetId === 'EIDO';
    const label = isEtf ? 'NYSE Arca · EIDO ETF' : 'US Equities (NYSE/NASDAQ)';
    const shortLabel = isEtf ? 'NYSE' : 'US';
    if (ny.isWeekend) {
      return {
        id: 'us',
        label,
        shortLabel,
        stateLabel: 'Closed',
        detail: 'Weekend · Opens Mon 21:30 WIB',
        tone: 'closed',
        isLiveRunning: false,
      };
    }
    if (ny.totalMin >= 9 * 60 + 30 && ny.totalMin < 16 * 60) {
      return {
        id: 'us',
        label,
        shortLabel,
        stateLabel: 'Open',
        detail: 'Regular Session · Closes 04:00 WIB',
        tone: 'open',
        isLiveRunning: true,
      };
    }
    if (ny.totalMin >= 4 * 60 && ny.totalMin < 9 * 60 + 30) {
      return {
        id: 'us',
        label,
        shortLabel,
        stateLabel: 'Pre-Market',
        detail: 'Extended Hours · Regular 21:30 WIB',
        tone: 'extended',
        isLiveRunning: true,
      };
    }
    if (ny.totalMin >= 16 * 60 && ny.totalMin < 20 * 60) {
      return {
        id: 'us',
        label,
        shortLabel,
        stateLabel: 'After-Hours',
        detail: 'Extended Trading · Ends 08:00 WIB',
        tone: 'extended',
        isLiveRunning: true,
      };
    }
    return {
      id: 'us',
      label,
      shortLabel,
      stateLabel: 'Closed',
      detail: 'Last Session Close · Next 21:30 WIB',
      tone: 'closed',
      isLiveRunning: false,
    };
  }

  if (assetId === 'IHSG') {
    const jkt = getTzClock(now, 'Asia/Jakarta');
    const isFri = jkt.weekday === 'Fri';
    const lunchStart = isFri ? 11 * 60 + 30 : 12 * 60;
    const lunchEnd = isFri ? 14 * 60 : 13 * 60 + 30;
    if (jkt.isWeekend) {
      return {
        id: 'idx',
        label: 'Indonesia (IDX)',
        shortLabel: 'IDX',
        stateLabel: 'Closed',
        detail: 'Weekend · Opens Mon 09:00 WIB',
        tone: 'closed',
        isLiveRunning: false,
      };
    }
    if (jkt.totalMin >= 9 * 60 && jkt.totalMin < lunchStart) {
      return {
        id: 'idx',
        label: 'Indonesia (IDX)',
        shortLabel: 'IDX',
        stateLabel: 'Open (Ses I)',
        detail: `Running Session · Break ${isFri ? '11:30' : '12:00'} WIB`,
        tone: 'open',
        isLiveRunning: true,
      };
    }
    if (jkt.totalMin >= lunchStart && jkt.totalMin < lunchEnd) {
      return {
        id: 'idx',
        label: 'Indonesia (IDX)',
        shortLabel: 'IDX',
        stateLabel: 'Lunch Break',
        detail: `Resumes ${isFri ? '14:00' : '13:30'} WIB`,
        tone: 'break',
        isLiveRunning: false,
      };
    }
    if (jkt.totalMin >= lunchEnd && jkt.totalMin < 16 * 60) {
      return {
        id: 'idx',
        label: 'Indonesia (IDX)',
        shortLabel: 'IDX',
        stateLabel: 'Open (Ses II)',
        detail: 'Running Session · Closes 16:00 WIB',
        tone: 'open',
        isLiveRunning: true,
      };
    }
    return {
      id: 'idx',
      label: 'Indonesia (IDX)',
      shortLabel: 'IDX',
      stateLabel: 'Closed',
      detail: 'Last Session Close · Opens 09:00 WIB',
      tone: 'closed',
      isLiveRunning: false,
    };
  }

  if (assetId === 'HSI') {
    const hkg = getTzClock(now, 'Asia/Hong_Kong');
    if (hkg.isWeekend) {
      return {
        id: 'asia',
        label: 'HKEX Hong Kong',
        shortLabel: 'HKEX',
        stateLabel: 'Closed',
        detail: 'Weekend · Opens Mon 08:30 WIB',
        tone: 'closed',
        isLiveRunning: false,
      };
    }
    if (hkg.totalMin >= 9 * 60 + 30 && hkg.totalMin < 12 * 60) {
      return {
        id: 'asia',
        label: 'HKEX Hong Kong',
        shortLabel: 'HKEX',
        stateLabel: 'Open (AM)',
        detail: 'Morning Session Active',
        tone: 'open',
        isLiveRunning: true,
      };
    }
    if (hkg.totalMin >= 12 * 60 && hkg.totalMin < 13 * 60) {
      return {
        id: 'asia',
        label: 'HKEX Hong Kong',
        shortLabel: 'HKEX',
        stateLabel: 'Lunch Break',
        detail: 'Resumes 12:00 WIB',
        tone: 'break',
        isLiveRunning: false,
      };
    }
    if (hkg.totalMin >= 13 * 60 && hkg.totalMin < 16 * 60) {
      return {
        id: 'asia',
        label: 'HKEX Hong Kong',
        shortLabel: 'HKEX',
        stateLabel: 'Open (PM)',
        detail: 'Afternoon Session · Closes 15:00 WIB',
        tone: 'open',
        isLiveRunning: true,
      };
    }
    return {
      id: 'asia',
      label: 'HKEX Hong Kong',
      shortLabel: 'HKEX',
      stateLabel: 'Closed',
      detail: 'Last Session Close · Opens 08:30 WIB',
      tone: 'closed',
      isLiveRunning: false,
    };
  }

  if (assetId === 'TAIEX') {
    const tw = getTzClock(now, 'Asia/Taipei');
    const open = !tw.isWeekend && tw.totalMin >= 9 * 60 && tw.totalMin < 13 * 60 + 30;
    return {
      id: 'asia',
      label: 'TWSE Taiwan',
      shortLabel: 'TWSE',
      stateLabel: open ? 'Open' : 'Closed',
      detail: open ? 'Taipei Session Active · Closes 12:30 WIB' : 'Opens 08:00 WIB',
      tone: open ? 'open' : 'closed',
      isLiveRunning: open,
    };
  }

  if (assetId === 'KOSPI') {
    const kr = getTzClock(now, 'Asia/Seoul');
    const open = !kr.isWeekend && kr.totalMin >= 9 * 60 && kr.totalMin < 15 * 60 + 30;
    return {
      id: 'asia',
      label: 'KRX Korea',
      shortLabel: 'KRX',
      stateLabel: open ? 'Open' : 'Closed',
      detail: open ? 'Seoul Session Active · Closes 13:30 WIB' : 'Opens 07:00 WIB',
      tone: open ? 'open' : 'closed',
      isLiveRunning: open,
    };
  }

  if (assetId === 'SSEC') {
    const cn = getTzClock(now, 'Asia/Shanghai');
    if (!cn.isWeekend && cn.totalMin >= 9 * 60 + 30 && cn.totalMin < 11 * 60 + 30) {
      return {
        id: 'asia',
        label: 'SSE Shanghai',
        shortLabel: 'SSE',
        stateLabel: 'Open (AM)',
        detail: 'Morning Session · Break 10:30 WIB',
        tone: 'open',
        isLiveRunning: true,
      };
    }
    if (!cn.isWeekend && cn.totalMin >= 11 * 60 + 30 && cn.totalMin < 13 * 60) {
      return {
        id: 'asia',
        label: 'SSE Shanghai',
        shortLabel: 'SSE',
        stateLabel: 'Lunch Break',
        detail: 'Resumes 12:00 WIB',
        tone: 'break',
        isLiveRunning: false,
      };
    }
    if (!cn.isWeekend && cn.totalMin >= 13 * 60 && cn.totalMin < 15 * 60) {
      return {
        id: 'asia',
        label: 'SSE Shanghai',
        shortLabel: 'SSE',
        stateLabel: 'Open (PM)',
        detail: 'Afternoon Session · Closes 14:00 WIB',
        tone: 'open',
        isLiveRunning: true,
      };
    }
    return {
      id: 'asia',
      label: 'SSE Shanghai',
      shortLabel: 'SSE',
      stateLabel: 'Closed',
      detail: 'Opens 08:30 WIB',
      tone: 'closed',
      isLiveRunning: false,
    };
  }

  if (assetId === 'NIFTY') {
    const ist = getTzClock(now, 'Asia/Kolkata');
    const open = !ist.isWeekend && ist.totalMin >= 9 * 60 + 15 && ist.totalMin < 15 * 60 + 30;
    return {
      id: 'asia',
      label: 'NSE India',
      shortLabel: 'NSE',
      stateLabel: open ? 'Open' : 'Closed',
      detail: open ? 'Mumbai Session Active · Closes 17:00 WIB' : 'Opens 10:45 WIB',
      tone: open ? 'open' : 'closed',
      isLiveRunning: open,
    };
  }

  return null;
}

export function isIndexOpenSession(assetId: string, now: Date): boolean {
  const s = getSingleIndexSession(assetId, now);
  return s !== null && s.tone === 'open';
}

export function getAllMarketSessions(
  now: Date
): Record<'us' | 'idx' | 'asia' | 'crypto', MarketSessionStatus> {
  const us = getSingleIndexSession('SPX', now)!;
  const idx = getSingleIndexSession('IHSG', now)!;

  const asiaOpenCount = ['HSI', 'TAIEX', 'KOSPI', 'SSEC', 'NIFTY'].filter((id) =>
    isIndexOpenSession(id, now)
  ).length;

  const asia: MarketSessionStatus =
    asiaOpenCount > 0
      ? {
          id: 'asia',
          label: 'Asia-Pacific',
          shortLabel: 'Asia',
          stateLabel: `Open (${asiaOpenCount})`,
          detail: 'Regional Exchanges Active',
          tone: 'open',
          isLiveRunning: true,
        }
      : {
          id: 'asia',
          label: 'Asia-Pacific',
          shortLabel: 'Asia',
          stateLabel: 'Closed',
          detail: 'Regional Session Closed',
          tone: 'closed',
          isLiveRunning: false,
        };

  const crypto: MarketSessionStatus = {
    id: 'crypto',
    label: 'Crypto & Spot FX',
    shortLabel: '24/7',
    stateLabel: 'Live 24/7',
    detail: 'Continuous Global Trading',
    tone: 'open',
    isLiveRunning: true,
  };

  return { us, idx, asia, crypto };
}

export function getAssetSessionStatus(
  assetId: string,
  category: WatchlistCategory,
  now: Date
): MarketSessionStatus {
  const indexSpecific = getSingleIndexSession(assetId, now);
  if (indexSpecific) {
    return indexSpecific;
  }
  const sessions = getAllMarketSessions(now);
  if (assetId === 'BTCUSD' || assetId === 'ETHUSD') {
    return sessions.crypto;
  }
  if (category === 'us-indices') {
    return sessions.us;
  }
  if (category === 'asia-indices') {
    return sessions.asia;
  }
  const ny = getTzClock(now, 'America/New_York');
  const isWeekendClosed =
    (ny.weekday === 'Fri' && ny.totalMin >= 17 * 60) ||
    ny.weekday === 'Sat' ||
    (ny.weekday === 'Sun' && ny.totalMin < 18 * 60);
  return {
    id: 'us',
    label: 'Global 24/5 Market',
    shortLabel: 'Global',
    stateLabel: isWeekendClosed ? 'Closed' : 'Open (24/5)',
    detail: isWeekendClosed ? 'Weekend Pause · Opens Mon 05:00 WIB' : 'Continuous Electronic Session',
    tone: isWeekendClosed ? 'closed' : 'open',
    isLiveRunning: !isWeekendClosed,
  };
}

export function getSessionProgressRatio(assetId: string, now: Date): number {
  const clamp = (v: number) => Math.max(0.08, Math.min(1, v));

  if (assetId === 'SPX' || assetId === 'IXIC' || assetId === 'DJI' || assetId === 'EIDO') {
    const ny = getTzClock(now, 'America/New_York');
    if (ny.isWeekend) return 1;
    if (ny.totalMin >= 9 * 60 + 30 && ny.totalMin < 16 * 60) {
      return clamp((ny.totalMin - (9 * 60 + 30)) / 390);
    }
    return 1;
  }

  if (assetId === 'IHSG') {
    const jkt = getTzClock(now, 'Asia/Jakarta');
    if (jkt.isWeekend) return 1;
    if (jkt.totalMin >= 9 * 60 && jkt.totalMin < 16 * 60) {
      return clamp((jkt.totalMin - 9 * 60) / (7 * 60));
    }
    return 1;
  }

  if (assetId === 'HSI') {
    const hkg = getTzClock(now, 'Asia/Hong_Kong');
    if (hkg.isWeekend) return 1;
    if (hkg.totalMin >= 9 * 60 + 30 && hkg.totalMin < 16 * 60) {
      return clamp((hkg.totalMin - (9 * 60 + 30)) / (6 * 60 + 30));
    }
    return 1;
  }

  if (assetId === 'TAIEX') {
    const tw = getTzClock(now, 'Asia/Taipei');
    if (!tw.isWeekend && tw.totalMin >= 9 * 60 && tw.totalMin < 13 * 60 + 30) {
      return clamp((tw.totalMin - 9 * 60) / 270);
    }
    return 1;
  }

  if (assetId === 'KOSPI') {
    const kr = getTzClock(now, 'Asia/Seoul');
    if (!kr.isWeekend && kr.totalMin >= 9 * 60 && kr.totalMin < 15 * 60 + 30) {
      return clamp((kr.totalMin - 9 * 60) / 390);
    }
    return 1;
  }

  if (assetId === 'SSEC') {
    const cn = getTzClock(now, 'Asia/Shanghai');
    if (!cn.isWeekend && cn.totalMin >= 9 * 60 + 30 && cn.totalMin < 15 * 60) {
      return clamp((cn.totalMin - (9 * 60 + 30)) / 330);
    }
    return 1;
  }

  if (assetId === 'NIFTY') {
    const ist = getTzClock(now, 'Asia/Kolkata');
    if (!ist.isWeekend && ist.totalMin >= 9 * 60 + 15 && ist.totalMin < 15 * 60 + 30) {
      return clamp((ist.totalMin - (9 * 60 + 15)) / 375);
    }
    return 1;
  }

  if (assetId === 'BTCUSD' || assetId === 'ETHUSD') {
    const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    return clamp(utcMins / 1440);
  }

  if (
    assetId === 'DXY' ||
    assetId === 'USDIDR' ||
    assetId === 'EURUSD' ||
    assetId === 'GBPUSD' ||
    assetId === 'USDJPY' ||
    assetId === 'AUDUSD' ||
    assetId === 'USDCHF' ||
    assetId === 'USDCAD' ||
    assetId === 'NZDUSD' ||
    assetId === 'USDCNY'
  ) {
    const ny = getTzClock(now, 'America/New_York');
    const isWeekendClosed =
      (ny.weekday === 'Fri' && ny.totalMin >= 17 * 60) ||
      ny.weekday === 'Sat' ||
      (ny.weekday === 'Sun' && ny.totalMin < 18 * 60);
    return isWeekendClosed ? 1 : clamp(((ny.hour * 60 + ny.minute + 360) % 1440) / 1440);
  }

  return 1;
}

export type DashboardRegionTab = 'all' | 'us' | 'asia' | 'commodities' | 'currencies';

export function getRegionStatusSummary(
  region: DashboardRegionTab,
  now: Date
): { text: string; isOpen: boolean } {
  const sessions = getAllMarketSessions(now);

  if (region === 'us') {
    if (sessions.us.tone === 'open') {
      return { text: 'US markets are open · 1s live feed', isOpen: true };
    }
    if (sessions.us.tone === 'extended') {
      return { text: `US ${sessions.us.stateLabel.toLowerCase()} · Last regular close held`, isOpen: false };
    }
    return { text: 'US markets are closed · Showing last close', isOpen: false };
  }

  if (region === 'asia') {
    const asiaAny = sessions.idx.tone === 'open' || sessions.asia.tone === 'open';
    if (asiaAny) {
      return { text: 'Some Asian markets are open · 1s live feed', isOpen: true };
    }
    return { text: 'Asian markets are closed · Showing last close', isOpen: false };
  }

  if (region === 'commodities') {
    return { text: 'Crypto 24/7 & Commodities electronic session live', isOpen: true };
  }

  if (region === 'currencies') {
    const anyFxOpen = sessions.crypto.isLiveRunning;
    return {
      text: anyFxOpen ? 'Global FX & Sovereign Yields active' : 'FX & Bond markets closed',
      isOpen: anyFxOpen,
    };
  }

  const anyOpen = sessions.us.tone === 'open' || sessions.idx.tone === 'open' || sessions.asia.tone === 'open';
  if (sessions.us.tone === 'open') {
    return { text: 'US markets are open · 1s live feed active', isOpen: true };
  }
  if (sessions.idx.tone === 'open' || sessions.asia.tone === 'open') {
    return { text: 'Some Asian markets are open · US closed (last settle)', isOpen: true };
  }
  return {
    text: anyOpen ? 'Global markets active' : 'Cash equity markets closed · 24/7 Crypto live',
    isOpen: false,
  };
}
