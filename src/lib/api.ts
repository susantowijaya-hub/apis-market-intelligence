/**
 * Resolve the app's former JSON API paths to versioned-free static snapshots.
 * The snapshots are built from public provider data by GitHub Actions; no paid
 * backend, private key, database or server is required at runtime.
 */
const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

function segment(value: string | null, fallback: string): string {
  const raw = (value || fallback).trim();
  if (!raw || raw.length > 64 || !/^[A-Za-z0-9._^=-]+$/.test(raw)) return fallback;
  return raw.replace(/\.\./g, '');
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const [pathname, query = ''] = normalizedPath.split('?', 2);
  const params = new URLSearchParams(query);
  let file: string;

  switch (pathname) {
    case '/api/market/quotes': file = 'api/market/quotes.json'; break;
    case '/api/market/diagnostics': file = 'api/market/diagnostics.json'; break;
    case '/api/market/daily-summary': file = 'api/market/daily-summary.json'; break;
    case '/api/market/intelligence': file = 'api/market/intelligence.json'; break;
    case '/api/market/heatmap': file = 'api/market/heatmap.json'; break;
    case '/api/fx/rates': file = 'api/fx/rates.json'; break;
    case '/api/news/feed': file = 'api/news/feed.json'; break;
    case '/api/calendar/events': file = 'api/calendar/events.json'; break;
    case '/api/stocks/movers': file = 'api/stocks/movers.json'; break;
    case '/api/stocks/search': file = 'api/stocks/search.json'; break;
    case '/api/portfolio/quotes': file = 'api/portfolio/quotes.json'; break;
    case '/api/portfolio/movers-brief': file = 'api/portfolio/movers-brief.json'; break;
    case '/api/market/share-snapshot': {
      const slot = segment(params.get('slot'), 'morning_0530');
      file = `api/market/share-snapshot/${slot}.json`;
      break;
    }
    case '/api/market/chart': {
      const id = segment(params.get('id'), 'SPX');
      const timeframe = segment(params.get('timeframe'), '1D');
      file = `api/market/charts/${id}/${timeframe}.json`;
      break;
    }
    case '/api/portfolio/chart': {
      const symbol = segment(params.get('symbol'), 'AAPL');
      const timeframe = segment(params.get('timeframe'), '1D');
      file = `api/portfolio/charts/${symbol}/${timeframe}.json`;
      break;
    }
    case '/api/symbol/detail': {
      const symbol = segment(params.get('symbol'), 'AAPL');
      const timeframe = segment(params.get('timeframe'), '1D');
      file = `api/symbol/details/${symbol}/${timeframe}.json`;
      break;
    }
    case '/api/market/depth': {
      const id = segment(params.get('id'), 'BTCUSD');
      file = `api/market/depth/${id}.json`;
      break;
    }
    case '/api/market/correlations': {
      const timeframe = params.get('timeframe') === '3M' ? '3M' : '1M';
      file = `api/market/correlations/${timeframe}.json`;
      break;
    }
    default:
      return `${basePath}/api/unavailable.json`;
  }

  return `${basePath}/${file}`;
}
