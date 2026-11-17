/* Binance public real-time BTC/USDT trade ticker. Market data only; no credentials. */
async function fetchBitcoinRest(){
 if(APP.btc&&APP.btc.transport==='WEBSOCKET'&&btcIsFresh())return;
 const endpoints=[
  {url:'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT',parse:d=>({price:Number(d.lastPrice),change:Number(d.priceChangePercent),time:Number(d.closeTime),source:'Binance public REST'})},
  {url:'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',parse:d=>({price:Number(d.lastPrice),change:Number(d.priceChangePercent),time:Number(d.closeTime),source:'Binance public REST'})},
  {url:'https://api.coinbase.com/v2/prices/BTC-USD/spot',parse:d=>({price:Number(d.data?.amount),change:null,time:Date.now(),source:'Coinbase public REST'})}
 ];
 let error='No public REST endpoint responded';
 for(const item of endpoints){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5500);try{
  const r=await fetch(item.url,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json(),x=item.parse(d);
  if(!Number.isFinite(x.price)||x.price<=0)throw new Error('Invalid BTC payload');
  if(APP.btc&&APP.btc.transport==='WEBSOCKET'&&btcIsFresh())return;
  APP.btc={price:x.price,changePct:Number.isFinite(x.change)?x.change:null,observedAt:Number.isFinite(x.time)&&x.time>0?x.time:Date.now(),receivedAt:Date.now(),source:x.source,transport:'REST'};
  saveJSON('apis_browser_btc',APP.btc);APP.btcError='';
  setText('btcPrice',fmt(x.price,2)+' USD');const ch=document.getElementById('btcChange');if(ch){ch.textContent=(Number.isFinite(x.change)?pct(x.change):'24h change unavailable')+' · snapshot';ch.className='change '+changeClass(x.change||0)}
  setText('btcAsOf',fmtTime(APP.btc.observedAt/1000));setText('btcStatus','REST SNAPSHOT · NOT LIVE');renderTape();updateFeedState();renderQuality();evaluateAlerts();return;
 }catch(e){error=String(e?.message||e).slice(0,100)}finally{clearTimeout(timer)}}
 APP.btcError='BTC REST failed: '+error;if(!btcIsFresh()){setText('btcStatus','UNAVAILABLE · '+error);updateFeedState();renderQuality()}
}
function connectBitcoinStream(){
 if(typeof WebSocket==='undefined'){APP.btcState='unavailable';setText('btcStatus','WEBSOCKET UNAVAILABLE');fetchBitcoinRest();return}
 if(APP.ws&&(APP.ws.readyState===WebSocket.OPEN||APP.ws.readyState===WebSocket.CONNECTING))return;
 const plans=[
  {name:'Binance',url:'wss://data-stream.binance.vision/ws/btcusdt@ticker',subscribe:null,parse:d=>d?.c?{price:Number(d.c),change:Number(d.P),time:Number(d.E)}:null},
  {name:'Binance alt',url:'wss://stream.binance.com:9443/ws/btcusdt@ticker',subscribe:null,parse:d=>d?.c?{price:Number(d.c),change:Number(d.P),time:Number(d.E)}:null},
  {name:'Coinbase',url:'wss://ws-feed.exchange.coinbase.com',subscribe:ws=>ws.send(JSON.stringify({type:'subscribe',product_ids:['BTC-USD'],channels:['ticker']})),parse:d=>d?.type==='ticker'&&d.product_id==='BTC-USD'?{price:Number(d.price),change:null,time:Date.parse(d.time)}:null},
  {name:'Kraken',url:'wss://ws.kraken.com/v2',subscribe:ws=>ws.send(JSON.stringify({method:'subscribe',params:{channel:'ticker',symbol:['BTC/USD']}})),parse:d=>d?.channel==='ticker'&&Array.isArray(d.data)&&d.data[0]?{price:Number(d.data[0].last),change:null,time:Date.now()}:null}
 ];
 const plan=plans[APP.wsRetry%plans.length];APP.btcState='connecting';setText('btcStatus','CONNECTING · '+plan.name);
 try{const ws=new WebSocket(plan.url);APP.ws=ws;
  ws.onopen=()=>{APP.btcState='connected';setText('btcStatus','CONNECTED · '+plan.name);if(plan.subscribe)plan.subscribe(ws);updateFeedState();renderQuality()};
  ws.onmessage=event=>{let d;try{d=JSON.parse(event.data)}catch{return}const tick=plan.parse(d);if(!tick||!Number.isFinite(tick.price)||tick.price<=0)return;
   const eventTime=Number.isFinite(tick.time)&&tick.time>0?tick.time:Date.now();
   APP.btc={price:tick.price,changePct:Number.isFinite(tick.change)?tick.change:null,observedAt:eventTime,receivedAt:Date.now(),source:plan.name+' public WebSocket',transport:'WEBSOCKET'};
   if(Date.now()-APP.btcLastSavedAt>15000){saveJSON('apis_browser_btc',APP.btc);APP.btcLastSavedAt=Date.now()}
   APP.btcError='';setText('btcPrice',fmt(tick.price,2)+' USD');const ch=document.getElementById('btcChange');if(ch){ch.textContent=(Number.isFinite(tick.change)?pct(tick.change):'Live trade tick')+' · '+plan.name;ch.className='change '+changeClass(tick.change||0)}
   setText('btcAsOf',fmtTime(eventTime/1000));setText('btcStatus','LIVE TICK · '+plan.name.toUpperCase());renderTape();updateFeedState();renderQuality();evaluateAlerts();
  };
  ws.onerror=()=>{APP.btcState='error';APP.btcError=plan.name+' websocket error';setText('btcStatus','STREAM ERROR · '+plan.name);fetchBitcoinRest()};
  ws.onclose=()=>{APP.btcState='disconnected';if(APP.ws===ws)APP.ws=null;setText('btcStatus','DISCONNECTED · '+plan.name+' · fallback');fetchBitcoinRest();if(APP.wsRetry<12){APP.wsRetry++;const delay=Math.min(30000,1500*Math.pow(1.5,APP.wsRetry));setTimeout(connectBitcoinStream,delay)}};
 }catch(e){APP.btcState='unavailable';APP.btcError=String(e?.message||e);fetchBitcoinRest();if(APP.wsRetry<12){APP.wsRetry++;setTimeout(connectBitcoinStream,4000)}}
}
/* Frankfurter reference rate — explicitly not a live quote. */
async function loadFxReference(){
 const endpoints=[
  {url:'https://api.frankfurter.dev/v2/rate/usd/idr',parse:d=>({rate:Number(d.rate),date:d.date})},
  {url:'https://api.frankfurter.app/latest?from=USD&to=IDR',parse:d=>({rate:Number(d.rates?.IDR),date:d.date})}
 ];let error='Unavailable';
 for(const endpoint of endpoints){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);try{
  const r=await fetch(endpoint.url,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json(),x=endpoint.parse(d);
  if(!Number.isFinite(x.rate)||x.rate<=0||!x.date)throw new Error('Invalid reference-rate payload');
  setText('fxValue',fmt(x.rate,2)+' IDR');setText('fxDate','Rate date '+fmtDate(x.date));setText('fxStatus','DAILY REFERENCE');
  APP.fxState='loaded';APP.fxError='';saveJSON('apis_browser_fx',{rate:x.rate,date:x.date,retrievedAt:Date.now(),source:'Frankfurter'});error='';break;
 }catch(e){error=String(e?.message||e).slice(0,90)}finally{clearTimeout(timer)}}
 if(error){APP.fxError='Frankfurter fetch failed: '+error;const cache=loadJSON('apis_browser_fx',null);
  if(cache&&Number.isFinite(Number(cache.rate))&&cache.date){setText('fxValue',fmt(Number(cache.rate),2)+' IDR');setText('fxDate','Saved reference · '+fmtDate(cache.date));setText('fxStatus','STALE REFERENCE');APP.fxState='cached'}
  else{setText('fxValue','Unavailable');setText('fxDate',error);setText('fxStatus','UNAVAILABLE');APP.fxState='unavailable'}}
 renderQuality();
}
async function loadTreasuryCurve(){
 const series={two:'DGS2',five:'DGS5',ten:'DGS10',thirty:'DGS30'};
 const target='https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS2%2CDGS5%2CDGS10%2CDGS30';
 const routes=[target,'https://corsproxy.io/?url='+encodeURIComponent(target),'https://api.allorigins.win/raw?url='+encodeURIComponent(target),'https://proxy.cors.dev/'+target];
 let observation=null,lastError='FRED H.15 CSV unavailable',source='FRED · Federal Reserve H.15';
 for(const route of routes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
  try{
   const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'text/csv,text/plain,*/*'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const csv=(await response.text()).replace(/\r/g,'').trim();
   const lines=csv.split('\n');if(lines.length<2)throw new Error('FRED CSV has no observations');
   const header=lines.shift().split(',').map(x=>x.trim().toUpperCase());
   const dateIndex=header.findIndex(x=>x==='DATE'||x==='OBSERVATION_DATE');
   const dateCol=dateIndex>=0?dateIndex:0;
   const found={};
   Object.entries(series).forEach(([key,seriesName])=>{
    const index=header.indexOf(seriesName);
    if(index<0)return;
    for(let rowIndex=lines.length-1;rowIndex>=0;rowIndex--){
     const cells=lines[rowIndex].split(',');
     const date=String(cells[dateCol]||'').trim();
     const raw=String(cells[index]||'').trim();
     if(!date||raw===''||raw==='.'||raw==='NA')continue;
     const value=Number(raw);
     if(!Number.isFinite(value)||value<=0)continue;
     const check=new Date(date+'T12:00:00Z');
     if(Number.isNaN(check.getTime()))continue;
     found[key]={value,date,dayKey:date};
     break;
    }
   });
   if(!Object.keys(found).length)throw new Error('No valid FRED tenor observation found');
   observation={values:{},dates:{},found};
   Object.keys(series).forEach(key=>{
    observation.values[key]=found[key]?.value??null;
    observation.dates[key]=found[key]?.date??null;
   });
   source='FRED · Federal Reserve H.15';lastError='';break;
  }catch(error){lastError=error?.name==='AbortError'?'FRED request timeout':String(error?.message||error).slice(0,140)}
  finally{clearTimeout(timer)}
 }
 const formatDate=date=>date?new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'2-digit',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00Z')):'—';
 const setTenor=(key,id,dateId)=>{
  const value=observation?.values?.[key],date=observation?.dates?.[key];
  setText(id,Number.isFinite(value)?value.toFixed(2)+'%':'—');
  if(dateId)setText(dateId,date?formatDate(date):'No observation');
 };
 if(observation){
  setTenor('two','tsy2','tsy2Date');setTenor('five','tsy5','tsy5Date');
  setTenor('ten','tsy10','tsy10Date');setTenor('thirty','tsy30','tsy30Date');
  const two=observation.values.two,ten=observation.values.ten;
  const spreadAvailable=Number.isFinite(two)&&Number.isFinite(ten)&&observation.dates.two===observation.dates.ten;
  setText('tsySpread',spreadAvailable?((ten-two)>0?'+':'')+(ten-two).toFixed(2)+' pp':'—');
  const dates=Object.entries(observation.dates).filter(([,date])=>date).map(([key,date])=>key.toUpperCase()+' '+formatDate(date));
  setText('tsyDate',source+' · '+dates.join(' · ')+' · daily close');
  const available=Object.values(observation.values).filter(Number.isFinite).length;
  setText('tsyStatus',available===4?'FRED · 4 TENORS':'FRED · PARTIAL');
  const errorNode=document.getElementById('tsyError');if(errorNode)errorNode.hidden=true;
  APP.tsyState=available?'loaded':'unavailable';APP.tsySource=source;APP.tsyError='';
  saveJSON('apis_browser_treasury',{values:observation.values,dates:observation.dates,retrievedAt:Date.now(),source});
 }else{
  APP.tsyError=lastError;
  const cache=loadJSON('apis_browser_treasury',null);
  if(cache?.values){
   setText('tsy2',Number.isFinite(cache.values.two)?cache.values.two.toFixed(2)+'%':'—');
   setText('tsy5',Number.isFinite(cache.values.five)?cache.values.five.toFixed(2)+'%':'—');
   setText('tsy10',Number.isFinite(cache.values.ten)?cache.values.ten.toFixed(2)+'%':'—');
   setText('tsy30',Number.isFinite(cache.values.thirty)?cache.values.thirty.toFixed(2)+'%':'—');
   setText('tsy2Date',formatDate(cache.dates?.two));setText('tsy5Date',formatDate(cache.dates?.five));
   setText('tsy10Date',formatDate(cache.dates?.ten));setText('tsy30Date',formatDate(cache.dates?.thirty));
   const spread=cache.values.ten-cache.values.two;
   setText('tsySpread',Number.isFinite(spread)&&cache.dates?.ten===cache.dates?.two?(spread>0?'+':'')+spread.toFixed(2)+' pp':'—');
   setText('tsyDate','STALE · '+(cache.source||'FRED')+' · last stored provider observations');
   setText('tsyStatus','STALE DATA');APP.tsyState='cached';APP.tsySource=cache.source||'FRED';
  }else{
   ['tsy2','tsy5','tsy10','tsy30','tsySpread'].forEach(id=>setText(id,'—'));
   ['tsy2Date','tsy5Date','tsy10Date','tsy30Date'].forEach(id=>setText(id,'No observation'));
   setText('tsyDate','No official Treasury/FRED observation was received.');setText('tsyStatus','UNAVAILABLE');APP.tsyState='unavailable';
  }
  const errorNode=document.getElementById('tsyError');if(errorNode){errorNode.hidden=false;errorNode.textContent='Connection detail: '+lastError+' · The dashboard will retry automatically.'}
 }
 renderQuality();
}

