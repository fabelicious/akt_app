(function(){'use strict';
if(window.__AKT_TREND_PUSH_RUNTIME__)return;window.__AKT_TREND_PUSH_RUNTIME__=1;
const WL_KEY='aktpro_watchlist_v5';
const TOPIC_PREFIX='aktpro-trend-';
const norm=v=>String(v??'').trim().replace(/^WKN\s*[:#-]?\s*/i,'').replace(/[^A-Z0-9_-]/gi,'').toUpperCase();
const topicFor=k=>TOPIC_PREFIX+norm(k).toLowerCase().replace(/[^a-z0-9_-]/g,'-');
function topicUrl(k){return 'ntfy://ntfy.sh/'+encodeURIComponent(topicFor(k));}
function install(){
 const p=document.getElementById('watchlistPanel');
 if(!p)return;
 if(!p.querySelector('[data-push-help]')){
  const d=document.createElement('div');
  d.dataset.pushHelp='1';
  d.className='trend-push-help';
  d.innerHTML='<b>🔔 Kostenfreie Hintergrund-Pushs</b><span>Die Hintergrundprüfung läuft unabhängig von deiner geöffneten App. Für jeden Watchlist-Titel gibt es ein eigenes ntfy-Thema. „🔔 Push“ öffnet die kostenlose ntfy-App und abonniert genau dieses Thema.</span><span>Die Watchlist muss nicht an GitHub übertragen werden: GitHub prüft das Trenduniversum, und nur abonnierte WKN-Themen werden auf deinem Handy angezeigt.</span><a href="https://ntfy.sh/" target="_blank" rel="noopener">ntfy Web öffnen</a>';
  p.querySelector('.watchlist-body')?.prepend(d)
 }
 p.querySelectorAll('.watch-row').forEach(row=>{
  if(row.querySelector('[data-push]'))return;
  const w=row.querySelector('.watch-wkn')?.textContent?.replace(/^WKN:\s*/i,'').trim();
  if(!w)return;
  const b=document.createElement('button');
  b.type='button';
  b.dataset.push='1';
  b.textContent='🔔 Push';
  b.title='Kostenfreies ntfy-Push-Thema für diesen Watchlist-Titel abonnieren';
  b.onclick=()=>{window.location.href=topicUrl(w)};
  row.appendChild(b)
 })
}
function boot(){
 install();
 const p=document.getElementById('watchlistPanel');
 if(p)new MutationObserver(install).observe(p,{childList:true,subtree:true});
 window.addEventListener('storage',e=>{if(e.key===WL_KEY)install()})
}
const s=document.createElement('style');
s.textContent='.trend-push-help{margin:10px 0 4px;padding:10px 11px;border:1px solid #475569;border-radius:9px;background:#172033;display:flex;flex-direction:column;gap:4px;font-size:10px;color:#cbd5e1}.trend-push-help b{color:#fff;font-size:11px}.trend-push-help a{color:#7dd3fc;font-weight:800;text-decoration:none}.watch-row [data-push]{background:#075985!important;color:#e0f2fe!important}';
document.head.appendChild(s);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();