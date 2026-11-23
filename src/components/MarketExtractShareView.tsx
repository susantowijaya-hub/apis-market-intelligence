import { apiUrl } from '../lib/api';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Check,
  Clock,
  Copy,
  DollarSign,
  Download,
  Gem,
  Globe2,
  Image as ImageIcon,
  Landmark,
  Loader2,
  Lock,
  MessageSquareText,
  RefreshCw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  TrendingUp,
} from 'lucide-react';
import {
  MarketAsset,
  MarketIntelligenceResponse,
  ShareScheduleSlot,
  ShareSnapshotAsset,
  ShareSnapshotResponse,
  StocksMoversBucket,
} from '../types/market';

interface MarketExtractShareViewProps {
  assets: MarketAsset[];
  marketIntelligence: MarketIntelligenceResponse | null;
  usBucket: StocksMoversBucket;
  idxBucket: StocksMoversBucket;
  feedsLive?: boolean;
  onRefreshIntelligence?: () => void;
}

type TextFormatMode = 'whatsapp' | 'telegram' | 'plain';
type PosterAspect = 'story' | 'portrait' | 'square';
type PosterTheme = 'apple-gold' | 'champagne-glass' | 'obsidian-glass';

interface PosterThemePalette {
  id: PosterTheme;
  label: string;
  isLight: boolean;
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  bloomGoldTop: string;
  bloomGoldBottom: string;
  ambientSheen: string;
  glassFillTop: string;
  glassFillBottom: string;
  glassSpecular: string;
  glassBorder: string;
  iconBg: string;
  iconBorder: string;
  iconStroke: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  goldAccent: string;
  goldSoft: string;
  gainBg: string;
  gainBorder: string;
  gainText: string;
  lossBg: string;
  lossBorder: string;
  lossText: string;
}

const POSTER_THEMES: Record<PosterTheme, PosterThemePalette> = {
  'apple-gold': {
    id: 'apple-gold',
    label: 'Apple Gold Glass',
    isLight: false,
    bgTop: '#14100A',
    bgMid: '#0D0B08',
    bgBottom: '#060504',
    bloomGoldTop: 'rgba(236, 196, 118, 0.28)',
    bloomGoldBottom: 'rgba(196, 146, 62, 0.16)',
    ambientSheen: 'rgba(255, 240, 200, 0.06)',
    glassFillTop: 'rgba(255, 246, 224, 0.095)',
    glassFillBottom: 'rgba(255, 242, 210, 0.032)',
    glassSpecular: 'rgba(255, 244, 214, 0.46)',
    glassBorder: 'rgba(232, 194, 118, 0.32)',
    iconBg: 'rgba(232, 194, 118, 0.16)',
    iconBorder: 'rgba(232, 194, 118, 0.40)',
    iconStroke: '#F4D594',
    textPrimary: '#FCF8EE',
    textSecondary: '#E7DFCD',
    textMuted: '#B8AB94',
    goldAccent: '#ECC476',
    goldSoft: 'rgba(236, 196, 118, 0.16)',
    gainBg: 'rgba(34, 197, 94, 0.24)',
    gainBorder: 'rgba(74, 222, 128, 0.65)',
    gainText: '#4ADE80',
    lossBg: 'rgba(239, 68, 68, 0.24)',
    lossBorder: 'rgba(251, 113, 133, 0.65)',
    lossText: '#FF7078',
  },
  'champagne-glass': {
    id: 'champagne-glass',
    label: 'Frosted Champagne',
    isLight: true,
    bgTop: '#FBF7EE',
    bgMid: '#F3EBDC',
    bgBottom: '#E9DEC8',
    bloomGoldTop: 'rgba(218, 174, 92, 0.22)',
    bloomGoldBottom: 'rgba(184, 134, 48, 0.12)',
    ambientSheen: 'rgba(255, 255, 255, 0.55)',
    glassFillTop: 'rgba(255, 255, 255, 0.80)',
    glassFillBottom: 'rgba(255, 251, 242, 0.56)',
    glassSpecular: 'rgba(255, 255, 255, 0.96)',
    glassBorder: 'rgba(186, 145, 72, 0.30)',
    iconBg: 'rgba(186, 145, 72, 0.14)',
    iconBorder: 'rgba(186, 145, 72, 0.34)',
    iconStroke: '#9A6F22',
    textPrimary: '#1A1610',
    textSecondary: '#3E362B',
    textMuted: '#6D6252',
    goldAccent: '#A67824',
    goldSoft: 'rgba(166, 120, 36, 0.11)',
    gainBg: 'rgba(22, 163, 74, 0.16)',
    gainBorder: 'rgba(21, 128, 61, 0.45)',
    gainText: '#0F7033',
    lossBg: 'rgba(220, 38, 38, 0.15)',
    lossBorder: 'rgba(185, 28, 28, 0.45)',
    lossText: '#B91C1C',
  },
  'obsidian-glass': {
    id: 'obsidian-glass',
    label: 'Liquid Onyx Gold',
    isLight: false,
    bgTop: '#0E1219',
    bgMid: '#090C11',
    bgBottom: '#040508',
    bloomGoldTop: 'rgba(229, 193, 123, 0.20)',
    bloomGoldBottom: 'rgba(96, 165, 250, 0.14)',
    ambientSheen: 'rgba(255, 255, 255, 0.04)',
    glassFillTop: 'rgba(255, 255, 255, 0.09)',
    glassFillBottom: 'rgba(255, 255, 255, 0.028)',
    glassSpecular: 'rgba(255, 255, 255, 0.38)',
    glassBorder: 'rgba(229, 193, 123, 0.26)',
    iconBg: 'rgba(229, 193, 123, 0.14)',
    iconBorder: 'rgba(229, 193, 123, 0.34)',
    iconStroke: '#E5C17B',
    textPrimary: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    goldAccent: '#E5C17B',
    goldSoft: 'rgba(229, 193, 123, 0.14)',
    gainBg: 'rgba(34, 197, 94, 0.24)',
    gainBorder: 'rgba(74, 222, 128, 0.62)',
    gainText: '#4ADE80',
    lossBg: 'rgba(239, 68, 68, 0.24)',
    lossBorder: 'rgba(251, 113, 133, 0.62)',
    lossText: '#FF7078',
  },
};

