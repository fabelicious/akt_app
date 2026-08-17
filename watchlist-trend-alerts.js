/* Trendwende alerts: UI only at startup. Background scan is intentionally disabled during stabilization. */
(function(){
'use strict';
const WL_KEY='aktpro_watchlist_v5',ENABLED_KEY='aktpro_trend_alert_enabled_v1';
function enabled(){try{return localStorage.getItem(ENABLED_KEY)==='1'}catch(_){return false}}
function updateButton(){const b=document.getElementById('wlTrendAlertBtn');if(!b)return;b.textContent=enabled()?'🔔 Trendwende-Alarm: EIN':'🔕 Trendwende-Alarm: AUS'}
function install(){const p=document.getElementById('watchlistPanel');if(!p)return;if(!document.getElementById('wlTrendAlertBtn')){const sync=p.querySelector('.watch-sync');if(!sync)return;const b=document.createElement('button');b.type='button';b.id='wlTrendAlertBtn';b.className='action-btn';b.onclick=()=>{try{localStorage.setItem(ENABLED_KEY,enabled()?'0':'1')}catch(_){}updateButton()};sync.insertBefore(b,sync.firstChild)}updateButton()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
