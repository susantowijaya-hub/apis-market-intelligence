/* Navigation, clock and bootstrap. */
function tickClock(){setText('clock',new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())+' WIB');const hint=document.getElementById('autoRefreshLabel');if(hint){const left=APP.nextRefreshAt?Math.max(0,Math.ceil((APP.nextRefreshAt-Date.now())/1000)):60;hint.textContent=document.hidden?'AUTO · PAUSED':('AUTO · '+left+'s')}}
function initPageRouter(){
 const pageMap={home:'overview',markets:'markets',news:'research',macro:'macroView',movers:'moversView',filings:'filingsView',tools:'workbench',research:'sources'};
 const pageLinks=[...document.querySelectorAll('[data-page]')];
 function showPage(key){
  const target=pageMap[key]||'overview';
  document.querySelectorAll('.page-view').forEach(node=>node.classList.toggle('active',node.id===target));
  pageLinks.forEach(node=>node.classList.toggle('active',node.dataset.page===key));
  document.querySelectorAll('.nav-more').forEach(node=>node.open=false);
  history.replaceState(null,'','#'+target);
  try{window.scrollTo(0,0)}catch(ignore){window.scrollTo(0,0)}
  if(key==='markets')renderMarketOverview();
  if(key==='home')renderHomeStocks();
  if(key==='macro'){
   if(APP.tsyState!=='loaded')loadTreasuryCurve();
   if(APP.calendarState!=='loaded')loadMacroCalendar();
  }
  if(key==='news'&&!APP.newsItems?.length)loadPublicNews();
  if(key==='movers')renderMovers();
  if(key==='filings'&&!APP.filingsState)loadEdgarFilings();
  return target;
 }
 pageLinks.forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  showPage(link.dataset.page);
 }));
 document.querySelectorAll('[data-tool-anchor]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  const target=document.getElementById(link.dataset.toolAnchor);
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 window.addEventListener('hashchange',()=>{
  const entry=Object.entries(pageMap).find(([,id])=>id===location.hash.slice(1));
  if(entry)showPage(entry[0]);
 });
 const initial=Object.entries(pageMap).find(([,id])=>id===location.hash.slice(1));
 showPage(initial?initial[0]:'home');
}
function applyTheme(mode){
 const actual=mode==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
 document.documentElement.dataset.theme=actual;
 APP.themeMode=mode;
 saveJSON('apis_theme_mode',mode);
 document.querySelectorAll('[data-theme-choice]').forEach(button=>button.classList.toggle('selected',button.dataset.themeChoice===mode));
}
function initThemeControls(){
 const menu=document.querySelector('.theme-menu');
 if(!menu)return;
 applyTheme(loadJSON('apis_theme_mode','dark'));
 menu.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
  applyTheme(button.dataset.themeChoice);
  menu.open=false;
 }));
 if(window.matchMedia){
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener?.('change',()=>{if(APP.themeMode==='system')applyTheme('system')});
 }
}
function initNewsControls(){
 APP.newsFilter='All';
 APP.newsNotified=APP.newsNotified||new Set();
 const filters=document.getElementById('newsFilters');
 if(filters)filters.addEventListener('click',event=>{
  const button=event.target.closest('[data-news-filter]');
  if(!button)return;
  APP.newsFilter=button.dataset.newsFilter;
  filters.querySelectorAll('[data-news-filter]').forEach(node=>node.classList.toggle('active',node===button));
  renderNewsFeed();
 });
 const search=document.getElementById('newsSearch');
 if(search)search.addEventListener('input',renderNewsFeed);
 const refresh=document.getElementById('refreshNewsBtn');
 if(refresh)refresh.onclick=loadPublicNews;
 const toggle=document.getElementById('newsAlertsToggle');
 if(toggle)toggle.addEventListener('change',async()=>{
  if(!toggle.checked){APP.newsAlertsOn=false;saveJSON('apis_browser_news_alerts',false);return}
  if(!('Notification'in window)){toggle.checked=false;toast('Notifications are not supported in this browser.');return}
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  APP.newsAlertsOn=permission==='granted';
  toggle.checked=APP.newsAlertsOn;
  saveJSON('apis_browser_news_alerts',APP.newsAlertsOn);
  if(!APP.newsAlertsOn)toast('Notification permission was not granted.');
 });
 APP.newsAlertsOn=loadJSON('apis_browser_news_alerts',false);
 if(toggle)toggle.checked=!!APP.newsAlertsOn;
}
function initCalendarControls(){
 const filterRoot=document.getElementById('calendarFilterDrawer');
 const eventRoot=document.querySelector('.calendar-terminal');
 APP.calendarRangeDays=APP.calendarRangeDays||3;
 if(filterRoot){
  filterRoot.addEventListener('change',event=>{
   if(event.target.matches('[data-cal-impact],[data-cal-country],[data-cal-category]'))renderMacroCalendar();
  });
  filterRoot.addEventListener('click',event=>{
   const all=event.target.closest('[data-cal-all]'),none=event.target.closest('[data-cal-none]');
   const control=all||none;if(!control)return;
   const kind=control.dataset.calAll||control.dataset.calNone;
   const selector=kind==='impact'?'[data-cal-impact]':kind==='country'?'[data-cal-country]':'[data-cal-category]';
   filterRoot.querySelectorAll(selector).forEach(input=>{input.checked=!!all});
   renderMacroCalendar();
  });
 }
 if(eventRoot)eventRoot.addEventListener('click',event=>{
  const range=event.target.closest('[data-cal-range]');if(range){APP.calendarRangeDays=Number(range.dataset.calRange)||3;renderMacroCalendar();return}
  const refresh=event.target.closest('#refreshCalendarBtn');if(refresh)loadMacroCalendar(true);
 });
}