const ASPECT_SPECS: Record<
  PosterAspect,
  { label: string; width: number; height: number; tag: string }
> = {
  story: { label: 'IG Story (9:16)', width: 1080, height: 1920, tag: '1080×1920' },
  portrait: { label: 'IG Feed (4:5)', width: 1080, height: 1350, tag: '1080×1350' },
  square: { label: 'Square (1:1)', width: 1080, height: 1080, tag: '1080×1080' },
};

const STORAGE_PREFIX = 'market-share-ts-v4:';

const DISPLAY_INSTRUMENT_NAMES: Record<string, string> = {
  SPX: 'S&P 500',
  IXIC: 'NASDAQ',
  DJI: 'Dow Jones',
  IHSG: 'IDX Composite',
  BTCUSD: 'Bitcoin',
  DXY: 'US Dollar Index',
  USDIDR: 'USD / IDR',
  XAUUSD: 'Spot Gold',
};

function getDefaultJakartaSlot(now: Date): ShareScheduleSlot {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const totalMin = hour * 60 + minute;
  return totalMin >= 16 * 60 + 30 || totalMin < 5 * 60 + 30 ? 'afternoon_1630' : 'morning_0530';
}

function getJakartaDateKey(now: Date, slot: ShareScheduleSlot): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '11');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '20');

  const targetHourWib = slot === 'morning_0530' ? 5 : 16;
  let targetEpochMs = Date.UTC(year, month - 1, day, targetHourWib - 7, 30, 0);
  if (targetEpochMs > now.getTime()) {
    targetEpochMs -= 86_400_000;
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(targetEpochMs));
}

function formatSnapshotPrice(asset: ShareSnapshotAsset): string {
  const numStr = asset.price.toLocaleString('en-US', {
    minimumFractionDigits: asset.decimals,
    maximumFractionDigits: asset.decimals,
  });
  return `${asset.currencyPrefix ?? ''}${numStr}${asset.unitSuffix ?? ''}`;
}

function formatPct(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

function renderHtmlAssetIcon(assetId: string) {
  const cls = 'w-3.5 h-3.5 text-[#9A6F22] dark:text-[#ECC476] shrink-0';
  switch (assetId) {
    case 'SPX':
      return <BarChart3 className={cls} />;
    case 'IXIC':
      return <TrendingUp className={cls} />;
    case 'DJI':
      return <Landmark className={cls} />;
    case 'IHSG':
      return <Globe2 className={cls} />;
    case 'BTCUSD':
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#C4923E]/20 dark:bg-[#ECC476]/20 text-[#9A6F22] dark:text-[#ECC476] text-[10px] font-black leading-none shrink-0">
          ₿
        </span>
      );
    case 'DXY':
      return <DollarSign className={cls} />;
    case 'USDIDR':
      return <ArrowLeftRight className={cls} />;
    case 'XAUUSD':
      return <Gem className={cls} />;
    default:
      return <BarChart3 className={cls} />;
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (ctx.measureText(clean).width <= maxWidth) return clean;
  let clipped = clean;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1).trimEnd();
  }
  return `${clipped}…`;
}

/**
 * Draw crisp Apple-style vector glyph inside each translucent card's gold glass badge.
 */