function zonedDateToUtc(year,month,day,hour,minute,timeZone){
 const values=[year,month,day,hour,minute].map(Number);
 if(values.some(value=>!Number.isInteger(value)))return null;
 const [y,m,d,hh,mm]=values;
 if(y<1970||y>2200||m<1||m>12||d<1||d>31||hh<0||hh>23||mm<0||mm>59)return null;
 const wall=new Date(Date.UTC(y,m-1,d,hh,mm,0));
 if(wall.getUTCFullYear()!==y||wall.getUTCMonth()!==m-1||wall.getUTCDate()!==d)return null;
 let zone=String(timeZone||'America/New_York').trim();
 const aliases={'Eastern Standard Time':'America/New_York','Eastern Daylight Time':'America/New_York','EST':'America/New_York','EDT':'America/New_York','Central Standard Time':'America/Chicago','CST':'America/Chicago','CDT':'America/Chicago','Pacific Standard Time':'America/Los_Angeles','PST':'America/Los_Angeles','PDT':'America/Los_Angeles'};
 zone=aliases[zone]||zone;
 const weekday=(year,month,day)=>new Date(Date.UTC(year,month-1,day)).getUTCDay();
 const nthSunday=(year,month,nth)=>{const first=weekday(year,month,1);return 1+((7-first)%7)+(nth-1)*7};
 let standardOffset=-5;
 if(zone==='UTC'||zone==='Etc/UTC'||zone==='GMT')standardOffset=0;
 else if(zone==='America/Chicago')standardOffset=-6;
 else if(zone==='America/Denver')standardOffset=-7;
 else if(zone==='America/Los_Angeles')standardOffset=-8;
 else if(zone==='America/New_York'||zone==='America/Chicago'||zone==='America/Denver'||zone==='America/Los_Angeles'){
  standardOffset=zone==='America/New_York'?-5:zone==='America/Chicago'?-6:zone==='America/Denver'?-7:-8;
 }else{
  // The public BLS/BEA/Fed calendars use US Eastern time. Unknown TZIDs are
  // deliberately treated as Eastern Standard/Daylight time rather than thrown.
  standardOffset=-5;
 }
 let offset=standardOffset;
 if(standardOffset!==0){
  const startDay=nthSunday(y,3,2),endDay=nthSunday(y,11,1);
  const localScalar=Date.UTC(y,m-1,d,hh,mm,0);
  const dstStart=Date.UTC(y,2,startDay,2,0,0);
  const dstEnd=Date.UTC(y,10,endDay,2,0,0);
  if(localScalar>=dstStart&&localScalar<dstEnd)offset=standardOffset+1;
 }
 const result=new Date(Date.UTC(y,m-1,d,hh,mm,0)-offset*3600000);
 return Number.isFinite(result.getTime())?result:null;
}
function parseIcsDate(value,timeZone){
 if(value===null||value===undefined)return null;
 value=String(value).trim();
 const match=value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/);
 if(!match)return null;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),hour=Number(match[4]||8),minute=Number(match[5]||30),second=Number(match[6]||0);
 if(![year,month,day,hour,minute,second].every(Number.isInteger)||year<1970||year>2200||month<1||month>12||day<1||day>31||hour<0||hour>23||minute<0||minute>59||second<0||second>59)return null;
 const wallDate=new Date(Date.UTC(year,month-1,day,hour,minute,second));
 if(wallDate.getUTCFullYear()!==year||wallDate.getUTCMonth()!==month-1||wallDate.getUTCDate()!==day)return null;
 if(value.endsWith('Z'))return wallDate;
 return zonedDateToUtc(year,month,day,hour,minute,timeZone||'America/New_York');
}
function macroImpact(title){
 if(/consumer price index|\bcpi\b|employment situation|nonfarm payroll|fomc|federal funds|gross domestic product.*(advance|second|third)|\bgdp\b.*(advance|second|third)|personal income and outlays/i.test(title))return 'HIGH';
 if(/producer price index|\bppi\b|job openings and labor turnover|\bjolts\b|retail sales|initial claims|trade in goods and services/i.test(title))return 'MEDIUM';
 return null;
}
function calendarWibDayKey(date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=type=>parts.find(part=>part.type===type)?.value||'';
 return get('year')+'-'+get('month')+'-'+get('day');
}
function calendarDateKeyPlus(days){
 const today=calendarWibDayKey(new Date()),parts=today.split('-').map(Number);
 return new Date(Date.UTC(parts[0],parts[1]-1,parts[2]+days)).toISOString().slice(0,10);
}
function classifyCalendarCategory(title){
 const t=String(title||'').toLowerCase();
 if(/speaks|speech|testimony|remarks|address by|press conference|president .* speak|member .* speak/.test(t))return 'Speeches';
 if(/cpi|consumer price|inflation|ppi|producer price|pce price|price index|inflation expectations/.test(t))return 'Inflation';
 if(/employment|payroll|jobless|unemployment|claimant|wage|earnings|labour market|labor market|jolts/.test(t))return 'Employment';
 if(/gdp|gross domestic|industrial production|production index|retail sales|trade balance|exports|imports|durable goods|factory orders|capacity utilization|business inventories|current account/.test(t))return 'Growth';
 if(/central bank|fomc|monetary policy|interest rate|rate decision|policy meeting|minutes|board of governor|rdg|ecb|rba|rbnz|boj|boe|snb|pboc/.test(t))return 'Central Bank';
 if(/bond|treasury|auction|yield|government debt|coupon/.test(t))return 'Bonds';
 if(/housing|home sales|house price|building permits|mortgage|property|housing starts/.test(t))return 'Housing';
 if(/consumer confidence|consumer sentiment|consumer survey|uom|gfk|expectations survey/.test(t))return 'Consumer Surveys';
 if(/business confidence|business sentiment|pmi|manufacturing index|services index|business survey|empire state|philly fed|zew|ifo|cbi/.test(t))return 'Business Surveys';
 return 'Misc';
}
const CALENDAR_COUNTRY_NAMES={AUD:'Australia',CAD:'Canada',CHF:'Switzerland',CNY:'China',EUR:'Euro Area',GBP:'United Kingdom',IDR:'Indonesia',JPY:'Japan',NZD:'New Zealand',USD:'United States'};
const CALENDAR_FLAGS={AUD:'🇦🇺',CAD:'🇨🇦',CHF:'🇨🇭',CNY:'🇨🇳',EUR:'🇪🇺',GBP:'🇬🇧',IDR:'🇮🇩',JPY:'🇯🇵',NZD:'🇳🇿',USD:'🇺🇸'};
function calendarSourceLink(source){
 const s=String(source||'').toLowerCase();
 if(s.includes('xoomar'))return 'https://xoomar.com/economic-calendar-api';
 if(s.includes('bank indonesia'))return 'https://www.bi.go.id/id/publikasi/Kalender/Default.aspx';
 return 'https://www.forexfactory.com/calendar';
}
function normalizeCalendarImpact(value){
 const text=String(value??'').toUpperCase().trim();
 if(text==='3'||/\bHIGH\b/.test(text)||text.includes('RED'))return 'HIGH';
 if(text==='2'||text==='MED'||/\bMEDIUM\b/.test(text)||/\bMODERATE\b/.test(text)||text.includes('ORANGE'))return 'MEDIUM';
 if(text==='1'||/\bLOW\b/.test(text)||text.includes('YELLOW'))return 'LOW';
 return '';
}
function normalizeCalendarCurrency(value){
 const code=String(value||'').trim().toUpperCase();
 const aliases={US:'USD',USA:'USD',UNITEDSTATES:'USD',EU:'EUR',EUROZONE:'EUR',UK:'GBP',UNITEDKINGDOM:'GBP',GB:'GBP',AU:'AUD',AUSTRALIA:'AUD',CA:'CAD',CANADA:'CAD',CH:'CHF',SWITZERLAND:'CHF',CN:'CNY',CHINA:'CNY',JP:'JPY',JAPAN:'JPY',NZ:'NZD',NEWZEALAND:'NZD',ID:'IDR',INDONESIA:'IDR'};
 return aliases[code]||code;
}
function calendarValue(value){
 if(value===null||value===undefined)return '';
 if(typeof value==='object')return String(value.value??value.formatted??value.raw??'');
 const text=String(value).replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/g,' ').trim();
 return ['--','-','N/A','null','undefined'].includes(text.toLowerCase())?'':text;
}
function normalizeFxCalendarEvent(raw){
 const date=new Date(raw.date||raw.scheduledAt||raw.scheduled_at||raw.occurrence_time||'');
 if(Number.isNaN(date.getTime()))return null;
 const country=normalizeCalendarCurrency(raw.country||raw.currency||raw.currencyCode||raw.currency_code||'USD');
 const impact=normalizeCalendarImpact(raw.impact||raw.importance||raw.impact_name||'');
 if(!impact)return null;
 const title=String(raw.title||raw.eventName||raw.event_name||raw.event_translated||raw.name||'').trim();
 if(!title)return null;
 const source=raw.sourceLabel||raw.source||'Forex Factory · public calendar';
 return {
  id:raw.id||raw.event_id+'|'+(raw.occurrence_id||date.toISOString())||country+'|'+title+'|'+date.toISOString(),
  eventId:raw.event_id||'',title,country,countryName:CALENDAR_COUNTRY_NAMES[country]||country,date,dateKey:calendarWibDayKey(date),
  impact,category:classifyCalendarCategory(title),
  previous:calendarValue(raw.previous??raw.previous_value??raw.previousValue??raw.previous_formatted??raw.previous_value_formatted),
  forecast:calendarValue(raw.forecast??raw.forecast_value??raw.forecastValue??raw.forecast_formatted??raw.forecast_value_formatted),
  actual:calendarValue(raw.actual??raw.actual_value??raw.actualValue??raw.actual_formatted??raw.actual_value_formatted),
  unit:raw.unit||'',periodLabel:raw.periodLabel||raw.period_label||'',
  timeLabel:new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(date)+' WIB',
  source,sourceLink:raw.sourceLink||raw.source_url||calendarSourceLink(source),sourceNote:raw.sourceNote||'Public schedule / consensus'
 };
}
async function fetchCalendarJSON(url,label){
 const routes=[url,'https://corsproxy.io/?url='+encodeURIComponent(url),'https://api.allorigins.win/raw?url='+encodeURIComponent(url)];
 const controllers=routes.map(()=>new AbortController()),timers=[];
 const tasks=routes.map((route,index)=>{
  const timer=setTimeout(()=>controllers[index].abort(),5000);timers.push(timer);
  return fetch(route,{cache:'no-store',credentials:'omit',signal:controllers[index].signal,headers:{Accept:'application/json,text/plain,*/*'}})
   .then(async response=>{
    if(!response.ok)throw new Error('HTTP '+response.status);
    const payload=JSON.parse(await response.text());
    if(payload===null||payload===undefined)throw new Error('Empty '+label+' payload');
    return payload;
   });
 });
 try{
  const result=await Promise.any(tasks);
  controllers.forEach(controller=>controller.abort());
  return result;
 }catch(error){
  const detail=error?.errors?.map(reason=>String(reason?.message||reason)).slice(0,3).join(' | ')||String(error?.message||error);
  throw new Error(label+': '+detail.slice(0,180));
 }finally{
  controllers.forEach(controller=>controller.abort());timers.forEach(clearTimeout);
 }
}

