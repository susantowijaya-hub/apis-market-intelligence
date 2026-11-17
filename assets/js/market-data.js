/* FREE-ONLY market quote adapters.
   Priority: Stooq public CSV snapshot (where mapped) -> Yahoo public chart fallback.
   No paid API, account, or API key is required. Stooq may rate-limit or deny public requests.
*/
const STOOQ_SYMBOLS={
 '^KS11':'^kospi','^VIX':'^vix',
 'EIDO':'eido.us','AAPL':'aapl.us','NVDA':'nvda.us','MSFT':'msft.us',
 'IDR=X':'usdidr','GC=F':'gc.f','BZ=F':'brent.f'
};
const STOOQ_CACHE=new Map();
let STOOQ_LAST_REQUEST=0;
async function fetchStooqQuote(item){
 const symbol=item.stooqSymbol||STOOQ_SYMBOLS[item.symbol];
 if(!symbol)throw new Error('Stooq has no mapped symbol for this instrument');
 const cached=STOOQ_CACHE.get(item.symbol),session=exchangeSession(item);
 const sessionDay=session?[session.tradeDate.year,String(session.tradeDate.month).padStart(2,'0'),String(session.tradeDate.day).padStart(2,'0')].join('-'):'';
 if(cached&&Date.now()-cached.retrievedAt<10*60*1000&&(!session||cached.observationDate===sessionDay))return {...cached};
 const wait=Math.max(0,1100-(Date.now()-STOOQ_LAST_REQUEST));
 if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
 STOOQ_LAST_REQUEST=Date.now();
 const target='https://stooq.com/q/l/?s='+encodeURIComponent(symbol)+'&f=sd2t2ohlcvnp&h&e=csv';
 const routes=[
  'https://corsproxy.io/?url='+encodeURIComponent(target),
  'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
 ];
 const errors=[];
 for(const route of routes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
  try{
   const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'text/csv,text/plain,*/*'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const csv=(await response.text()).trim();
   if(!csv||/exceeded|captcha|cloudflare|access denied/i.test(csv))throw new Error('Public CSV denied or rate-limited');
   const lines=csv.split(/\r?\n/);
   if(lines.length<2||!/^symbol,date,time,open,high,low,close,volume/i.test(lines[0].replace(/"/g,'')))throw new Error('Unexpected CSV schema');
   const parseCsvLine=line=>{
    const out=[];let cell='',quoted=false;
    for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){out.push(cell);cell=''}else cell+=ch}
    out.push(cell);return out.map(value=>value.trim().replace(/^"|"$/g,''));
   };
   const headers=parseCsvLine(lines[0]).map(x=>x.toLowerCase()),values=parseCsvLine(lines[1]);
   const row=Object.fromEntries(headers.map((key,index)=>[key,values[index]||'']));
   const price=num(Number(row.close)),previous=num(Number(row.prev));
   if(price===null||price<=0||!row.date||row.date==='N/D')throw new Error('No valid Stooq observation for '+symbol);
   if(session?.state==='CLOSED'&&row.date!==sessionDay)throw new Error('Stooq observation date does not match the current exchange session');
   const dateMatch=row.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if(!dateMatch)throw new Error('Invalid Stooq observation date');
   const observedAt=Date.UTC(Number(dateMatch[1]),Number(dateMatch[2])-1,Number(dateMatch[3]))/1000;
   if(observedAt>Date.now()/1000+86400)throw new Error('Stooq observation date is in the future');
   const age=Math.max(0,Date.now()/1000-observedAt);
   if(age>48*3600)throw new Error('Stooq last available session is older than 48 hours');
   const quote={
    symbol:item.symbol,name:item.name,short:item.short,group:item.group,price,previousClose:previous,
    currency:item.currency||'',exchange:'Stooq',marketState:'PUBLIC CSV SNAPSHOT',
    observedAt,observedAge:age,status:age>48*3600?'STALE_OBSERVATION':'LAST_AVAILABLE_CLOSE',
    source:'Stooq · public CSV snapshot (EOD/delayed)',sourceUrl:'https://stooq.com/q/?s='+encodeURIComponent(symbol),
    retrievedAt:Date.now(),proxy:new URL(route).host,observationDate:row.date,providerFallbacks:[]
   };
   STOOQ_CACHE.set(item.symbol,quote);return {...quote};
  }catch(error){errors.push(new URL(route).host+': '+String(error?.message||error).slice(0,70))}
  finally{clearTimeout(timer)}
 }
 throw new Error(errors.slice(0,3).join(' | ')||'Stooq public CSV unavailable');
}
function exchangeDateKey(timestamp,timeZone){
 const p=exchangeWallClock(new Date(Number(timestamp)*1000),timeZone);
 return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');
}
function selectDailyIndexPreviousClose(dailyBars,cutoff,timeZone){
 if(!Array.isArray(dailyBars)||!cutoff||!timeZone)return null;
 const eligible=dailyBars.filter(bar=>bar&&Number.isFinite(Number(bar.price))&&Number(bar.price)>0&&Number.isFinite(Number(bar.timestamp))&&exchangeDateKey(bar.timestamp,timeZone)<cutoff);
 return eligible.length?Number(eligible[eligible.length-1].price):null;
}
const DAILY_INDEX_SYMBOLS=new Set(['^JKSE','^JKLQ45','^GSPC','^IXIC','^DJI','000001.SS','^TWII','^KS11','^NSEI','^N225','^HSI']);
const US_INDEX_SYMBOLS=new Set(['^GSPC','^IXIC','^DJI']);
function isDailyIndexSymbol(symbol){return DAILY_INDEX_SYMBOLS.has(String(symbol||''))}
function parseIdxSummaryDay(value){const match=String(value??'').match(/(20\d{2})[-/]?(\d{2})[-/]?(\d{2})/);return match?match[1]+'-'+match[2]+'-'+match[3]:null}
function parseIdxIndexSummary(payload,indexCode,expectedDay){const rows=Array.isArray(payload?.data)?payload.data:(Array.isArray(payload?.data?.data)?payload.data.data:[]);const row=rows.find(item=>String(item?.IndexCode||item?.indexCode||item?.Code||'').trim().toUpperCase()===String(indexCode).toUpperCase());if(!row)return null;const day=parseIdxSummaryDay(row.Date||row.date||row.TradingDate||row.tradingDate);if(!day||day!==expectedDay)return null;const price=Number(row.Close??row.Last??row.close??row.last),previousClose=Number(row.Previous??row.previous??row.PrevClose??row.prevClose),reportedChange=Number(row.Change??row.change);if(!Number.isFinite(price)||price<=0||!Number.isFinite(previousClose)||previousClose<=0)return null;const pointChange=price-previousClose;if(Number.isFinite(reportedChange)&&Math.abs(pointChange-reportedChange)>Math.max(0.05,Math.abs(reportedChange)*0.001))return null;const changePct=pointChange/previousClose*100;if(!Number.isFinite(changePct)||Math.abs(changePct)>30)return null;return {price,previousClose,change:pointChange,changePct,day}}
async function fetchIdxOfficialIndexQuote(item){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=type=>parts.find(value=>value.type===type)?.value||'';const expectedDay=part('year')+'-'+part('month')+'-'+part('day'),date=expectedDay.replace(/-/g,'');const target='https://www.idx.co.id/primary/TradingSummary/GetIndexSummary?lang=id&date='+date+'&start=0&length=100';const routes=[target,'https://corsproxy.io/?url='+encodeURIComponent(target),'https://api.allorigins.win/raw?url='+encodeURIComponent(target)],errors=[];for(const route of routes){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);try{const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error('HTTP '+response.status);const observation=parseIdxIndexSummary(await response.json(),'LQ45',expectedDay);if(!observation)throw new Error('IDX summary has no same-day LQ45 close/previous pair');const observedAt=Date.UTC(Number(observation.day.slice(0,4)),Number(observation.day.slice(5,7))-1,Number(observation.day.slice(8,10)),9,0,0)/1000;return {symbol:item.symbol,name:item.name,short:item.short,group:item.group,region:item.region,price:observation.price,previousClose:observation.previousClose,changePct:observation.changePct,currency:'IDR',exchange:'Indonesia Stock Exchange',marketState:'CLOSED',observedAt,observedAge:Math.max(0,Date.now()/1000-observedAt),status:'LAST_AVAILABLE_CLOSE',source:'IDX · official Index Summary (LQ45)',sourceUrl:'https://www.idx.co.id/en/market-data/trading-summary/index-summary/',retrievedAt:Date.now(),observationDate:observation.day,providerFallbacks:[]}}catch(error){errors.push(new URL(route).host+': '+(error?.name==='AbortError'?'timeout':String(error?.message||error).slice(0,90)))}finally{clearTimeout(timer)}}throw new Error(errors.join(' | ')||'IDX official LQ45 summary unavailable')}
async function fetchYahooQuote(item){
 const encoded=encodeURIComponent(item.symbol);
 const isDailyIndex=isDailyIndexSymbol(item.symbol);
 const plans=isDailyIndex?[{range:'1mo',interval:'1d'}]:[{range:'1d',interval:'1m'}];
 const routesFor=target=>[
  'https://corsproxy.io/?url='+encodeURIComponent(target),
  'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
  'https://proxy.cors.dev/'+target
 ];
 const errors=[];
 for(const plan of plans){
  const target='https://query1.finance.yahoo.com/v8/finance/chart/'+encoded+'?range='+plan.range+'&interval='+plan.interval+'&includePrePost=true';
  for(const route of routesFor(target)){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
   try{
    const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const payload=await response.json(),result=payload?.chart?.result?.[0];
    if(!result?.meta)throw new Error(payload?.chart?.error?.description||'No Yahoo quote metadata');
    const meta=result.meta,ts=Array.isArray(result.timestamp)?result.timestamp:[];
    const closes=result.indicators?.quote?.[0]?.close||[];
    let index=-1;for(let i=closes.length-1;i>=0;i--){if(num(closes[i])!==null){index=i;break}}
    const barPrice=index>=0?num(closes[index]):null,barTime=index>=0?num(ts[index]):null;
    const marketPrice=num(meta.regularMarketPrice),marketTime=num(meta.regularMarketTime);
    const useMeta=marketPrice!==null&&(marketTime||0)>=(barTime||0);
    const session=exchangeSession(item);
    const hasDailyBars=isDailyIndex&&plan.interval==='1d';
    const useDailyClose=hasDailyBars&&barPrice!==null&&session&&(session.state==='CLOSED'||session.state==='PREOPEN');
    const price=useDailyClose?barPrice:(useMeta?marketPrice:barPrice),observedAt=useDailyClose?barTime:(useMeta?marketTime:barTime);
    const providerPreviousClose=num(meta.regularMarketPreviousClose??meta.chartPreviousClose??meta.previousClose);
    const providerChangePct=useMeta?num(meta.regularMarketChangePercent):null;
    // Align daily baselines to the selected quote's exchange-local trading date.
    // Yahoo may include today's partial daily candle while the session is open;
    // blindly taking closes[-2] then points at the wrong session.
    const dailyBars=hasDailyBars?closes.map((value,index)=>({price:num(value),timestamp:num(ts[index])})).filter(bar=>bar.price!==null&&bar.price>0&&bar.timestamp!==null):[];
    const sessionDay=session?.tradeDate?[session.tradeDate.year,String(session.tradeDate.month).padStart(2,'0'),String(session.tradeDate.day).padStart(2,'0')].join('-'):'';
    const selectedDailyBarDay=useDailyClose&&barTime?(()=>{const p=exchangeWallClock(new Date(barTime*1000),session.zone);return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-')})():'';
    // A closed index must use a daily candle dated to the current exchange session.
    // Never relabel an old intraday/provider metadata snapshot as today's official close.
    if(isDailyIndex&&session?.state==='CLOSED'&&(!useDailyClose||selectedDailyBarDay!==sessionDay))throw new Error('No verified daily close for the current exchange session; refusing stale intraday/metadata value');
    if(isDailyIndex&&session?.state==='CLOSED'){
     const metaClock=marketTime?exchangeWallClock(new Date(marketTime*1000),session.zone):null;
     const metaDay=metaClock?[metaClock.year,String(metaClock.month).padStart(2,'0'),String(metaClock.day).padStart(2,'0')].join('-'):'';
     const metaMinute=metaClock?metaClock.hour*60+metaClock.minute:-1;
     if(metaDay!==sessionDay||metaMinute<session.finalCloseMinute-10)throw new Error('Provider observation predates the official close window; withholding unfinalized index close');
    }
    if(useDailyClose&&selectedDailyBarDay!==sessionDay&&session?.state==='CLOSED')throw new Error('Daily close date does not match the exchange session date');
    const baselineCutoff=useDailyClose?selectedDailyBarDay:sessionDay;
    const dailyPreviousClose=baselineCutoff?selectDailyIndexPreviousClose(dailyBars,baselineCutoff,session.zone):(dailyBars.length>1?dailyBars[dailyBars.length-2].price:null);
    if(useDailyClose&&(!dailyPreviousClose||dailyPreviousClose<=0))throw new Error('Previous session close unavailable; refusing unverified daily percentage');
    const liveIndexSession=!!(session&&['OPEN','PRECLOSE','BREAK'].includes(session.state));
    // During an active session, Yahoo's regularMarketPreviousClose belongs to
    // the same live quote snapshot. Use paired daily candles only for a closed
    // session's finalized close; this prevents a partial/current daily bar from
    // shifting NIFTY/LQ45's percentage baseline.
    const previousClose=useDailyClose?dailyPreviousClose:(isDailyIndex&&liveIndexSession?(providerPreviousClose??dailyPreviousClose):(dailyPreviousClose??providerPreviousClose??(providerChangePct!==null&&providerChangePct>-100?price/(1+providerChangePct/100):null)));
    const changePct=previousClose!==null&&previousClose>0?(price/previousClose-1)*100:null;
    if(isDailyIndex&&(!Number.isFinite(previousClose)||previousClose<=0||!Number.isFinite(changePct)))throw new Error('Matching previous-session close unavailable; withholding index percentage');
    if(price===null||price<=0||!observedAt)throw new Error('Yahoo price/timestamp missing');
    if(observedAt>Date.now()/1000+300)throw new Error('Yahoo timestamp is in the future');
    const age=Math.max(0,Date.now()/1000-observedAt),state=String(meta.marketState||'UNKNOWN').toUpperCase();
    const open=['REGULAR','PRE','POST','PREPRE','POSTPOST'].includes(state);
    const status=age>48*3600?'STALE_OBSERVATION':(!open||age>20*60?'LAST_AVAILABLE_CLOSE':'DELAYED_PROVIDER');
    return {
     symbol:item.symbol,name:item.name,short:item.short,group:item.group,region:item.region,price,previousClose,changePct,
     currency:meta.currency||item.currency||'',exchange:meta.exchangeName||meta.fullExchangeName||'',
     marketState:state,observedAt,observedAge:age,status,intervalUsed:plan.interval,changePctMethod:useDailyClose?'matched daily closes':(isDailyIndex&&liveIndexSession?'provider live previous close':'provider previous close / matched history'),
     source:'Yahoo Finance · public fallback (unofficial)',sourceUrl:'https://finance.yahoo.com/quote/'+encoded+'/',
     retrievedAt:Date.now(),proxy:new URL(route).host,
     sparkline:closes.filter(value=>num(value)!==null).slice(-36).map(Number),
     providerFallbacks:[]
    };
   }catch(error){errors.push(new URL(route).host+': '+(error?.name==='AbortError'?'timeout':String(error?.message||error).slice(0,75)))}
   finally{clearTimeout(timer)}
  }
 }
 throw new Error(errors.slice(0,9).join(' | ')||'Yahoo public chart endpoint unavailable');
}
function parseTwseDate(value){
 const raw=String(value||'').replace(/[^0-9]/g,'');
 if(raw.length===7){const year=Number(raw.slice(0,3))+1911,month=Number(raw.slice(3,5)),day=Number(raw.slice(5,7));return {year,month,day}}
 if(raw.length===8){const year=Number(raw.slice(0,4)),month=Number(raw.slice(4,6)),day=Number(raw.slice(6,8));return {year,month,day}}
 const match=String(value||'').match(/(20\d{2})[/-](\d{1,2})[/-](\d{1,2})/);
 return match?{year:Number(match[1]),month:Number(match[2]),day:Number(match[3])}:null;
}
function parseTwseIndexReport(payload){
 const tables=Array.isArray(payload?.tables)?payload.tables:[payload];
 for(const table of tables){
  const fields=table?.fields||table?.columns||[];
  const rows=table?.data||table?.data1||[];
  if(!Array.isArray(fields)||!Array.isArray(rows))continue;
  const fieldIndex=pattern=>fields.findIndex(field=>pattern.test(String(field||'').replace(/<[^>]*>/g,'')));
  const nameIndex=fieldIndex(/^(指數|指數名稱|Index)$/i);
  const priceIndex=fieldIndex(/^(收盤指數|Closing Index|ClosingIndex)$/i);
  const changeIndex=fieldIndex(/漲跌.*百分比|漲跌.*%|Change Percent|Change%/i);
  const signIndex=fieldIndex(/漲跌\(\+\/-\)|漲跌$|Change Sign/i);
  const pointIndex=fieldIndex(/漲跌.*點數|Change Points/i);
  const dateIndex=fieldIndex(/^日期$|^Date$/i);
  if(nameIndex<0||priceIndex<0)continue;
  for(const row of rows){
   if(!Array.isArray(row))continue;
   const title=String(row[nameIndex]||'').replace(/<[^>]*>/g,'').trim();
   if(!/發行量加權股價指數|TAIEX|Taiwan Weighted|Capitalization Weighted Stock Index/i.test(title))continue;
   const date=parseTwseDate(dateIndex>=0?row[dateIndex]:payload.date||payload.dateString);
   const price=Number(String(row[priceIndex]||'').replace(/[,\s]/g,''));
   if(!date||!Number.isFinite(price)||price<=0)continue;
   const signText=String(signIndex>=0?row[signIndex]||'':'').replace(/<[^>]*>/g,'').trim();
   const signedText=value=>{const raw=String(value??'').replace(/<[^>]*>/g,'');const arrowSign=/[▼▽]/.test(raw)?'-':/[▲△]/.test(raw)?'+':'';const cleaned=raw.replace(/[−－﹣]/g,'-').replace(/[＋]/g,'+').replace(/[▲△▼▽]/g,'').replace(/[,，％%\s]/g,'').trim();return cleaned&&arrowSign&&!/^[+-]/.test(cleaned)?arrowSign+cleaned:cleaned||arrowSign};
   const sign=signedText(signIndex>=0?row[signIndex]:'');
   const changeText=signedText(changeIndex>=0?row[changeIndex]:'');
   let changePct=changeText===''?NaN:Number(changeText);
   if(Number.isFinite(changePct)&&sign){if(sign.includes('-'))changePct=-Math.abs(changePct);else if(sign.includes('+'))changePct=Math.abs(changePct)}
   const pointText=signedText(pointIndex>=0?row[pointIndex]:'');
   let pointMove=pointText===''?NaN:Number(pointText);
   if(Number.isFinite(pointMove)&&sign){if(sign.includes('-'))pointMove=-Math.abs(pointMove);else if(sign.includes('+'))pointMove=Math.abs(pointMove)}
   let previousClose=null;
   if(Number.isFinite(changePct)&&changePct>-100)previousClose=price/(1+changePct/100);
   else if(Number.isFinite(pointMove)){previousClose=price-pointMove;if(previousClose>0)changePct=(price/previousClose-1)*100}
   if(!Number.isFinite(changePct)||!Number.isFinite(previousClose)||previousClose<=0)continue;
   const dayKey=[date.year,String(date.month).padStart(2,'0'),String(date.day).padStart(2,'0')].join('-');
   return {price,previousClose,changePct,date,dayKey};
  }
 }
 return null;
}
function twseObservationQuote(item,observation,sourceName,sourceUrl){
 // Official TAIEX cash-session close is 13:30 Taipei time (05:30 UTC).
 const observedAt=Date.UTC(observation.date.year,observation.date.month-1,observation.date.day,5,30,0)/1000;
 const now=Date.now();
 return {
  symbol:item.symbol,name:item.name,short:item.short,group:item.group,region:item.region,
  price:observation.price,previousClose:observation.previousClose,changePct:observation.changePct,
  currency:'',exchange:'Taiwan Stock Exchange',marketState:'CLOSED',
  observedAt,status:'LAST_AVAILABLE_CLOSE',observationDate:observation.dayKey,
  source:sourceName,sourceUrl,retrievedAt:now,providerQuoteVerified:true,sparkline:[],providerFallbacks:[]
 };
}
async function fetchTaiwanOfficialQuote(item){
 const taipei=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=type=>taipei.find(value=>value.type===type)?.value||'';
 const tradeDate=part('year')+part('month')+part('day');
 const dailyTarget='https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date='+tradeDate+'&type=ALLBUT0999&response=json';
 const dailyRoutes=[
  dailyTarget,
  'https://corsproxy.io/?url='+encodeURIComponent(dailyTarget),
  'https://api.allorigins.win/raw?url='+encodeURIComponent(dailyTarget),
 ];
 let lastError='TWSE dated daily index report unavailable';
 for(const route of dailyRoutes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
  try{
   const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const payload=await response.json();
   if(String(payload?.stat||'').toUpperCase()!=='OK')throw new Error(payload?.stat||'TWSE daily report not ready');
   const payloadDate=String(payload.date||'');
   if(payloadDate!==tradeDate)throw new Error('TWSE daily report returned a different trade date');
   const observation=parseTwseIndexReport(payload);
   if(!observation)throw new Error('No valid TAIEX close / signed change row in official report');
   if(observation.dayKey!==tradeDate.slice(0,4)+'-'+tradeDate.slice(4,6)+'-'+tradeDate.slice(6,8))throw new Error('TWSE report row date mismatch');
   return twseObservationQuote(item,observation,'TWSE · Taiwan Stock Exchange · official dated daily close','https://www.twse.com.tw/en/afterTrading/MI_INDEX');
  }catch(error){lastError=error?.name==='AbortError'?'TWSE daily report timed out':String(error?.message||error).slice(0,120)}
  finally{clearTimeout(timer)}
 }
 // The static OpenAPI history is a last-available-session fallback only.
 const target='https://openapi.twse.com.tw/v1/indicesReport/MI_5MINS_HIST';
 const historyRoutes=[target,'https://corsproxy.io/?url='+encodeURIComponent(target),'https://api.allorigins.win/raw?url='+encodeURIComponent(target)];
 for(const route of historyRoutes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
  try{
   const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const payload=await response.json();if(!Array.isArray(payload)||payload.length<2)throw new Error('TWSE history has fewer than two sessions');
   const records=payload.map(row=>{
    const date=parseTwseDate(row.Date||row.date||row.TradingDate);
    const price=Number(String(row.ClosingIndex||row.Closing_Index||row.close||'').replace(/,/g,''));
    if(!date||!Number.isFinite(price)||price<=0)return null;
    return {...date,price,dayKey:[date.year,String(date.month).padStart(2,'0'),String(date.day).padStart(2,'0')].join('-')};
   }).filter(Boolean).sort((x,y)=>x.dayKey.localeCompare(y.dayKey));
   if(records.length<2)throw new Error('TWSE history records could not be normalized');
   const latest=records.at(-1),previous=records.at(-2);
   return twseObservationQuote(item,{...latest,previousClose:previous.price,changePct:(latest.price/previous.price-1)*100},'Taiwan Stock Exchange · official history (last available session)','https://www.twse.com.tw/en/indicesReport/MI_5MINS_HIST');
  }catch(error){lastError=error?.name==='AbortError'?'TWSE history request timed out':String(error?.message||error).slice(0,120)}
  finally{clearTimeout(timer)}
 }
 throw new Error(lastError);
}
async function fetchXauSpotQuote(item){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 let spot;
 try{
  const response=await fetch('https://xaus.com/api/v1/spot?compact=1',{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('XAUS spot HTTP '+response.status);
  spot=await response.json();
 }finally{clearTimeout(timer)}
 const price=Number(spot?.spot_usd_oz??spot?.xau?.price);
 if(!Number.isFinite(price)||price<=0)throw new Error('XAUS did not return a valid USD/troy-ounce spot price');
 const state=spot.data_state||{},asOf=spot.price_as_of||state.as_of||spot.updated_at;
 const observedAt=Date.parse(asOf)/1000;
 if(!Number.isFinite(observedAt))throw new Error('XAUS observation timestamp is missing');
 const ageFromPayload=Number(state.age_seconds);
 const age=Number.isFinite(ageFromPayload)?Math.max(ageFromPayload,Date.now()/1000-observedAt):Math.max(0,Date.now()/1000-observedAt);
 if(state.status==='unavailable'||age>15*60)throw new Error('XAUS observation is stale/unavailable ('+Math.round(age/60)+' min old)');
 let sparkline=[],changePct=null,historyCoverage=0;
 try{
  const historyResponse=await fetch('https://xaus.com/api/v1/intraday?symbol=xau&hours=24',{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
  if(historyResponse.ok){
   const series=await historyResponse.json(),points=(series.points||[]).map(point=>({t:Number(point.t),p:Number(point.p)})).filter(point=>Number.isFinite(point.t)&&Number.isFinite(point.p)&&point.p>0).sort((a,b)=>a.t-b.t);
   historyCoverage=Number(series.coverage_seconds)||0;
   if(points.length>=3){sparkline=points.slice(-36).map(point=>point.p);if(historyCoverage>=23*3600){const first=points[0].p;changePct=(price/first-1)*100}}
  }
 }catch(_){}
 const marketOpen=goldSpotSessionOpen();
 return {
  symbol:item.symbol,name:item.name,short:item.short,group:item.group,price,
  previousClose:changePct!==null?price/(1+changePct/100):null,changePct,
  currency:'USD',exchange:'XAUS spot reference',marketState:marketOpen?'REGULAR':'CLOSED',
  observedAt,observedAge:age,status:state.status==='stale'?'STALE_OBSERVATION':(marketOpen?'DELAYED_PROVIDER':'LAST_AVAILABLE_CLOSE'),
  source:'XAUS · XAU/USD indicative spot (USD per troy ounce)',
  sourceUrl:'https://xaus.com/api/',retrievedAt:Date.now(),sparkline,historyCoverageSeconds:historyCoverage,
  providerFallbacks:[]
 };
}
async function fetchMarketQuote(item){
 const errors=[];
 if(item.symbol==='XAUUSD=X')return fetchXauSpotQuote(item);
 if(item.symbol==='^JKLQ45'){
  const session=exchangeSession(item);
  if(session?.state==='OPEN'||session?.state==='PRECLOSE')return fetchYahooQuote(item);
  try{return await fetchIdxOfficialIndexQuote(item)}catch(error){errors.push('IDX official LQ45 summary: '+String(error?.message||error).slice(0,130))}
  try{const quote=await fetchYahooQuote(item);quote.providerFallbacks=errors.slice();return quote}catch(error){errors.push('Yahoo LQ45 daily fallback: '+String(error?.message||error).slice(0,130))}
  throw new Error(errors.join(' · ')||'No verified LQ45 quote provider returned an observation');
 }
 if(US_INDEX_SYMBOLS.has(item.symbol)||item.symbol==='^NSEI')return fetchYahooQuote(item);
 // Use exchange/public market feeds only; do not treat scraped web-page markup as a quote API.
 if(item.symbol==='^TWII'){
  const session=exchangeSession(item);
  if(session?.state==='OPEN'||session?.state==='PRECLOSE'){
   try{return await fetchYahooQuote(item)}
   catch(error){errors.push('Yahoo intraday fallback: '+String(error?.message||error).slice(0,130))}
  }
  try{return await fetchTaiwanOfficialQuote(item)}
  catch(error){errors.push('TWSE official close: '+String(error?.message||error).slice(0,130))}
  try{
   const fallback=await fetchYahooQuote(item);
   fallback.providerFallbacks=errors.slice();
   return fallback;
  }catch(error){errors.push('Yahoo public fallback: '+String(error?.message||error).slice(0,130))}
  throw new Error(errors.join(' · ')||'No verified Taiwan quote provider returned an observation');
 }
 const session=exchangeSession(item);
 if((!session||session.state==='CLOSED'||session.state==='PREOPEN')&&(item.stooqSymbol||STOOQ_SYMBOLS[item.symbol])){
  try{return await fetchStooqQuote(item)}
  catch(error){errors.push('Stooq public CSV: '+String(error?.message||error).slice(0,130))}
 }
 try{
  const quote=await fetchYahooQuote(item);
  quote.providerFallbacks=errors.slice();
  return quote;
 }catch(error){
  errors.push('Yahoo public fallback: '+String(error?.message||error).slice(0,150));
 }
 throw new Error(errors.join(' · ')||'No public provider returned a valid observation');
}
async function fetchQuoteBatch(){
  if(APP.yahooState==='loading')return;
  APP.yahooState='loading';APP.failures.clear();APP.successCount=0;APP.currentRunId=++APP.runCounter;const runId=APP.currentRunId;updateFeedState();
  const buttons=['refreshBtn','refreshTop'];buttons.forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=true});
  const queue=homeWatchlistItems().filter(item=>marketPollEligible(item,new Date()));
  setText('lastRefresh','Fetching '+queue.length+' Home market references…');
  let cursor=0,successes=0,failures=0;const queueSize=queue.length;
  const workers=Array.from({length:3},async()=>{while(cursor<queue.length){const item=queue[cursor++];try{const q=await fetchMarketQuote(item);q.activeRunId=runId;QUOTES.set(item.symbol,q);APP.failures.delete(item.symbol);successes++;if(exchangeSession(item)?.state==='CLOSED')markClosedRefreshAttempt(item)}
    catch(e){failures++;APP.failures.set(item.symbol,String(e?.message||'Provider request failed'));const old=QUOTES.get(item.symbol);if(old){const age=Date.now()/1000-old.observedAt;old.status=age>48*3600?'STALE_OBSERVATION':'STALE_CACHE';old.activeRunId=0;old.lastError=String(e?.message||'Refresh failed').slice(0,180);old.cacheRestored=true;QUOTES.set(item.symbol,old)}}
    APP.successCount=successes;setText('lastRefresh',`Fetching ${successes+failures}/${queueSize} · ${successes} updated · ${failures} failed`);
  }});
  try{
    await Promise.all(workers);APP.lastRefresh=Date.now();APP.nextRefreshAt=Date.now()+5000;APP.lastSliceRefreshAt=Date.now();APP.successCount=successes;APP.yahooState=successes===queueSize?'ready':(successes?'partial':'unavailable');
    const all=[...QUOTES.values()].filter(q=>num(q.price)!==null&&num(q.observedAt)!==null);
    saveJSON('apis_browser_quotes',all.slice(-WATCHLIST.length));APP.lastCacheSavedAt=Date.now();
    const checked=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
    setText('lastRefresh',`Checked ${checked} WIB · ${successes} updated · ${failures} failed`);
    renderQuoteViews();renderQuality();updateFeedState();
    if(!successes&&QUOTES.size===0){
      const firstFailure=APP.failures.values().next().value||'No provider response';
      setText('feedState','Market data unavailable · '+firstFailure.slice(0,72));
    }
  }catch(error){
    console.error('[APIS quote refresh]',error);
    APP.yahooState=successes?'partial':'unavailable';
    setText('lastRefresh','Refresh interrupted · '+String(error?.message||error).slice(0,100));
    renderQuality();updateFeedState();
  }finally{buttons.forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=false});if(!APP.nextRefreshAt)APP.nextRefreshAt=Date.now()+60000;}
}
async function persistQuoteCache(){
 const all=[...QUOTES.values()].filter(q=>num(q.price)!==null&&num(q.observedAt)!==null);
 saveJSON('apis_browser_quotes',all.slice(-WATCHLIST.length));
 APP.lastCacheSavedAt=Date.now();
}
function updateQuoteRowsInPlace(){
 const visibleRows=[...document.querySelectorAll('.ios-stock-item[data-symbol]')];
 visibleRows.forEach(row=>{
  const symbol=row.dataset.symbol;
  if(symbol==='BTCUSDT')return;
  const item=WATCHLIST.find(entry=>entry.symbol===symbol);
  const quote=QUOTES.get(symbol);
  if(!item||!quote)return;
  const pctValue=stockChangePct(quote);
  const price=row.querySelector('.ios-stock-price');
  const badge=row.querySelector('.ios-stock-change');
  const session=row.querySelector('.ios-stock-session');
  const stamp=row.querySelector('.ios-stock-updated');
  const spark=row.querySelector('.ios-stock-spark');
  if(price){const nextPrice=stockPriceText(quote,item);if(price.textContent!==nextPrice){row.classList.remove('is-updating');void row.offsetWidth;row.classList.add('is-updating');price.textContent=nextPrice;setTimeout(()=>row.classList.remove('is-updating'),600)}}
  if(badge){
   badge.textContent=pctValue===null?'—':pct(pctValue);
   badge.className='ios-stock-change '+(pctValue===null?'unavailable':pctValue>0?'up':pctValue<0?'down':'flat');
  }
  if(session)session.textContent=marketSessionLabel(quote,item);
  if(stamp)stamp.textContent=marketFeedTimestampLabel(quote,item);
  if(spark)spark.replaceChildren(buildStockSparkline(quote.sparkline,pctValue));
  if(row.open){
   const chip=row.querySelector('.ios-detail-chip');
   const observed=row.querySelector('.ios-detail-time');
   const source=row.querySelector('.ios-detail-source');
   const error=row.querySelector('.ios-detail-error');
   if(chip)chip.textContent=quote.transport==='WEBSOCKET'?'LIVE TICK':quoteStatusLabel(quote.status);
   if(observed)observed.textContent='Provider observation '+fmtTime(quote.observedAt)+' · checked '+marketFeedTimestampLabel(quote,item);
   if(source){source.href=quote.sourceUrl||'#';source.textContent=quote.source||'Public provider unavailable'}
   if(error)error.textContent=quote.lastError||APP.failures.get(symbol)||'';
  }
 });
}
async function fetchQuoteSlice(){
 if(document.hidden||!navigator.onLine||APP.yahooState==='loading'||APP.sliceBusy)return;
 APP.sliceBusy=true;
 const now=new Date(),queue=WATCHLIST.filter(item=>marketPollEligible(item,now)),selected=[],sliceSize=6;
 for(let i=0;i<Math.min(sliceSize,queue.length);i++){selected.push(queue[APP.sliceCursor%queue.length]);APP.sliceCursor=(APP.sliceCursor+1)%queue.length}
 if(!selected.length){APP.lastSliceRefreshAt=Date.now();setText('lastRefresh','All tracked exchanges closed · close snapshots already checked');APP.sliceBusy=false;return}
 const runId=APP.currentRunId||1;
 try{
  const results=await Promise.allSettled(selected.map(item=>fetchMarketQuote(item)));let updated=0,failed=0;
  results.forEach((result,index)=>{
   const item=selected[index],session=exchangeSession(item,now);
   if(result.status==='fulfilled'&&num(result.value.price)!==null){const quote=result.value;quote.activeRunId=runId;QUOTES.set(item.symbol,quote);APP.failures.delete(item.symbol);if(session?.state==='CLOSED')markClosedRefreshAttempt(item,now);updated++}
   else{const reason=result.status==='rejected'?String(result.reason?.message||result.reason):'Invalid provider price';APP.failures.set(item.symbol,reason.slice(0,150));failed++;const old=QUOTES.get(item.symbol);if(old){old.lastError=reason.slice(0,180);old.activeRunId=0;old.status='STALE_CACHE';QUOTES.set(item.symbol,old)}}
  });
  APP.sliceUpdated=(APP.sliceUpdated||0)+updated;APP.sliceFailed=(APP.sliceFailed||0)+failed;APP.lastSliceRefreshAt=Date.now();APP.nextRefreshAt=Date.now()+5000;
  if(Date.now()-(APP.lastCacheSavedAt||0)>15000)await persistQuoteCache();
  updateQuoteRowsInPlace();renderTape();renderMovers();evaluateAlerts();updateFeedState();renderQuality();
  const stamp=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date());
  setText('lastRefresh','Feed '+stamp+' WIB · '+updated+' updated · '+failed+' failed · session-aware queue');
 }finally{APP.sliceBusy=false}
}
function btcIsFresh(){if(!APP.btc)return false;const age=Date.now()-APP.btc.receivedAt;if(APP.btc.transport==='WEBSOCKET')return !!(typeof WebSocket!=='undefined'&&APP.ws&&APP.ws.readyState===WebSocket.OPEN&&age<=15000&&(Date.now()-APP.btc.observedAt)<=15000);return APP.btc.transport==='REST'&&age<=90000&&(Date.now()-APP.btc.observedAt)<=90000;}
function quoteStatusClass(status){
 if(['STALE_OBSERVATION','STALE_CACHE','UNAVAILABLE'].includes(status))return 'bad';
 if(['LAST_AVAILABLE_CLOSE','DELAYED_PROVIDER'].includes(status))return 'warn';
 return 'ok';
}
function quoteStatusLabel(status){
 return ({DELAYED_PROVIDER:'DELAYED',LAST_AVAILABLE_CLOSE:'LAST CLOSE',STALE_OBSERVATION:'STALE',STALE_CACHE:'CACHED / STALE',PROVIDER_QUOTE:'PROVIDER UPDATE'})[status]||String(status||'UNAVAILABLE').replaceAll('_',' ');
}
function formatQuoteObservation(quote){
 if(!quote)return '—';
 if(quote.observationDate)return quote.observationDate+' · Stooq public snapshot';
 return fmtTime(quote.observedAt);
}
function updateFeedState(){
 const dot=document.getElementById('feedDot'),label=document.getElementById('feedState');
 const cryptoLive=!!(APP.btc&&APP.btc.transport==='WEBSOCKET'&&btcIsFresh());
 const updated=[...QUOTES.values()].filter(q=>q.activeRunId===APP.currentRunId&&APP.currentRunId!==0);
 const hasFresh=updated.some(q=>q.status==='PROVIDER_QUOTE'||q.status==='DELAYED_PROVIDER');
 if(dot)dot.className='dot'+(cryptoLive?' live':hasFresh?' warn':'');
 if(label){
  const suffix=APP.yahooState==='loading'?' · updating':APP.yahooState==='partial'?' · partial':APP.yahooState==='unavailable'?' · unavailable':'';
  label.textContent=(cryptoLive?'BTC LIVE · ':'')+'PUBLIC '+(APP.successCount||0)+'/'+WATCHLIST.length+suffix;
 }
}

function createQuoteCard(item,quote){const card=document.createElement('article');card.className='card quote-card'+(quote?'':' empty');const top=document.createElement('div');top.className='quote-top';const name=document.createElement('div');name.className='quote-name';name.textContent=item.name;const sym=document.createElement('span');sym.className='symbol';sym.textContent=item.short;top.append(name,sym);card.append(top);const value=document.createElement('div');value.className='quote-value';value.textContent=quote?fmtPrice(quote):'Unavailable';card.append(value);const bottom=document.createElement('div');bottom.className='quote-bottom';const ch=document.createElement('span');ch.className='change '+(quote?changeClass((quote.price-(quote.previousClose??quote.price))):'flat');ch.textContent=quote&&num(quote.previousClose)!==null?`${fmt(quote.price-quote.previousClose,2)} (${pct((quote.price/quote.previousClose-1)*100)})`:'No verified observation';const status=document.createElement('span');status.className='status-label '+(quote?quoteStatusClass(quote.status):'bad');status.textContent=quote?quoteStatusLabel(quote.status):'UNAVAILABLE';bottom.append(ch,status);card.append(bottom);const asof=document.createElement('div');asof.className='quote-asof';asof.textContent=quote?`Observed ${formatQuoteObservation(quote)} · ${quote.exchange||'provider quote'}`:'No price shown because a valid provider observation was not received';card.append(asof);return card;}
function renderMovers(){
 const stockGroups=new Set(['Indonesia equity','US equity','Hong Kong equity','Korea focus equity','Taiwan focus equity']);
 const rows=[...QUOTES.values()].filter(q=>{
  if(!stockGroups.has(q.group)||num(q.price)===null||stockChangePct(q)===null||['STALE_OBSERVATION','STALE_CACHE','UNAVAILABLE','CONFLICTED_OBSERVATION'].includes(q.status))return false;
  const item=WATCHLIST.find(entry=>entry.symbol===q.symbol);if(!item)return false;
  const session=exchangeSession(item),age=Date.now()/1000-Number(q.observedAt||0);
  if(age>6*3600)return false;
  if(session){
   const expected=[session.tradeDate.year,String(session.tradeDate.month).padStart(2,'0'),String(session.tradeDate.day).padStart(2,'0')].join('-');
   const observed=q.observationDate||new Intl.DateTimeFormat('en-CA',{timeZone:session.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Number(q.observedAt)*1000));
   if(observed!==expected)return false;
   if((session.state==='OPEN'||session.state==='PRECLOSE')&&q.status==='LAST_AVAILABLE_CLOSE')return false;
  }
  return true;
 }).map(q=>({...q,changePct:stockChangePct(q)}));
 const moversByMagnitude=[...rows].sort((a,b)=>Math.abs(b.changePct)-Math.abs(a.changePct));
 const gainers=rows.filter(q=>q.changePct>0).sort((a,b)=>b.changePct-a.changePct).slice(0,5);
 const losers=rows.filter(q=>q.changePct<0).sort((a,b)=>a.changePct-b.changePct).slice(0,5);
 const draw=(id,items,cls)=>{const host=document.getElementById(id);if(!host)return;host.replaceChildren();
  if(!items.length){const e=document.createElement('div');e.className='empty-state';e.textContent='No validated mover observations available.';host.append(e);return}
  items.forEach(q=>{const row=document.createElement('div');row.className='mover-row';const name=document.createElement('div');const symbol=document.createElement('span');symbol.className='mover-symbol';symbol.textContent=q.short;const label=document.createElement('span');label.className='mover-name';const market=q.region||({ 'Indonesia equity':'Indonesia','US equity':'United States','Hong Kong equity':'Hong Kong','Korea focus equity':'South Korea','Taiwan focus equity':'Taiwan'}[q.group]||'');label.textContent=q.name+(market?' · '+market:'');name.append(symbol,label);
   const val=document.createElement('span');val.className='mover-value';val.textContent=fmtPrice(q);const change=document.createElement('span');change.className='mover-change '+cls;change.textContent=(q.changePct>0?'+':'')+q.changePct.toFixed(2)+'%';row.append(name,val,change);host.append(row)});
 };
 draw('gainersList',gainers,'up');
 draw('losersList',losers,'down');
 setText('moversStamp',moversByMagnitude.length+' current-session individual stocks · largest absolute movers ranked · stale / prior-session rows excluded');
}
function stockChangePct(quote){
 if(!quote)return null;
 if(quote.symbol==='^TWII'&&!['TWSE'].some(token=>String(quote.source||'').toUpperCase().includes(token)))return null;
 if(num(quote.changePct)!==null)return Number(quote.changePct);
 if(num(quote.previousClose)!==null&&quote.previousClose>0&&num(quote.price)!==null)return (quote.price/quote.previousClose-1)*100;
 return null;
}
function stockPriceText(quote,item){
 if(!quote||num(quote.price)===null)return '—';
 const value=new Intl.NumberFormat('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}).format(quote.price);
 if(item&&item.symbol==='XAUUSD=X')return value+' USD/oz';
 if(item&&item.group==='Commodity')return value+' USD';
 if(item&&item.group==='FX')return value+' IDR';
 if(item&&item.group==='Crypto')return value+' USD';
 return value;
}
function buildStockSparkline(values,changePct){
 const series=(Array.isArray(values)?values:[]).map(Number).filter(Number.isFinite).slice(-36);
 if(series.length<3){const empty=document.createElement('span');empty.className='ios-sparkline-empty';empty.textContent='';empty.setAttribute('aria-label','Historical line unavailable for snapshot-only source');return empty}
 const width=112,height=34,pad=3,min=Math.min(...series),max=Math.max(...series),range=max-min||1;
 const coords=series.map((value,index)=>{
  const x=pad+(index/(series.length-1))*(width-pad*2);
  const y=height-pad-((value-min)/range)*(height-pad*2);
  return [x,y];
 });
 const points=coords.map(point=>point[0].toFixed(1)+','+point[1].toFixed(1)).join(' ');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 112 34');svg.setAttribute('preserveAspectRatio','none');
 svg.setAttribute('class','ios-sparkline '+(changePct>0?'positive':changePct<0?'negative':'neutral'));
 svg.setAttribute('role','img');svg.setAttribute('aria-label','Provider price history');
 const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
 line.setAttribute('points',points);line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');
 line.setAttribute('stroke-width','2.5');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');
 svg.append(line);
 return svg;
}
function exchangeWallClock(date,timeZone){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=type=>parts.find(part=>part.type===type)?.value||'0';
 return {weekday:get('weekday'),year:Number(get('year')),month:Number(get('month')),day:Number(get('day')),hour:Number(get('hour')),minute:Number(get('minute')),second:Number(get('second'))};
}
function exchangeMinutes(date,timeZone){
 const p=exchangeWallClock(date,timeZone);return p.hour*60+p.minute+(p.second/60);
}
function exchangeSession(item,now=new Date()){
 const symbol=item?.symbol||'',group=item?.group||'';
 let zone='',openWindows=[],closeTime='',closeZone='',finalCloseMinute=0,auctionWindow=null;
 if(symbol==='^JKSE'||symbol==='^JKLQ45'||group==='Indonesia equity'){
  zone='Asia/Jakarta';closeTime='16:00';closeZone='WIB';finalCloseMinute=16*60;
  const p=exchangeWallClock(now,zone),minute=p.hour*60+p.minute;
  if(p.weekday==='Sat'||p.weekday==='Sun')return {state:'CLOSED',label:'MARKET CLOSE',zone,closeTime,closeZone,finalCloseMinute,tradeDate:p};
  const friday=p.weekday==='Fri';
  openWindows=friday?[[9*60,11*60+30],[14*60,15*60+50]]:[[9*60,12*60],[13*60+30,15*60+50]];
  auctionWindow=[15*60+50,16*60];
  return sessionState(p,minute,{zone,closeTime,closeZone,finalCloseMinute,openWindows,auctionWindow});
 }
 if(symbol==='^TWII'||group==='Taiwan focus equity'){zone='Asia/Taipei';closeTime='13:30';closeZone='TST';finalCloseMinute=13*60+30;openWindows=[[9*60,13*60+30]]}
 else if(symbol==='000001.SS'){zone='Asia/Shanghai';closeTime='15:00';closeZone='CST';finalCloseMinute=15*60;openWindows=[[9*60+30,11*60+30],[13*60,14*60+57]];auctionWindow=[14*60+57,15*60]}
 else if(symbol==='^HSI'||group==='Hong Kong equity'){zone='Asia/Hong_Kong';closeTime='16:10';closeZone='HKT';finalCloseMinute=16*60+10;openWindows=[[9*60+30,12*60],[13*60,16*60]];auctionWindow=[16*60,16*60+10]}
 else if(symbol==='^N225'){zone='Asia/Tokyo';closeTime='15:30';closeZone='JST';finalCloseMinute=15*60+30;openWindows=[[9*60,11*60+30],[12*60+30,15*60+25]];auctionWindow=[15*60+25,15*60+30]}
 else if(symbol==='^KS11'||group==='Korea focus equity'){zone='Asia/Seoul';closeTime='15:30';closeZone='KST';finalCloseMinute=15*60+30;openWindows=[[9*60,15*60+20]];auctionWindow=[15*60+20,15*60+30]}
 else if(group==='US equity'||['^GSPC','^IXIC','^DJI','^VIX'].includes(symbol)){zone='America/New_York';closeTime='16:00';closeZone='ET';finalCloseMinute=16*60;openWindows=[[9*60+30,15*60+50]];auctionWindow=[15*60+50,16*60]}
 else if(symbol==='^NSEI'){zone='Asia/Kolkata';closeTime='15:30';closeZone='IST';finalCloseMinute=15*60+30;openWindows=[[9*60+15,15*60+30]]}
 else return null;
 const p=exchangeWallClock(now,zone),minute=p.hour*60+p.minute;
 return sessionState(p,minute,{zone,closeTime,closeZone,finalCloseMinute,openWindows,auctionWindow});
}
function sessionState(p,minute,config){
 const {zone,closeTime,closeZone,finalCloseMinute,openWindows,auctionWindow}=config;
 const timeLabel=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
 const base={zone,closeTime,closeZone,finalCloseMinute,tradeDate:p,sessionHours:openWindows.map(([a,b])=>timeLabel(a)+'–'+timeLabel(b)).join(' / '),auctionHours:auctionWindow?timeLabel(auctionWindow[0])+'–'+timeLabel(auctionWindow[1]):''};
 if(p.weekday==='Sat'||p.weekday==='Sun')return {...base,state:'CLOSED',label:'MARKET CLOSE'};
 if(openWindows.some(([a,b])=>minute>=a&&minute<b))return {...base,state:'OPEN',label:'SESSION OPEN'};
 if(auctionWindow&&minute>=auctionWindow[0]&&minute<auctionWindow[1])return {...base,state:'PRECLOSE',label:'CLOSING AUCTION'};
 if(openWindows.length===2&&minute>=openWindows[0][1]&&minute<openWindows[1][0])return {...base,state:'BREAK',label:'LUNCH BREAK'};
 if(minute<openWindows[0][0])return {...base,state:'PREOPEN',label:'PRE-MARKET'};
 return {...base,state:'CLOSED',label:'MARKET CLOSE'};
}
function marketPollEligible(item,now=new Date()){
 const session=exchangeSession(item,now);if(!session)return true;
 if(session.state==='OPEN'||session.state==='PRECLOSE')return true;
 if(session.state!=='CLOSED'||session.tradeDate.weekday==='Sat'||session.tradeDate.weekday==='Sun')return false;
 const minute=session.tradeDate.hour*60+session.tradeDate.minute;if(minute<session.finalCloseMinute)return false;
 const p=session.tradeDate,key=[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');
 const prior=QUOTES.get(item.symbol),retrieved=Number(prior?.retrievedAt||0),retrievedLocal=retrieved?exchangeWallClock(new Date(retrieved),session.zone):null;
 const closePublishMinute=session.finalCloseMinute+3;
 if(marketQuoteDayKey(prior,session)===key&&retrievedLocal&&retrievedLocal.hour*60+retrievedLocal.minute>=closePublishMinute){APP.closedRefreshDone[item.symbol]=key;return false}
 if(minute<closePublishMinute)return false;
 return APP.closedRefreshDone[item.symbol]!==key;
}
function markClosedRefreshAttempt(item,now=new Date()){
 const session=exchangeSession(item,now);
 if(session&&session.state==='CLOSED'&&session.tradeDate.weekday!=='Sat'&&session.tradeDate.weekday!=='Sun'){const p=session.tradeDate;APP.closedRefreshDone[item.symbol]=[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');saveJSON('apis_market_closed_refresh_done',APP.closedRefreshDone)}
}
function marketQuoteDayKey(quote,session){
 if(!quote||!session)return '';
 if(quote.observationDate)return String(quote.observationDate);
 if(num(quote.observedAt)!==null)return new Intl.DateTimeFormat('en-CA',{timeZone:session.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(quote.observedAt*1000));
 return '';
}
function marketSessionScheduleLabel(item){
 const session=exchangeSession(item);if(!session)return '';
 return 'Regular '+session.sessionHours+' '+session.closeZone+' · Close '+session.closeTime+' '+session.closeZone+(session.auctionHours?' · Auction '+session.auctionHours+' '+session.closeZone:'');
}
function marketSessionLabel(quote,item,now=new Date()){
 if(!quote)return 'FEED UNAVAILABLE';
 if(item?.symbol==='XAUUSD=X'){
  if(!goldSpotSessionOpen())return quote.status==='STALE_OBSERVATION'?'MARKET CLOSE · STALE':'MARKET CLOSE';
  return quote.status==='STALE_OBSERVATION'?'SESSION OPEN · STALE':'LIVE · SPOT';
 }
 if(quote.transport==='WEBSOCKET')return 'LIVE';
 const session=exchangeSession(item,now);
 if(session){
  if(session.state==='OPEN'){
   const observedDay=marketQuoteDayKey(quote,session);
   const marketDay=new Intl.DateTimeFormat('en-CA',{timeZone:session.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   if(quote.marketState==='PUBLIC CSV SNAPSHOT')return 'SESSION OPEN · SNAPSHOT';
   if(quote.status==='STALE_CACHE'||quote.status==='STALE_OBSERVATION'||quote.status==='LAST_AVAILABLE_CLOSE'||(observedDay&&observedDay<marketDay))return 'SESSION OPEN · STALE';
   return quote.status==='DELAYED_PROVIDER'?'SESSION OPEN · DELAYED':'SESSION OPEN';
  }
  if(session.state==='PRECLOSE')return 'PRE-CLOSE';
  if(session.state==='BREAK')return 'LUNCH BREAK';
  if(session.state==='PREOPEN')return 'PRE-MARKET';
  if(session.state==='CLOSED')return quote.status==='STALE_OBSERVATION'||quote.status==='STALE_CACHE'?'MARKET CLOSE · STALE':'MARKET CLOSE';
 }
 const marketState=String(quote.marketState||'').toUpperCase();
 if(marketState==='PRE')return 'PRE-MARKET';
 if(marketState==='POST')return 'AFTER-HOURS';
 if(marketState==='REGULAR')return quote.status==='DELAYED_PROVIDER'?'SESSION OPEN · DELAYED':'LIVE';
 if(marketState==='CLOSED')return quote.status==='STALE_OBSERVATION'||quote.status==='STALE_CACHE'?'MARKET CLOSE · STALE':'MARKET CLOSE';
 if(marketState==='PUBLIC CSV SNAPSHOT')return 'MARKET CLOSE · PUBLIC SNAPSHOT';
 if(quote.status==='STALE_OBSERVATION'||quote.status==='STALE_CACHE')return 'STALE OBSERVATION';
 if(quote.status==='LAST_AVAILABLE_CLOSE')return 'MARKET CLOSE';
 return quote.status==='DELAYED_PROVIDER'?'SESSION OPEN · DELAYED':'MARKET STATUS · PROVIDER';
}
function marketFeedTimestampLabel(quote,item){
 if(!quote)return 'No feed time';
 const stamp=Number(quote.retrievedAt||quote.receivedAt||0);
 const feed=stamp>0?new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(stamp))+' WIB':'Feed time n/a';
 const session=exchangeSession(item);
 if(session&&quote.observationDate){
  const observedDate=new Date(quote.observationDate+'T12:00:00Z');
  const day=new Intl.DateTimeFormat('en-GB',{timeZone:session.zone,day:'2-digit',month:'short',year:'numeric'}).format(observedDate);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:session.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const descriptor=session.state==='CLOSED'&&quote.observationDate===today?'Close':'Last close';
  return feed+' · '+descriptor+' '+session.closeTime+' '+session.closeZone+' · '+day;
 }
 if(session&&quote.observedAt&&(session.state==='CLOSED'||quote.status==='LAST_AVAILABLE_CLOSE'||quote.status==='STALE_CACHE'||quote.status==='STALE_OBSERVATION')){
  const observed=new Date(quote.observedAt*1000);
  const day=new Intl.DateTimeFormat('en-GB',{timeZone:session.zone,day:'2-digit',month:'short'}).format(observed);
  const observedKey=new Intl.DateTimeFormat('en-CA',{timeZone:session.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(observed);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:session.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const descriptor=session.state==='CLOSED'&&observedKey===today?'Close':'Last close';
  return feed+' · '+descriptor+' '+session.closeTime+' '+session.closeZone+' · '+day;
 }
 return feed;
}
function goldSpotSessionOpen(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const get=name=>parts.find(part=>part.type===name)?.value||'0';
 const weekday=get('weekday'),minutes=Number(get('hour'))*60+Number(get('minute'));
 if(weekday==='Sat')return false;
 if(weekday==='Sun')return minutes>=18*60;
 if(weekday==='Fri')return minutes<17*60;
 return !(minutes>=17*60&&minutes<18*60);
}
function createStockRow(item,quote,opts={}){
 const detail=document.createElement('details');detail.className='ios-stock-item';
 const summary=document.createElement('summary');summary.className='ios-stock-row';
 const identity=document.createElement('div');identity.className='ios-stock-identity';
 const symbol=document.createElement('strong');symbol.className='ios-stock-symbol';symbol.textContent=item.short||item.symbol;
 const name=document.createElement('span');name.className='ios-stock-name';name.textContent=item.name;
 const group=document.createElement('small');group.className='ios-stock-group';group.textContent=item.group==='Commodity'?'COMMODITY':item.group==='FX'?'CURRENCY':item.group==='Index'||item.group==='Risk'?'INDEX':item.group.toUpperCase();
 identity.append(symbol,name,group);
 const sparkWrap=document.createElement('div');sparkWrap.className='ios-stock-spark';
 const pctValue=stockChangePct(quote);
 sparkWrap.append(buildStockSparkline(quote?.sparkline,pctValue));
 const right=document.createElement('div');right.className='ios-stock-right';
 const price=document.createElement('strong');price.className='ios-stock-price';price.textContent=stockPriceText(quote,item);
 const badge=document.createElement('span');badge.className='ios-stock-change '+(pctValue===null?'unavailable':pctValue>0?'up':pctValue<0?'down':'flat');
 badge.textContent=pctValue===null?'—':pct(pctValue);
 const sessionLine=document.createElement('div');sessionLine.className='ios-stock-session-line';
 const session=document.createElement('small');session.className='ios-stock-session';session.textContent=marketSessionLabel(quote,item);
 const feedStamp=document.createElement('time');feedStamp.className='ios-stock-updated';feedStamp.textContent=marketFeedTimestampLabel(quote,item);
 sessionLine.append(session,feedStamp);right.append(price,badge,sessionLine);
 detail.dataset.symbol=item.symbol;
 const chevron=document.createElement('span');chevron.className='ios-stock-chevron';chevron.textContent='›';
 summary.append(identity,sparkWrap,right,chevron);
 const extra=document.createElement('div');extra.className='ios-stock-detail';
 const status=document.createElement('span');status.className='ios-detail-chip';status.textContent=quote?(quote.transport==='WEBSOCKET'?'LIVE TICK':quoteStatusLabel(quote.status)):'UNAVAILABLE';
 const observed=document.createElement('span');observed.className='ios-detail-time';
 const schedule=document.createElement('small');schedule.className='ios-detail-schedule';schedule.textContent=marketSessionScheduleLabel(item);
 let observedSeconds=quote?Number(quote.observedAt):null;
 if(quote&&(quote.transport==='WEBSOCKET'||quote.transport==='REST'||quote.transport==='CACHE'))observedSeconds=observedSeconds/1000;
 observed.textContent=quote&&Number.isFinite(observedSeconds)?'Observed '+fmtTime(observedSeconds):'No validated observation';
 const source=document.createElement('a');source.className='ios-detail-source';source.href=quote?.sourceUrl||'#';source.target='_blank';source.rel='noopener';source.textContent=quote?.source||'Public provider unavailable';
 if(!quote){source.removeAttribute('target');source.addEventListener('click',event=>event.preventDefault())}
 const comparison=document.createElement('small');comparison.className='ios-detail-comparison';
 if(quote?.providerComparison){
  const check=quote.providerComparison,delta=Number.isFinite(Number(check.differencePct))?(check.differencePct>0?'+':'')+Number(check.differencePct).toFixed(2)+'%':'—';
  const backupPrice=Number.isFinite(Number(check.price))?new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(check.price):'—';
  comparison.textContent='Backup comparison · '+check.source+' · '+backupPrice+' · Δ '+delta+' · '+check.status;
 }else comparison.textContent='';
 const providerError=document.createElement('small');providerError.className='ios-detail-error';
 providerError.textContent=quote?.lastError||APP.failures.get(item.symbol)||'';
 extra.append(status,observed);if(schedule.textContent)extra.append(schedule);extra.append(source);if(comparison.textContent)extra.append(comparison);extra.append(providerError);
 detail.append(summary,extra);
 return detail;
}
function homeWatchlistItems(){
 const priority=['^JKSE','^JKLQ45','^GSPC','^IXIC','^DJI','NQ=F','000001.SS','^HSI','^TWII','^N225','^KS11','^NSEI','^VIX','EIDO','XAUUSD=X','GC=F','CL=F','BZ=F','HG=F','IDR=X'];
 const eligible=WATCHLIST.filter(item=>!['Indonesia equity','US equity','Hong Kong equity','Korea focus equity','Taiwan focus equity'].includes(item.group));
 const ordered=priority.map(symbol=>eligible.find(item=>item.symbol===symbol)).filter(Boolean);
 return ordered.concat(eligible.filter(item=>!priority.includes(item.symbol)));
}
function renderHomeStocks(){
 const host=document.getElementById('featuredQuotes');if(!host)return;
 const query=(document.getElementById('homeSearch')?.value||'').trim().toLowerCase();
 const items=homeWatchlistItems().filter(item=>!query||(item.name+' '+item.short+' '+item.symbol+' '+item.group).toLowerCase().includes(query));
 host.replaceChildren();
 if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='No instruments match your search.';host.append(empty)}
 renderGroupedStockRows(host,items,'No market references match this search.');
 setText('homeWatchCount',items.length+' market references · no individual equities · tap a row for source details');
 setText('homeSnapshotStamp',APP.yahooState==='loading'?'PUBLIC FEEDS · UPDATING':(APP.successCount||0)+' / '+WATCHLIST.length+' UPDATED');
 setText('homeDate',new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'numeric',month:'long'}).format(new Date()));
 setText('quoteCount',QUOTES.size+' / '+WATCHLIST.length+' · '+items.length+' shown on Home');
}
function updateLiveRowLabels(){
 document.querySelectorAll('.ios-stock-item[data-symbol]').forEach(row=>{
  const symbol=row.dataset.symbol,item=WATCHLIST.find(entry=>entry.symbol===symbol);
  const quote=QUOTES.get(symbol);if(!item)return;
  const session=row.querySelector('.ios-stock-session'),stamp=row.querySelector('.ios-stock-updated');
  if(session)session.textContent=marketSessionLabel(quote,item);
  if(stamp)stamp.textContent=marketFeedTimestampLabel(quote,item);
 });
}
function renderGroupedStockRows(host,items,emptyMessage='No validated observations for this segment yet.'){
 host.replaceChildren();
 const groups=new Map();
 items.forEach(item=>{
  const key=item.group==='Commodity'?'Commodities':item.group==='FX'?'Foreign Exchange':(item.region||item.group||'Other');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);
 });
 const order=['Indonesia','United States','Greater China','North Asia','South Asia','Commodities','Foreign Exchange','Other'];
 const entries=[...groups.entries()].sort((a,b)=>{
  const ai=order.indexOf(a[0]),bi=order.indexOf(b[0]);
  return (ai<0?99:ai)-(bi<0?99:bi);
 });
 if(!entries.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent=emptyMessage;host.append(empty);return}
 entries.forEach(([region,regionItems])=>{
  const section=document.createElement('section');section.className='ios-market-region';
  const head=document.createElement('div');head.className='ios-market-region-heading';
  const title=document.createElement('h3');title.textContent=region;
  const count=document.createElement('span');count.textContent=regionItems.length+' instruments';
  head.append(title,count);section.append(head);
  regionItems.forEach(item=>section.append(createStockRow(item,QUOTES.get(item.symbol))));
  host.append(section);
 });
}
function renderMarketOverview(){
 const host=document.getElementById('marketSnapshotGrid');if(!host)return;
 const selected=APP.marketFilter||'indices';
 const filters={
  indices:{title:'Global indices',description:'Major equity benchmarks across the US, India, Japan and Asia.',items:WATCHLIST.filter(item=>['Index','Risk','ETF'].includes(item.group))},
  commodities:{title:'Commodities',description:'Gold spot, crude oil, Brent crude and copper futures. Public quotes may be delayed or last close.',items:WATCHLIST.filter(item=>item.group==='Commodity')},
  'fx-crypto':{title:'FX & Crypto',description:'Currency observations and public cryptocurrency exchange data.',items:WATCHLIST.filter(item=>item.group==='FX')},
  equities:{title:'Equities',description:'Market-moving individual stocks: Indonesia, US, Hong Kong; Samsung / SK Hynix and TSMC focus names.',items:WATCHLIST.filter(item=>['Indonesia equity','US equity','Hong Kong equity','Korea focus equity','Taiwan focus equity'].includes(item.group))}
 };
 const current=filters[selected]||filters.indices;
 setText('marketSegmentTitle',current.title);setText('marketSegmentDescription',current.description);
 const controls=document.getElementById('marketFilters');
 if(controls)controls.querySelectorAll('[data-market-filter]').forEach(button=>{
  const active=button.dataset.marketFilter===selected;
  button.classList.toggle('active',active);button.setAttribute('aria-selected',active?'true':'false');
 });
 renderGroupedStockRows(host,current.items,'No verified public observations for this segment yet.');
 if(selected==='fx-crypto'){
  const bitcoinItem={symbol:'BTCUSDT',short:'BTC / USD',name:'Bitcoin',group:'Crypto'};
  const bitcoinQuote=APP.btc&&num(APP.btc.price)!==null?
   {...APP.btc,changePct:APP.btc.changePct,source:APP.btc.source,status:APP.btc.transport==='WEBSOCKET'?'LIVE TICK':'REST SNAPSHOT'}:null;
  const bitcoinSection=document.createElement('section');bitcoinSection.className='ios-market-region';
  const bitcoinHead=document.createElement('div');bitcoinHead.className='ios-market-region-heading';bitcoinHead.innerHTML='<h3>Crypto</h3><span>1 instrument</span>';
  bitcoinSection.append(bitcoinHead,createStockRow(bitcoinItem,bitcoinQuote));host.prepend(bitcoinSection);
 }

 setText('snapshotStamp',current.items.length+(selected==='fx-crypto'?1:0)+' instruments · public feed');
 setText('quoteCountMarkets',QUOTES.size+' / '+WATCHLIST.length);
 setText('lastRefreshMarkets',document.getElementById('lastRefresh')?.textContent||'Not refreshed');
}
function renderQuoteViews(){
 renderHomeStocks();
 renderMarketOverview();
 renderTape();renderMovers();evaluateAlerts();updateFeedState();
}
function renderTape(){
 const tape=document.getElementById('tickerTape');if(!tape)return;tape.replaceChildren();let any=false;
 const add=(symbol,value,change,sub='')=>{const node=document.createElement('div');node.className='tape-item';const s=document.createElement('strong');s.textContent=symbol;const v=document.createElement('span');v.textContent=value;const c=document.createElement('span');c.className='change '+(change>0?'up':change<0?'down':'flat');c.textContent=Number.isFinite(change)?((change>0?'+':'')+change.toFixed(2)+'%'):'—';node.append(s,v,c);if(sub){const x=document.createElement('span');x.className='minor';x.textContent=sub;node.append(x)}tape.append(node);any=true};
 ['^JKSE','^GSPC','^IXIC','NQ=F','^DJI','^NSEI','^N225','^VIX','IDR=X','BZ=F','GC=F'].forEach(sym=>{const item=WATCHLIST.find(x=>x.symbol===sym),q=QUOTES.get(sym);if(q&&item){const change=q.previousClose?((q.price/q.previousClose)-1)*100:NaN;add(item.short,fmtPrice(q),change,quoteStatusLabel(q.status))}});
 if(APP.btc&&num(APP.btc.price)!==null)add('BTC/USDT',fmt(APP.btc.price,2)+' USD',num(APP.btc.changePct),APP.btc.transport==='WEBSOCKET'?'LIVE TICK':'REST SNAPSHOT');
 if(!any){const n=document.createElement('div');n.className='tape-item';const b=document.createElement('strong');b.textContent='APIS';const t=document.createElement('span');t.className='minor';t.textContent='No validated provider observations yet.';n.append(b,t);tape.append(n)}
}
function renderQuality(){
  const total=WATCHLIST.length;
  const valid=[...QUOTES.values()].filter(q=>num(q.price)!==null&&num(q.observedAt)!==null);
  const updated=valid.filter(q=>q.activeRunId===APP.currentRunId&&APP.currentRunId!==0).length;
  const cached=Math.max(0,valid.length-updated);
  const pctv=total?updated/total*100:0;
  setText('coveragePct',pctv.toFixed(0)+'%');
  document.getElementById('coverageFill').style.width=pctv+'%';
  setText('coverageDetails',`${updated} updated this refresh · ${cached} cached · ${APP.failures.size} failed`);
  setText('coverageStatus',`${updated}/${total} updated`);
  setText('coverageAsOf',APP.lastRefresh?'last refresh checked':'awaiting provider response');
  setText('dqRequested',String(total));setText('dqUsable',String(updated));
  setText('dqUnavailable',String(total-updated));setText('dqTimestamp',String(updated));
  const cryptoLive=!!(APP.btc&&APP.btc.transport==='WEBSOCKET'&&btcIsFresh());
  const cryptoRest=!!(APP.btc&&APP.btc.transport==='REST'&&btcIsFresh());
  const cryptoCached=!!(APP.btc&&APP.btc.transport==='CACHE');
  const sampleErrors=[...APP.failures.entries()].slice(0,2).map(([sym,msg])=>`${sym}: ${msg}`).join(' · ');
  const yahooDetail=`${updated} valid responses this refresh; ${cached} retained observations; ${APP.failures.size} failed`+(sampleErrors?` · Error sample: ${sampleErrors}`:'');
  const protocol=String(location.protocol||'unknown');
  const origin=String(location.origin||'opaque');
  const browserDetail=`online=${navigator.onLine?'yes':'no'} · protocol=${protocol} · origin=${origin} · secureContext=${window.isSecureContext?'yes':'no'}`;
  const browserStatus=!navigator.onLine?'OFFLINE':(protocol==='content:'||protocol==='file:'?'LOCAL FILE CONTEXT':'ONLINE');
  const rows=[
    ['Browser network context',browserDetail,browserStatus,browserStatus==='ONLINE'?'good':'warn'],
    ['Multi-provider market quotes',updated+' of '+total+' validated observations; Stooq public CSV where mapped, Yahoo public chart fallback otherwise.',APP.yahooState==='ready'?'UPDATED':APP.yahooState==='partial'?'PARTIAL':APP.yahooState==='loading'?'FETCHING':'UNAVAILABLE',APP.yahooState==='ready'?'good':'warn'],
    ['Price mini-charts','Sparkline is shown only when a provider returns historical price observations. Snapshot-only rows do not get a fabricated chart.','PROVIDER HISTORY','good'],
    ['Binance WebSocket',cryptoLive?'Timestamped BTC/USDT trade stream is fresh':cryptoRest?'BTC/USDT REST observation is fresh; not a live stream':cryptoCached?'Only a previously saved BTC observation is available':APP.btcError||'BTC/USDT unavailable',cryptoLive?'LIVE STREAM':cryptoRest?'REST UPDATE':cryptoCached?'STALE CACHE':'NOT LIVE',cryptoLive?'good':'warn'],
    ['Frankfurter FX',APP.fxState==='loaded'?'Daily reference-rate response received':APP.fxState==='cached'?'Saved dated reference rate; refresh failed':APP.fxError||'Reference-rate response unavailable',APP.fxState==='loaded'?'DAILY':APP.fxState==='cached'?'STALE':'UNAVAILABLE',APP.fxState==='loaded'?'good':'warn'],
    ['U.S. Treasury yield curve',APP.tsyState==='loaded'?(APP.tsySource||'Official daily Treasury par-yield curve'):APP.tsyError||'No daily Treasury response',APP.tsyState==='loaded'?'DAILY':'UNAVAILABLE',APP.tsyState==='loaded'?'good':'warn'],
    ['Publisher news RSS',APP.newsState==='loaded'?(APP.newsItems?.length||0)+' headlines from '+(APP.newsSourcesOK||0)+' free publisher feeds':APP.newsError||'RSS unavailable',APP.newsState==='loaded'?'UPDATED':'UNAVAILABLE',APP.newsState==='loaded'?'good':'warn'],
    ['Economic calendar',APP.calendarState==='loaded'?(APP.calendarEvents?.length||0)+' releases · Forex Factory / Investing.com / XOOMAR / BI':APP.calendarError||'Calendar unavailable',APP.calendarState==='loaded'?'UPDATED':'UNAVAILABLE',APP.calendarState==='loaded'?'good':'warn'],
    ['SEC EDGAR submissions',APP.filingsState==='loaded'?'Recent public company filings loaded':APP.filingsError||'SEC filing feed not yet available',APP.filingsState==='loaded'?'UPDATED':'UNAVAILABLE',APP.filingsState==='loaded'?'good':'warn']
  ];
  const container=document.getElementById('sourceHealth');if(container)container.replaceChildren();
  rows.forEach(row=>{if(!Array.isArray(row)||row.length!==4)return;const [name,detail,status,kind]=row;const r=document.createElement('div');r.className='source-row';const l=document.createElement('div');const strong=document.createElement('strong');strong.textContent=name;const small=document.createElement('small');small.textContent=detail;l.append(strong,small);const badge=document.createElement('span');badge.className='badge '+kind;badge.textContent=status;r.append(l,badge);if(container)container.append(r)});
}