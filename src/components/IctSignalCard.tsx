import React, { useMemo } from 'react';
import { ArrowDown, ArrowUp, BellRing, Crosshair, ShieldAlert, Target, Zap } from 'lucide-react';
import { IctSignalAnalysis, MarketAsset, Timeframe } from '../types/market';
import { computeIctSignal, isIctEligibleAsset, scanAllIctSignals } from '../utils/ictSignals';

interface IctSignalCardProps {
  assets: MarketAsset[];
  activeAsset: MarketAsset;
  activeTimeframe: Timeframe;
  onSelectAsset: (id: string) => void;
  onLoadTimeframe?: (assetId: string, tf: Timeframe) => void;
  onTriggerIctAlert?: (signal: IctSignalAnalysis) => void;
}

const ICT_INTRADAY_FOCUS_TFS: Set<Timeframe> = new Set([
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1D',
]);

export const IctSignalCard: React.FC<IctSignalCardProps> = React.memo(
  ({
    assets,
    activeAsset,
    activeTimeframe,
    onSelectAsset,
    onLoadTimeframe,
    onTriggerIctAlert,
  }) => {
    const activeIsEligible = isIctEligibleAsset(activeAsset);
    const evalTf: Timeframe | undefined = ICT_INTRADAY_FOCUS_TFS.has(activeTimeframe)
      ? activeTimeframe
      : '15m';

    const allIctSignals = useMemo(() => {
      const prefMap: Record<string, Timeframe> = {};
      if (activeIsEligible) {
        prefMap[activeAsset.id] = evalTf ?? '15m';
      }
      return scanAllIctSignals(assets, prefMap);
    }, [assets, activeAsset.id, activeIsEligible, evalTf]);

    const featuredSignal = useMemo<IctSignalAnalysis | null>(() => {
      if (activeIsEligible) {
        return computeIctSignal(activeAsset, evalTf);
      }
      return allIctSignals[0] ?? null;
    }, [activeAsset, activeIsEligible, evalTf, allIctSignals]);

    const actionableCount = useMemo(
      () => allIctSignals.filter((s) => s.direction !== 'NEUTRAL').length,
      [allIctSignals]
    );

    if (!featuredSignal) return null;

    const isBuy = featuredSignal.direction === 'BUY';
    const isSell = featuredSignal.direction === 'SELL';
    const dirTone = isBuy
      ? 'bg-[#16A34A]/18 dark:bg-[#22C55E]/22 text-[#0B5D2A] dark:text-[#4ADE80] border-[#16A34A]/45 dark:border-[#4ADE80]/45'
      : isSell
        ? 'bg-[#DC2626]/18 dark:bg-[#EF4444]/22 text-[#B91C1C] dark:text-[#FF6B63] border-[#DC2626]/45 dark:border-[#FF6B63]/45'
        : 'bg-[#E5E5EA]/85 dark:bg-[#2C2C2E] text-[#4A4D57] dark:text-[#C7CBD6] border-[#C7C7CC] dark:border-[#48484E]';

    const handleInspectSignal = (sig: IctSignalAnalysis) => {
      onSelectAsset(sig.assetId);
      if (onLoadTimeframe) {
        onLoadTimeframe(sig.assetId, sig.timeframe);
      }
    };

    return (
      <section
        data-testid="ict-signal-card"
        aria-label="ICT Smart Money Signal Radar for FX Majors, BTCUSD, and XAUUSD"
        className="rounded-2xl liquid-glass-card p-4 flex flex-col gap-3.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#0071E3] dark:text-[#F59E0B] shrink-0" />
              <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
                ICT Liquidity &amp; OTE Radar
              </h2>
            </div>
            <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] mt-0.5">
              FX Majors · BTC/USD · XAU/USD · {actionableCount} active{' '}
              {actionableCount === 1 ? 'setup' : 'setups'}
            </p>
          </div>

          {onTriggerIctAlert && (
            <button
              type="button"
              onClick={() => onTriggerIctAlert(featuredSignal)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg liquid-glass-pill text-[11px] font-bold text-[#0071E3] dark:text-[#FBBF24] hover:brightness-95 dark:hover:brightness-110 transition-all whitespace-nowrap shrink-0"
              title={`Emit live ICT ${featuredSignal.direction} alert for ${featuredSignal.symbol}`}
            >
              <BellRing className="w-3 h-3 shrink-0" />
              Alert Setup
            </button>
          )}
        </div>

        {/* Active Setup Spotlight */}
        <div className="rounded-xl liquid-glass-inset p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleInspectSignal(featuredSignal)}
              className="text-left group min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#1C1C1E] dark:text-white group-hover:text-[#0071E3] dark:group-hover:text-[#FBBF24] transition-colors">
                  {featuredSignal.symbol}
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#6C6C70] dark:text-[#9EB5C8]">
                  {featuredSignal.timeframe} · {featuredSignal.pdZone}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-[#4A4D57] dark:text-[#C7CBD6] truncate">
                {featuredSignal.setupName}
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-extrabold tracking-wide whitespace-nowrap ${dirTone}`}
              >
                {isBuy ? (
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                ) : isSell ? (
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                ICT {featuredSignal.direction}
              </span>
              <span className="text-xs font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white">
                {featuredSignal.confidence}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/8 dark:border-white/10 text-[11px]">
            <div className="min-w-0">
              <span className="text-[#6C6C70] dark:text-[#9EB5C8] block">Entry OTE</span>
              <span className="font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-white truncate block">
                {featuredSignal.entryZone}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[#6C6C70] dark:text-[#9EB5C8] flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-[#DC2626] dark:text-[#FF6B63]" />
                Stop Loss
              </span>
              <span className="font-mono font-bold tabular-nums text-[#C41C16] dark:text-[#FF6B63] truncate block">
                {featuredSignal.stopLoss}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[#6C6C70] dark:text-[#9EB5C8] flex items-center gap-1">
                <Target className="w-3 h-3 text-[#16A34A] dark:text-[#4ADE80]" />
                Target Liq
              </span>
              <span className="font-mono font-bold tabular-nums text-[#0F7033] dark:text-[#4ADE80] truncate block">
                {featuredSignal.targetPrice}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[#6C6C70] dark:text-[#9EB5C8] block">R:R Ratio</span>
              <span className="font-mono font-extrabold tabular-nums text-[#1C1C1E] dark:text-white block">
                {featuredSignal.riskReward}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#6C6C70] dark:text-[#9EB5C8] flex flex-wrap items-center gap-1.5">
            <span>Confluence:</span>
            {featuredSignal.triggers.map((tr, i) => (
              <React.Fragment key={tr}>
                {i > 0 && <span aria-hidden="true">·</span>}
                <span className="font-semibold text-[#1C1C1E] dark:text-[#E5E5EA]">{tr}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Cross-Pair ICT Signal Scanner Strip (FX Majors + BTC + XAU) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8]">
            <span>FX Majors · BTC · XAU Feed</span>
            <span className="font-mono tabular-nums">{allIctSignals.length} pairs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1.5 max-h-[248px] overflow-y-auto pr-0.5">
            {allIctSignals.map((sig) => {
              const selected = sig.assetId === activeAsset.id;
              const buySig = sig.direction === 'BUY';
              const sellSig = sig.direction === 'SELL';
              const badgeCls = buySig
                ? 'bg-[#16A34A]/16 text-[#0B5D2A] dark:text-[#4ADE80] border-[#16A34A]/40'
                : sellSig
                  ? 'bg-[#DC2626]/16 text-[#B91C1C] dark:text-[#FF6B63] border-[#DC2626]/40'
                  : 'bg-[#E5E5EA]/75 dark:bg-[#2C2C2E] text-[#52525A] dark:text-[#B4B8C4] border-[#D1D1D6] dark:border-[#38383A]';

              return (
                <div
                  key={sig.assetId}
                  onClick={() => handleInspectSignal(sig)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleInspectSignal(sig);
                    }
                  }}
                  className={`rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    selected
                      ? 'bg-[#0071E3]/10 dark:bg-[#F59E0B]/12 border-[#0071E3]/55 dark:border-[#F59E0B]/55'
                      : 'liquid-glass-inset hover:border-[#0071E3]/45 dark:hover:border-[#F59E0B]/45'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white">
                        {sig.symbol}
                      </span>
                      <span className="text-[10px] font-mono text-[#6C6C70] dark:text-[#9EB5C8]">
                        {sig.timeframe}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6C6C70] dark:text-[#9EB5C8] truncate">
                      {sig.setupName}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border text-[10px] font-extrabold font-mono tabular-nums ${badgeCls}`}
                    >
                      {sig.direction === 'NEUTRAL' ? 'WAIT' : sig.direction} · {sig.confidence}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
);