function drawInstrumentVectorIcon(
  ctx: CanvasRenderingContext2D,
  assetId: string,
  cx: number,
  cy: number,
  size: number,
  strokeColor: string
) {
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const r = size * 0.42;

  switch (assetId) {
    case 'SPX': {
      const bw = 3.4;
      ctx.fillRect(cx - 8.5, cy + 1, bw, 7.5);
      ctx.fillRect(cx - 1.7, cy - 3.5, bw, 12);
      ctx.fillRect(cx + 5, cy - 8.5, bw, 17);
      break;
    }
    case 'IXIC': {
      ctx.beginPath();
      ctx.moveTo(cx - 8.5, cy + 5.5);
      ctx.lineTo(cx - 2.5, cy + 0.5);
      ctx.lineTo(cx + 1.5, cy + 3);
      ctx.lineTo(cx + 8, cy - 5.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 3.5, cy - 5.5);
      ctx.lineTo(cx + 8, cy - 5.5);
      ctx.lineTo(cx + 8, cy - 1);
      ctx.stroke();
      break;
    }
    case 'DJI': {
      ctx.beginPath();
      ctx.moveTo(cx - 8.5, cy - 4.5);
      ctx.lineTo(cx, cy - 9.5);
      ctx.lineTo(cx + 8.5, cy - 4.5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 7.5);
      ctx.lineTo(cx + 9, cy + 7.5);
      ctx.moveTo(cx - 5, cy - 4.5);
      ctx.lineTo(cx - 5, cy + 7.5);
      ctx.moveTo(cx, cy - 4.5);
      ctx.lineTo(cx, cy + 7.5);
      ctx.moveTo(cx + 5, cy - 4.5);
      ctx.lineTo(cx + 5, cy + 7.5);
      ctx.stroke();
      break;
    }
    case 'IHSG': {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.ellipse(cx, cy, r * 0.48, r, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'BTCUSD': {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₿', cx + 0.4, cy + 0.8);
      break;
    }
    case 'DXY': {
      ctx.font = '800 19px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', cx, cy + 0.8);
      break;
    }
    case 'USDIDR': {
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 3.5);
      ctx.lineTo(cx + 7.5, cy - 3.5);
      ctx.moveTo(cx + 4, cy - 7);
      ctx.lineTo(cx + 7.5, cy - 3.5);
      ctx.lineTo(cx + 4, cy);

      ctx.moveTo(cx + 8, cy + 3.5);
      ctx.lineTo(cx - 7.5, cy + 3.5);
      ctx.moveTo(cx - 4, cy);
      ctx.lineTo(cx - 7.5, cy + 3.5);
      ctx.lineTo(cx - 4, cy + 7);
      ctx.stroke();
      break;
    }
    case 'XAUUSD': {
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5);
      ctx.lineTo(cx + 6, cy - 5);
      ctx.lineTo(cx + 9.5, cy + 5.5);
      ctx.lineTo(cx - 9.5, cy + 5.5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 1.5);
      ctx.lineTo(cx + 4, cy - 1.5);
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export const MarketExtractShareView: React.FC<MarketExtractShareViewProps> = ({
  assets,
  feedsLive = false,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<ShareScheduleSlot>(() =>
    getDefaultJakartaSlot(new Date())
  );
  const [snapshotsBySlot, setSnapshotsBySlot] = useState<
    Partial<Record<ShareScheduleSlot, ShareSnapshotResponse>>
  >(() => {
    const out: Partial<Record<ShareScheduleSlot, ShareSnapshotResponse>> = {};
    const now = new Date();
    (['morning_0530', 'afternoon_1630'] as ShareScheduleSlot[]).forEach((slot) => {
      try {
        const key = `${STORAGE_PREFIX}${getJakartaDateKey(now, slot)}:${slot}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as ShareSnapshotResponse;
          if (parsed && parsed.assets) {
            out[slot] = parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
    });
    return out;
  });
  const [slotLoading, setSlotLoading] = useState<boolean>(false);

  const [textFormat, setTextFormat] = useState<TextFormatMode>('whatsapp');
  const [includeLevels, setIncludeLevels] = useState<boolean>(true);
  const [deskTitle, setDeskTitle] = useState<string>('MARKET BRIEF EDITION');
  const [deskHandle, setDeskHandle] = useState<string>('Global & IDX Desk');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const [posterAspect, setPosterAspect] = useState<PosterAspect>('story');
  const [posterTheme, setPosterTheme] = useState<PosterTheme>('apple-gold');
  const [copiedImage, setCopiedImage] = useState<'idle' | 'copied' | 'unsupported'>('idle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch true timestamp-anchored historical bar snapshot from the free scheduled public-data snapshot
  const loadTimestampSnapshot = useCallback(
    async (slot: ShareScheduleSlot, force = false) => {
      setSlotLoading(true);
      try {
        const res = await fetch(
          apiUrl(`/api/market/share-snapshot?slot=${encodeURIComponent(slot)}${force ? '&force=1' : ''}`)
        );
        if (!res.ok) return;
        const payload = (await res.json()) as ShareSnapshotResponse;
        if (!payload || !payload.assets) return;

        // Preserve the exact scheduled provider snapshot; never merge in live quotes.
        const normalized: ShareSnapshotResponse = payload;

        try {
          localStorage.setItem(
            `${STORAGE_PREFIX}${normalized.dateKey}:${slot}`,
            JSON.stringify(normalized)
          );
        } catch {
          // ignore quota errors
        }
        setSnapshotsBySlot((prev) => ({ ...prev, [slot]: normalized }));
      } catch {
        // retain prior snapshot if network hiccups
      } finally {
        setSlotLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const existing = snapshotsBySlot[selectedSlot];
    const expectedDateKey = getJakartaDateKey(new Date(), selectedSlot);
    if (!existing || existing.dateKey !== expectedDateKey) {
      void loadTimestampSnapshot(selectedSlot, false);
    }
  }, [selectedSlot, snapshotsBySlot, loadTimestampSnapshot]);

  // If a scheduled edition has not been published, render an explicit empty state.
  // Never relabel the latest live quote as a 05:30 / 16:30 scheduled observation.
  const activeSnapshot = useMemo<ShareSnapshotResponse>(() => {
    const loaded = snapshotsBySlot[selectedSlot];
    if (loaded) return loaded;
    return {
      slot: selectedSlot,
      dateKey: getJakartaDateKey(new Date(), selectedSlot),
      dateLabel: 'Not published',
      timeSlotLabel: 'Snapshot unavailable',
      targetTimestampIso: '',
      targetEpochMs: 0,
      editionTitle: 'Scheduled market snapshot unavailable',
      marketSummary: 'No verified scheduled snapshot is available for this edition yet.',
      aiGenerated: false,
      assets: {},
      updatedAt: '',
    };
  }, [snapshotsBySlot, selectedSlot]);

  // Formatted Copy-Paste Text Brief (pure data + optional Support & Resistance; zero commentary)
  const formattedBriefText = useMemo(() => {
    const snap = activeSnapshot;
    const isMorning = snap.slot === 'morning_0530';
    const map = snap.assets;

    const bold = (s: string) =>
      textFormat === 'whatsapp' ? `*${s}*` : textFormat === 'telegram' ? `**${s}**` : s.toUpperCase();
    const code = (s: string) => (textFormat === 'plain' ? s : `\`${s}\``);

    const fmtRow = (label: string, item?: ShareSnapshotAsset) => {
      if (!item) return `• ${label}: —`;
      const lvl = includeLevels ? ` | S ${item.support} · R ${item.resistance}` : '';
      return `• ${bold(label)}: ${code(formatSnapshotPrice(item))} (${formatPct(item.changePercent)})${lvl}`;
    };

    const lines: string[] = [
      `${bold(deskTitle.trim() || 'MARKET BRIEF EDITION')} · ${snap.timeSlotLabel}`,
      `${snap.dateLabel} · Static Timestamp Edition`,
      `────────────────────`,
    ];

    if (isMorning) {
      lines.push(
        `${bold('US BENCHMARKS')}`,
        fmtRow('S&P 500 (SPX)', map.SPX),
        fmtRow('NASDAQ (IXIC)', map.IXIC),
        fmtRow('Dow Jones (DJI)', map.DJI),
        ``,
        `${bold('INDONESIA & BITCOIN')}`,
        fmtRow('IHSG (IDX)', map.IHSG),
        fmtRow('Bitcoin (BTC/USD)', map.BTCUSD),
        ``,
        `${bold('FX & GOLD')}`,
        fmtRow('DXY (Dollar Index)', map.DXY),
        fmtRow('USD/IDR', map.USDIDR),
        fmtRow('XAU/USD (Gold Spot)', map.XAUUSD)
      );
    } else {
      lines.push(
        `${bold('INDONESIA & BITCOIN')}`,
        fmtRow('IHSG (IDX)', map.IHSG),
        fmtRow('Bitcoin (BTC/USD)', map.BTCUSD),
        ``,
        `${bold('FX & GOLD')}`,
        fmtRow('DXY (Dollar Index)', map.DXY),
        fmtRow('USD/IDR', map.USDIDR),
        fmtRow('XAU/USD (Gold Spot)', map.XAUUSD)
      );
    }

    if (deskHandle.trim()) {
      lines.push(`────────────────────`, `— ${deskHandle.trim()}`);
    }

    return lines.join('\n');
  }, [activeSnapshot, textFormat, includeLevels, deskTitle, deskHandle]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedBriefText);
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Clipboard fallback ignored if restricted
    }
  };

  // Draw Apple Liquid Glass + Gold Social Poster on <canvas> (ZERO commentary; oversized % color badge, value, instrument name)
  const renderPosterCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const spec = ASPECT_SPECS[posterAspect];
    const palette = POSTER_THEMES[posterTheme];
    canvas.width = spec.width;
    canvas.height = spec.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = spec.width;
    const H = spec.height;
    const padX = 56;
    const innerW = W - padX * 2;
    const isStory = posterAspect === 'story';
    const isSquare = posterAspect === 'square';
    const isMorning = activeSnapshot.slot === 'morning_0530';
    const map = activeSnapshot.assets;

    // 1. Multi-stop warm champagne / obsidian base gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.25, H);
    bgGrad.addColorStop(0, palette.bgTop);
    bgGrad.addColorStop(0.52, palette.bgMid);
    bgGrad.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Dual radial Apple Liquid Gold glass refractive blooms
    const bloomTopRight = ctx.createRadialGradient(
      W * 0.84,
      H * 0.08,
      20,
      W * 0.84,
      H * 0.08,
      W * 0.82
    );
    bloomTopRight.addColorStop(0, palette.bloomGoldTop);
    bloomTopRight.addColorStop(1, 'transparent');
    ctx.fillStyle = bloomTopRight;
    ctx.fillRect(0, 0, W, H);

    const bloomBottomLeft = ctx.createRadialGradient(
      W * 0.14,
      H * 0.86,
      30,
      W * 0.14,
      H * 0.86,
      W * 0.72
    );
    bloomBottomLeft.addColorStop(0, palette.bloomGoldBottom);
    bloomBottomLeft.addColorStop(1, 'transparent');
    ctx.fillStyle = bloomBottomLeft;
    ctx.fillRect(0, 0, W, H);

    // Subtle soft diagonal specular prism wash
    const diagSheen = ctx.createLinearGradient(0, 0, W, H * 0.75);
    diagSheen.addColorStop(0, palette.ambientSheen);
    diagSheen.addColorStop(0.5, 'transparent');
    diagSheen.addColorStop(1, palette.ambientSheen);
    ctx.fillStyle = diagSheen;
    ctx.fillRect(0, 0, W, H);

    // Helper: Apple Liquid Glass Panel
    const drawLiquidGlassPanel = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius = 24
    ) => {
      ctx.save();
      ctx.shadowColor = palette.isLight ? 'rgba(120, 92, 42, 0.10)' : 'rgba(0, 0, 0, 0.42)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;

      roundRectPath(ctx, x, y, w, h, radius);
      const gFill = ctx.createLinearGradient(x, y, x, y + h);
      gFill.addColorStop(0, palette.glassFillTop);
      gFill.addColorStop(1, palette.glassFillBottom);
      ctx.fillStyle = gFill;
      ctx.fill();
      ctx.restore();

      // Hairline border
      roundRectPath(ctx, x, y, w, h, radius);
      ctx.strokeStyle = palette.glassBorder;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Top specular highlight rim
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + radius, y + 1);
      ctx.lineTo(x + w - radius, y + 1);
      const specGrad = ctx.createLinearGradient(x, y, x + w, y);
      specGrad.addColorStop(0, 'transparent');
      specGrad.addColorStop(0.18, palette.glassSpecular);
      specGrad.addColorStop(0.82, palette.glassSpecular);
      specGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = specGrad;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    };

    // Asset Card Renderer: prominent Instrument Name + Hero Price Value + OVERSIZED High-Contrast % Badge
    const drawGlassAssetCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      assetId: string,
      tickerLabel: string,
      item?: ShareSnapshotAsset,
      featured = false
    ) => {
      drawLiquidGlassPanel(x, y, w, h, featured ? 28 : 22);

      const innerPad = h >= 280 ? 28 : h >= 210 ? 22 : 16;
      const contentW = w - innerPad * 2;
      const iconBadgeSize = h >= 280 ? 48 : h >= 210 ? 40 : 34;
      const iconCenterX = x + innerPad + iconBadgeSize / 2;
      const iconCenterY = y + innerPad + iconBadgeSize / 2;

      // Frosted Gold Vector Icon Badge
      roundRectPath(
        ctx,
        x + innerPad,
        y + innerPad,
        iconBadgeSize,
        iconBadgeSize,
        featured ? 14 : 11
      );
      ctx.fillStyle = palette.iconBg;
      ctx.fill();
      ctx.strokeStyle = palette.iconBorder;
      ctx.lineWidth = 1.3;
      ctx.stroke();

      drawInstrumentVectorIcon(
        ctx,
        assetId,
        iconCenterX,
        iconCenterY,
        iconBadgeSize * 0.72,
        palette.iconStroke
      );

      // Clear Instrument Name & Symbol beside vector icon
      const displayName =
        DISPLAY_INSTRUMENT_NAMES[assetId] || item?.shortName || tickerLabel;
      const titleX = x + innerPad + iconBadgeSize + (h >= 240 ? 14 : 11);
      const maxTitleW = Math.max(48, x + w - innerPad - titleX);

      const nameFontSize = h >= 280 ? 24 : h >= 210 ? 20 : 17;
      ctx.font = `800 ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(
        fitTextToWidth(ctx, displayName, maxTitleW),
        titleX,
        iconCenterY + (h >= 240 ? -2 : -1)
      );

      const tickerFontSize = h >= 280 ? 15 : 13;
      ctx.font = `700 ${tickerFontSize}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = palette.goldAccent;
      ctx.fillText(
        fitTextToWidth(ctx, tickerLabel, maxTitleW),
        titleX,
        iconCenterY + (h >= 240 ? 20 : 16)
      );

      if (!item) {
        ctx.font = '800 34px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = palette.textMuted;
        ctx.fillText('—', x + innerPad, y + h * 0.6);
        return;
      }

      // Compute clean vertical positions inside freed card height
      const topRowBottom = y + innerPad + iconBadgeSize;
      const srFooterH = includeLevels ? (h >= 240 ? 30 : 22) : 0;
      const bottomLimit = y + h - innerPad - srFooterH;
      const middleSpan = Math.max(82, bottomLimit - topRowBottom);

      // Hero Price Value
      const priceStr = formatSnapshotPrice(item);
      let priceFont = h >= 320 ? 52 : h >= 250 ? 44 : h >= 200 ? 38 : 30;
      if (w < 330) priceFont = Math.min(priceFont, h >= 250 ? 39 : 33);
      if (priceStr.length > 10) priceFont = Math.max(24, priceFont - 5);
      else if (priceStr.length > 8) priceFont = Math.max(26, priceFont - 2);

      // Keep font shrunk automatically if needed to avoid truncation
      ctx.font = `800 ${priceFont}px "JetBrains Mono", ui-monospace, monospace`;
      while (priceFont > 21 && ctx.measureText(priceStr).width > contentW) {
        priceFont -= 2;
        ctx.font = `800 ${priceFont}px "JetBrains Mono", ui-monospace, monospace`;
      }

      // BIG High-Contrast Color-Coded % Pill
      const isGain = item.changePercent >= 0;
      const arrowGlyph = isGain ? '▲' : '▼';
      const pctText = `${arrowGlyph} ${formatPct(item.changePercent)}`;
      const pillH = h >= 320 ? 64 : h >= 240 ? 52 : h >= 195 ? 42 : 36;
      let pctFont = h >= 320 ? 36 : h >= 240 ? 29 : h >= 195 ? 24 : 20;
      if (w < 330) pctFont = Math.min(pctFont, h >= 240 ? 27 : 21);

      ctx.font = `800 ${pctFont}px "JetBrains Mono", ui-monospace, monospace`;
      const pillPadX = h >= 240 ? 20 : 14;
      while (pctFont > 16 && ctx.measureText(pctText).width + pillPadX * 2 > contentW) {
        pctFont -= 2;
        ctx.font = `800 ${pctFont}px "JetBrains Mono", ui-monospace, monospace`;
      }

      const contentGap = Math.max(10, Math.min(22, (middleSpan - priceFont - pillH) * 0.45));
      const priceBaselineY = topRowBottom + contentGap + priceFont * 0.85;
      const pillY = Math.min(
        bottomLimit - pillH - 4,
        priceBaselineY + Math.max(12, contentGap * 0.9)
      );

      // Render Hero Price Value
      ctx.font = `800 ${priceFont}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(fitTextToWidth(ctx, priceStr, contentW), x + innerPad, priceBaselineY);

      // Render BIG Color-Coded % Badge
      ctx.font = `800 ${pctFont}px "JetBrains Mono", ui-monospace, monospace`;
      const pillW = Math.min(contentW, Math.max(w * 0.62, ctx.measureText(pctText).width + pillPadX * 2));
      roundRectPath(ctx, x + innerPad, pillY, pillW, pillH, Math.min(16, pillH / 2.6));
      ctx.fillStyle = isGain ? palette.gainBg : palette.lossBg;
      ctx.fill();
      ctx.strokeStyle = isGain ? palette.gainBorder : palette.lossBorder;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = isGain ? palette.gainText : palette.lossText;
      ctx.textBaseline = 'middle';
      ctx.fillText(pctText, x + innerPad + pillPadX, pillY + pillH / 2 + 1);
      ctx.textBaseline = 'alphabetic';

      // Clean Support & Resistance line (if enabled)
      if (includeLevels) {
        const srFont = h >= 250 ? 16 : 13;
        ctx.font = `600 ${srFont}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = palette.textMuted;
        const srLine = `S ${item.support}  ·  R ${item.resistance}`;
        ctx.fillText(fitTextToWidth(ctx, srLine, contentW), x + innerPad, y + h - (innerPad * 0.72));
      }
    };

    // 2. Top Masthead Bar
    let cursorY = isStory ? 70 : isSquare ? 44 : 54;
    const editionPillText = `${activeSnapshot.timeSlotLabel} EDITION`;
    ctx.font = '700 17px "JetBrains Mono", ui-monospace, monospace';
    const edPillW = ctx.measureText(editionPillText).width + 32;

    roundRectPath(ctx, W - padX - edPillW, cursorY - 22, edPillW, 34, 12);
    ctx.fillStyle = palette.goldSoft;
    ctx.fill();
    ctx.strokeStyle = palette.glassBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = palette.goldAccent;
    ctx.fillText(editionPillText, W - padX - edPillW + 16, cursorY);

    ctx.font = '700 18px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.goldAccent;
    ctx.fillText('GLOBAL & IDX MARKET PULSE', padX, cursorY);

    cursorY += isSquare ? 46 : 54;
    ctx.font = `800 ${isSquare ? 40 : 48}px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = palette.textPrimary;
    ctx.fillText(
      fitTextToWidth(ctx, deskTitle.trim() || 'MARKET BRIEF EDITION', innerW),
      padX,
      cursorY
    );

    cursorY += 32;
    ctx.font = '500 19px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.textMuted;
    const scopeSummary = isMorning
      ? '05:30 WIB All-Markets Timestamp'
      : '16:30 WIB IDX, BTC, DXY, IDR & Gold';
    ctx.fillText(
      fitTextToWidth(ctx, `${activeSnapshot.dateLabel}  ·  ${scopeSummary}`, innerW),
      padX,
      cursorY
    );

    cursorY += isSquare ? 20 : 26;
    const divGrad = ctx.createLinearGradient(padX, cursorY, W - padX, cursorY);
    divGrad.addColorStop(0, palette.goldAccent);
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padX, cursorY);
    ctx.lineTo(W - padX, cursorY);
    ctx.stroke();

    const gap = 18;
    const col3W = (innerW - gap * 2) / 3;
    const col2W = (innerW - gap) / 2;
    const footerReserve = isStory ? 84 : 64;
    const availableBodyH = Math.max(600, H - footerReserve - cursorY);

    if (isMorning) {
      const sectionOverhead = isSquare ? 40 : 54;
      const cardH = Math.floor((availableBodyH - sectionOverhead * 3) / 3);

      cursorY += isSquare ? 28 : 38;
      ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.goldAccent;
      ctx.fillText('01 / UNITED STATES BENCHMARKS', padX, cursorY);

      cursorY += 14;
      drawGlassAssetCard(padX, cursorY, col3W, cardH, 'SPX', 'SPX', map.SPX);
      drawGlassAssetCard(padX + col3W + gap, cursorY, col3W, cardH, 'IXIC', 'IXIC', map.IXIC);
      drawGlassAssetCard(padX + (col3W + gap) * 2, cursorY, col3W, cardH, 'DJI', 'DJI', map.DJI);

      cursorY += cardH + (isSquare ? 26 : 38);
      ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.goldAccent;
      ctx.fillText('02 / INDONESIA & BITCOIN', padX, cursorY);

      cursorY += 14;
      drawGlassAssetCard(padX, cursorY, col2W, cardH, 'IHSG', 'IHSG', map.IHSG, true);
      drawGlassAssetCard(padX + col2W + gap, cursorY, col2W, cardH, 'BTCUSD', 'BTC/USD', map.BTCUSD, true);

      cursorY += cardH + (isSquare ? 26 : 38);
      ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.goldAccent;
      ctx.fillText('03 / DOLLAR, RUPIAH & GOLD', padX, cursorY);

      cursorY += 14;
      drawGlassAssetCard(padX, cursorY, col3W, cardH, 'DXY', 'DXY', map.DXY);
      drawGlassAssetCard(padX + col3W + gap, cursorY, col3W, cardH, 'USDIDR', 'USD/IDR', map.USDIDR);
      drawGlassAssetCard(padX + (col3W + gap) * 2, cursorY, col3W, cardH, 'XAUUSD', 'XAU/USD', map.XAUUSD);
    } else {
      const sectionOverhead = isSquare ? 48 : 66;
      const totalCardH = Math.floor(availableBodyH - sectionOverhead * 2);
      const topCardH = Math.round(totalCardH * 0.52);
      const botCardH = totalCardH - topCardH;

      cursorY += isSquare ? 32 : 48;
      ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.goldAccent;
      ctx.fillText('01 / INDONESIA BENCHMARK & BITCOIN', padX, cursorY);

      cursorY += 16;
      drawGlassAssetCard(padX, cursorY, col2W, topCardH, 'IHSG', 'IHSG', map.IHSG, true);
      drawGlassAssetCard(padX + col2W + gap, cursorY, col2W, topCardH, 'BTCUSD', 'BTC/USD', map.BTCUSD, true);

      cursorY += topCardH + (isSquare ? 32 : 48);
      ctx.font = '700 16px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.goldAccent;
      ctx.fillText('02 / DOLLAR, RUPIAH & GOLD', padX, cursorY);

      cursorY += 16;
      drawGlassAssetCard(padX, cursorY, col3W, botCardH, 'DXY', 'DXY', map.DXY);
      drawGlassAssetCard(padX + col3W + gap, cursorY, col3W, botCardH, 'USDIDR', 'USD/IDR', map.USDIDR);
      drawGlassAssetCard(padX + (col3W + gap) * 2, cursorY, col3W, botCardH, 'XAUUSD', 'XAU/USD', map.XAUUSD);
    }

    // Footer Signature
    const footerY = H - (isStory ? 38 : 26);
    ctx.font = '600 17px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.textMuted;
    ctx.fillText(deskHandle.trim() || 'Global & IDX Desk', padX, footerY);

    const rightSig = `${activeSnapshot.timeSlotLabel} SNAPSHOT  ·  ${ASPECT_SPECS[posterAspect].tag}`;
    const rightW = ctx.measureText(rightSig).width;
    ctx.fillText(rightSig, W - padX - rightW, footerY);
  }, [
    activeSnapshot,
    posterAspect,
    posterTheme,
    deskTitle,
    deskHandle,
    includeLevels,
  ]);

  useEffect(() => {
    renderPosterCanvas();
  }, [renderPosterCanvas]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const slotTag = activeSnapshot.slot === 'morning_0530' ? '0530' : '1630';
      link.download = `market-snapshot-${slotTag}-${posterAspect}-${activeSnapshot.dateKey}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleCopyPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      setCopiedImage('unsupported');
      window.setTimeout(() => setCopiedImage('idle'), 2600);
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedImage('copied');
        window.setTimeout(() => setCopiedImage('idle'), 2200);
      } catch {
        setCopiedImage('unsupported');
        window.setTimeout(() => setCopiedImage('idle'), 2600);
      }
    }, 'image/png');
  };

  const quickChips = useMemo(() => {
    const m = activeSnapshot.assets;
    if (activeSnapshot.slot === 'morning_0530') {
      return [
        { id: 'SPX', label: 'SPX', item: m.SPX },
        { id: 'IXIC', label: 'IXIC', item: m.IXIC },
        { id: 'DJI', label: 'DJI', item: m.DJI },
        { id: 'IHSG', label: 'IHSG', item: m.IHSG },
        { id: 'BTCUSD', label: 'BTC/USD', item: m.BTCUSD },
        { id: 'DXY', label: 'DXY', item: m.DXY },
        { id: 'USDIDR', label: 'USD/IDR', item: m.USDIDR },
        { id: 'XAUUSD', label: 'XAU/USD', item: m.XAUUSD },
      ];
    }
    return [
      { id: 'IHSG', label: 'IHSG', item: m.IHSG },
      { id: 'BTCUSD', label: 'BTC/USD', item: m.BTCUSD },
      { id: 'DXY', label: 'DXY', item: m.DXY },
      { id: 'USDIDR', label: 'USD/IDR', item: m.USDIDR },
      { id: 'XAUUSD', label: 'XAU/USD', item: m.XAUUSD },
    ];
  }, [activeSnapshot]);

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-6 pt-4 pb-28 sm:pb-32 space-y-5">
      {/* Header & Timestamped 05:30 / 16:30 Edition Controls */}
      <section className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#C4923E] dark:text-[#ECC476]" />
              <h1 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white tracking-tight">
                Scheduled Market Share Studio
              </h1>
            </div>
            <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] mt-0.5">
              Timestamp-anchored data fetched at exact 05:30 WIB (All Markets) &amp; 16:30 WIB (IDX, Bitcoin, DXY, USD/IDR &amp; Gold) bars
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Static Edition Slot Switcher */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-black/40 border border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setSelectedSlot('morning_0530')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  selectedSlot === 'morning_0530'
                    ? 'bg-[#C4923E] dark:bg-[#ECC476] text-white dark:text-[#16120B] shadow-sm'
                    : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>05:30 WIB Morning · All</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlot('afternoon_1630')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  selectedSlot === 'afternoon_1630'
                    ? 'bg-[#C4923E] dark:bg-[#ECC476] text-white dark:text-[#16120B] shadow-sm'
                    : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                <Sunset className="w-3.5 h-3.5" />
                <span>16:30 WIB Afternoon · IDX &amp; Macro</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => void loadTimestampSnapshot(selectedSlot, true)}
              disabled={slotLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]/80 hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-semibold text-[#1C1C1E] dark:text-white whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
            >
              {slotLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Sync Timestamp Data</span>
            </button>
          </div>
        </div>

        {/* Timestamp Snapshot Status & Extracted Instruments with Icons */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6C6C70] dark:text-[#8E8E93] pt-0.5">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#C4923E] dark:text-[#ECC476]" />
            Timestamp Edition: {activeSnapshot.dateLabel} · {activeSnapshot.timeSlotLabel} ({activeSnapshot.editionTitle})
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {slotLoading
              ? 'Resolving historical timestamp candles...'
              : snapshotsBySlot[selectedSlot]
                ? 'Anchored to exact timestamp bars'
                : feedsLive
                  ? 'Synced from live feed'
                  : 'Initializing...'}
          </span>
        </div>

        <div
          className={`grid gap-2 ${
            quickChips.length === 8
              ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          }`}
        >
          {quickChips.map(({ id, label, item }) => {
            const isGain = (item?.changePercent ?? 0) >= 0;
            return (
              <div
                key={label}
                className="rounded-xl bg-[#F2F2F7]/80 dark:bg-[#141416] border border-[#E5E5EA] dark:border-[#2C2C2E] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93]">
                    {renderHtmlAssetIcon(id)}
                    {label}
                  </span>
                  {item?.barTimeWib && (
                    <span className="text-[9px] font-mono text-[#8E8E93] truncate">
                      {item.barTimeWib}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white mt-1 truncate">
                  {item ? formatSnapshotPrice(item) : '—'}
                </div>
                <div
                  className={`text-sm font-mono font-extrabold tabular-nums ${
                    isGain
                      ? 'text-[#16803C] dark:text-[#4ADE80]'
                      : 'text-[#D7261C] dark:text-[#FF6B6B]'
                  }`}
                >
                  {item ? formatPct(item.changePercent) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Text Format Extractor (Pure Instrument Data, Zero Commentary) */}
        <section className="lg:col-span-6 liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-[#C4923E] dark:text-[#ECC476]" />
              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Telegram &amp; WhatsApp Data Brief
              </h2>
            </div>

            <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-black/40 border border-[#E5E5EA] dark:border-[#2C2C2E]">
              {(
                [
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'telegram', label: 'Telegram' },
                  { id: 'plain', label: 'Plain' },
                ] as { id: TextFormatMode; label: string }[]
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setTextFormat(fmt.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    textFormat === fmt.id
                      ? 'bg-[#C4923E] dark:bg-[#ECC476] text-white dark:text-[#16120B] shadow-sm'
                      : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93] mb-1">
                Brief Header Title
              </label>
              <input
                type="text"
                value={deskTitle}
                onChange={(e) => setDeskTitle(e.target.value)}
                maxLength={44}
                className="w-full rounded-xl bg-[#F2F2F7] dark:bg-[#141416] border border-[#E5E5EA] dark:border-[#2C2C2E] px-3 py-2 text-xs font-semibold text-[#1C1C1E] dark:text-white focus:outline-none focus:border-[#C4923E]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#8E8E93] mb-1">
                Signature / Channel Handle
              </label>
              <input
                type="text"
                value={deskHandle}
                onChange={(e) => setDeskHandle(e.target.value)}
                maxLength={36}
                placeholder="@yourdesk"
                className="w-full rounded-xl bg-[#F2F2F7] dark:bg-[#141416] border border-[#E5E5EA] dark:border-[#2C2C2E] px-3 py-2 text-xs font-semibold text-[#1C1C1E] dark:text-white focus:outline-none focus:border-[#C4923E]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6C6C70] dark:text-[#8E8E93]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Levels:
            </span>
            <button
              type="button"
              onClick={() => setIncludeLevels((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                includeLevels
                  ? 'bg-[#C4923E]/12 dark:bg-[#ECC476]/15 border-[#C4923E]/40 text-[#9A6F22] dark:text-[#ECC476]'
                  : 'bg-[#F2F2F7] dark:bg-[#141416] border-[#E5E5EA] dark:border-[#2C2C2E] text-[#6C6C70] dark:text-[#8E8E93]'
              }`}
            >
              Support &amp; Resistance
            </button>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={formattedBriefText}
              rows={17}
              aria-label="Formatted brief for Telegram or WhatsApp"
              className="w-full rounded-xl bg-[#F2F2F7]/80 dark:bg-[#0D0E12] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3.5 font-mono text-xs leading-relaxed text-[#1C1C1E] dark:text-[#E5E5EA] focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
              Clean copy-paste ready for {textFormat === 'whatsapp' ? 'WhatsApp' : textFormat === 'telegram' ? 'Telegram' : 'Notes'}.
            </span>
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C4923E] dark:bg-[#ECC476] hover:opacity-95 text-white dark:text-[#16120B] text-xs font-bold whitespace-nowrap shrink-0 shadow-sm transition-opacity"
            >
              {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? 'Copied to Clipboard' : 'Copy Text Brief'}</span>
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: Apple Translucent Gold Glass Poster Studio */}
        <section className="lg:col-span-6 liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#C4923E] dark:text-[#ECC476]" />
              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Apple Gold Glass Poster Studio
              </h2>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6C6C70] dark:text-[#8E8E93]">
              <Sparkles className="w-3.5 h-3.5 text-[#C4923E] dark:text-[#ECC476]" />
              {ASPECT_SPECS[posterAspect].tag} PNG
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-black/40 border border-[#E5E5EA] dark:border-[#2C2C2E]">
              {(Object.keys(ASPECT_SPECS) as PosterAspect[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPosterAspect(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    posterAspect === key
                      ? 'bg-[#C4923E] dark:bg-[#ECC476] text-white dark:text-[#16120B] shadow-sm'
                      : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {ASPECT_SPECS[key].label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-black/40 border border-[#E5E5EA] dark:border-[#2C2C2E]">
              {(Object.keys(POSTER_THEMES) as PosterTheme[]).map((themeKey) => (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => setPosterTheme(themeKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    posterTheme === themeKey
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] shadow-sm'
                      : 'text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {POSTER_THEMES[themeKey].label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#E5E5EA]/60 dark:bg-[#0B0C10] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex justify-center items-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[580px] w-auto h-auto rounded-xl shadow-2xl border border-black/10 dark:border-white/10"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93]">
              {copiedImage === 'unsupported'
                ? 'Direct image copy unavailable in this browser — use Download PNG.'
                : 'Displays instrument name, vector icon, value & high-contrast % gain/loss.'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPng}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] border border-[#E5E5EA] dark:border-[#38383A] text-xs font-bold text-[#1C1C1E] dark:text-white whitespace-nowrap shrink-0 transition-colors"
              >
                {copiedImage === 'copied' ? (
                  <Check className="w-4 h-4 text-[#16803C] dark:text-[#30D158]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedImage === 'copied' ? 'Image Copied' : 'Copy Image'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16803C] dark:bg-[#30D158] hover:opacity-95 text-white dark:text-[#09120B] text-xs font-bold whitespace-nowrap shrink-0 shadow-sm transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
