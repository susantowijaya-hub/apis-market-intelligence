import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Wifi,
  X,
} from 'lucide-react';
import {
  ClientFeedTransportDiagnostics,
  ProviderHealthStatus,
  ServerFeedDiagnosticsResponse,
} from '../types/market';

interface FeedDiagnosticsBadgeProps {
  serverDiagnostics: ServerFeedDiagnosticsResponse | null;
  clientTransport: ClientFeedTransportDiagnostics;
  feedsLive: boolean;
  isPulseActive: boolean;
  wsConnected: boolean;
  onTogglePulse: () => void;
  onRefreshAll: () => void;
  onRefreshDiagnostics: () => void;
}

function formatAgeLabel(epochMs: number | null, nowMs: number): string {
  if (!epochMs || !Number.isFinite(epochMs)) return 'Pending';
  const diffSec = Math.max(0, Math.round((nowMs - epochMs) / 1000));
  if (diffSec < 3) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function getStatusMeta(status: ProviderHealthStatus): {
  label: string;
  textClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'live':
      return {
        label: 'Live',
        textClass: 'text-[#0F7033] dark:text-[#4ADE80]',
        dotClass: 'bg-[#16A34A] dark:bg-[#4ADE80]',
      };
    case 'failover':
      return {
        label: 'Failover',
        textClass: 'text-[#9A5B06] dark:text-[#FBBF24]',
        dotClass: 'bg-[#D97706] dark:bg-[#FBBF24]',
      };
    case 'cached':
      return {
        label: 'Cached',
        textClass: 'text-[#9A5B06] dark:text-[#FBBF24]',
        dotClass: 'bg-[#D97706] dark:bg-[#FBBF24]',
      };
    default:
      return {
        label: 'Offline',
        textClass: 'text-[#C41C16] dark:text-[#FF6B63]',
        dotClass: 'bg-[#DC2626] dark:bg-[#FF6B63]',
      };
  }
}

