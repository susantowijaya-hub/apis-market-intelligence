import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full bg-[#FF9F0A] px-3.5 py-1.5 text-xs font-bold text-black shadow-lg">
      <span className="h-2 w-2 rounded-full bg-black animate-pulse" />
      Offline Mode — Showing cached market data
    </div>
  );
};
