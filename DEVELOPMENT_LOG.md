# APIS Development Log

## 2026-11-17 — v2.4.1 Free Public-Data Runtime

### User operating constraint
- No paid market-data subscriptions.
- No paid API keys, paid entitlements, or credentialed quote providers.
- Keep the application static-hosted on GitHub Pages.
- Do not fabricate quotes when a public source fails or lacks instrument coverage.

### Changes delivered
- Removed Twelve Data and Financial Modeling Prep adapters, API-key inputs, key-saving controls, and their bootstrap path.
- Removed any saved `apis_market_provider_keys` value from browser local storage during startup.
- Replaced the quote waterfall with:
  1. Stooq public CSV snapshot for explicitly mapped instruments.
  2. Yahoo Finance public chart fallback when Stooq has no mapping, denies access, is rate-limited, or returns an invalid/stale observation.
- Added Stooq symbol mappings for selected global indices, ETF, FX, commodity futures, and US equities. Instruments without a verified mapping skip Stooq and proceed to Yahoo.
- Added a one-request-per-1.1-second Stooq throttle, a 10-minute in-memory Stooq cache, CSV schema checks, positive-price checks, date validation, and a 48-hour stale guard.
- Reduced market quote workers from 8 to 3 to reduce pressure on public endpoints.
- Added provider-aware observation labels. Stooq values are shown as dated public snapshots, not falsely presented as intraday/live ticks.
- Retained Binance public BTC WebSocket/REST, Frankfurter daily USD/IDR reference rates, public Treasury/FRED yield sources, BLS/BEA/Federal Reserve calendar sources, and public publisher/news RSS.
- Retained responsive mobile-first Home/Markets/Movers/Watchlist layouts and the non-blocking diagnostic panel.
- Retained Macro calendar exception handling and strict date/time validation.

### Data-source semantics
- Stooq: free public CSV, selective symbol coverage, snapshot/EOD/delayed, rate limits or access denial possible.
- Yahoo Finance: unofficial public fallback, may be delayed, throttled, or unavailable.
- Binance/Coinbase/Kraken: public BTC streams; only label BTC as live while a timestamped WebSocket message is fresh.
- Frankfurter: daily reference FX, not executable/live FX.
- Treasury/FRED: daily yields, not intraday.
- BLS/BEA/Federal Reserve: official schedules; event coverage depends on the public pages/feeds being reachable.
- Reuters/Bloomberg/Investing headlines: Google News RSS discovery, not licensed market-price feeds.

### Validation
- Inline JavaScript syntax is checked by the GitHub Actions workflow in `.github/workflows/validate.yml`.
- Static assertions verify free-only provider wiring, required runtime modules, and absence of paid-provider API-key controls.
- Network availability is intentionally not treated as a code correctness guarantee. Public providers may block CORS relays, rate-limit requests, change symbols, or be unavailable.
- The app must show unavailable/stale states rather than fabricate data.

### Known limitations
- This is a static browser application. No server-side proxy, database, background worker, or licensed exchange feed is included.
- No free source guarantees tick-by-tick data for all 22 instruments, particularly IDX equities, regional indices, and futures.
- Stooq mappings are best-effort and must be validated against current Stooq coverage.
- GitHub Actions syntax validation does not itself prove live network feeds or GitHub Pages deployment are healthy.

### Current version
- APIS The Market Terminal v2.4.1
- Primary source file: `index.html`
- Branch: `main`
