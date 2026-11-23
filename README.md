# Stocks — Global Market Terminal

A free-first global market terminal built with React, Vite and a Progressive Web App. Stocks is the surviving application. Only APIS market-data collection/adapters are retained; APIS non-market workspace modules and duplicate app shells are removed.

## No paid API keys or backend

- No OpenAI, Gemini, Firebase, Google sign-in, Express API server, Render service, paid market-data key, or remote database.
- GitHub Actions builds timestamped JSON snapshots from unauthenticated public market-data sources on an hourly schedule.
- GitHub Pages serves the app and snapshots as static files.
- Portfolio positions, watchlists, preferences, alerts and other user changes are stored in this browser/device only. There is no account or cloud synchronization.
- BTC/ETH may receive a free public Coinbase WebSocket tick while the app is open; other instruments use scheduled snapshots and source timestamps.
- News, macro calendar, FX, charts and market commentary use public sources where available. If a source is unavailable, the app shows unavailable/stale status rather than invented values.
- AI-generated research/chat is not included. Market summaries and signal explanations are deterministic calculations over available public data, not an LLM.

## Data quality and limitations

Public endpoints are best-effort and can be delayed, rate-limited, blocked or changed without notice. This build does not provide licensed real-time exchange data; in particular, a free public source cannot guarantee real-time IDX equities. Prices must be read with their provider timestamp and market-session label. Missing OHLC, previous-close, volume, 52-week range, yield or order-book fields stay unavailable. No prices or news are fabricated to fill gaps.

GitHub Actions snapshots run once per hour to limit load and remain within free public-repository usage. Crypto WebSocket updates only while the page is open and connected.

## Run locally

Requires Node.js 22 or later.

```bash
npm install
npm run feeds:generate
npm run validate
npm run lint
npm run build
```

For the GitHub Pages base path used by this repository:

```bash
GITHUB_PAGES=true npm run build
```

## Deploy

The `.github/workflows/deploy-pages.yml` workflow generates public data snapshots, validates the data and app source, builds the static PWA, commits the clean source tree, and deploys `dist/` to GitHub Pages. The workflow is also scheduled hourly. No secrets are needed.

## Install on Android

Open the published HTTPS site in Chrome and use **Install app** / **Add to Home screen**. The PWA shell and cached static assets support offline app launch; market refreshes still require an internet connection. This is not a native APK.

## APIS code retained

Only free public market-feed adapters and deterministic market-analysis/data-shaping functions in `scripts/data-sources/freeMarketFeeds.ts` are used by `scripts/generate-market-data.ts`. This collector runs only in GitHub Actions at build time; it is not a deployed server. All other APIS modules, AI services, authentication, cloud persistence and backend deployment files are intentionally excluded.
