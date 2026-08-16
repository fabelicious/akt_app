(function(){'use strict';
if(window.__AKT_TREND_PUSH_RUNTIME__)return;window.__AKT_TREND_PUSH_RUNTIME__=1;
const WL_KEY='aktpro_watchlist_v5';
const TOPIC_PREFIX='aktpro-trend-';
const norm=v=>String(v??'').trim().replace(/^WKN\s*[:#-]?\s*/i,'').replace(/[^A-Z0-9_-]/gi,'').toUpperCase();
const topicFor=k=>TOPIC_PREFIX+norm(k).toLowerCase().replace(/[^a-z0-9_-]/g,'-');
function topicUrl(k){return 'ntfy://ntfy.sh/'+encodeURIComponent(topicFor(k));}
function publishTest(k,name){
 const topic=topicFor(k);
 const body='AKT-Pro Test-Push: '+(name||k)+' · Trendwende-Benachrichtigung ist korrekt verbunden.';
 return fetch('https://ntfy.sh/'+encodeURIComponent(topic),{method:'POST',headers:{'Title':'AKT-Pro Test-Push','Priority':'high','Tags':'bell'},body})
  .then(r=>{if(!r.ok)throw new Error('ntfy HTTP '+r.status);return r.text()});
}
function install(){
 const p=document.getElementById('watchlistPanel');
 if(!p)return;
 if(!p.querySelector('[data-push-help]')){
  const d=document.createElement('div');d.dataset.pushHelp='1';d.className='trend-push-help';
  d.innerHTML='<b>🔔 Kostenfreie Hintergrund-Pushs</b><span>„🔔 Push“ abonniert das ntfy-Thema. „🧪 Test“ sendet eine echte Testbenachrichtigung nur an dieses Thema.</span><span>Die Testfunktion ist vollständig unabhängig von der Trendwendeanalyse und verändert weder Watchlist noch Cache.</span><a href="https://ntfy.sh/" target="_blank" rel="noopener">ntfy Web öffnen</a>';
  p.querySelector('.watchlist-body')?.prepend(d);
 }
 p.querySelectorAll('.watch-row').forEach(row=>{
  if(row.querySelector('[data-push]'))return;
  const w=row.querySelector('.watch-wkn')?.textContent?.replace(/^WKN:\s*/i,'').trim();
  if(!w)return;
  const name=row.querySelector('.watch-name')?.textContent?.trim()||row.querySelector('b')?.textContent?.trim()||w;
  const wrap=document.createElement('span');wrap.dataset.pushControls='1';wrap.style.cssText='display:inline-flex;gap:5px;flex-wrap:wrap';
  const b=document.createElement('button');b.type='button';b.dataset.push='1';b.textContent='🔔 Push';b.title='ntfy-Push-Thema abonnieren';
  b.onclick=()=>{window.location.href=topicUrl(w)};
  const t=document.createElement('button');t.type='button';t.dataset.pushTest='1';t.textContent='🧪 Test';t.title='Echte Testbenachrichtigung senden';
  t.onclick=async()=>{t.disabled=true;t.textContent='⏳';try{await publishTest(w,name);t.textContent='✅ Gesendet';setTimeout(()=>{t.textContent='🧪 Test';t.disabled=false},2500)}catch(e){console.error(e);t.textContent='❌ Fehler';setTimeout(()=>{t.textContent='🧪 Test';t.disabled=false},3000)}};
  wrap.append(b,t);row.appendChild(wrap);
 });
}
function boot(){install();const p=document.getElementById('watchlistPanel');if(p)new MutationObserver(install).observe(p,{childList:true,subtree:true});window.addEventListener('storage',e=>{if(e.key===WL_KEY)install()})}
const s=document.createElement('style');s.textContent='.trend-push-help{margin:10px 0 4px;padding:10px 11px;border:1px solid #475569;border-radius:9px;background:#172033;display:flex;flex-direction:column;gap:4px;font-size:10px;color:#cbd5e1}.trend-push-help b{color:#fff;font-size:11px}.trend-push-help a{color:#7dd3fc;font-weight:800;text-decoration:none}.watch-row [data-push]{background:#075985!important;color:#e0f2fe!important}.watch-row [data-push-test]{background:#166534!important;color:#dcfce7!important}';document.head.appendChild(s);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();