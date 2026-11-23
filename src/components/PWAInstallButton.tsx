import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install Stocks App"
        title="Install Stocks as a standalone app"
        className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-full bg-[#0066CC] hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm transition-opacity"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline">Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        aria-label="Install as standalone app"
        title="Install as standalone app on phone or desktop"
        className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-full liquid-glass-pill hover:brightness-95 dark:hover:brightness-110 text-[#1C1C1E] dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#0066CC] dark:text-[#38BDF8] shrink-0" />
        <span className="hidden md:inline">App Install</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141B28] border border-[#E5E5EA] dark:border-white/15 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                Run Stocks as Standalone App
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-full text-[#6C6C70] hover:text-[#1C1C1E] dark:text-[#8E8E93] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#E5E5EA] leading-relaxed">
                1. Open the deployed web URL in <strong>Safari</strong>.<br />
                2. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.<br />
                3. Tap <strong>Add to Home Screen</strong> to launch Stocks fullscreen anytime.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#E5E5EA] leading-relaxed">
                1. Open the deployed web URL in <strong>Chrome / Edge</strong> (outside any iframe).<br />
                2. Tap the browser menu (<strong>⋮</strong>) and choose <strong>Install App</strong> or{' '}
                <strong>Add to Home screen</strong>.<br />
                3. Launch directly from your desktop or phone home screen anytime.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-[#0066CC] py-2 text-xs font-bold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
