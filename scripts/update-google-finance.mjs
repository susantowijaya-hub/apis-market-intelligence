import fs from 'node:fs';

const instruments = [
  ['^JKSE','COMPOSITE:IDX'],['^GSPC','.INX:INDEXSP'],['^IXIC','.IXIC:INDEXNASDAQ'],
  ['^DJI','.DJI:INDEXDJX'],['000001.SS','000001:SHA'],['^TWII','IX0001:TPE'],
  ['^KS11','KOSPI:KRX'],['^NSEI','NIFTY_50:NSE'],['^N225','NI225:INDEXNIKKEI'],
  ['^HSI','HSI:INDEXHANGSENG']
];

function number(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/[,%\s]/g,'').replace(/−/g,'-').replace(/^\+/,''));
  return Number.isFinite(n) ? n : null;
}
function parsePage(html, symbol, now = Date.now()) {
  const attr = name => {
    const match = html.match(new RegExp(name + '="([^"]+)"','i'));
    return match?.[1] ?? null;
  };
  let price = number(attr('data-last-price'));
  if (price === null) {
    const match = html.match(/class="[^"]*YMlKec[^"]*fxKbKc[^"]*"[^>]*>([\d,.]+)</i);
    price = number(match?.[1]);
  }
  const change = number(attr('data-last-price-change'));
  const pct = number(attr('data-last-percentage-change'));
  if (price === null || price <= 0) {
    const markers=['data-last-price','YMlKec','fxKbKc','IX0001','TAIEX','__NEXT_DATA__'];
    const diagnostics=markers.map(marker=>marker+':'+html.indexOf(marker)).join(' ');
    const snippets=markers.map(marker=>{const at=html.indexOf(marker);return at>=0?html.slice(Math.max(0,at-100),at+260).replace(/\\s+/g,' '):''}).filter(Boolean).join(' || ');
    throw new Error('price not found · '+diagnostics+' · '+snippets.slice(0,900));
  }
  let changePct = pct;
  if (changePct === null && change !== null && price - change > 0)
    changePct = (price / (price - change) - 1) * 100;
  if (changePct === null || changePct <= -100 || changePct > 100)
    throw new Error('daily percentage missing / invalid');
  const previousClose = price / (1 + changePct / 100);
  const timeMatch = html.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+GMT[+-]\d{1,2})/);
  if (!timeMatch) throw new Error('source timestamp missing');
  const normalized = timeMatch[1].replace(/GMT([+-])(\d{1,2})$/,(_,sign,h)=>'GMT'+sign+String(h).padStart(2,'0')+'00');
  const observedAt = Date.parse(normalized + ' ' + new Date(now).getUTCFullYear()) / 1000;
  if (!Number.isFinite(observedAt) || observedAt > now/1000 + 300 || now/1000 - observedAt > 96*3600)
    throw new Error('source timestamp invalid / stale');
  const date = new Date(observedAt * 1000);
  const observationDate = new Intl.DateTimeFormat('en-CA',{timeZone:
    symbol==='^TWII'?'Asia/Taipei':symbol==='^JKSE'?'Asia/Jakarta':symbol==='000001.SS'?'Asia/Shanghai':
    symbol==='^HSI'?'Asia/Hong_Kong':symbol==='^KS11'?'Asia/Seoul':symbol==='^N225'?'Asia/Tokyo':
    symbol==='^NSEI'?'Asia/Kolkata':'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  return {price,previousClose,changePct,observedAt,observationDate};
}

const quotes = {}, errors = {};
const now = Date.now();
const results = await Promise.all(instruments.map(async ([symbol, googleSymbol]) => {
  const url = 'https://www.google.com/finance/quote/' + encodeURIComponent(googleSymbol) + '?hl=en&gl=US';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        'Accept':'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const html = await response.text();
    if (html.length < 500 || /unusual traffic|sorry\/index|captcha/i.test(html.slice(0,5000)))
      throw new Error('Google Finance returned a block / incomplete page');
    const parsed = parsePage(html,symbol,now);
    return {googleSymbol,record:{...parsed,source:'Google Finance public quote page',sourceUrl:url,retrievedAt:now}};
  } catch (error) {
    return {googleSymbol,error:String(error?.message || error).slice(0,180)};
  }
}));
for (const result of results) {
  if (result.record) quotes[result.googleSymbol] = result.record;
  else errors[result.googleSymbol] = result.error;
}
const payload = {
  schemaVersion:1,
  provider:'Google Finance public quote pages',
  generatedAt:new Date(now).toISOString(),
  generatedAtEpoch:Math.floor(now/1000),
  quoteCount:Object.keys(quotes).length,
  quotes,errors
};
if (!payload.quoteCount) {
  console.error(JSON.stringify(payload,null,2));
  throw new Error('No Google Finance index quote could be parsed; refusing to publish an empty snapshot.');
}
fs.writeFileSync('google-finance-quotes.json',JSON.stringify(payload,null,2)+'\n');
console.log('Google Finance snapshot: '+payload.quoteCount+'/'+instruments.length+' indices · '+payload.generatedAt);
console.log('Sources: '+Object.keys(quotes).join(', '));
if (Object.keys(errors).length) console.warn('Unavailable: '+JSON.stringify(errors));
