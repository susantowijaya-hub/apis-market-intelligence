# APIS Source Architecture

## Runtime entry
- `index.html`: semantic page shell, navigation, page containers, and ordered asset loading only.
- `assets/css/app.css`: all application styles and theme tokens.
- Scripts load as ordered classic scripts. This preserves the shared browser-global contract and avoids a bundler/package dependency on GitHub Pages.

## JavaScript modules
1. `assets/js/compat.js` — early compatibility shims and runtime diagnostics. Load first.
2. `assets/js/core.js` — timezone, watchlist, quote/cache state, formatting and DOM helpers.
3. `assets/js/market-data.js` — quote providers, exchange sessions, quote polling, market rendering and feed labels.
4. `assets/js/realtime-data.js` — Bitcoin, FX, Treasury, economic calendar, news and filing feeds.
5. `assets/js/workspace.js` — prompt audit, calculators, evidence ledger, alerts, exports and local task routing.
6. `assets/js/bootstrap.js` — navigation, theme controls, event wiring and application startup. Load last.

## Targeted editing workflow
- Market quote bug: edit `market-data.js` and its focused regression fixture only.
- Calendar bug: edit `realtime-data.js` only.
- Workspace/tool bug: edit `workspace.js` only.
- Layout/style bug: edit `app.css`; edit `index.html` only when DOM structure changes.
- Startup/routing bug: edit `bootstrap.js`.
- Keep each provider adapter and instrument mapping in one source file. Do not duplicate logic in HTML or workflow files.

## Validation and deployment
- `.github/workflows/validate.yml` compiles the ordered modules and runs pure regression tests.
- `.github/workflows/deploy-pages.yml` validates DOM/function wiring, then runs Chromium and WebKit browser smoke tests before Pages deployment.
- Make one cohesive commit, then wait for its validation/deploy run before pushing another commit.
- Never label a quote live unless its provider timestamp and market session support that label. Reject stale/mismatched dates and derive percentage from the paired previous close when available.

## Data policy
- Prefer exchange-published data when it is accessible and timestamped.
- Public third-party feeds are fallbacks, not exchange-authoritative feeds.
- Never fabricate a price, previous close, percentage, chart point or event value.
- If provider coverage cannot be verified, display unavailable/stale rather than a guessed value.
