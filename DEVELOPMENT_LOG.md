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

## 2026-11-17 — v2.5.0 iOS Stocks-style experience

### Product changes
- Rebuilt Home as a compact iOS Stocks-inspired screen: Stocks/date heading, searchable 27-instrument watchlist, actual provider sparkline when historical closes are returned, right-aligned last price and green/red move badge, and expandable source/status/observation details.
- Moved the primary market watchlist and data quality summary to Home.
- Added Home cross-asset pulse cards for BTC/USD and USD/IDR.
- Added Markets category tabs: Indices, Commodities, FX & Crypto, Equities.
- Added commodity instruments: XAU/USD spot, WTI crude futures, Brent crude futures, copper futures, plus COMEX gold futures. The commodity segment contains five instruments.
- Added IDX LQ45 and Hang Seng to the instrument set. Total watchlist is 27.
- Bitcoin appears in FX & Crypto even before a fresh public price arrives; it remains unavailable until a real exchange observation is received.
- Removed the TradingView embed HTML, widget loader, chart functions, and bootstrap dependency. No non-working chart embed remains.
- Added animated page transitions, expandable stock rows, sparkline drawing, search expansion, tab press/selection feedback, theme controls and checkbox switch behavior.
- Dark appearance is the first-run default; user-selected theme is retained.

### Data integrity
- No paid API keys or subscriptions added.
- Public source path remains Stooq public CSV where mapped, then Yahoo Finance public chart fallback.
- BTC uses public exchange streams/REST; only a fresh WebSocket message is labelled LIVE TICK.
- USD/IDR uses Frankfurter's daily reference rate and is not shown as intraday/executable FX.
- Sparklines use actual quote close history only. Snapshot-only instruments get no invented line.
- Unavailable or failed provider values remain unavailable; no synthetic quotes are generated.
- XAU/USD, WTI and copper currently rely on Yahoo public fallback where Stooq does not have a mapped symbol; coverage/delay is not guaranteed.

### Runtime defect found and fixed
- Chromium/WebKit initially exposed a missing comma in the source-health rows array after the Price mini-charts entry.
- The row destructuring inside renderQuality then received an undefined array entry and raised TypeError: undefined is not iterable on every quote/news/macro refresh.
- Added the missing array separator and a defensive four-field row guard. This was not hidden or suppressed.

### Verified browser and deployment results
- Static validation: SUCCESS.
- Chromium at 390px iPhone viewport: SUCCESS.
- Chromium at 826px touch/desktop-width viewport: SUCCESS.
- WebKit at 390px iPhone viewport: SUCCESS.
- WebKit at 826px touch/desktop-width viewport: SUCCESS.
- Each browser verified 27 Home rows, search filtering, BTC/USDIDR cards, five commodity rows, no external chart embed, expandable instrument details, no horizontal overflow, News/Macro navigation, animated theme control, refresh, and no JavaScript page errors.
- GitHub Pages deployment: SUCCESS for commit 5bf128f682f310225dfb4f497f816a2f74230a4a.
- Deployment run: https://github.com/susantowijaya-hub/apis-market-intelligence/actions/runs/44034875955

### Current operating constraints
- Free public data only; no paid data APIs or keys.
- Free price sources are not guaranteed to be real-time, complete, or continuously available.
- Do not call stale, delayed or daily-reference data live.
- Current product release: APIS v2.5.0.


## 2026-11-17 — v2.6.0 verified market data and macro calendar

### Home and Markets
- Home now contains only 20 market references: equity indices, volatility / ETF references, FX and commodities. Individual company shares (BBCA, BMRI, BBRI, GOTO, AAPL, NVDA, MSFT) remain accessible under the separate Equities segment, not Home.
- Home index rows are grouped by region: Indonesia, United States, Greater China, North Asia and South Asia.
- Markets segments use regional group headings, with separate Commodities, Foreign Exchange and Crypto group headings.
- Added a small session-status line below the move badge: LIVE, LIVE · SPOT, SESSION OPEN · DELAYED, MARKET CLOSE, MARKET CLOSE · STALE, PRE-MARKET, AFTER-HOURS, etc. The label follows provider state and exchange/spot-session logic; a stale quote is not labelled live.
- Commodity segment retains XAU/USD spot, Gold Futures, WTI, Brent and Copper.

### XAU/USD
- Replaced the Yahoo Finance / CORS-proxy dependency for spot gold with XAUS GET https://xaus.com/api/v1/spot?compact=1.
- Uses the direct public browser endpoint; XAUS documents open CORS, no API key, spot response cache of approximately 60 seconds and data-state metadata.
- Reads spot_usd_oz, data_state.status, data_state.as_of / price_as_of, and age. Unavailable, stale or timestamp-less responses are rejected rather than replaced by a fallback estimate.
- The intraday line / percentage uses XAUS first-party intraday points only when at least 23 hours of series coverage is available. Otherwise the price may be shown but percentage/history remains unavailable. No fabricated 24-hour percentage.
- Source / provider link is shown in the expanded row. Quote is indicative spot (USD per troy ounce), not an executable broker quote.