['refreshBtn','refreshTop','refreshHomeBtn'].forEach(id=>{const e=document.getElementById(id);if(e)e.onclick=()=>fetchQuoteBatch()});
function safeInit(label,fn){
 try{
  const result=fn();
  if(result&&typeof result.catch==='function')result.catch(error=>{
   const message=label+': '+String(error?.message||error).slice(0,160);
   console.error('[APIS async]',message);
   if(label==='Major economic releases'){APP.calendarState='error';APP.calendarError=message;setText('calendarUpdatedAt','Calendar feed error · retry scheduled');renderQuality();}
   else if(window.__APIS_REPORT_ERROR__)window.__APIS_REPORT_ERROR__('Async '+label,message);
  });
  return true;
 }catch(error){
  const message=label+': '+String(error?.message||error).slice(0,160);
  console.error('[APIS]',message);setText('feedState','ERROR · '+message);
  if(window.__APIS_REPORT_ERROR__)window.__APIS_REPORT_ERROR__('Startup '+label,message);
  return false;
 }
}
function setMarketSession(){
 const el=document.getElementById('marketSession');if(!el)return;
 const stampEl=document.getElementById('marketSessionStamp');
 const now=new Date(),idx=exchangeSession({symbol:'^JKSE',group:'Index'},now),us=exchangeSession({symbol:'^GSPC',group:'Index'},now);
 const fmt=session=>session?session.label:'MARKET STATUS';
 el.textContent='IDX '+fmt(idx)+' · US '+fmt(us);
 const quote=QUOTES.get('^JKSE');
 const checked=quote?.retrievedAt?new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(quote.retrievedAt))+' WIB':'Feed check pending';
 let close='';
 if(idx&&idx.state==='CLOSED'){
  const dateKey=quote?.observationDate||[idx.tradeDate.year,String(idx.tradeDate.month).padStart(2,'0'),String(idx.tradeDate.day).padStart(2,'0')].join('-');
  const date=new Date(dateKey+'T12:00:00+07:00');
  close=' · Close '+idx.closeTime+' '+idx.closeZone+' · '+new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'2-digit',month:'short',year:'numeric'}).format(date);
 }
 if(stampEl)stampEl.textContent=checked+close;
}
function bootstrap(){
 window.__APIS_BOOTED__=true;
 setText('feedState','APIS READY · initializing data providers');
 /* Independent services: one failed embed or module must not block the others. */
 safeInit('Quote cache',restoreQuoteCache);
 safeInit('Auxiliary cache',restoreAuxCache);
 safeInit('Page navigation',initPageRouter);
 safeInit('Theme controls',initThemeControls);
 safeInit('Home search',initHomeControls);
 safeInit('Market segments',initMarketControls);
 safeInit('News controls',initNewsControls);
 safeInit('Calendar controls',initCalendarControls);
 try{localStorage.removeItem('apis_market_provider_keys')}catch(_){}
 safeInit('Clock',()=>{tickClock();setInterval(tickClock,1000);setMarketSession();setInterval(setMarketSession,4000)});
 safeInit('Quote view',renderQuoteViews);
 safeInit('Source health',renderQuality);
 safeInit('BTC WebSocket',connectBitcoinStream);
 safeInit('BTC REST',fetchBitcoinRest);
 safeInit('USD/IDR',loadFxReference);
 safeInit('Treasury yield',loadTreasuryCurve);
 safeInit('Major economic releases',loadMacroCalendar);
 safeInit('Market quotes',fetchQuoteBatch);
 safeInit('Publisher news',loadPublicNews);
 safeInit('SEC EDGAR filings',loadEdgarFilings);
 APP.sliceCursor=0;APP.sliceBusy=false;APP.sliceUpdated=0;APP.sliceFailed=0;APP.lastCacheSavedAt=Date.now();
 APP.nextRefreshAt=Date.now()+5000;
 APP.timer=setInterval(()=>{if(!document.hidden&&navigator.onLine)fetchQuoteSlice()},5000);
 APP.displayTimer=setInterval(()=>{
  if(document.hidden)return;
  tickClock();updateLiveRowLabels();setMarketSession();
 },4000);
 APP.fxTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)loadFxReference()},60*60*1000);
 APP.tsyTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)loadTreasuryCurve()},6*60*60*1000);
 APP.calendarTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)loadMacroCalendar()},5*60*1000);
 APP.newsTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)loadPublicNews()},5*60*1000);
 APP.filingsTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)loadEdgarFilings()},30*60*1000);
 APP.btcRestTimer=setInterval(()=>{if(!btcIsFresh()||APP.btc?.transport!=='WEBSOCKET')fetchBitcoinRest()},30000);
 APP.staleTimer=setInterval(()=>{if(APP.btc&&!btcIsFresh()){setText('btcStatus','STALE · last observation retained');updateFeedState();renderQuality()}},3000);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  if(!btcIsFresh())connectBitcoinStream();
  if(navigator.onLine&&(!APP.lastSliceRefreshAt||Date.now()-APP.lastSliceRefreshAt>5000))fetchQuoteSlice();
  if(APP.fxState==='unavailable'||APP.fxState==='cached')loadFxReference();
  if(APP.tsyState!=='loaded')loadTreasuryCurve();
  if(APP.calendarState!=='loaded')loadMacroCalendar();
  if(APP.newsState!=='loaded')loadPublicNews();
  if(APP.filingsState!=='loaded')loadEdgarFilings();
 });
 window.addEventListener('online',()=>{
  fetchQuoteSlice();loadFxReference();loadTreasuryCurve();loadMacroCalendar();loadPublicNews();loadEdgarFilings();
  if(!btcIsFresh())connectBitcoinStream();
 });
 window.addEventListener('focus',()=>{
  if(navigator.onLine&&!document.hidden&&(!APP.lastRefresh||Date.now()-APP.lastRefresh>45000))fetchQuoteBatch();
 });
 safeInit('Alert options',addAlertOptions);
 safeInit('Evidence ledger',renderLedger);
 safeInit('Alert rules',renderAlerts);
 if(QUOTES.size)setText('lastRefresh','Restored '+QUOTES.size+' saved observations · refresh pending');
}
bootstrap();