function investingApiDate(value){
 const p=value;
 const day=String(p.day).padStart(2,'0'),month=String(p.month).padStart(2,'0');
 return p.year+'-'+month+'-'+day;
}
function parseCalendarDateValue(value){
 if(typeof value==='number'&&Number.isFinite(value))return new Date(value<100000000000?value*1000:value);
 const text=String(value||'').trim();
 if(/^\d{10}$/.test(text))return new Date(Number(text)*1000);
 if(/^\d{13}$/.test(text))return new Date(Number(text));
 return new Date(text);
}
async function fetchInvestingCalendar(){
 const now=new Date(),wib=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=t=>wib.find(p=>p.type===t)?.value||'';
 const year=Number(get('year')),month=Number(get('month')),day=Number(get('day'));
 const start=zonedDateToUtc(year,month,day,0,0,TZ);
 const endDay=new Date(Date.UTC(year,month-1,day+7));
 const end=zonedDateToUtc(endDay.getUTCFullYear(),endDay.getUTCMonth()+1,endDay.getUTCDate(),23,59,TZ);
 const params=new URLSearchParams({
  domain_id:'1',limit:'200',start_date:start.toISOString().replace('.000Z','Z'),
  end_date:end.toISOString().replace('.000Z','Z')
 });
 const target='https://endpoints.investing.com/pd-instruments/v1/calendars/economic/events/occurrences?'+params.toString();
 const payload=await fetchCalendarJSON(target,'Investing.com calendar');
 const events=Array.isArray(payload?.events)?payload.events:[];
 const occurrences=Array.isArray(payload?.occurrences)?payload.occurrences:[];
 if(!events.length&&!occurrences.length)throw new Error('Investing.com response had no events / occurrences');
 const eventMap=new Map(events.map(event=>[String(event.event_id??event.id??''),event]));
 const output=[];
 occurrences.forEach(occ=>{
  const event=eventMap.get(String(occ.event_id??''))||{};
  const date=parseCalendarDateValue(occ.occurrence_time||occ.date||'');
  if(Number.isNaN(date.getTime()))return;
  const title=event.event_translated||event.event_name||event.name||occ.event_name||'';
  const item=normalizeFxCalendarEvent({
   event_id:event.event_id||occ.event_id,occurrence_id:occ.occurrence_id,
   eventName:title,country:event.currency||event.country||occ.currency,
   impact:event.importance||event.impact||occ.importance,
   date:date.toISOString(),previous:occ.previous??occ.previous_value??occ.previousValue??event.previous??event.previous_value??event.previousValue,
   forecast:occ.forecast??occ.forecast_value??occ.forecastValue??event.forecast??event.forecast_value??event.forecastValue,
   actual:occ.actual??occ.actual_value??occ.actualValue??event.actual??event.actual_value??event.actualValue,
   periodLabel:occ.period||occ.period_label||'',
   sourceLabel:'Investing.com · economic calendar',
   sourceLink:'https://www.investing.com/economic-calendar',
   sourceNote:'Investing.com · Previous / Forecast / Actual'
  });
  if(item)output.push(item);
 });
 if(!output.length)throw new Error('Investing.com calendar contained no usable High / Medium events');
 return output;
}
function calendarEventNameKey(title){
 return String(title||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').trim()
  .replace(/\b(index|m\/m|y\/y|q\/q|seasonally adjusted|preliminary|advance|final|flash|revised)\b/g,' ')
  .replace(/\s+/g,' ').trim();
}
function calendarEventSimilarity(a,b){
 const aa=calendarEventNameKey(a).split(' ').filter(Boolean),bb=calendarEventNameKey(b).split(' ').filter(Boolean);
 if(!aa.length||!bb.length)return 0;
 const aliases=[
  [/nonfarm payroll|non-farm payroll/,/employment situation|employment change/],
  [/initial jobless claims|unemployment claims/,/initial claims|jobless claims/],
  [/consumer price index|\bcpi\b/,/consumer price index|\bcpi\b/],
  [/producer price index|\bppi\b/,/producer price index|\bppi\b/],
  [/gross domestic product|\bgdp\b/,/gross domestic product|\bgdp\b/]
 ];
 const joinedA=aa.join(' '),joinedB=bb.join(' ');
 if(aliases.some(([left,right])=>(left.test(joinedA)&&right.test(joinedB))||(left.test(joinedB)&&right.test(joinedA))))return .92;
 const right=new Set(bb),common=aa.filter(word=>right.has(word)).length;
 return common/Math.max(aa.length,bb.length);
}
function mergeCalendarSources(primary,secondary){
 const merged=primary.map(item=>({...item}));
 secondary.forEach(candidate=>{
  const matches=merged.map((item,index)=>{
   if(item.country!==candidate.country||item.dateKey!==candidate.dateKey)return {index,score:0};
   const timeDiff=Math.abs(item.date.getTime()-candidate.date.getTime())/60000;
   if(timeDiff>180)return {index,score:0};
   return {index,score:calendarEventSimilarity(item.title,candidate.title)+(timeDiff<=15?.15:timeDiff<=60?.08:0)};
  }).sort((a,b)=>b.score-a.score);
  const hit=matches[0]&&matches[0].score>=.52?merged[matches[0].index]:null;
  if(!hit){merged.push({...candidate});return}
  const was=hit.source||'';
  if(candidate.previous!==''&&candidate.previous!==null&&candidate.previous!==undefined)hit.previous=candidate.previous;
  if(candidate.forecast!==''&&candidate.forecast!==null&&candidate.forecast!==undefined)hit.forecast=candidate.forecast;
  if(candidate.actual!==''&&candidate.actual!==null&&candidate.actual!==undefined)hit.actual=candidate.actual;
  if(candidate.periodLabel)hit.periodLabel=candidate.periodLabel;
  if(candidate.unit)hit.unit=candidate.unit;
  hit.source=was+' + '+candidate.source;
  hit.sourceLink=candidate.sourceLink||hit.sourceLink;
  hit.sourceNote='Merged schedule and values from '+hit.source;
 });
 return merged;
}
function parseInvestingCalendarHtml(markup){
 const doc=new DOMParser().parseFromString(markup,'text/html');
 const rows=[...doc.querySelectorAll('tr.js-event-item,tr[data-event-datetime]')];
 const read=cell=>cell?.textContent?.replace(/\s+/g,' ').trim()||'';
 return rows.map(row=>{
  const titleCell=row.querySelector('td.event,td[class*="event"]');
  const title=read(titleCell?.querySelector('a')||titleCell);
  const currency=read(row.querySelector('td.flagCur,td[class*="flagCur"]')).replace(/[^A-Z]/g,'').slice(0,3);
  const sentiment=row.querySelector('td.sentiment,td[class*="sentiment"]');
  const indicator=(sentiment?.getAttribute('title')||sentiment?.className||'').toLowerCase();
  const impact=indicator.includes('high')?'HIGH':indicator.includes('moderate')||indicator.includes('medium')?'MEDIUM':indicator.includes('low')?'LOW':'';
  const rawDate=row.getAttribute('data-event-datetime')||row.getAttribute('data-event-date')||'';
  const dateMatch=rawDate.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const date=dateMatch?zonedDateToUtc(+dateMatch[1],+dateMatch[2],+dateMatch[3],+dateMatch[4],+dateMatch[5],'UTC'):new Date(rawDate);
  if(!title||!impact||Number.isNaN(date.getTime()))return null;
  const val=selector=>calendarValue(read(row.querySelector(selector)));
  return normalizeFxCalendarEvent({
   title,country:currency,date:date.toISOString(),impact,
   previous:val('td.previous,td[class*="previous"]'),
   forecast:val('td.forecast,td[class*="forecast"]'),
   actual:val('td.actual,td[class*="actual"]'),
   sourceLabel:'Investing.com · economic calendar',
   sourceLink:'https://www.investing.com/economic-calendar',
   sourceNote:'Investing.com public calendar table'
  });
 }).filter(Boolean);
}
async function fetchInvestingCalendarHtml(){
 const target='https://www.investing.com/economic-calendar/';
 const routes=['https://corsproxy.io/?url='+encodeURIComponent(target),'https://api.allorigins.win/raw?url='+encodeURIComponent(target),'https://proxy.cors.dev/'+target];
 let lastError='Investing.com public HTML unavailable';
 for(const route of routes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'text/html,application/xhtml+xml'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const markup=await response.text();
   const events=parseInvestingCalendarHtml(markup);
   if(events.length)return events;
   throw new Error('No server-rendered calendar rows');
  }catch(error){lastError=error?.name==='AbortError'?'timeout':String(error?.message||error).slice(0,100)}
  finally{clearTimeout(timer)}
 }
 throw new Error(lastError);
}
function mergeUsCalendarActuals(primary,agencyEvents){
 const merged=primary.map(item=>({...item}));
 const normalizeName=name=>calendarEventNameKey(name);
 const used=new Set();
 agencyEvents.forEach(agency=>{
  if(!agency||agency.country!=='USD')return;
  const a=normalizeName(agency.title);
  const candidates=merged.map((item,index)=>{
   if(item.country!=='USD'||item.dateKey!==agency.dateKey||used.has(index))return {index,score:0};
   const delta=Math.abs(item.date.getTime()-agency.date.getTime())/60000;
   if(delta>180)return {index,score:0};
   let score=calendarEventSimilarity(item.title,agency.title);
   if(score>0)score+=delta<=15?.16:delta<=60?.08:0;
   return {index,score};
  }).sort((x,y)=>y.score-x.score);
  const best=candidates[0],match=best&&best.score>=.52?merged[best.index]:null;
  if(!match){
   merged.push({...agency});
   return;
  }
  used.add(best.index);
  if(agency.previous!==''&&agency.previous!==null&&agency.previous!==undefined)match.previous=agency.previous;
  if(agency.forecast!==''&&agency.forecast!==null&&agency.forecast!==undefined)match.forecast=agency.forecast;
  if(agency.actual!==''&&agency.actual!==null&&agency.actual!==undefined)match.actual=agency.actual;
  if(agency.periodLabel)match.periodLabel=agency.periodLabel;
  if(agency.unit)match.unit=agency.unit;
  const currentSources=String(match.source||'').split(' + ');
  if(!currentSources.includes(agency.source))match.source=currentSources.concat(agency.source).filter(Boolean).join(' + ');
  match.sourceLink=agency.sourceLink||match.sourceLink;
  match.sourceNote='Forex Factory / Investing schedule + U.S. agency previous / actual';
 });
 return merged;
}
function buildIndonesiaCalendarEvents(){
 const official='https://www.bi.go.id/id/publikasi/Kalender/Default.aspx',research='https://www.bca.co.id/-/media/Feature/Report/File/S8/Laporan-Riset-Ekonomi/2026/11/tfp-w44-2026-when-the-valve-blows-04-nov-2026.pdf';
 const rows=[
  {day:'2026-11-17',title:'Indonesia External Debt Statistics (SULNI) · September 2026',impact:'MEDIUM',category:'Growth',source:official,note:'BI calendar listing; no numeric values are published in the calendar entry'},
  {day:'2026-11-17',title:'Bank Indonesia · Board of Governors Meeting (day 1)',impact:'MEDIUM',category:'Central Bank',source:official,note:'Official schedule only; no policy decision on day 1'},
  {day:'2026-11-18',title:'Bank Indonesia · BI Rate Decision',impact:'HIGH',category:'Central Bank',previous:'5.75%',forecast:'6.00%',source:research,note:'Previous / forecast from BCA Economics research dated 4 Nov 2026; actual pending BI'},
  {day:'2026-11-18',title:'Bank Indonesia · RDG monetary policy decision (day 2)',impact:'HIGH',category:'Central Bank',source:official,note:'Official schedule; actual only after BI release'},
  {day:'2026-11-18',title:'Indonesia Loan Growth YoY',impact:'MEDIUM',category:'Growth',previous:'13.26%',source:research,note:'Previous from BCA research; consensus forecast not supplied'},
  {day:'2026-11-20',title:'Indonesia Foreign Direct Investment YoY',impact:'MEDIUM',category:'Growth',previous:'27.4%',source:research,note:'Previous from BCA research; forecast not supplied'},
  {day:'2026-11-21',title:'Indonesia Current Account · Q3 2026',impact:'HIGH',category:'Growth',previous:'-12.5',forecast:'-3.3',source:research,note:'Previous / forecast from BCA research; actual pending'},
  {day:'2026-12-15',title:'Bank Indonesia · Board of Governors Meeting (day 1)',impact:'MEDIUM',category:'Central Bank',source:official,note:'Official schedule only'},
  {day:'2026-12-16',title:'Bank Indonesia · RDG monetary policy decision (day 2)',impact:'HIGH',category:'Central Bank',source:official,note:'Official schedule only'}
 ];
 return rows.map(row=>{const date=new Date(row.day+'T00:00:00+07:00');return {id:'ID|'+row.day+'|'+row.title,title:row.title,country:'IDR',countryName:'Indonesia',date,dateKey:row.day,impact:row.impact,category:row.category||classifyCalendarCategory(row.title),previous:row.previous||'',forecast:row.forecast||'',actual:row.actual||'',unit:'',periodLabel:'',timeLabel:'Time TBA · WIB release time unconfirmed',source:'Bank Indonesia / BCA Economics research',sourceLink:row.source,sourceNote:row.note}});
}
function calendarRefreshStatus(){
 const errors=APP.calendarErrors||[];
 const status=APP.calendarSourcesOK||0;
 const checked=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
 const counts=APP.calendarSourceCounts||{};
 const detail=['FF '+(counts.forexFactory||0),'INV '+(counts.investing||0),'XOOMAR '+(counts.xoomar||0),'TE-ID '+(counts.tradingEconomicsIndonesia||0),'BI '+(counts.indonesia||0)].join(' · ');
 setText('calendarUpdatedAt',(status?status+' sources · ':'')+detail+' · Updated '+checked+' WIB');
 if(errors.length)setText('calendarCount', (APP.calendarEvents||[]).length+' releases · partial source coverage');
}
function calendarNumericValue(value){
 if(value===null||value===undefined||value==='')return null;
 const text=String(value).replace(/\s/g,'').replace(/,/g,'');
 const match=text.match(/[+-]?(?:\d+\.?\d*|\.\d+)/);
 return match?Number(match[0]):null;
}
function calendarActualTone(item){
 const actual=calendarNumericValue(item?.actual),forecast=calendarNumericValue(item?.forecast);
 if(actual===null||forecast===null||actual===forecast)return '';
 const title=String(item?.title||'').toLowerCase();
 const lowerBetter=/unemployment|jobless|claimant|initial claims|continuing claims|inflation|consumer price|producer price|cpi|ppi|price index|trade deficit|budget deficit|debt-to-gdp|default rate/.test(title);
 const higherBetter=/gdp|employment change|nonfarm payroll|payrolls|retail sales|industrial production|manufacturing production|pmi|business activity|new orders|consumer confidence|consumer sentiment|housing starts|building permits/.test(title);
 if(lowerBetter)return actual<forecast?'good':'bad';
 if(higherBetter)return actual>forecast?'good':'bad';
 return '';
}
function renderMacroCalendar(){
 const host=document.getElementById('calendarEvents');if(!host)return;
 host.replaceChildren();
 const selectedImpacts=[...document.querySelectorAll('[data-cal-impact]:checked')].map(el=>el.dataset.calImpact);
 const selectedCountries=[...document.querySelectorAll('[data-cal-country]:checked')].map(el=>el.dataset.calCountry);
 const selectedCategories=[...document.querySelectorAll('[data-cal-category]:checked')].map(el=>el.dataset.calCategory);
 const today=calendarWibDayKey(new Date()),end=calendarDateKeyPlus((APP.calendarRangeDays||3)-1);
 const events=(APP.calendarEvents||[]).filter(item=>
  item.dateKey>=today&&item.dateKey<=end&&
  selectedImpacts.includes(item.impact)&&selectedCountries.includes(item.country)&&selectedCategories.includes(item.category)
 ).sort((a,b)=>a.date-b.date);
 const rangeButtons=document.querySelectorAll('[data-cal-range]');
 rangeButtons.forEach(button=>{
  const active=Number(button.dataset.calRange)===(APP.calendarRangeDays||3);
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');
 });
 const impactCount=selectedImpacts.length,countryCount=selectedCountries.length,categoryCount=selectedCategories.length;
 setText('calendarFilterSummary',(impactCount===3?'High + Medium + Low':impactCount?selectedImpacts.join(' + '):'No impact')+' · '+(countryCount===10?'all countries':countryCount+' currencies')+' · '+(categoryCount===10?'all categories':categoryCount+' types'));
 if(!events.length){
  const empty=document.createElement('div');empty.className='empty-state';
  empty.textContent=(APP.calendarEvents||[]).length?'No releases match these filters in the selected '+(APP.calendarRangeDays||3)+'D window.':'No economic events were received from the public calendar providers.';
  host.append(empty);
 }
 const dayGroups=new Map();
 events.forEach(item=>{if(!dayGroups.has(item.dateKey))dayGroups.set(item.dateKey,[]);dayGroups.get(item.dateKey).push(item)});
 dayGroups.forEach((dayEvents,dayKey)=>{
  const group=document.createElement('section');group.className='calendar-day-group';
  const head=document.createElement('div');head.className='calendar-day-heading';
  const date=new Date(dayKey+'T12:00:00+07:00');
  const title=document.createElement('strong');title.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,weekday:'long',day:'2-digit',month:'long'}).format(date);
  const count=document.createElement('span');count.textContent=dayEvents.length+' releases';
  head.append(title,count);group.append(head);
  dayEvents.forEach(item=>{
   const card=document.createElement('article');card.className='calendar-event-card '+(item.impact==='HIGH'?'impact-high':'impact-medium');
   const top=document.createElement('div');top.className='calendar-event-top';
   const country=document.createElement('span');country.className='calendar-country';
   country.textContent=(CALENDAR_FLAGS[item.country]||'🌐')+' '+item.country+' · '+item.countryName;
   const time=document.createElement('time');time.textContent=item.timeLabel;
   const impact=document.createElement('span');impact.className='calendar-event-impact '+(item.impact==='HIGH'?'high':item.impact==='LOW'?'low':'medium');
   impact.textContent=item.impact;
   top.append(country,time,impact);
   const name=document.createElement('strong');name.className='calendar-event-name';name.textContent=item.title;
   const meta=document.createElement('div');meta.className='calendar-event-meta';
   const category=document.createElement('span');category.textContent=item.category;
   const period=document.createElement('span');period.textContent=item.periodLabel||'';
   meta.append(category);if(item.periodLabel)meta.append(period);
   const values=document.createElement('div');values.className='calendar-event-values';
   [['PREVIOUS',item.previous],['FORECAST',item.forecast],['ACTUAL',item.actual]].forEach(([label,value])=>{
    const metric=document.createElement('div');metric.className='calendar-event-metric '+label.toLowerCase()+(label==='ACTUAL'&&calendarActualTone(item)?' '+calendarActualTone(item):'');
    const small=document.createElement('small');small.textContent=label;
    const strong=document.createElement('strong');
    const showUnit=item.unit&&(label==='PREVIOUS'||label==='ACTUAL')&&!String(value??'').includes(item.unit);
    strong.textContent=value===null||value===undefined||value===''?'—':String(value)+(showUnit?' '+item.unit:'');
    metric.append(small,strong);values.append(metric);
   });
   const footer=document.createElement('div');footer.className='calendar-event-footer';
   const source=document.createElement('a');source.href=item.sourceLink||calendarSourceLink(item.source);source.target='_blank';source.rel='noopener';source.textContent=item.source||'Public calendar source';
   const note=document.createElement('span');note.textContent=item.sourceNote||'Public schedule';
   footer.append(source,note);
   card.append(top,name,meta,values,footer);group.append(card);
  });
  host.append(group);
 });
 setText('calendarCount',events.length+' economic releases · '+(APP.calendarRangeDays||3)+'D · current day retained');
}
async function loadMacroCalendar(force=false){
 if(APP.calendarLoading)return APP.calendarLoading;
 const cached=loadJSON('apis_browser_calendar_cache',null);
 const cacheTtl=5*60*1000;
 if(!force&&cached&&cached.version==='2.10.0'&&cached.savedAt&&Date.now()-cached.savedAt<cacheTtl){
  APP.calendarEvents=Array.isArray(cached.events)?cached.events.map(event=>({...event,date:new Date(event.date)})).filter(event=>!Number.isNaN(event.date.getTime())):[];
  APP.calendarState=APP.calendarEvents.length?'loaded':'unavailable';
  APP.calendarErrors=cached.errors||[];APP.calendarSourcesOK=cached.sourcesOK||0;
  APP.calendarSourceCounts=cached.counts||{};
  renderMacroCalendar();
  setText('calendarUpdatedAt','Cached '+new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(cached.savedAt))+' WIB · next source refresh ≤ 5 min');
  renderQuality();return;
 }
 APP.calendarLoading=(async()=>{
  APP.calendarState='loading';
  setText('calendarUpdatedAt','Updating Forex Factory · Investing.com · XOOMAR · Bank Indonesia…');
  const ffUrl='https://nfs.faireconomy.media/ff_calendar_thisweek.json';
  const ffNextUrl='https://nfs.faireconomy.media/ff_calendar_nextweek.json';
  const teUrl=()=>{const today=calendarWibDayKey(new Date()),end=calendarDateKeyPlus(7);return 'https://api.tradingeconomics.com/calendar/country/indonesia?c=guest:guest&d1='+today+'&d2='+end};
  const highUrl='https://xoomar.com/api/markets/calendar?importance=high';
  const mediumUrl='https://xoomar.com/api/markets/calendar?importance=med';
  const investingPromise=fetchInvestingCalendar().catch(async apiError=>{
   try{return await fetchInvestingCalendarHtml()}
   catch(htmlError){throw new Error('Investing API: '+String(apiError?.message||apiError).slice(0,75)+' · HTML: '+String(htmlError?.message||htmlError).slice(0,75))}
  });
  const results=await Promise.allSettled([
   fetchCalendarJSON(ffUrl,'Forex Factory this week'),
   fetchCalendarJSON(ffNextUrl,'Forex Factory next week'),
   investingPromise,
   fetchCalendarJSON(highUrl,'XOOMAR high-impact'),
   fetchCalendarJSON(mediumUrl,'XOOMAR medium-impact'),
   fetchCalendarJSON(teUrl(),'Trading Economics Indonesia')
  ]);
  const errors=[],factory=[],investing=[],agency=[],indonesiaTe=[];
  [0,1].forEach(index=>{
   const result=results[index],label=index===0?'this week':'next week';
   if(result.status==='fulfilled'&&Array.isArray(result.value))result.value.forEach(raw=>{const item=normalizeFxCalendarEvent(raw);if(item)factory.push(item)});
   else errors.push('Forex Factory '+label+': '+String(result.reason?.message||result.reason||'invalid weekly JSON'));
  });
  if(!factory.length)errors.push('Forex Factory: no normalizable High / Medium events');
  if(results[2].status==='fulfilled'&&Array.isArray(results[2].value))investing.push(...results[2].value);
  else errors.push('Investing.com: '+String(results[2].reason?.message||results[2].reason||'calendar source unavailable'));
  [3,4].forEach(index=>{
   const result=results[index];
   if(result.status!=='fulfilled'){errors.push('XOOMAR: '+String(result.reason?.message||result.reason));return}
   const rows=result.value?.data;
   if(!Array.isArray(rows)){errors.push('XOOMAR returned no data array');return}
   rows.forEach(raw=>{
    const date=new Date(raw.scheduledAt||raw.scheduled_at||'');if(Number.isNaN(date.getTime()))return;
    const item=normalizeFxCalendarEvent({
     title:raw.eventName||raw.event_name,country:raw.currency||'USD',date:date.toISOString(),
     impact:raw.importance||raw.impact||'',
     previous:raw.previous??'',forecast:raw.forecast??'',actual:raw.actual??'',
     unit:raw.unit||'',periodLabel:raw.periodLabel||'',
     sourceLabel:'XOOMAR · U.S. agency releases',
     sourceLink:raw.canonicalUrl||'https://xoomar.com/economic-calendar-api',
     sourceNote:'U.S. agency previous / actual · forecast supplied separately by calendar source'
    });
    if(item)agency.push(item);
   });
  });
  if(results[5].status==='fulfilled'&&Array.isArray(results[5].value))results[5].value.forEach(raw=>{const item=normalizeFxCalendarEvent({title:raw.Event||raw.event||raw.Category,country:'IDR',date:raw.Date||raw.date,impact:raw.Importance||raw.importance,previous:raw.Previous??raw.previous,forecast:raw.Forecast??raw.forecast,actual:raw.Actual??raw.actual,unit:raw.Unit||raw.unit,periodLabel:raw.Reference||raw.reference,sourceLabel:'Trading Economics · Indonesia calendar',sourceLink:'https://tradingeconomics.com/indonesia/calendar',sourceNote:'Indonesia calendar · consensus / official-source actuals'});if(item)indonesiaTe.push(item)});
  else errors.push('Trading Economics Indonesia: '+String(results[5].reason?.message||results[5].reason||'calendar unavailable'));
  let merged=mergeCalendarSources(factory,investing);merged=mergeUsCalendarActuals(merged,agency);merged=mergeCalendarSources(merged,indonesiaTe);
  const bi=buildIndonesiaCalendarEvents();
  const unique=new Map();
  [...merged,...bi].forEach(item=>{
   const key=[item.country,item.dateKey,calendarEventNameKey(item.title)].join('|');
   if(!unique.has(key)){unique.set(key,item);return}
   const previous=unique.get(key);
   if((previous.actual===''||previous.actual===null||previous.actual===undefined)&&item.actual!==''&&item.actual!==null&&item.actual!==undefined)previous.actual=item.actual;
   if((previous.previous===''||previous.previous===null||previous.previous===undefined)&&item.previous!==''&&item.previous!==null&&item.previous!==undefined)previous.previous=item.previous;
   if((previous.forecast===''||previous.forecast===null||previous.forecast===undefined)&&item.forecast!==''&&item.forecast!==null&&item.forecast!==undefined)previous.forecast=item.forecast;
   if(item.source&&!previous.source.includes(item.source))previous.source+=' + '+item.source;
  });
  APP.calendarEvents=[...unique.values()].sort((a,b)=>a.date-b.date);
  APP.calendarErrors=errors;
  APP.calendarSourcesOK=results.filter(result=>result.status==='fulfilled').length+1;
  APP.calendarState=APP.calendarEvents.length?'loaded':'unavailable';
  APP.calendarError=errors.join(' · ');
  APP.calendarSourceCounts={forexFactory:factory.length,investing:investing.length,xoomar:agency.length,tradingEconomicsIndonesia:indonesiaTe.length,indonesia:bi.length};
  const serializable=APP.calendarEvents.map(item=>({...item,date:item.date.toISOString()}));
  saveJSON('apis_browser_calendar_cache',{version:'2.10.0',events:serializable,savedAt:Date.now(),errors,sourcesOK:APP.calendarSourcesOK,counts:APP.calendarSourceCounts});
  saveJSON('apis_calendar_last_success',Date.now());
  renderMacroCalendar();calendarRefreshStatus();renderQuality();
 })();
 try{return await APP.calendarLoading}
 finally{APP.calendarLoading=null}
}

