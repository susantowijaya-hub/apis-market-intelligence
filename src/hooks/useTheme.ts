import { useCallback, useEffect, useState } from 'react';
import { ThemeMode } from '../types/market';

export interface ThemeOptionMeta {
  id: ThemeMode;
  label: string;
  shortLabel: string;
  description: string;
  swatchTop: string;
  swatchBottom: string;
  accent: string;
  recommended?: boolean;
  isDarkSurface: boolean;
}

/**
 * 3 Surviving Themes synthesized & refined from the 5 reference dashboards:
 * - obsidian  : Ref 02 (Smart Home) smoked obsidian glass + warm tungsten amber highlights
 * - arctic    : Refs 04 & 05 (Turbine + Fenisco) Nordic mist daylight glass + fintech cobalt
 * - parchment : Refs 01 & 03 (Worktail + SentinelAI) warm alabaster editorial matte + coral/sage clarity
 */
export const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: 'obsidian',
    label: 'Obsidian Amber',
    shortLabel: 'Obsidian',
    description: 'Smoked dark glass with warm tungsten amber & slate depth',
    swatchTop: '#0A0F18',
    swatchBottom: '#F59E0B',
    accent: '#FBBF24',
    recommended: true,
    isDarkSurface: true,
  },
  {
    id: 'arctic',
    label: 'Arctic Cobalt',
    shortLabel: 'Arctic',
    description: 'Nordic frosted crystal light with fintech cobalt accents',
    swatchTop: '#EDF3FA',
    swatchBottom: '#1D63ED',
    accent: '#0066CC',
    recommended: true,
    isDarkSurface: false,
  },
  {
    id: 'parchment',
    label: 'Warm Editorial',
    shortLabel: 'Editorial',
    description: 'Ivory parchment hairlines with terracotta & sage telemetry',
    swatchTop: '#F4F0E6',
    swatchBottom: '#C2410C',
    accent: '#C2410C',
    isDarkSurface: false,
  },
];

const THEME_ORDER: ThemeMode[] = ['obsidian', 'arctic', 'parchment'];

function normalizeThemeMode(value: string | null): ThemeMode {
  if (value === 'obsidian' || value === 'aurora' || value === 'dark') {
    return 'obsidian';
  }
  if (value === 'arctic' || value === 'light') {
    return 'arctic';
  }
  if (value === 'parchment' || value === 'champagne' || value === 'monochrome') {
    return 'parchment';
  }
  return 'obsidian';
}

export function getThemeMeta(mode: ThemeMode): ThemeOptionMeta {
  return THEME_OPTIONS.find((t) => t.id === mode) ?? THEME_OPTIONS[0];
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('stocks-theme');
      return normalizeThemeMode(saved);
    } catch {
      return 'obsidian';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.classList.remove(
      'obsidian',
      'arctic',
      'parchment',
      'dark',
      'light',
      'monochrome',
      'aurora',
      'champagne'
    );
    root.classList.add(themeMode);
    root.dataset.theme = themeMode;
    // Flush style recalculation synchronously before re-enabling hover/UI transitions
    void root.offsetHeight;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });

    try {
      localStorage.setItem('stocks-theme', themeMode);
    } catch {
      // ignore storage failure
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      const metaColor =
        themeMode === 'obsidian'
          ? '#080C14'
          : themeMode === 'parchment'
            ? '#F4F0E6'
            : '#EDF3FA';
      themeMeta.setAttribute('content', metaColor);
    }

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      root.classList.remove('theme-switching');
    };
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  return {
    themeMode,
    setThemeMode,
    isDark: themeMode === 'obsidian',
    toggleTheme,
  };
}
