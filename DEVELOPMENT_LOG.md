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


### Follow-up hardening — 2026-11-17
- Restored and syntax-checked the Yahoo public chart adapter as the final fallback after Stooq. This is required for instruments without Stooq symbol coverage and when Stooq is blocked.
- Added a Stooq 48-hour freshness guard so stale Stooq snapshots fall through to Yahoo rather than being treated as a successful current refresh.
- Added observation-date rendering for Stooq snapshots to avoid presenting a date-only EOD observation as a precise intraday timestamp.
- Reduced public quote batch concurrency to three workers and retained per-symbol Stooq throttling/cache.
- Added `.github/workflows/validate.yml` to compile all inline JavaScript and assert free-only provider wiring on pushes and pull requests.
- Latest follow-up commit: `d0cfe0b9dac87580d22e5a0cd68c5b0b0d9e44f8`.
- Static verification in the development session: both inline scripts compile; free-only Stooq → Yahoo wiring, BTC stream, FX, Treasury, Macro, News, and mobile watchlist checks pass.
- The public endpoints were not claimed as universally reachable: browser CORS, Stooq quota, Yahoo throttling, provider outages, and instrument coverage remain external runtime dependencies.


### Final verification note — 2026-11-17
- Restored the Yahoo chart adapter after Stooq so the actual runtime path is Stooq → Yahoo, not Stooq-only.
- Mocked Stooq CSV smoke test passed: CSV header/row parsed, close and previous close normalized, provider/source/date/status assigned.
- Mocked Yahoo chart smoke test passed: provider metadata, timestamp, last price, previous close, and delayed status normalized.
- Both inline scripts compile successfully after the final quote-adapter changes.
- Static checks pass for free-only mode, no paid-provider names/adapters/key fields, 22 watchlist instruments, Stooq-first waterfall, Yahoo fallback, BTC, FX, Treasury, Macro, News, and responsive watchlist.
- Latest index content blob: `73a89db42a989c503ab55d066b2df7556918ca4a`.
- External live-feed connectivity and GitHub Pages browser rendering remain unverified from this execution environment; the new Actions workflow is the repository-side syntax/wiring gate.


## 2026-11-17 — v2.4.2 Touch-first visual correction

### User-reported defects from iPhone screenshots
- The market overview rendered two regional groups side by side, which forced nested quote tiles into extremely narrow widths and split names vertically (for example S&P 500 and NIFTY 50).
- The watchlist retained a wide seven-column HTML table, requiring horizontal scrolling and clipping columns.

### Root cause
- Mobile layout depended primarily on a 720px viewport breakpoint.
- iOS Safari can retain/request a desktop-width layout, so a touch device may not enter that breakpoint.
- The market summary reused the same .snapshot-grid class for both the outer group container and each nested instrument collection; old two-column rules therefore narrowed the nested cards.

### Changes
- Added high-specificity touch-first CSS targeting the market summary container by ID, forcing region groups into one full-width vertical stack.
- Instrument rows now use a two-line information hierarchy: instrument and price on line one; move, source state, and observation time on line two.
- Names use normal wrapping and prices use no-wrap/tabular alignment to prevent character-by-character stacking.
- Added a coarse-pointer media query in addition to width-based breakpoints, so iPhone layout remains responsive even when Safari requests desktop site.
- Forced the seven-column watchlist into full-width labelled stacked rows on touch devices; table headers are hidden and each value retains its own field label.
- No horizontal scrolling is required to read the watchlist on touch devices.
- Updated market snapshot wording to say “Free public-data snapshot”, avoiding a live-feed implication for delayed/EOD public feeds.
- Updated GitHub Actions checks for v2.4.2, touch-pointer layout rules, full-width market groups, and stacked watchlist.
- All 22 instruments remain in the same central watchlist; no data source or price logic was changed in this UI-only release.

### Validation
- Both inline JavaScript scripts compile after the CSS update.
- Static checks confirm v2.4.2, coarse-pointer media rules, full-width group container, nested one-column market rows, and touch-device stacked watchlist.
- A live iPhone screenshot/browser execution has not been available in this session; verify the deployed page after GitHub Pages publishes the commit.

## 2026-11-17 — v2.4.3 iPhone layout deployment verified

### Root cause of the unchanged/broken live page
- The v2.4.2 touch-first CSS and stacked watchlist were already present in the main source, but GitHub Pages had not published them.
- The deployment workflow contained an over-escaped JavaScript regular expression in its local static file server (requested.replace). Node raised SyntaxError: Invalid regular expression: missing / before browser tests, so upload and deploy were skipped.
- After the regex was corrected, the browser test initially measured the Markets view while it was hidden on the initial Home route. Its dimensions were correctly reported as zero. The test now activates Markets before measuring layout.

### Delivered changes
- APIS version marker: v2.4.3.
- Touch-first layout applies to narrow viewports and coarse-pointer/touch devices, including iOS Safari desktop-width mode.
- Market overview group container is forced into one vertical column. Each region group occupies the available width; instrument rows use readable instrument/price and change/status/time alignment.
- Market instrument names wrap as words instead of being squeezed into character-per-line columns.
- Watchlist on touch devices is converted from the wide seven-column table into full-width labelled rows. Table headers are hidden in the stacked mode; all fields retain explicit labels. No horizontal scroll is required to read the watchlist.
- The deployment test now opens the Markets route before checking computed dimensions and overflow.
- The deployment workflow's static-file-server regex was corrected.

### Verified GitHub Actions browser results
- APIS static validation: success.
- Chromium, 390px iPhone viewport: PASS.
- Chromium, 826px touch/desktop-width viewport: PASS.
- WebKit, 390px iPhone viewport: PASS.
- WebKit, 826px touch/desktop-width viewport: PASS.
- Each browser test also verified application boot, eight Home market pulse rows, one-column market groups, no sideways watchlist table, News/Macro navigation, dark theme control, and Refresh action.
- GitHub Pages deployment: success. GitHub reported "Reported success!" for build version commit 4f976a7d92f02e40526a8d3a64772f18399b0a60.
- Public site URL: https://susantowijaya-hub.github.io/apis-market-intelligence/

### Current release state
- User constraint remains: free public data only; no paid quote API or API key.
- Market-data source caveats remain unchanged: public feeds may be delayed, rate-limited, blocked by browser CORS, or omit instruments.
- Current visual release: v2.4.3.
