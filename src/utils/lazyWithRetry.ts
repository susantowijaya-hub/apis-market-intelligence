import React, { ComponentType, lazy } from 'react';

const RETRY_DELAYS_MS = [250, 700, 1500];
const CHUNK_RELOAD_GUARD_KEY = 'stocks-chunk-reload-attempted';

export function isDynamicImportError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('error loading dynamically imported module')
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Wraps React.lazy with automatic transient-network retries so brief dev-server
 * restarts or proxy hiccups do not crash lazy widgets or routes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const mod = await loader();
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
        } catch {
          // ignore storage unavailability
        }
        return mod;
      } catch (err) {
        lastError = err;
        if (!isDynamicImportError(err) || attempt === RETRY_DELAYS_MS.length) {
          break;
        }
        await wait(RETRY_DELAYS_MS[attempt]);
      }
    }

    if (typeof window !== 'undefined' && isDynamicImportError(lastError)) {
      try {
        const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
        if (!alreadyReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise<never>(() => {});
        }
      } catch {
        // fall through to throw lastError
      }
    }

    throw lastError;
  });
}
