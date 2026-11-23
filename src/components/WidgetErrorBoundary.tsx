import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface WidgetErrorBoundaryProps {
  widgetName: string;
  children: React.ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  message: string;
  retryKey: number;
}

export class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '', retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return {
      hasError: true,
      message: error?.message || 'Unable to load widget module.',
    };
  }

  componentDidCatch(error: Error) {
    console.warn(`WidgetErrorBoundary (${this.props.widgetName}):`, error);
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      message: '',
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-2xl liquid-glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {this.props.widgetName} temporarily unavailable
              </p>
              <p className="text-[11px] text-[#6C6C70] dark:text-[#9EB5C8] truncate">
                {this.state.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-glass-pill text-xs font-bold text-[#0071E3] dark:text-[#38BDF8] hover:brightness-95 shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </section>
      );
    }

    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
