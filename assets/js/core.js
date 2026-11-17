'use strict';
/* APIS The Market Terminal 2.11.0 · Mobile-first free public-data terminal
   - No synthetic market data or fabricated news.
   - Yahoo Finance is an unofficial public fallback accessed through third-party CORS relays.
   - No external chart embed is required; sparklines are drawn only from real provider history.
   - Binance websocket is used for genuine public BTC/USDT market-data messages.
   - Local browser tools are a subset, not a replacement for the APIS Python runtime.
*/
const TZ='Asia/Jakarta';
const WATCHLIST=[
  {symbol:'^JKSE',name:'IDX Composite',short:'IHSG',group:'Index',region:'Indonesia',tv:'IDX:COMPOSITE'},
  {symbol:'^JKLQ45',name:'IDX LQ45',short:'LQ45',group:'Index',region:'Indonesia',tv:'IDX:LQ45'},
  {symbol:'^GSPC',name:'S&P 500',short:'S&P 500',group:'Index',region:'United States',tv:'SP:SPX',tdSymbol:'SPX'},
  {symbol:'^IXIC',name:'Nasdaq Composite',short:'Nasdaq',group:'Index',region:'United States',tv:'NASDAQ:IXIC',tdSymbol:'IXIC'},
  {symbol:'^DJI',name:'Dow Jones Industrial Average',short:'Dow Jones',group:'Index',region:'United States',tv:'DJ:DJI',tdSymbol:'DJI'},
  {symbol:'000001.SS',name:'Shanghai Composite',short:'Shanghai',group:'Index',region:'Greater China',tv:'SSE:000001'},
  {symbol:'^TWII',name:'Taiwan Weighted',short:'Taiwan',group:'Index',region:'Greater China',tv:'TWSE:IX0001'},
  {symbol:'^KS11',name:'KOSPI Composite',short:'KOSPI',group:'Index',region:'North Asia',tv:'KRX:KOSPI',tdSymbol:'KS11',stooqSymbol:'^kospi'},
  {symbol:'^NSEI',name:'NIFTY 50',short:'NIFTY 50',group:'Index',region:'South Asia',tv:'NSE:NIFTY',tdSymbol:'NIFTY'},
  {symbol:'NQ=F',name:'Nasdaq-100 E-mini Futures',short:'NQ Futures',group:'Index',region:'United States',tv:'CME_MINI:NQ1!'},
  {symbol:'^N225',name:'Nikkei 225',short:'Nikkei 225',group:'Index',region:'North Asia',tv:'TVC:NI225'},
  {symbol:'^HSI',name:'Hang Seng Index',short:'HSI',group:'Index',region:'Greater China',tv:'HKEX:HSI'},
  {symbol:'^VIX',name:'CBOE Volatility Index',short:'VIX',group:'Risk',region:'United States',tv:'TVC:VIX',tdSymbol:'VIX',stooqSymbol:'^vix'},
  {symbol:'EIDO',name:'iShares MSCI Indonesia ETF',short:'EIDO',group:'ETF',region:'Indonesia',tv:'AMEX:EIDO',stooqSymbol:'eido.us'},
  {symbol:'IDR=X',name:'USD / IDR',short:'USD/IDR',group:'FX',tv:'FX_IDC:USDIDR',stooqSymbol:'usdidr'},
  {symbol:'BZ=F',name:'Brent Crude Futures',short:'Brent',group:'Commodity',tv:'NYMEX:BZ1!',stooqSymbol:'brent.f',currency:'USD'},
  {symbol:'GC=F',name:'Gold Futures',short:'Gold Futures',group:'Commodity',tv:'COMEX:GC1!',stooqSymbol:'gc.f',currency:'USD'},
  {symbol:'XAUUSD=X',name:'Gold Spot · XAU/USD',short:'XAU/USD',group:'Commodity',tv:'OANDA:XAUUSD',currency:'USD'},
  {symbol:'CL=F',name:'WTI Crude Oil Futures',short:'WTI Crude',group:'Commodity',tv:'NYMEX:CL1!',currency:'USD'},
  {symbol:'HG=F',name:'Copper Futures',short:'Copper',group:'Commodity',tv:'COMEX:HG1!',currency:'USD'},
  {symbol:'BBCA.JK',name:'Bank Central Asia',short:'BBCA',group:'Indonesia equity',tv:'IDX:BBCA'},
  {symbol:'BMRI.JK',name:'Bank Mandiri',short:'BMRI',group:'Indonesia equity',tv:'IDX:BMRI'},
  {symbol:'BBRI.JK',name:'Bank Rakyat Indonesia',short:'BBRI',group:'Indonesia equity',tv:'IDX:BBRI'},
  {symbol:'GOTO.JK',name:'GoTo Gojek Tokopedia',short:'GOTO',group:'Indonesia equity',region:'Indonesia',tv:'IDX:GOTO'},
  {symbol:'TLKM.JK',name:'Telkom Indonesia',short:'TLKM',group:'Indonesia equity',region:'Indonesia',tv:'IDX:TLKM'},
  {symbol:'ASII.JK',name:'Astra International',short:'ASII',group:'Indonesia equity',region:'Indonesia',tv:'IDX:ASII'},
  {symbol:'BREN.JK',name:'Barito Renewables Energy',short:'BREN',group:'Indonesia equity',region:'Indonesia',tv:'IDX:BREN'},
  {symbol:'AMMN.JK',name:'Amman Mineral Internasional',short:'AMMN',group:'Indonesia equity',region:'Indonesia',tv:'IDX:AMMN'},
  {symbol:'AAPL',name:'Apple',short:'AAPL',group:'US equity',tv:'NASDAQ:AAPL',stooqSymbol:'aapl.us'},
  {symbol:'NVDA',name:'NVIDIA',short:'NVDA',group:'US equity',tv:'NASDAQ:NVDA',stooqSymbol:'nvda.us'},
  {symbol:'MSFT',name:'Microsoft',short:'MSFT',group:'US equity',tv:'NASDAQ:MSFT',stooqSymbol:'msft.us'},
  {symbol:'AMZN',name:'Amazon',short:'AMZN',group:'US equity',tv:'NASDAQ:AMZN'},
  {symbol:'META',name:'Meta Platforms',short:'META',group:'US equity',tv:'NASDAQ:META'},
  {symbol:'GOOGL',name:'Alphabet',short:'GOOGL',group:'US equity',tv:'NASDAQ:GOOGL'},
  {symbol:'TSLA',name:'Tesla',short:'TSLA',group:'US equity',tv:'NASDAQ:TSLA'},
  {symbol:'AVGO',name:'Broadcom',short:'AVGO',group:'US equity',tv:'NASDAQ:AVGO'},
  {symbol:'0700.HK',name:'Tencent Holdings',short:'TENCENT',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:700'},
  {symbol:'9988.HK',name:'Alibaba Group',short:'ALIBABA',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:9988'},
  {symbol:'3690.HK',name:'Meituan',short:'MEITUAN',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:3690'},
  {symbol:'1810.HK',name:'Xiaomi',short:'XIAOMI',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:1810'},
  {symbol:'0941.HK',name:'China Mobile',short:'CHINA MOBILE',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:941'},
  {symbol:'0005.HK',name:'HSBC Holdings',short:'HSBC',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:5'},
  {symbol:'1299.HK',name:'AIA Group',short:'AIA',group:'Hong Kong equity',region:'Hong Kong',tv:'HKEX:1299'},
  {symbol:'005930.KS',name:'Samsung Electronics',short:'SAMSUNG',group:'Korea focus equity',region:'South Korea',tv:'KRX:005930'},
  {symbol:'000660.KS',name:'SK Hynix',short:'SK HYNIX',group:'Korea focus equity',region:'South Korea',tv:'KRX:000660'},
  {symbol:'2330.TW',name:'Taiwan Semiconductor Manufacturing',short:'TSMC',group:'Taiwan focus equity',region:'Taiwan',tv:'TWSE:2330'}
];
const QUOTES=new Map();
/* Restore only previously received provider observations. Restored values are
   explicitly marked stale until a fresh provider response validates them. */
function restoreQuoteCache(){
  const cached=loadJSON('apis_browser_quotes',[]);
  if(!Array.isArray(cached))return 0;
  let restored=0;
  const allowed=new Set(WATCHLIST.map(x=>x.symbol));
  for(const q of cached){
    if(!q||!allowed.has(q.symbol)||num(q.price)===null||q.price<=0||num(q.observedAt)===null)continue;
    const age=Date.now()/1000-q.observedAt;
    if(age < -300)continue;
    q.status=age>48*3600?'STALE_OBSERVATION':'STALE_CACHE';
    q.cacheRestored=true;q.activeRunId=0;
    QUOTES.set(q.symbol,q);
    restored++;
  }
  return restored;
}
const APP={lastRefresh:null,closedRefreshDone:loadJSON('apis_market_closed_refresh_done',{}),yahooState:'idle',runCounter:0,currentRunId:0,btcState:'connecting',btc:null,btcLastSavedAt:0,btcError:'',ws:null,wsRetry:0,fxState:'loading',fxError:'',widgetError:'',failures:new Map(),successCount:0,storageWarned:false,alerts:Array.isArray(loadJSON('apis_browser_alerts',[]))?loadJSON('apis_browser_alerts',[]):[],ledger:Array.isArray(loadJSON('apis_browser_ledger',[]))?loadJSON('apis_browser_ledger',[]):[],fired:new Set(),timer:null,staleTimer:null,btcRestTimer:null};
function loadJSON(k,fallback){try{const v=JSON.parse(localStorage.getItem(k));return v??fallback}catch{return fallback}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Browser storage is unavailable in this session.')}}
APP.closedRefreshDone=loadJSON('apis_market_closed_refresh_done',{})||{};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(v){return typeof v==='number'&&Number.isFinite(v)?v:null}
function fmt(v,maximumFractionDigits=2){if(num(v)===null)return'—';return new Intl.NumberFormat('en-US',{maximumFractionDigits,minimumFractionDigits:maximumFractionDigits}).format(v)}
function fmtPrice(q){if(!q||num(q.price)===null)return'—';if(q.group==='Index'||q.group==='Risk')return fmt(q.price,2);const c=q.currency||'';const digits=/JPY|KRW|IDR|TWD|CNY/.test(c)?0:(q.price<10?4:2);return `${fmt(q.price,digits)}${c?' '+c:''}`}
function fmtTime(ts){if(!ts)return'—';return new Intl.DateTimeFormat('en-GB',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(ts*1000))+' WIB'}
function fmtDate(d){return d?new Intl.DateTimeFormat('en-GB',{timeZone:TZ,dateStyle:'medium'}).format(new Date(d+'T12:00:00Z')):'—'}
function changeClass(v){return v>0?'up':v<0?'down':'flat'}
function pct(v){return num(v)===null?'—':`${v>0?'+':''}${v.toFixed(2)}%`}
function toast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('show');clearTimeout(APP.toastTimer);APP.toastTimer=setTimeout(()=>t.classList.remove('show'),2800)}
function setText(id,text){const e=document.getElementById(id);if(e)e.textContent=text}

function restoreAuxCache(){
  const b=loadJSON('apis_browser_btc',null);
  if(b&&Number.isFinite(Number(b.price))&&Number.isFinite(Number(b.observedAt))){
    APP.btc={...b,transport:'CACHE',receivedAt:0};
    setText('btcPrice',fmt(Number(b.price),2)+' USDT');
    const ch=document.getElementById('btcChange');
    if(ch){ch.textContent=(Number.isFinite(Number(b.changePct))?pct(Number(b.changePct)):'Change unavailable')+' · 24h';ch.className='change '+changeClass(Number(b.changePct)||0)}
    setText('btcAsOf',fmtTime(Number(b.observedAt)/1000));
    setText('btcStatus','STALE CACHE · last provider observation');
  }
  const f=loadJSON('apis_browser_fx',null);
  if(f&&Number.isFinite(Number(f.rate))&&f.date){
    setText('fxValue',fmt(Number(f.rate),2)+' IDR');
    setText('fxDate','Saved reference rate · '+fmtDate(f.date));
    setText('fxStatus','STALE REFERENCE CACHE');
    APP.fxState='cached';
  }
}