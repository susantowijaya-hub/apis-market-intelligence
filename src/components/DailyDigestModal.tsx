import React, { useEffect } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ExternalLink,
  Minus,
  RefreshCw,
  X,
} from 'lucide-react';
import { DailyDigestMoverImpact, DailyDigestResponse } from '../types/market';

interface DailyDigestModalProps {
  open: boolean;
  topicLabel: string;
  digest: DailyDigestResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRegenerate: () => void;
  onInspectMover?: (item: DailyDigestMoverImpact) => void;
}

function formatWibTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) return 'Just now';
  try {
    return `${new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(parsed))} WIB`;
  } catch {
    return 'Just now';
  }
}

export const DailyDigestModal: React.FC<DailyDigestModalProps> = ({
  open,
  topicLabel,
  digest,
  loading,
  error,
  onClose,
  onRegenerate,
  onInspectMover,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-digest-modal-title"
        data-testid="daily-digest-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl liquid-glass-strong border border-[#E5E5EA] dark:border-[#1E3A4C] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/8 dark:border-white/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#6C6C70] dark:text-[#9EB5C8]">
              <BookOpen className="w-4 h-4 text-[#0066CC] dark:text-[#3898FF] shrink-0" />
              <span>Free Public Data Recap</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{digest?.topicLabel || topicLabel}</span>
              {digest?.generatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums whitespace-nowrap">
                    {formatWibTime(digest.generatedAt)}
                  </span>
                </>
              )}
            </div>
            <h2
              id="daily-digest-modal-title"
              className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white mt-1 text-balance"
            >
              Daily Digest
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Digest"
            className="w-9 h-9 rounded-full liquid-glass-pill flex items-center justify-center text-[#6C6C70] dark:text-[#9EB5C8] hover:text-[#1C1C1E] dark:hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 py-5 overflow-y-auto flex-1 flex flex-col gap-6">
          {loading && !digest ? (
            <div
              data-testid="daily-digest-loading"
              className="flex flex-col gap-5"
              aria-live="polite"
            >
              <div className="flex flex-col gap-2">
                <div className="h-4 w-36 rounded bg-black/8 dark:bg-white/10 animate-pulse" />
                <div className="h-6 w-3/4 rounded bg-black/10 dark:bg-white/15 animate-pulse" />
                <div className="h-4 w-full rounded bg-black/8 dark:bg-white/10 animate-pulse mt-1" />
                <div className="h-4 w-5/6 rounded bg-black/8 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="border-t border-black/8 dark:border-white/10 pt-4 divide-y divide-black/8 dark:divide-white/10">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/12 animate-pulse" />
                      <div className="h-4 w-16 rounded bg-black/10 dark:bg-white/12 animate-pulse" />
                    </div>
                    <div className="h-3.5 w-full rounded bg-black/8 dark:bg-white/8 animate-pulse" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#6C6C70] dark:text-[#9EB5C8] text-center">
                Synthesizing live top market movers and session news impact...
              </p>
            </div>
          ) : error && !digest ? (
            <div
              data-testid="daily-digest-error"
              className="py-6 px-4 rounded-xl border border-[#DC2626]/30 bg-[#EF4444]/[0.06] dark:bg-[#FF6B63]/[0.08] flex flex-col gap-3"
            >
              <div className="flex items-start gap-2.5 text-sm text-[#B91C1C] dark:text-[#FF8A80]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Unable to generate session digest</span>
                  <span className="text-xs leading-relaxed opacity-90">{error}</span>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066CC] dark:bg-[#0EA5E9] text-white text-xs font-bold hover:brightness-110 transition-all whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Digest</span>
                </button>
              </div>
            </div>
          ) : digest ? (
            <>
              {/* Executive Thesis */}
              <section className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6C6C70] dark:text-[#9EB5C8]">
                  <span className="font-bold text-[#0066CC] dark:text-[#38BDF8]">
                    {digest.marketMood}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Executive Summary</span>
                  {loading && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#0066CC] dark:text-[#38BDF8]">
                        Refreshing...
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1C1C1E] dark:text-white leading-snug text-balance">
                  {digest.sessionHeadline}
                </h3>
                <p className="text-sm text-[#3A3A3C] dark:text-[#D1D9E0] leading-relaxed">
                  {digest.executiveBrief}
                </p>
              </section>

              {error && (
                <div className="px-3 py-2 rounded-xl border border-[#DC2626]/30 bg-[#EF4444]/[0.06] text-xs text-[#B91C1C] dark:text-[#FF8A80]">
                  Refresh error: {error}
                </div>
              )}

              {/* Top Movers & News Impact Breakdown */}
              <section className="border-t border-black/8 dark:border-white/10 pt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 pb-1">
                  <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                    Top Movers &amp; News Impact
                  </h4>
                  <span className="text-xs font-mono tabular-nums text-[#6C6C70] dark:text-[#9EB5C8]">
                    {digest.moverImpacts.length} Movers
                  </span>
                </div>

                {digest.moverImpacts.length > 0 ? (
                  <div
                    data-testid="daily-digest-movers-list"
                    className="divide-y divide-black/8 dark:divide-white/10"
                  >
                    {digest.moverImpacts.map((item, idx) => {
                      const isUp = item.direction === 'up';
                      const isDown = item.direction === 'down';
                      const canInspect = Boolean(item.yahooSymbol && onInspectMover);

                      return (
                        <div
                          key={`${item.symbol}-${idx}`}
                          className="py-3.5 first:pt-2 last:pb-1 flex flex-col gap-1.5"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                              {canInspect ? (
                                <button
                                  type="button"
                                  onClick={() => onInspectMover?.(item)}
                                  className="inline-flex items-center gap-1 text-sm font-extrabold font-mono text-[#0066CC] dark:text-[#38BDF8] hover:underline whitespace-nowrap shrink-0"
                                >
                                  <span>{item.symbol}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className="text-sm font-extrabold font-mono text-[#1C1C1E] dark:text-white whitespace-nowrap shrink-0">
                                  {item.symbol}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-[#3A3A3C] dark:text-[#D1D9E0] truncate">
                                {item.name}
                              </span>
                              <span aria-hidden="true" className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                                ·
                              </span>
                              <span className="text-xs text-[#6C6C70] dark:text-[#9EB5C8] whitespace-nowrap">
                                {item.market}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 text-xs font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${
                                isUp
                                  ? 'text-[#0F7033] dark:text-[#4ADE80]'
                                  : isDown
                                    ? 'text-[#C41C16] dark:text-[#FF6B63]'
                                    : 'text-[#6C6C70] dark:text-[#9EB5C8]'
                              }`}
                            >
                              {isUp ? (
                                <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                              ) : isDown ? (
                                <ArrowDown className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Minus className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{item.movePercent}</span>
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F2F6FA]">
                            Catalyst: {item.associatedHeadline}
                          </p>
                          <p className="text-xs text-[#4A4D57] dark:text-[#B4C8D8] leading-relaxed">
                            {item.impactAnalysis}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-xs text-[#6C6C70] dark:text-[#9EB5C8]">
                    No mover-impact pairs returned for this scope. Try regenerating with All Topics selected.
                  </p>
                )}
              </section>

              {/* Session Watchpoints */}
              {digest.sessionWatchpoints.length > 0 && (
                <section className="border-t border-black/8 dark:border-white/10 pt-4 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                    Session Watchpoints
                  </h4>
                  <ul className="flex flex-col gap-1.5 text-xs text-[#3A3A3C] dark:text-[#D1D9E0] leading-relaxed list-disc pl-4">
                    {digest.sessionWatchpoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-black/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#6C6C70] dark:text-[#9EB5C8]">
            {digest?.model ? `Method: ${digest.model}` : 'Live Market Wire + Top Movers'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={loading}
              data-testid="daily-digest-regenerate"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066CC] dark:bg-[#0EA5E9] text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Generating...' : 'Regenerate'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl liquid-glass-pill text-xs font-semibold text-[#4A4D57] dark:text-[#C2D4E2] hover:text-[#1C1C1E] dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
