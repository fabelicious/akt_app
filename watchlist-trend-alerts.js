(function(){'use strict';
if(window.__AKT_WATCHLIST_TREND_ALERTS__)return;window.__AKT_WATCHLIST_TREND_ALERTS__=1;
const WL_KEY='aktpro_watchlist_v5',STATE_KEY='aktpro_trend_alert_state_v2',ENABLED_KEY='aktpro_trend_alert_enabled_v1';
const norm=v=>String(v??'').trim().replace(/^WKN\s*[:#-]?\s*/i,'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
const TOPIC_PREFIX='aktpro-trend-';
const known={
 '854075':'BRK-A','A0YJQ2':'BRK-B','918422':'NVDA','870747':'MSFT','865985':'AAPL','906866':'AMZN','716460':'SAP','723610':'SIE.DE','840400':'ALV.DE','A11099':'ANET','A1CX3T':'TSLA','A2JG9Z':'AVGO','850628':'JPM','858560':'LLY','938914':'AIR.PA','909800':'TSM','A1J4U4':'ASML','A3CSML':'GE','A0B87V':'CRM','871460':'ORCL','552484':'NFLX','A14Y6F':'GOOGL','A1JWVX':'META','863186':'AMD','A2J7M9':'V','A0F602':'MA','871981':'ADBE','878841':'CSCO','883121':'QCOM','852654':'TXN','888351':'COST','856958':'MCD','850663':'KO','852062':'PG','860853':'WMT','853260':'JNJ','A2QA4J':'PLTR','A2PHHG':'UBER','A2JEXP':'BKNG','850598':'CAT','870153':'HON','894648':'LMT','A2DSYC':'LIN','857209':'TMO','888024':'ISRG','851995':'PEP','851399':'IBM','868440':'T','868402':'VZ','852549':'XOM','852552':'CVX','853292':'MC.PA','860180':'SU.PA','886670':'RMS.PA','850727':'TTE.PA','920657':'SAN.PA','863195':'EL.PA','850133':'AI.PA','887771':'BNP.PA','855705':'CS.PA','867475':'DG.PA','555750':'DTE.DE','843002':'MUV2.DE','623100':'IFX.DE','710000':'MBG.DE','519000':'BMW.DE','766403':'VOW3.DE','515100':'BAS.DE','555200':'DHL.DE','703000':'RHM.DE','514000':'DBK.DE','CBK100':'CBK.DE','A2JNF4':'ADYEN.AS','A2PRDK':'PRX.AS','A3EU6F':'NOVO-B.CO','A1C0ZC':'DSV.CO','855167':'ROG.SW','904278':'NOVN.SW','A12DFH':'UBSG.SW','579919':'ZURN.SW','919730':'ABBN.SW','852147':'RIO.L','886455':'AZN.L','A3C99G':'SHEL.L','A0JNE2':'ULVR.L','923893':'HSBA.L','850517':'BP.L','A3EQR4':'REL.L','A0JEJF':'LSEG.L','A2ACKK':'RACE.MI','A117ME':'BABA','A1138D':'0700.HK','853510':'7203.T','853687':'6758.T','878610':'6861.T','865510':'8035.T','657892':'8306.T','853219':'6501.T','A12B2R':'6098.T','864009':'7974.T','891624':'9984.T','859579':'4063.T','888322':'005930.KS','A0MZ1Y':'000660.KS','885166':'005380.KS','A2JR2L':'PDD','A112ST':'JD','A0F5DE':'BIDU','A2N5NR':'3690.HK','A0MN2Z':'IBN','A0X9JL':'HDB','946271':'RELIANCE.NS','850524':'BHP.AX','882695':'CBA.AX','890068':'CSL.AX','A0F5K1':'MQG.AX','A3C6AE':'WDS.AX','A14TJP':'SHOP','852173':'RY','A42D4F':'SPCX','852684':'TD.TO','865114':'CNQ','885427':'ENB','A0MYNP':'MELI','897998':'VALE','899026':'PBR','886561':'ATCO-A.ST','855689':'VOLV-B.ST','865956':'SAND.ST','A2P4AH':'EQT.ST','881050':'KNEBV.HE','870737':'NOKIA.HE','881360':'WRT1V.HE'
};
function watchlist(){try{const x=JSON.parse(localStorage.getItem(WL_KEY)||'[]');return Array.isArray(x)?x.map(v=>({key:norm(v?.key||v?.wkn||v),title:String(v?.title||v?.name||'').trim()})).filter(v=>v.key):[]}catch(_){return[]}}
function states(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch(_){return{}}}
function saveStates(x){try{localStorage.setItem(STATE_KEY,JSON.stringify(x))}catch(_) {}}
function enabled(){return localStorage.getItem(ENABLED_KEY)==='1'}
function setEnabled(v){try{localStorage.setItem(ENABLED_KEY,v?'1':'0')}catch(_){}updateButton()}
function status(z){if(z.score>=72)return'BESTÄTIGTER KAUF';if(z.score>=58)return'FRÜHES KAUFSIGNAL';if(z.score>=42)return'BODENBILDUNG / ABWARTEN';return'ABWÄRTSTREND / KEIN KAUF'}
function topicFor(k){return TOPIC_PREFIX+norm(k).toLowerCase().replace(/[^a-z0-9_-]/g,'-')}
async function ntfy(title,body,key){if(!enabled())return;try{const r=await fetch('https://ntfy.sh/'+encodeURIComponent(topicFor(key)),{method:'POST',headers:{'Title':title,'Priority':'high','Tags':'chart_with_upwards_trend'},body});if(!r.ok)throw Error('ntfy HTTP '+r.status)}catch(e){console.warn('Trendwende-ntfy fehlgeschlagen:',e)}}
async function browserNotify(title,body){if(!('Notification'in window)||Notification.permission!=='granted')return;try{new Notification(title,{body,tag:'aktpro-trend-'+title})}catch(_) {}}
async function rowsForSymbol(symbol){const end=Math.floor(Date.now()/1000),start=end-60*60*24*1900,url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?period1='+start+'&period2='+end+'&interval=1d&events=history&includeAdjustedClose=true';for(const p of ['https://corsproxy.io/?url=','https://api.allorigins.win/raw?url=']){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);const r=await fetch(p+encodeURIComponent(url),{signal:c.signal,cache:'no-store'});clearTimeout(t);if(!r.ok)continue;const j=await r.json(),q=j.chart?.result?.[0],quote=q?.indicators?.quote?.[0]||{},adj=q?.indicators?.adjclose?.[0]?.adjclose||[],rows=(q?.timestamp||[]).map((t,i)=>({d:new Date(t*1000),c:Number.isFinite(adj[i])?adj[i]:quote.close?.[i],v:Number(quote.volume?.[i])||0})).filter(x=>Number.isFinite(x.c));if(rows.length>=60)return rows}catch(_) {}}return null}
async function resolveSymbol(key){if(known[key])return known[key];if(!/^[A-Z0-9]{6}$/.test(key))return key;try{const c=new AbortController(),t=setTimeout(()=>c.abort(),3000),r=await fetch('https://api.openfigi.com/v3/mapping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{idType:'ID_WERTPAPIER',idValue:key}]),signal:c.signal});clearTimeout(t);if(r.ok){const j=await r.json(),rows=j?.[0]?.data||[];for(const e of rows){const s=String(e.ticker||'').trim();if(s){const candidates=[s,s+'.DE',s+'.F',s+'.VI',s+'.PA',s+'.AS',s+'.L',s+'.SW',s+'.MI',s+'.T',s+'.HK',s+'.TO'];for(const cnd of [...new Set(candidates)]){const rws=await rowsForSymbol(cnd);if(rws)return cnd}}}}}catch(_){}return null}
async function evaluateItem(item){
 // This function deliberately does NOT depend on #individuals or a loaded detail analysis.
 const key=norm(item.key);if(!key)return;
 const symbol=await resolveSymbol(key);if(!symbol)return;
 const rows=await rowsForSymbol(symbol);if(!rows||rows.length<60||!window.AKTTrendReversal?.analyse)return;
 let z;try{z=window.AKTTrendReversal.analyse(rows)}catch(_){return}
 const next={score:z.score,status:status(z),symbol,at:Date.now()},all=states(),prev=all[key];
 // A title leaving the Watchlist must never be able to trigger an alert: only current items reach here.
 all[key]=next;saveStates(all);
 if(!prev)return;
 const changed=prev.status!==next.status;
 const crossed=(prev.score<58&&next.score>=58)||(prev.score>=58&&next.score<58)||(prev.score<72&&next.score>=72)||(prev.score>=72&&next.score<72);
 if(changed||crossed){
   const name=item.title||key,title='📈 '+name+' · Trendwende';
   const body=prev.status+' → '+next.status+' · Score '+prev.score+' → '+next.score;
   await ntfy(title,body,key);await browserNotify(title,body);
 }
}
async function scan(){const wl=watchlist();if(!wl.length)return;const active=new Set(wl.map(x=>x.key));const old=states();Object.keys(old).forEach(k=>{if(!active.has(k))delete old[k]});saveStates(old);for(const item of wl){try{await evaluateItem(item)}catch(e){console.warn('Trendwendeprüfung fehlgeschlagen:',item.key,e)}}}
function updateButton(){const b=document.getElementById('wlTrendAlertBtn');if(!b)return;b.textContent=enabled()?'🔔 Trendwende-Alarm: EIN':'🔕 Trendwende-Alarm: AUS';b.title=enabled()?'Trendwende-Alarm für aktuelle Watchlist-Titel aktiv':'Trendwende-Benachrichtigungen aktivieren'}
function install(){const p=document.getElementById('watchlistPanel');if(!p)return;if(!document.getElementById('wlTrendAlertBtn')){const sync=p.querySelector('.watch-sync');if(!sync)return;const b=document.createElement('button');b.type='button';b.id='wlTrendAlertBtn';b.className='action-btn';b.onclick=async()=>{if('Notification'in window&&Notification.permission==='default')try{await Notification.requestPermission()}catch(_){}setEnabled(!enabled())};sync.insertBefore(b,sync.firstChild)}updateButton()}
function boot(){install();scan();const p=document.getElementById('watchlistPanel');if(p)new MutationObserver(()=>{install();setTimeout(scan,500)}).observe(p,{childList:true,subtree:true});window.addEventListener('storage',e=>{if(e.key===WL_KEY){install();setTimeout(scan,250)}});setInterval(scan,15*60*1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();