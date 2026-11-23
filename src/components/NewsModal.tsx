import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { NewsStory } from '../types/market';

interface NewsModalProps {
  story: NewsStory | null;
  onClose: () => void;
}

export const NewsModal: React.FC<NewsModalProps> = ({ story, onClose }) => {
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setSavedNotice(false);
    if (!story) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [story, onClose]);

  if (!story) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-modal-headline"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl liquid-glass-strong rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative max-h-[88dvh]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close story"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] dark:hover:bg-[#38383A] flex items-center justify-center text-[#1C1C1E] dark:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Publisher & Time */}
        <div className="flex items-center gap-2 text-xs pr-10">
          {story.isBreaking && (
            <span className="px-2 py-0.5 rounded font-black tracking-wider uppercase bg-[#FF453A] text-white text-[10px]">
              BREAKING
            </span>
          )}
          <span className="font-bold text-[#1C1C1E] dark:text-white text-sm">
            {story.publisher}
          </span>
          <span className="text-[#6C6C70] dark:text-[#8E8E93]">·</span>
          <span className="text-[#6C6C70] dark:text-[#8E8E93]">
            {story.publishedAt ? `${story.timeAgo} (${story.publishedAt})` : story.timeAgo}
          </span>
        </div>

        {/* Headline */}
        <h3
          id="news-modal-headline"
          className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white leading-snug"
        >
          {story.headline}
        </h3>

        {/* Body */}
        <div className="text-sm text-[#1C1C1E]/90 dark:text-[#E5E5EA] leading-relaxed flex flex-col gap-3 overflow-y-auto pr-1">
          {story.paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#6C6C70] dark:text-[#8E8E93] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
            Verified Desk Dispatch
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {story.url && (
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white text-xs font-semibold hover:opacity-85 transition-opacity flex items-center gap-1.5"
              >
                <span>Open on {story.publisher}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setSavedNotice(true)}
              className="px-4 py-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              {savedNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved to Reading Brief</span>
                </>
              ) : (
                <>
                  <span>Save Full Dispatch</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
