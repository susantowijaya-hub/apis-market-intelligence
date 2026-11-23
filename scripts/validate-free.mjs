import fs from 'node:fs';
import path from 'node:path';

const fail = (message) => { console.error(`VALIDATION FAILED: ${message}`); process.exit(1); };
const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`Cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`); }
};

const root = process.cwd();
const pkg = readJson(path.join(root, 'package.json'));
const allDeps = {...pkg.dependencies, ...pkg.devDependencies};
const forbiddenPackages = Object.keys(allDeps).filter((name) =>
  /firebase|openai|google-generative|@capacitor|express|stripe|amplitude/i.test(name)
);
if (forbiddenPackages.length) fail(`Paid/cloud/backend dependency remains: ${forbiddenPackages.join(', ')}`);
for (const required of ['react', 'react-dom', 'vite', 'vite-plugin-pwa', 'tsx', 'typescript']) {
  if (!allDeps[required]) fail(`Required build dependency missing: ${required}`);
}

const mustExist = [
  'index.html', 'src/App.tsx', 'src/main.tsx', 'src/lib/api.ts',
  'src/hooks/useLiveMarket.ts', 'scripts/data-sources/freeMarketFeeds.ts', 'scripts/generate-market-data.ts', 'scripts/validate-free.mjs',
  'public/pwa-192x192.png', 'public/pwa-512x512.png',
];
for (const file of mustExist) if (!fs.existsSync(path.join(root, file))) fail(`Required file missing: ${file}`);

const sourceFiles = [];
for (const directory of ['src', 'scripts']) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|mjs|json)$/.test(entry.name) && entry.name !== 'validate-free.mjs') sourceFiles.push(full);
    }
  };
  walk(path.join(root, directory));
}
const forbiddenCode = /api\.openai\.com|generativelanguage\.googleapis\.com|firebaseapp\.com|firebaseio\.com|OPENAI_API_KEY|GEMINI_API_KEY|FIREBASE_API_KEY|import\s+.*from\s+['"](?:firebase|openai|@capacitor)/i;
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (forbiddenCode.test(content)) fail(`Paid/cloud service reference found in ${path.relative(root, file)}`);
}

const status = readJson(path.join(root, 'public/api/snapshot-status.json'));
if (!Number.isFinite(status.quoteCount) || status.quoteCount < 3) {
  fail(`Only ${status.quoteCount ?? 0} verified quotes were generated; preserving the previous deployment is safer than publishing an empty terminal.`);
}
if (!status.generatedAt || !Number.isFinite(Date.parse(status.generatedAt))) fail('Snapshot manifest has no valid generation timestamp.');
const quotes = readJson(path.join(root, 'public/api/market/quotes.json'));
if (!Array.isArray(quotes.quotes) || quotes.quotes.length < 3) fail('Market quote snapshot is empty or too small.');
const chartRoot = path.join(root, 'public/api/market/charts');
let usableCharts = 0;
const scan = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.name.endsWith('.json')) {
      try {
        const chart = JSON.parse(fs.readFileSync(file, 'utf8'));
        const points = Array.isArray(chart?.points) ? chart.points : Array.isArray(chart?.series) ? chart.series : [];
        if (points.filter((point) => Number.isFinite(typeof point === 'number' ? point : point?.value ?? point?.v)).length >= 2) usableCharts++;
      } catch { /* null/unavailable snapshots are valid; they do not count as charts */ }
    }
  }
};
scan(chartRoot);
if (usableCharts < 1) fail('No chart snapshot with two or more real observations was generated.');

console.log(`Free-only validation passed: ${quotes.quotes.length} quote observations, ${usableCharts} charts, zero paid/cloud SDKs.`);