function classifyNews(title,source){
 const t=(title+' '+source).toLowerCase();
 if(/federal reserve|fomc|ecb|european central bank|bank of japan|boj|bank of england|bank indonesia|pboc|central bank|monetary policy|interest rate decision/.test(t))return 'Central Banks';
 if(/forex|currency|exchange rate|dollar|yen|euro|rupiah|sterling|usd\/|fx market/.test(t))return 'Forex';
 if(/oil|crude|brent|wti|gold|silver|copper|commodity|commodities|opec|natural gas/.test(t))return 'Commodities';
 if(/war |war:|sanction|tariff|geopolit|attack|ceasefire|conflict|iran|ukraine|middle east|trade tension/.test(t))return 'Geopolitical';
 if(/cpi|inflation|gdp|pce|employment|jobs report|unemployment|payroll|pmi|retail sales|recession|economic growth|producer price|consumer price|trade deficit/.test(t))return 'Economy';
 return 'Markets';
}
function renderNewsFeed(){
 const host=document.getElementById('newsFeedList');if(!host)return;
 const filter=APP.newsFilter||'All',query=(document.getElementById('newsSearch')?.value||'').trim().toLowerCase();
 const items=(APP.newsItems||[]).filter(item=>{
  const recent=item.publishedAt&&Date.now()-item.publishedAt<=3*60*60*1000&&Date.now()>=item.publishedAt-5*60*1000;
  const matches=filter==='All'||(filter==='Breaking'?recent:item.category===filter);
  return matches&&(!query||(item.title+' '+item.source).toLowerCase().includes(query));
 });
 host.replaceChildren();
 if(!items.length){
  const empty=document.createElement('div');empty.className='empty-state';
  empty.textContent=(APP.newsItems||[]).length?'No headlines match this filter or search.':'No publisher headlines were received. Check source status and retry.';
  host.append(empty);
 }
 items.slice(0,35).forEach(item=>{
  const row=document.createElement('article');row.className='news-item';
  const time=document.createElement('div');time.className='news-time';
  time.textContent=item.publishedAt?new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(new Date(item.publishedAt))+' WIB':'Time unavailable';
  const main=document.createElement('div');main.className='news-item-main';
  const link=document.createElement('a');link.href=item.link;link.target='_blank';link.rel='noopener';link.textContent=item.title;
  const meta=document.createElement('div');meta.className='news-meta';
  const source=document.createElement('span');source.textContent=item.source;
  const tag=document.createElement('span');tag.className='news-tag';tag.textContent=item.category;
  meta.append(source,tag);main.append(link,meta);row.append(time,main);host.append(row);
 });
 setText('newsResultsCount',items.length+' headlines');
}
async function loadPublicNews(){
 const host=document.getElementById('newsFeedList');if(!host)return;
 const feeds=[
  {source:'CNBC Markets',url:'https://www.cnbc.com/id/100003114/device/rss/rss.html',direct:true},
  {source:'BBC Business',url:'https://feeds.bbci.co.uk/news/business/rss.xml'},
  {source:'The Guardian Business',url:'https://www.theguardian.com/business/rss'},
  {source:'Reuters Markets · Google News RSS',url:'https://news.google.com/rss/search?q=site%3Areuters.com%2Fmarkets&hl=en-US&gl=US&ceid=US:en'},
  {source:'Bloomberg Markets · Google News RSS',url:'https://news.google.com/rss/search?q=site%3Abloomberg.com%2Fnews%2Farticles%2Fmarket&hl=en-US&gl=US&ceid=US:en'},
  {source:'Investing.com · Google News RSS',url:'https://news.google.com/rss/search?q=site%3Ainvesting.com%2Fnews%2Fstock-market-news&hl=en-US&gl=US&ceid=US:en'},
  {source:'Federal Reserve',url:'https://www.federalreserve.gov/feeds/press_monetary.xml'},
  {source:'BIS',url:'https://www.bis.org/rss/press.xml'}
 ];
 const readFeed=async feed=>{
  const routes=feed.direct?[feed.url,'https://proxy.cors.dev/'+feed.url]:['https://proxy.cors.dev/'+feed.url,'https://corsproxy.io/?url='+encodeURIComponent(feed.url),'https://api.allorigins.win/raw?url='+encodeURIComponent(feed.url)];
  let error='unavailable';
  for(const route of routes){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9500);
   try{
    const response=await fetch(route,{cache:'no-store',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const text=await response.text(),doc=new DOMParser().parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('Feed XML parse error');
    const nodes=[...doc.querySelectorAll('item, entry')];if(!nodes.length)throw new Error('No RSS entries');
    const readChild=(node,names)=>{for(const child of [...node.children])if(names.includes(child.localName.toLowerCase()))return child.textContent?.trim()||'';return ''};
    return nodes.slice(0,20).map(node=>{
     const title=readChild(node,['title'])||'Untitled';
     const linkNode=[...node.children].find(child=>child.localName.toLowerCase()==='link');
     const link=(linkNode?.getAttribute('href')||linkNode?.textContent||'').trim();
     const pub=readChild(node,['pubdate','published','updated','date']),parsed=pub?Date.parse(pub):NaN;
     return {title,link,source:feed.source,publishedAt:Number.isFinite(parsed)?parsed:null,category:classifyNews(title,feed.source)};
    }).filter(item=>item.title&&item.link);
   }catch(e){error=e?.name==='AbortError'?'timeout':String(e?.message||e).slice(0,70)}
   finally{clearTimeout(timer)}
  }
  return {error,source:feed.source};
 };
 const results=await Promise.allSettled(feeds.map(readFeed));let items=[],failures=[];
 results.forEach((result,i)=>{
  if(result.status==='fulfilled'&&Array.isArray(result.value))items.push(...result.value);
  else if(result.status==='fulfilled'&&result.value?.error)failures.push(feeds[i].source+': '+result.value.error);
  else failures.push(feeds[i].source+': '+(result.reason?.message||'failed'));
 });
 const seen=new Set();
 items=items.filter(item=>{const key=(item.link||item.title).toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>(b.publishedAt||0)-(a.publishedAt||0));
 APP.newsItems=items;APP.newsState=items.length?'loaded':'unavailable';APP.newsError=failures.join(' · ');APP.newsSourcesOK=feeds.length-failures.length;
 renderNewsFeed();
 setText('newsFeedStatus',items.length?items.length+' headlines · '+APP.newsSourcesOK+'/'+feeds.length+' sources':'NEWS FEED UNAVAILABLE');
 setText('newsUpdatedAt',items.length?'Updated '+new Date().toLocaleTimeString('en-GB',{timeZone:TZ})+' WIB':failures.slice(0,2).join(' · ')||'No publisher response');
 if(items.length&&APP.newsAlertsOn&&'Notification'in window&&Notification.permission==='granted'){
  const fresh=items.filter(item=>item.publishedAt&&Date.now()-item.publishedAt<8*60*1000&&!APP.newsNotified.has(item.link));
  fresh.slice(0,2).forEach(item=>{new Notification('APIS · '+item.source,{body:item.title});APP.newsNotified.add(item.link)});
 }
 renderQuality();
}
function initHomeControls(){
 const toggle=document.getElementById('homeSearchToggle'),wrap=document.getElementById('homeSearchWrap'),input=document.getElementById('homeSearch'),clear=document.getElementById('homeSearchClear');
 if(!toggle||!wrap||!input)return;
 const setOpen=open=>{
  toggle.setAttribute('aria-expanded',open?'true':'false');
  wrap.classList.toggle('is-open',open);wrap.setAttribute('aria-hidden',open?'false':'true');
  if(open)requestAnimationFrame(()=>input.focus());
  else{input.value='';renderHomeStocks()}
 };
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
 input.addEventListener('input',renderHomeStocks);
 if(clear)clear.addEventListener('click',()=>{input.value='';renderHomeStocks();input.focus()});
 const refresh=document.getElementById('refreshHomeBtn');if(refresh)refresh.addEventListener('click',fetchQuoteBatch);
}
function initMarketControls(){
 const filters=document.getElementById('marketFilters');if(!filters)return;
 filters.addEventListener('click',event=>{
  const button=event.target.closest('[data-market-filter]');if(!button)return;
  const next=button.dataset.marketFilter;if(APP.marketFilter===next)return;
  APP.marketFilter=next;
  renderMarketOverview();
 });
}
function initNewsControls(){
 APP.newsFilter='All';APP.newsNotified=APP.newsNotified||new Set();
 const filters=document.getElementById('newsFilters');
 if(filters)filters.addEventListener('click',event=>{
  const button=event.target.closest('[data-news-filter]');if(!button)return;
  APP.newsFilter=button.dataset.newsFilter;
  filters.querySelectorAll('[data-news-filter]').forEach(node=>node.classList.toggle('active',node===button));
  renderNewsFeed();
 });
 const search=document.getElementById('newsSearch');if(search)search.addEventListener('input',renderNewsFeed);
try{ const refresh=document.getElementById('refreshNewsBtn');if(refresh)refresh.onclick=loadPublicNews;}catch(bindingError){console.error('[APIS event binding]',bindingError);if(window.__APIS_REPORT_ERROR__)window.__APIS_REPORT_ERROR__('Event binding',bindingError.message||bindingError);}
 const toggle=document.getElementById('newsAlertsToggle');
 if(toggle)toggle.addEventListener('change',async()=>{
  if(!toggle.checked){APP.newsAlertsOn=false;saveJSON('apis_browser_news_alerts',false);return}
  if(!('Notification'in window)){toggle.checked=false;toast('Notifications are not supported in this browser.');return}
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  APP.newsAlertsOn=permission==='granted';toggle.checked=APP.newsAlertsOn;saveJSON('apis_browser_news_alerts',APP.newsAlertsOn);
  if(!APP.newsAlertsOn)toast('Notification permission was not granted.');
 });
 APP.newsAlertsOn=loadJSON('apis_browser_news_alerts',false);if(toggle)toggle.checked=!!APP.newsAlertsOn;
}
async function loadEdgarFilings(){
 const host=document.getElementById('filingsFeedList');if(!host)return;
 const companies=[
  {ticker:'AAPL',name:'Apple',cik:'0000320193'},
  {ticker:'MSFT',name:'Microsoft',cik:'0000789019'},
  {ticker:'NVDA',name:'NVIDIA',cik:'0001045810'}
 ];
 const all=[];let errors=[];
 for(const company of companies){
  const target='https://data.sec.gov/submissions/CIK'+company.cik+'.json';
  const routes=['https://proxy.cors.dev/'+target,'https://corsproxy.io/?url='+encodeURIComponent(target)];
  let found=false;
  for(const url of routes){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);try{
   const r=await fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const data=await r.json(),recent=data.filings?.recent;if(!recent)throw new Error('Recent filing array missing');
   const count=Math.min(recent.form?.length||0,100);
   for(let i=0;i<count;i++){
    const form=recent.form?.[i],date=recent.filingDate?.[i],accession=recent.accessionNumber?.[i],doc=recent.primaryDocument?.[i],desc=recent.primaryDocDescription?.[i];
    if(!form||!date||!accession||!doc)continue;
    if(!['10-K','10-Q','8-K','20-F','6-K','SC 13D','SC 13G','4'].includes(form))continue;
    const accessionPath=accession.replaceAll('-','');
    all.push({ticker:company.ticker,name:company.name,form,date,description:desc||'',url:`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${accessionPath}/${doc}`});
    if(all.filter(x=>x.ticker===company.ticker).length>=4)break;
   }
   found=true;break;
  }catch(e){errors.push(company.ticker+': '+String(e?.message||e).slice(0,70))}finally{clearTimeout(timer)}}
  if(!found)errors.push(company.ticker+': unavailable');
 }
 all.sort((a,b)=>b.date.localeCompare(a.date));host.replaceChildren();
 if(!all.length){const e=document.createElement('div');e.className='empty-state';e.textContent='SEC EDGAR feed unavailable through free public access on this network. Use the official company search links below; no sample filings are shown.';host.append(e);APP.filingsState='unavailable';APP.filingsError=errors.join(' · ')}
 else{
  all.slice(0,10).forEach(f=>{const row=document.createElement('div');row.className='filing-row';
   const main=document.createElement('div');const a=document.createElement('a');a.href=f.url;a.target='_blank';a.rel='noopener';a.textContent=f.ticker+' · '+f.form+' · '+f.name;
   const small=document.createElement('small');small.textContent=f.date+(f.description?' · '+f.description:'');main.append(a,small);
   const badge=document.createElement('span');badge.className='badge';badge.textContent=f.form;row.append(main,badge);host.append(row)});
  APP.filingsState='loaded';APP.filingsError=errors.join(' · ');
 }
 renderQuality();
}