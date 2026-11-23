import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { PriceAlertItem } from '../types/market';

function formatAlertValue(
  value: number,
  decimals: number,
  currencyPrefix?: string,
  unitSuffix?: string
): string {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currencyPrefix ?? ''}${formatted}${unitSuffix ?? ''}`;
}

function formatWibClock(ts: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ts));
}

function formatShortPhase(phase?: string): string {
  if (!phase) return 'Accumulation';
  return phase
    .replace('Accumulation', 'Acc')
    .replace('Distribution', 'Dist');
}

export const PriceAlertToastStack: React.FC<{
  toasts: PriceAlertItem[];
  onDismiss: (id: string) => void;
  onSelectAlert: (alert: PriceAlertItem) => void;
}> = ({ toasts, onDismiss, onSelectAlert }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="price-alert-toast-stack"
      className="fixed bottom-24 right-4 z-50 flex flex-col gap-2.5 w-[min(355px,calc(100vw-2rem))] pointer-events-none"
      aria-live="polite"
      aria-label="Live price and accumulation notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const isIct = toast.alertKind === 'ict';
          const isBandar = toast.alertKind === 'bandarmology';
          const isBandarUpgrade =
            isBandar && toast.bandarToPhase === 'Strong Accumulation';
          const isSurge = isIct
            ? toast.ictAction !== 'SELL'
            : isBandar
              ? isBandarUpgrade
              : toast.direction === 'surge';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto rounded-2xl liquid-glass-strong p-3.5 shadow-xl border border-black/10 dark:border-white/20 flex items-start gap-3 cursor-pointer hover:brightness-[0.98] dark:hover:brightness-110 transition-all"
              onClick={() => onSelectAlert(toast)}
            >
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  isBandar && !isBandarUpgrade
                    ? 'bg-[#D97706]/16 border-[#D97706]/35 text-[#9A5A0A] dark:text-[#FBBF24]'
                    : isSurge
                      ? 'bg-[#22C55E]/16 border-[#22C55E]/35 text-[#0F7033] dark:text-[#4ADE80]'
                      : 'bg-[#EF4444]/16 border-[#EF4444]/35 text-[#C41C16] dark:text-[#FF6B63]'
                }`}
              >
                {isBandar ? (
                  <Activity className="w-4 h-4" />
                ) : isSurge ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white truncate">
                      {toast.symbol}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap ${
                        isBandar
                          ? isBandarUpgrade
                            ? 'bg-[#16A34A]/18 text-[#0F7033] dark:text-[#4ADE80]'
                            : 'bg-[#D97706]/18 text-[#9A5A0A] dark:text-[#FBBF24]'
                          : isIct
                            ? isSurge
                              ? 'bg-[#16A34A]/18 text-[#0F7033] dark:text-[#4ADE80]'
                              : 'bg-[#DC2626]/18 text-[#C41C16] dark:text-[#FF6B63]'
                            : 'text-[#6C6C70] dark:text-[#B4B8C4]'
                      }`}
                    >
                      {isBandar
                        ? 'IDX Bandar'
                        : isIct
                          ? `ICT ${toast.ictAction ?? 'BUY'}`
                          : '5m Alert'}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-extrabold text-xs tabular-nums ${
                      isBandar && !isBandarUpgrade
                        ? 'text-[#9A5A0A] dark:text-[#FBBF24]'
                        : isSurge
                          ? 'text-[#0F7033] dark:text-[#4ADE80]'
                          : 'text-[#C41C16] dark:text-[#FF6B63]'
                    }`}
                  >
                    {isBandar
                      ? `Score ${(toast.bandarScore ?? 0) >= 0 ? '+' : ''}${toast.bandarScore ?? 0}`
                      : isIct
                        ? `${toast.confidence ?? 72}%`
                        : toast.movePercent > 0
                          ? `+${toast.movePercent.toFixed(2)}%`
                          : `${toast.movePercent.toFixed(2)}%`}
                  </span>
                </div>

                {isBandar ? (
                  <p className="text-[11px] text-[#4A4D57] dark:text-[#C7CBD6] mt-0.5 leading-snug">
                    <span className="font-semibold text-[#1C1C1E] dark:text-white">
                      {formatShortPhase(toast.bandarFromPhase)} → {formatShortPhase(toast.bandarToPhase)}
                    </span>{' '}
                    · {(toast.bandarVolumeRatio ?? 1).toFixed(2)}x Vol ·{' '}
                    {toast.bandarForeignBias ?? 'Balanced'}
                  </p>
                ) : isIct ? (
                  <p className="text-[11px] text-[#4A4D57] dark:text-[#C7CBD6] mt-0.5 leading-snug">
                    <span className="font-semibold text-[#1C1C1E] dark:text-white">
                      {toast.ictSetup}
                    </span>{' '}
                    ({toast.ictTimeframe ?? '15m'}) · Entry{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {toast.entryZone}
                    </span>{' '}
                    · TP{' '}
                    <span className="font-mono tabular-nums font-bold text-[#0F7033] dark:text-[#4ADE80]">
                      {toast.targetPrice}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[#4A4D57] dark:text-[#C7CBD6] mt-0.5 leading-snug">
                    {isSurge ? 'Surged' : 'Dropped'}{' '}
                    <span className="font-mono font-bold tabular-nums">
                      {Math.abs(toast.movePercent).toFixed(2)}%
                    </span>{' '}
                    in {toast.windowMinutes}m:{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {formatAlertValue(
                        toast.fromPrice,
                        toast.decimals,
                        toast.currencyPrefix,
                        toast.unitSuffix
                      )}
                    </span>{' '}
                    →{' '}
                    <span className="font-mono tabular-nums font-bold text-[#1C1C1E] dark:text-white">
                      {formatAlertValue(
                        toast.toPrice,
                        toast.decimals,
                        toast.currencyPrefix,
                        toast.unitSuffix
                      )}
                    </span>
                  </p>
                )}

                <div className="text-[10px] font-mono text-[#6C6C70] dark:text-[#8E8E93] mt-1">
                  {formatWibClock(toast.triggeredAt)} WIB · Tap to inspect chart
                </div>
              </div>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(toast.id);
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

type AlertFilterKind = 'all' | 'bandarmology' | 'ict' | 'volatility';

export const PriceAlertDrawer: React.FC<{
  open: boolean;
  alerts: PriceAlertItem[];
  unreadCount: number;
  activeAssetId?: string;
  onClose: () => void;
  onSelectAlert: (alert: PriceAlertItem) => void;
  onMarkAllRead: () => void;
  onClearAlerts: () => void;
  onScanIct?: (assetId?: string) => void;
  onScanBandar?: () => void;
}> = ({
  open,
  alerts,
  unreadCount,
  activeAssetId,
  onClose,
  onSelectAlert,
  onMarkAllRead,
  onClearAlerts,
  onScanIct,
  onScanBandar,
}) => {
  const [filterKind, setFilterKind] = useState<AlertFilterKind>('all');

  const counts = useMemo(() => {
    let bandar = 0;
    let ict = 0;
    let vol = 0;
    for (const a of alerts) {
      if (a.alertKind === 'bandarmology') bandar++;
      else if (a.alertKind === 'ict') ict++;
      else vol++;
    }
    return { all: alerts.length, bandar, ict, vol };
  }, [alerts]);

  const visibleAlerts = useMemo(() => {
    if (filterKind === 'all') return alerts;
    if (filterKind === 'bandarmology') {
      return alerts.filter((a) => a.alertKind === 'bandarmology');
    }
    if (filterKind === 'ict') {
      return alerts.filter((a) => a.alertKind === 'ict');
    }
    return alerts.filter((a) => !a.alertKind || a.alertKind === 'volatility');
  }, [alerts, filterKind]);

  if (!open) return null;

  return (
    <motion.div
      data-testid="price-alert-drawer"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl liquid-glass-strong p-4 flex flex-col gap-3 border border-[#E5E5EA] dark:border-[#1E3142] shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/8 dark:border-white/10">
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
          ) : (
            <Bell className="w-4 h-4 text-[#0071E3] dark:text-[#38BDF8]" />
          )}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white">
              Live Alerts: IDX Bandarmology, ICT Signals &amp; 5m Volatility
            </h3>
            <p className="text-[11px] text-[#6C6C70] dark:text-[#94B0C4]">
              Auto-triggers on IDX Early ↔ Strong Accumulation shifts, ICT FX/BTC/Gold setups, and &ge;2% spikes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onScanBandar && (
            <button
              type="button"
              data-testid="scan-idx-bandar-btn"
              onClick={onScanBandar}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg liquid-glass-pill text-[11px] font-bold text-[#0F7033] dark:text-[#4ADE80] hover:brightness-95 dark:hover:brightness-110 transition-all whitespace-nowrap shrink-0"
              title="Scan Indonesian stocks for Early Accumulation <-> Strong Accumulation phase shifts"
            >
              <Activity className="w-3 h-3" />
              Scan IDX
            </button>
          )}
          {onScanIct && (
            <button
              type="button"
              onClick={() => onScanIct(activeAssetId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg liquid-glass-pill text-[11px] font-bold text-[#B45309] dark:text-[#FBBF24] hover:brightness-95 dark:hover:brightness-110 transition-all whitespace-nowrap shrink-0"
              title="Scan Forex Majors, BTC/USD, and XAU/USD for ICT Buy/Sell setups now"
            >
              <Zap className="w-3 h-3" />
              Scan ICT
            </button>
          )}
          {alerts.length > 0 && (
            <>
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg liquid-glass-pill text-[11px] font-semibold text-[#4A4D57] dark:text-[#C7CBD6] hover:text-[#1C1C1E] dark:hover:text-white whitespace-nowrap shrink-0"
              >
                <CheckCheck className="w-3 h-3" />
                Mark read
              </button>
              <button
                type="button"
                onClick={onClearAlerts}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg liquid-glass-pill text-[11px] font-semibold text-[#C41C16] dark:text-[#FF6B63] whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alerts panel"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6C6C70] dark:text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Filter Segmented Control */}
      <div
        role="tablist"
        aria-label="Filter alert feed"
        data-testid="alert-filter-tabs"
        className="flex items-center gap-1.5 flex-wrap"
      >
        {(
          [
            { id: 'all', label: `All (${counts.all})` },
            { id: 'bandarmology', label: `IDX Bandar (${counts.bandar})` },
            { id: 'ict', label: `ICT Signals (${counts.ict})` },
            { id: 'volatility', label: `5m Volatility (${counts.vol})` },
          ] as const
        ).map((tab) => {
          const active = filterKind === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilterKind(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#0066CC] text-white shadow-xs'
                  : 'liquid-glass-pill text-[#4A4D57] dark:text-[#B4B8C4] hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {visibleAlerts.length === 0 ? (
        <div className="py-5 px-3 text-center flex flex-col items-center gap-1.5">
          <p className="text-xs font-semibold text-[#1C1C1E] dark:text-white">
            No {filterKind === 'all' ? 'alerts' : filterKind === 'bandarmology' ? 'IDX Bandarmology shift alerts' : filterKind === 'ict' ? 'ICT signal alerts' : '5m volatility spikes'} queued right now
          </p>
          <p className="text-[11px] text-[#6C6C70] dark:text-[#8E8E93] max-w-md">
            Alerts fire automatically when IDX stocks shift between Early Accumulation and Strong Accumulation, on ICT Buy/Sell setups, and on &ge; 2.0% moves. Use Scan IDX or Scan ICT to check live signals immediately.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-black/6 dark:divide-white/10 max-h-[260px] overflow-y-auto">
          {visibleAlerts.map((alert) => {
            const isIct = alert.alertKind === 'ict';
            const isBandar = alert.alertKind === 'bandarmology';
            const isBandarUpgrade =
              isBandar && alert.bandarToPhase === 'Strong Accumulation';
            const isSurge = isIct
              ? alert.ictAction !== 'SELL'
              : isBandar
                ? isBandarUpgrade
                : alert.direction === 'surge';

            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => onSelectAlert(alert)}
                className={`w-full text-left py-2.5 px-2 rounded-lg flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                  alert.read ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isBandar && !isBandarUpgrade
                        ? 'bg-[#D97706]/16 text-[#9A5A0A] dark:text-[#FBBF24]'
                        : isSurge
                          ? 'bg-[#22C55E]/16 text-[#0F7033] dark:text-[#4ADE80]'
                          : 'bg-[#EF4444]/16 text-[#C41C16] dark:text-[#FF6B63]'
                    }`}
                  >
                    {isBandar ? (
                      <Activity className="w-3.5 h-3.5" />
                    ) : isSurge ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white">
                        {alert.symbol}
                      </span>
                      {isBandar ? (
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${
                            isBandarUpgrade
                              ? 'bg-[#16A34A]/18 text-[#0B5D2A] dark:text-[#4ADE80]'
                              : 'bg-[#D97706]/18 text-[#9A5A0A] dark:text-[#FBBF24]'
                          }`}
                        >
                          {formatShortPhase(alert.bandarFromPhase)} → {formatShortPhase(alert.bandarToPhase)}
                        </span>
                      ) : isIct ? (
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${
                            isSurge
                              ? 'bg-[#16A34A]/18 text-[#0B5D2A] dark:text-[#4ADE80]'
                              : 'bg-[#DC2626]/18 text-[#B91C1C] dark:text-[#FF6B63]'
                          }`}
                        >
                          ICT {alert.ictAction ?? 'BUY'} · {alert.ictTimeframe ?? '15m'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#6C6C70] dark:text-[#B4B8C4] truncate">
                          {alert.name}
                        </span>
                      )}
                      {!alert.read && (
                        <span className="text-[10px] font-bold text-[#0071E3] dark:text-[#3898FF]">
                          New
                        </span>
                      )}
                    </div>
                    {isBandar ? (
                      <p className="text-[11px] font-mono tabular-nums text-[#4A4D57] dark:text-[#C7CBD6] truncate">
                        {formatAlertValue(alert.toPrice, alert.decimals, alert.currencyPrefix)} · Vol{' '}
                        {(alert.bandarVolumeRatio ?? 1).toFixed(2)}x · Flow{' '}
                        {alert.bandarAccPressure ?? 50}% · {alert.bandarForeignBias ?? 'Balanced'}
                      </p>
                    ) : isIct ? (
                      <p className="text-[11px] font-mono tabular-nums text-[#4A4D57] dark:text-[#C7CBD6] truncate">
                        {alert.ictSetup} · Entry {alert.entryZone} · SL {alert.stopLoss} · TP {alert.targetPrice}
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono tabular-nums text-[#4A4D57] dark:text-[#C7CBD6]">
                        {formatAlertValue(
                          alert.fromPrice,
                          alert.decimals,
                          alert.currencyPrefix,
                          alert.unitSuffix
                        )}{' '}
                        →{' '}
                        {formatAlertValue(
                          alert.toPrice,
                          alert.decimals,
                          alert.currencyPrefix,
                          alert.unitSuffix
                        )}{' '}
                        ({alert.windowMinutes}m window)
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-extrabold font-mono tabular-nums ${
                      isBandar && !isBandarUpgrade
                        ? 'text-[#9A5A0A] dark:text-[#FBBF24]'
                        : isSurge
                          ? 'text-[#0F7033] dark:text-[#4ADE80]'
                          : 'text-[#C41C16] dark:text-[#FF6B63]'
                    }`}
                  >
                    {isBandar
                      ? `Score ${(alert.bandarScore ?? 0) >= 0 ? '+' : ''}${alert.bandarScore ?? 0}`
                      : isIct
                        ? `${alert.confidence ?? 72}% conf`
                        : alert.movePercent > 0
                          ? `+${alert.movePercent.toFixed(2)}%`
                          : `${alert.movePercent.toFixed(2)}%`}
                  </div>
                  <div className="text-[10px] font-mono text-[#6C6C70] dark:text-[#8E8E93]">
                    {formatWibClock(alert.triggeredAt)} WIB
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