export const FeedDiagnosticsBadge: React.FC<FeedDiagnosticsBadgeProps> = ({
  serverDiagnostics,
  clientTransport,
  feedsLive,
  isPulseActive,
  wsConnected,
  onTogglePulse,
  onRefreshAll,
  onRefreshDiagnostics,
}) => {
  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setNowMs(Date.now());
    onRefreshDiagnostics();
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, onRefreshDiagnostics]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const providers = serverDiagnostics?.providers ?? [];
  const hasCachedFallback =
    clientTransport.usingBootstrapCache ||
    Boolean(serverDiagnostics?.hasCachedFallback) ||
    clientTransport.activeBackoffs.length > 0;
  const hasFailover = Boolean(serverDiagnostics?.hasFailover);
  const isDegraded = isPulseActive && (hasCachedFallback || hasFailover);

  // Public snapshot status; reserve Live for an active WebSocket connection
  const mobileLabel = !isPulseActive
    ? 'Paused'
    : hasCachedFallback
      ? 'Cached'
      : hasFailover
        ? 'Failover'
        : wsConnected
          ? 'Live WS'
          : feedsLive
            ? 'Snapshot'
            : 'Init';

  const desktopSuffix =
    clientTransport.quotesRttMs !== null ? ` · ${clientTransport.quotesRttMs}ms` : '';

  const desktopLabel = !isPulseActive
    ? 'Paused'
    : hasCachedFallback
      ? `Cached${desktopSuffix}`
      : hasFailover
        ? `Failover${desktopSuffix}`
        : wsConnected
          ? `Live WSS${desktopSuffix}`
          : feedsLive
            ? `Snapshot${desktopSuffix}`
            : 'Init';

  const summaryStatusText = !isPulseActive
    ? 'Public market updates paused (last snapshot held)'
    : hasCachedFallback
      ? 'Cached Snapshot Fallback Active'
      : hasFailover
        ? 'Secondary Provider Failover Engaged'
        : wsConnected
          ? 'Free crypto WebSocket connected; other markets use public snapshots'
          : feedsLive
            ? 'Free public market snapshot loaded'
            : 'Waiting for a public market snapshot';

  const tooltipSummary = !isPulseActive
    ? 'Automatic public-data refresh paused · Click to resume or inspect sources'
    : isDegraded
      ? `${summaryStatusText}${
          clientTransport.quotesRttMs !== null ? ` · ${clientTransport.quotesRttMs}ms RTT` : ''
        }`
      : `Public data status · ${
          clientTransport.quotesRttMs !== null ? `${clientTransport.quotesRttMs}ms fetch · ` : ''
        }hourly market snapshots${wsConnected ? ' · Coinbase crypto WebSocket connected' : ''}`;

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        if (!open) setTooltipVisible(true);
      }}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <button
        type="button"
        data-testid="feed-diagnostics-trigger"
        onClick={() => {
          setTooltipVisible(false);
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Public Market Data Diagnostics: ${summaryStatusText}`}
        title={tooltipSummary}
        className={`h-8 px-2 sm:px-2.5 rounded-full border text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
          !isPulseActive
            ? 'liquid-glass-pill text-[#4A4D57] dark:text-[#B4B8C4]'
            : isDegraded
              ? 'bg-[#D97706]/14 dark:bg-[#FBBF24]/14 border-[#D97706]/40 dark:border-[#FBBF24]/40 text-[#8A5004] dark:text-[#FBBF24]'
              : 'bg-[#22C55E]/14 dark:bg-[#4ADE80]/16 border-[#16A34A]/35 dark:border-[#4ADE80]/40 text-[#0F7033] dark:text-[#4ADE80]'
        }`}
      >
        {!isPulseActive ? (
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
        ) : hasCachedFallback ? (
          <Database className="w-3.5 h-3.5 shrink-0" />
        ) : hasFailover ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Activity className={`w-3.5 h-3.5 shrink-0 ${wsConnected ? 'animate-pulse' : ''}`} />
        )}
        <span className="sm:hidden font-mono tabular-nums">{mobileLabel}</span>
        <span className="hidden sm:inline font-mono tabular-nums">{desktopLabel}</span>
      </button>

      {/* Optional Hover Tooltip when closed */}
      {tooltipVisible && !open && (
        <div
          role="tooltip"
          className="hidden sm:block absolute right-0 top-full mt-2 w-[272px] z-50 rounded-xl liquid-glass-strong p-3 text-left shadow-xl pointer-events-none"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#1C1C1E] dark:text-white">
            <span>{summaryStatusText}</span>
            {clientTransport.quotesRttMs !== null && (
              <span className="font-mono tabular-nums text-[#4A4D57] dark:text-[#AEAEB2]">
                {clientTransport.quotesRttMs}ms
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-[#6C6C70] dark:text-[#9EB5C8] leading-snug">
            Click to pause/resume public snapshot refreshes or inspect source status. Live WebSocket ticks are limited to supported crypto pairs.
          </p>
        </div>
      )}

      {/* Public Market Snapshot + Diagnostics Drawer/Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Public Market Feed & Provider Diagnostics"
          data-testid="feed-diagnostics-drawer"
          className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-[54px] sm:top-full sm:mt-2 sm:w-[384px] z-50 rounded-2xl liquid-glass-strong shadow-2xl overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="px-4 py-3 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!isPulseActive ? (
                  <PauseCircle className="w-4 h-4 text-[#4A4D57] dark:text-[#B4B8C4] shrink-0" />
                ) : isDegraded ? (
                  <AlertTriangle className="w-4 h-4 text-[#9A5B06] dark:text-[#FBBF24] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#0F7033] dark:text-[#4ADE80] shrink-0" />
                )}
                <h3 className="text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
                  Public Data Sources &amp; Failover
                </h3>
              </div>
              <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5 truncate">
                {summaryStatusText}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feed diagnostics"
              className="p-1.5 rounded-lg text-[#4A4D57] dark:text-[#AEAEB2] hover:text-[#1C1C1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Public Snapshot Refresh Toggle */}
          <div className="px-4 py-2.5 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                Refresh &amp; Live Crypto
              </div>
              <div className="text-[10px] text-[#6C6C70] dark:text-[#9EB5C8] truncate">
                {isPulseActive
                  ? wsConnected
                    ? 'Coinbase crypto WebSocket active; other markets use scheduled snapshots'
                    : 'Hourly public market snapshots; refresh checks are local'
                  : 'Paused — holding current prices cleanly'}
              </div>
            </div>
            <button
              type="button"
              onClick={onTogglePulse}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors ${
                isPulseActive
                  ? 'bg-[#22C55E]/16 dark:bg-[#4ADE80]/18 border-[#16A34A]/35 dark:border-[#4ADE80]/40 text-[#0F7033] dark:text-[#4ADE80]'
                  : 'liquid-glass-pill text-[#1C1C1E] dark:text-white'
              }`}
            >
              {isPulseActive ? (
                <>
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Pause Updates</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Resume Updates</span>
                </>
              )}
            </button>
          </div>

          {/* Client Transport Telemetry Strip */}
          <div className="grid grid-cols-3 divide-x divide-black/8 dark:divide-white/10 border-b border-black/8 dark:border-white/10 bg-black/[0.025] dark:bg-white/[0.025]">
            <div className="px-3 py-2">
              <div className="text-[10px] font-semibold text-[#6C6C70] dark:text-[#9EB5C8]">
                Quotes RTT
              </div>
              <div className="text-xs font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white mt-0.5">
                {clientTransport.quotesRttMs !== null ? `${clientTransport.quotesRttMs} ms` : '—'}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] font-semibold text-[#6C6C70] dark:text-[#9EB5C8]">
                Crypto Stream
              </div>
              <div className="text-xs font-semibold text-[#1C1C1E] dark:text-white mt-0.5 flex items-center gap-1 truncate">
                <Wifi className="w-3 h-3 shrink-0 text-[#0F7033] dark:text-[#4ADE80]" />
                <span className="truncate">
                  {clientTransport.wsFresh
                    ? 'Coinbase WSS (crypto)'
                    : clientTransport.wsConnected
                      ? 'WSS Idle'
                      : 'REST Poll'}
                </span>
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] font-semibold text-[#6C6C70] dark:text-[#9EB5C8]">
                Snapshot Mode
              </div>
              <div
                className={`text-xs font-semibold mt-0.5 truncate ${
                  clientTransport.usingBootstrapCache
                    ? 'text-[#9A5B06] dark:text-[#FBBF24]'
                    : 'text-[#0F7033] dark:text-[#4ADE80]'
                }`}
              >
                {clientTransport.usingBootstrapCache ? 'Bootstrap Cache' : 'Public Snapshot'}
              </div>
            </div>
          </div>

          {/* Per-Provider Table */}
          <div className="divide-y divide-black/6 dark:divide-white/8 max-h-[280px] overflow-y-auto">
            {providers.length > 0 ? (
              providers.map((p) => {
                const meta = getStatusMeta(p.status);
                return (
                  <div key={p.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
                          {p.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A4D57] dark:text-[#B4B8C4] truncate mt-0.5">
                        {p.activeSource}
                      </p>
                      {p.fallbackReason && (
                        <p className="text-[10px] text-[#9A5B06] dark:text-[#FBBF24] mt-0.5 leading-snug">
                          {p.fallbackReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                        <span className={`text-[11px] font-bold ${meta.textClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5">
                        {p.latencyMs !== null ? `${p.latencyMs}ms` : '—'}
                        <span className="mx-1 opacity-50">·</span>
                        {formatAgeLabel(p.lastSuccessAt, nowMs)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-5 text-center text-xs text-[#6C6C70] dark:text-[#9EB5C8]">
                <Activity className="w-4 h-4 mx-auto mb-1.5 opacity-70" />
                Waiting for the first public source diagnostics snapshot...
              </div>
            )}
          </div>

          {/* Active Client Backoff Notice */}
          {clientTransport.activeBackoffs.length > 0 && (
            <div className="px-4 py-2 border-t border-black/8 dark:border-white/10 bg-[#D97706]/10 text-[10px] font-medium text-[#8A5004] dark:text-[#FBBF24]">
              Retrying:{' '}
              {clientTransport.activeBackoffs
                .map((b) => `${b.endpoint} (${b.retryInSec}s)`)
                .join(' · ')}
            </div>
          )}

          {/* Drawer Footer Actions */}
          <div className="px-4 py-2.5 border-t border-black/8 dark:border-white/10 flex items-center justify-between gap-3">
            <span className="text-[10px] font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
              Last tick {formatAgeLabel(clientTransport.lastQuotesAt, nowMs)}
            </span>
            <button
              type="button"
              onClick={() => {
                onRefreshAll();
                onRefreshDiagnostics();
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0066CC] text-white hover:brightness-110 transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Public Snapshots</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