### Taiwan Weighted (TAIEX)
- Added a dated TWSE daily-report-first adapter:
  https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=YYYYMMDD&type=IND.
- Parses the named 發行量加權股價指數 row and its official closing index, signed point change and percentage. It validates the report date against the Asia/Taipei trading date.
- Only when the dated official daily report cannot be fetched does the adapter fall back to the TWSE OpenAPI monthly history endpoint:
  https://openapi.twse.com.tw/v1/indicesReport/MI_5MINS_HIST.
- This fallback is visibly attributed as a last-available-session observation; it cannot make an older quote appear to be today's close.
- For 17 Nov 2026, the official TWSE report shows TAIEX close 40,092.11, down 947.97 points / 2.31%. The previous close was 41,040.08. The earlier APIS -8.20% badge used an inconsistent previous-close reference and was wrong.
- Browser test fixtures independently assert 40,092.11 / 41,040.08 / -2.31% and verify the dated daily report is preferred over monthly history.

### U.S. Treasury yield curve
- Replaced the all-four-tenors-in-one-row requirement with independent FRED observation selection for DGS2, DGS5, DGS10 and DGS30.
- Each tenor now shows its own observation date. Missing observations in one tenor do not erase available values in other tenors.
- 10Y-2Y spread is calculated only when both tenors have valid observations for the same date; otherwise it remains blank.
- Browser regression fixture sets DGS30 to 5.47% on 13 Nov 2026 while leaving 16 Nov DGS30 blank, and verifies 30Y remains displayed with its correct date.
- FRED's DGS30 source is Board of Governors H.15 constant-maturity 30-year yield; daily percentages are not intraday prices.

### Economic release calendar
- Replaced the high-only official release list with a Forex Factory-style calendar.
- Filter controls: High / Medium impact; countries/currencies AUD, CAD, CHF, CNY, EUR, GBP, IDR, JPY, NZD and USD; and Growth, Inflation, Employment, Central Bank, Bonds, Housing, Consumer Surveys, Business Surveys, Speeches, Misc categories.
- Added 3D and 7D ranges, day grouping in WIB, red High / amber Medium indicators, and three Previous / Forecast / Actual value columns.
- Same-day rows remain visible until the WIB calendar day changes, including after a scheduled release time has passed.
- Forex Factory public weekly JSON supplies the event title, country, scheduled time, impact, previous and forecast where available.
- XOOMAR public API supplies U.S. agency-sourced previous / actual values. XOOMAR explicitly does not supply consensus forecasts; where a matching Forex Factory event exists, its forecast is retained. A blank field means the source did not provide the value.
- Indonesia RDG dates come from Bank Indonesia's official 2026 annual schedule: 17–18 Nov and 15–16 Dec 2026. APIS assigns Medium to the first meeting day and High to the decision day for filtering purposes; BI itself publishes dates, not Forex Factory impact ratings. No meeting time, previous rate, forecast rate or actual rate is invented.
- Calendar cache is stored for 15 minutes to avoid excessive calls to public providers and to retain the current-day schedule.
- Existing News page continues to use public publisher feeds including CNBC, BBC, Guardian, Reuters/Bloomberg via Google News RSS, Investing.com via Google News RSS, Federal Reserve and BIS.

### Final QA / deployment
- Static validation: SUCCESS for APIS v2.6.0.
- Chromium iPhone 390px: PASS.
- Chromium 826px touch/desktop-width: PASS.
- WebKit iPhone 390px: PASS.
- WebKit 826px touch/desktop-width: PASS.
- Browser checks include: Home has 20 market-only rows and no individual company equities; XAU adapter returns expected fixture price and computed change; Taiwan daily TWSE adapter returns official -2.31%; all five regional index groups render; five commodities render; no broken chart embed; DGS30 remains visible despite a blank latest observation on other dates; previous/forecast/actual merge; Medium/High and IDR/category filters; 3D/7D buttons; no horizontal overflow; News/Macro navigation; animated theme; refresh; no JavaScript page errors.
- GitHub Pages deployment: SUCCESS. Final run: https://github.com/susantowijaya-hub/apis-market-intelligence/actions/runs/44041526563
- Final Pages build commit: e36f587c672287063b3f27a64663b13063da7a70. Static validation and Chromium/WebKit browser suite passed on this deployed release.
- Release version: APIS v2.6.0.

### Data integrity and operating limitations
- No paid quote API or private API key was added.
- Public provider availability and rate limits may vary by network / browser. A source failure shows unavailable / stale; there is no generated replacement price.
- XAUS spot is indicative mid-market, not an executable trading quote.
- Forex Factory calendar is a public weekly schedule / consensus source; XOOMAR actuals are U.S.-focused. Outside U.S. releases, Actual remains blank unless the calendar provider actually supplies it.
- BI RDG is calendar-only; official meeting dates are shown, while release times and policy outcomes remain blank until a primary source publishes them.
- Never label daily reference FX, last close, stale cache or daily Treasury observations as live intraday quotes.
