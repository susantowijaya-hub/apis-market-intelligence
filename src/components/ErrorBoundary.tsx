import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { isDynamicImportError } from '../utils/lazyWithRetry';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isChunkError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(readable) as { error?: string };
      if (parsed && typeof parsed.error === 'string') {
        readable = parsed.error;
      }
    } catch {
      // keep original message
    }
    return {
      hasError: true,
      message: readable,
      isChunkError: isDynamicImportError(error),
    };
  }

  componentDidCatch(error: Error) {
    console.error('Terminal ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-[#F2F2F7] dark:bg-black text-[#1C1C1E] dark:text-white">
          <div className="max-w-md w-full rounded-2xl liquid-glass-strong p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF453A]/15 text-[#D7261C] dark:text-[#FF453A] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Session Recovery Needed</h2>
                <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93]">
                  {this.state.isChunkError
                    ? 'A terminal module update interrupted loading.'
                    : 'A rendering issue interrupted the view.'}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6C6C70] dark:text-[#8E8E93] bg-[#F2F2F7]/80 dark:bg-black/40 p-3 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] break-words">
              {this.state.message}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  this.setState({ hasError: false, message: '', isChunkError: false })
                }
                className="flex-1 min-h-[40px] rounded-xl liquid-glass-pill text-xs font-bold flex items-center justify-center gap-2 hover:brightness-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Terminal</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 min-h-[40px] rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
