import { MarketAsset } from '../types/market';

export function formatAssetPrice(asset: MarketAsset): string {
  if (!Number.isFinite(asset.price) || asset.price <= 0) return '—';
  const numStr = asset.price.toLocaleString('en-US', {
    minimumFractionDigits: asset.decimals,
    maximumFractionDigits: asset.decimals,
  });
  return `${asset.currencyPrefix ?? ''}${numStr}${asset.unitSuffix ?? ''}`;
}

export function formatAssetPrevClose(asset: MarketAsset): string {
  if (!Number.isFinite(asset.prevClose) || asset.prevClose <= 0) return '—';
  const numStr = asset.prevClose.toLocaleString('en-US', {
    minimumFractionDigits: asset.decimals,
    maximumFractionDigits: asset.decimals,
  });
  return `${asset.currencyPrefix ?? ''}${numStr}${asset.unitSuffix ?? ''}`;
}

export function formatChangeBadge(asset: MarketAsset, isPercentMode: boolean): string {
  if (!Number.isFinite(asset.price) || asset.price <= 0 || !Number.isFinite(asset.changePercent)) return '—';
  const isPos = asset.changePercent >= 0;
  const sign = isPos ? '+' : '';
  if (isPercentMode) {
    return `${sign}${asset.changePercent.toFixed(2)}%`;
  }
  const valDecimals = asset.decimals >= 3 ? asset.decimals : 2;
  const absFormatted = Math.abs(asset.changeValue).toLocaleString('en-US', {
    minimumFractionDigits: valDecimals,
    maximumFractionDigits: valDecimals,
  });
  return `${isPos ? '+' : '-'}${absFormatted}`;
}

export function formatFullDelta(asset: MarketAsset): string {
  if (!Number.isFinite(asset.price) || asset.price <= 0 || !Number.isFinite(asset.changePercent)) return '—';
  const isPos = asset.changePercent >= 0;
  const sign = isPos ? '+' : '-';
  const valDecimals = asset.decimals >= 3 ? asset.decimals : 2;
  const absFormatted = Math.abs(asset.changeValue).toLocaleString('en-US', {
    minimumFractionDigits: valDecimals,
    maximumFractionDigits: valDecimals,
  });
  const pctSign = isPos ? '+' : '';
  return `${sign}${absFormatted} (${pctSign}${asset.changePercent.toFixed(2)}%)`;
}

export function formatWibClock(date: Date): { full: string; short: string } {
  const wibDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  const wibShortDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);

  const wibTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return {
    full: `${wibDate} · ${wibTime} WIB (UTC+7)`,
    short: `${wibShortDate} · ${wibTime} WIB`,
  };
}
