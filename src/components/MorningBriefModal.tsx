import React from 'react';
import { ArrowRight, Sparkles, Sunrise, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AppRoute, EconomicEvent, MarketAsset, StockMover } from '../types/market';
import { formatAssetPrice } from '../utils/formatters';

interface MorningBriefPackData {
  snapshot: MarketAsset[];
  moodLabel: string;
  bullCount: number;
  bearCount: number;
  topCatalyst: EconomicEvent | null;
  conditionNote: string;
  topUs: StockMover | null;
  topIdx: StockMover | null;
}

interface MorningBriefModalProps {
  clockFull: string;
  morningBriefSentence: string;
  morningBriefPack: MorningBriefPackData;
  onClose: () => void;
  onSelectAsset: (id: string) => void;
  onNavigate: (route: AppRoute) => void;
}

export const MorningBriefModal: React.FC<MorningBriefModalProps> = ({
  clockFull,
  morningBriefSentence,
  morningBriefPack,
  onClose,
  onSelectAsset,
  onNavigate,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Morning Briefing Pack"
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl liquid-glass-strong border border-[#E5E5EA] dark:border-[#1E3A4C] shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#C4923E]/18 border border-[#C4923E]/35 text-[#8C6218] dark:text-[#FBBF24] flex items-center justify-center shrink-0">
              <Sunrise className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-[#1C1C1E] dark:text-white tracking-tight">
                  Morning Briefing Pack
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4923E]/16 text-[#8C6218] dark:text-[#FBBF24]">
                  {morningBriefPack.moodLabel}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#6C6C70] dark:text-[#9EB5C8] tabular-nums">
                {clockFull} · {morningBriefPack.bullCount} Bullish / {morningBriefPack.bearCount} Bearish
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Morning Briefing Pack"
            className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-[#6C6C70] dark:text-[#9EB5C8] hover:text-[#1C1C1E] dark:hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Briefing Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          <div className="rounded-xl p-3.5 bg-[#C4923E]/[0.08] dark:bg-[#FBBF24]/[0.07] border border-[#C4923E]/25 dark:border-[#FBBF24]/25">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8C6218] dark:text-[#FBBF24] mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Executive Summary</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#1C1C1E] dark:text-[#E8F1F5] leading-relaxed">
              {morningBriefSentence}
            </p>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6C6C70] dark:text-[#9EB5C8] mb-2">
              Core Benchmarks Snapshot (Tap to inspect)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {morningBriefPack.snapshot.map((asset) => {
                const pos = asset.changePercent >= 0;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelectAsset(asset.id);
                      onNavigate('dashboard');
                      onClose();
                    }}
                    className="text-left rounded-xl liquid-glass-inset p-2.5 hover:border-[#0071E3] dark:hover:border-[#38BDF8] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white">
                        {asset.symbol}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold tabular-nums ${
                          pos
                            ? 'text-[#0F7033] dark:text-[#4ADE80]'
                            : 'text-[#C41C16] dark:text-[#FF6B63]'
                        }`}
                      >
                        {pos ? '+' : ''}
                        {asset.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold tabular-nums text-[#1C1C1E] dark:text-[#E2EDF5] mt-1">
                      {formatAssetPrice(asset)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {morningBriefPack.topCatalyst && (
              <div className="rounded-xl liquid-glass-inset p-3 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071E3] dark:text-[#38BDF8]">
                  Key Economic Catalyst ({morningBriefPack.topCatalyst.currency})
                </span>
                <p className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                  {morningBriefPack.topCatalyst.title}
                </p>
                <p className="text-[11px] font-mono text-[#6C6C70] dark:text-[#9EB5C8] tabular-nums">
                  {morningBriefPack.topCatalyst.timeWib} · Fcst: {morningBriefPack.topCatalyst.forecast} · Prev: {morningBriefPack.topCatalyst.previous}
                </p>
              </div>
            )}

            {(morningBriefPack.topUs || morningBriefPack.topIdx) && (
              <div className="rounded-xl liquid-glass-inset p-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F7033] dark:text-[#4ADE80]">
                  Top Equity Leaders
                </span>
                {morningBriefPack.topUs && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1C1C1E] dark:text-white">
                      US: {morningBriefPack.topUs.symbol}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        morningBriefPack.topUs.changePercent >= 0
                          ? 'text-[#0F7033] dark:text-[#4ADE80]'
                          : 'text-[#C41C16] dark:text-[#FF6B63]'
                      }`}
                    >
                      {morningBriefPack.topUs.changePercent >= 0 ? '+' : ''}
                      {morningBriefPack.topUs.changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
                {morningBriefPack.topIdx && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1C1C1E] dark:text-white">
                      IDX: {morningBriefPack.topIdx.symbol}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        morningBriefPack.topIdx.changePercent >= 0
                          ? 'text-[#0F7033] dark:text-[#4ADE80]'
                          : 'text-[#C41C16] dark:text-[#FF6B63]'
                      }`}
                    >
                      {morningBriefPack.topIdx.changePercent >= 0 ? '+' : ''}
                      {morningBriefPack.topIdx.changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {morningBriefPack.conditionNote && (
            <p className="text-xs text-[#4A4D57] dark:text-[#B4C8D8] leading-relaxed">
              {morningBriefPack.conditionNote}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-black/8 dark:border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl liquid-glass-pill text-xs font-semibold text-[#4A4D57] dark:text-[#C2D4E2] whitespace-nowrap shrink-0"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate('extract');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0071E3] dark:bg-[#0EA5E9] text-white text-xs font-bold shadow-sm hover:brightness-110 transition-all whitespace-nowrap shrink-0"
          >
            <span>Open Full Share Card</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
