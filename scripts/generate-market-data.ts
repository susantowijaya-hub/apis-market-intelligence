import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  fetchCorrelationMatrix,
  fetchDailyMarketSummary,
  fetchLiveCalendar,
  fetchLiveChart,
  fetchLiveFxRates,
  fetchLiveNews,
  fetchLiveQuotes,
  fetchMarketDepth,
  fetchMarketHeatmap,
  fetchMarketIntelligence,
  fetchPortfolioMoversBrief,
  fetchPortfolioQuotes,
  fetchPortfolioSymbolSeries,
  fetchScheduledShareSnapshot,
  fetchSymbolDetail,
  fetchTopStockMovers,
  getServerFeedDiagnostics,
  searchMarketSymbols,
} from './data-sources/freeMarketFeeds.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'api');
const generatedAt = new Date().toISOString();

async function save(relativePath: string, value: unknown): Promise<void> {
  const target = path.join(out, relativePath);
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function attempt<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('snapshot timeout')), 28_000); });
    const value = await Promise.race([task(), timeout]);
    console.log(`OK ${label}`);
    return value;
  } catch (error) {
    console.warn(`UNAVAILABLE ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function mapLimit<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

const stamped = <T extends Record<string, unknown>>(value: T) => ({...value, snapshotGeneratedAt: generatedAt});

await rm(out, {recursive: true, force: true});
await mkdir(out, {recursive: true});
await save('unavailable.json', {available: false, message: 'No verified public snapshot is available for this request.', snapshotGeneratedAt: generatedAt});

const assets = await attempt('asset search catalogue', () => searchMarketSymbols('', false), [] as Awaited<ReturnType<typeof searchMarketSymbols>>);
const symbols = assets.map((item) => item.yahooSymbol).filter(Boolean).slice(0, 30);
const assetIds = ['SPX','IXIC','DJI','IHSG','EIDO','HSI','TAIEX','KOSPI','SSEC','NIFTY','XAUUSD','BTCUSD','ETHUSD','WTI','BRENT','USDIDR','EURUSD','GBPUSD','USDJPY','AUDUSD','USDCHF','USDCAD','NZDUSD','USDCNY','DXY','US10Y','US30Y'];

const quotes = await attempt('market quotes', fetchLiveQuotes, {quotes: [], updatedAt: generatedAt, diagnostics: getServerFeedDiagnostics()});
await save('market/quotes.json', quotes);
await save('stocks/search.json', {results: assets, updatedAt: generatedAt});
await save('portfolio/quotes.json', await attempt('portfolio quotes', () => fetchPortfolioQuotes(symbols), {quotes: [], updatedAt: generatedAt}));
await save('fx/rates.json', await attempt('FX reference rates', fetchLiveFxRates, {base: 'USD', rates: {USD: 1}, pairTiles: [], updatedAt: generatedAt}));
await save('news/feed.json', await attempt('public news feed', fetchLiveNews, {stories: [], updatedAt: generatedAt}));
await save('calendar/events.json', await attempt('public economic calendar', fetchLiveCalendar, {events: [], nextCatalyst: null, source: 'No public source responded', updatedAt: generatedAt}));
await save('stocks/movers.json', await attempt('public stock movers', fetchTopStockMovers, {us: {impact: [], gainers: [], losers: []}, indonesia: {impact: [], gainers: [], losers: []}, updatedAt: generatedAt}));
await save('market/heatmap.json', await attempt('market heatmap', fetchMarketHeatmap, {us: [], indonesia: [], sectorsUs: [], sectorsIndonesia: [], updatedAt: generatedAt}));
await save('market/daily-summary.json', await attempt('market summary', fetchDailyMarketSummary, {windowLabel: 'Unavailable', dateLabel: '', updatedAt: generatedAt, highlights: []}));
await save('market/intelligence.json', await attempt('market intelligence (deterministic)', fetchMarketIntelligence, {updatedAt: generatedAt, headline: 'Market data unavailable', compositeSentiment: 'Neutral', signalTally: {bullCount: 0, bearCount: 0, neutralCount: 0}, sourcesCount: 0, sourceNames: [], commentaryPoints: [], rumorAndCatalystThemes: [], dataReleaseImplications: [], stocksAndFlowSummary: 'No verified observations.', forwardPrediction: 'No forecast is generated without verified observations.', indexSessions: [], aiRefined: false}));
await save('market/diagnostics.json', getServerFeedDiagnostics());

const chartJobs: Array<{id: string; timeframe: string}> = [];
for (const id of assetIds) chartJobs.push({id, timeframe: '1D'});
for (const id of ['SPX','IXIC','DJI','IHSG','BTCUSD','ETHUSD','XAUUSD','USDIDR']) {
  for (const timeframe of ['1W','1M','3M','1Y']) chartJobs.push({id, timeframe});
}
await mapLimit(chartJobs, 3, async ({id, timeframe}) => {
  const data = await attempt(`chart ${id} ${timeframe}`, () => fetchLiveChart(id, timeframe), null);
  await save(`market/charts/${id}/${timeframe}.json`, data);
});

const portfolioSymbols = symbols.slice(0, 16);
const portfolioTimeframes = ['1D','5D','1M','6M','YTD','1Y','MAX'];
const portfolioJobs = portfolioSymbols.flatMap((symbol) => portfolioTimeframes.map((timeframe) => ({symbol, timeframe})));
await mapLimit(portfolioJobs, 3, async ({symbol, timeframe}) => {
  const data = await attempt(`portfolio chart ${symbol} ${timeframe}`, () => fetchPortfolioSymbolSeries(symbol, timeframe), null);
  await save(`portfolio/charts/${symbol}/${timeframe}.json`, data);
});

const detailJobs = assets.slice(0, 24).flatMap((item) => ['1D','1M'].map((timeframe) => ({symbol: item.yahooSymbol, timeframe}))); 
await mapLimit(detailJobs, 3, async ({symbol, timeframe}) => {
  const data = await attempt(`symbol detail ${symbol} ${timeframe}`, () => fetchSymbolDetail(symbol, timeframe), null);
  await save(`symbol/details/${symbol}/${timeframe}.json`, data);
});

for (const id of ['BTCUSD','ETHUSD']) {
  const data = await attempt(`verified Level-2 depth ${id}`, () => fetchMarketDepth(id), null);
  await save(`market/depth/${id}.json`, data);
}
for (const timeframe of ['1M','3M'] as const) {
  const data = await attempt(`correlation matrix ${timeframe}`, () => fetchCorrelationMatrix(timeframe), null);
  await save(`market/correlations/${timeframe}.json`, data);
}
for (const slot of ['morning_0530','afternoon_1630'] as const) {
  const data = await attempt(`scheduled public snapshot ${slot}`, () => fetchScheduledShareSnapshot(slot, true), null);
  await save(`market/share-snapshot/${slot}.json`, data);
}
await save('portfolio/movers-brief.json', await attempt('portfolio movers brief', () => fetchPortfolioMoversBrief(portfolioSymbols.slice(0, 8)), {items: [], updatedAt: generatedAt}));
await save('market/diagnostics.json', getServerFeedDiagnostics());

const manifest = {
  generatedAt,
  providerModel: 'Free public data providers; best-effort availability; no paid credentials',
  quoteCount: Array.isArray(quotes.quotes) ? quotes.quotes.length : 0,
  searchableSymbols: assets.length,
  chartSnapshots: chartJobs.length,
  portfolioChartSnapshots: portfolioJobs.length,
  detailSnapshots: detailJobs.length,
};
await save('snapshot-status.json', stamped(manifest));
console.log(`Finished free public snapshots: ${JSON.stringify(manifest)}`);
