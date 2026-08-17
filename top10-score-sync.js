(function(){
'use strict';
try{if(!window.__aktCourseNetworkLoaded){const s=document.createElement('script');s.src='./course-network-fix.js?v=2';s.async=false;document.head.appendChild(s);window.__aktCourseNetworkLoaded=true}}catch(_){ }
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const countries=[['WORLD','🌍 Weltweit'],['US','🇺🇸 USA'],['DE','🇩🇪 Deutschland'],['FR','🇫🇷 Frankreich'],['CH','🇨🇭 Schweiz'],['GB','🇬🇧 Großbritannien'],['NL','🇳🇱 Niederlande'],['IT','🇮🇹 Italien'],['ES','🇪🇸 Spanien'],['SE','🇸🇪 Schweden'],['NO','🇳🇴 Norwegen'],['DK','🇩🇰 Dänemark'],['FI','🇫🇮 Finnland'],['JP','🇯🇵 Japan'],['KR','🇰🇷 Südkorea'],['CN','🇨🇳 China'],['TW','🇹🇼 Taiwan'],['HK','🇭🇰 Hongkong'],['IN','🇮🇳 Indien'],['AU','🇦🇺 Australien'],['CA','🇨🇦 Kanada'],['BR','🇧🇷 Brasilien']];
let data=null;
async function load(){
 const panel=document.querySelector('.top10-panel');
 const grid=$('top10Grid');
 try{
   data=await fetch('./country-top10.json?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('country-top10 HTTP '+r.status);return r.json()});
 }catch(_){
   try{
     const fallback=await fetch('./top10.json?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('top10 HTTP '+r.status);return r.json()});
     data={items:fallback.items||[],countries:{WORLD:fallback.items||[]}};
   }catch(__){
     if(grid)grid.innerHTML='<div class="top10-empty">Top 10 konnte nicht geladen werden. Bitte später erneut versuchen.</div>';
     return;
   }
 }
 if(!panel)return;
 const summary=panel.querySelector('summary');if(!summary)return;
 let sel=document.getElementById('top10Country');
 if(!sel){sel=document.createElement('select');sel.id='top10Country';sel.setAttribute('aria-label','Top 10 Land auswählen');sel.style.cssText='margin-left:auto;min-width:190px;padding:7px 9px;border-radius:8px;border:1px solid #475569;background:#1f2937;color:#fff;font-weight:800;font-size:11px;cursor:pointer';summary.appendChild(sel);}
 sel.innerHTML='';
 countries.forEach(([code,label])=>{const rows=code==='WORLD'?(data.items||[]):(data.countries?.[code]||[]);const ok=rows.some(x=>Number(x.score)>=85);const o=document.createElement('option');o.value=code;o.textContent=(ok?'🟢 ':'🔴 ')+label;o.style.backgroundColor=ok?'#166534':'#991b1b';o.style.color='#fff';sel.appendChild(o)});
 const paint=()=>{const code=sel.value,rows=code==='WORLD'?(data.items||[]):(data.countries?.[code]||[]);render(rows);};
 sel.onchange=paint;paint();
 const d=$('top10Date');if(d&&data.generatedAt)d.textContent='Stand '+new Date(data.generatedAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function openTop10Detail(key){
 key=String(key||'').trim();if(!key)return;
 if(typeof window.__AKT_WATCHLIST_OPEN_DETAIL__==='function'){window.__AKT_WATCHLIST_OPEN_DETAIL__(key);return;}
 const input=$('wkn1'),btn=$('analyzeBtn');
 if(!input||!btn)return;
 input.value=key;input.dataset.wkn=key;input.dataset.selected='';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 setTimeout(()=>{try{btn.click()}catch(_){$('form')?.requestSubmit?.(btn)}},30);
}
function render(rows){
 const grid=$('top10Grid');if(!grid)return;
 const items=(rows||[]).filter(x=>Number(x.score)>=85).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
 if(!items.length){grid.innerHTML='<div class="top10-empty">Keine Aktie mit mindestens 85/100 gefunden.</div>';return}
 grid.innerHTML=items.map((x,i)=>`<div class="top10-item"><div><div class="top10-rank">#${i+1}</div><div class="top10-name">${esc(x.name)}</div><div class="top10-symbol">${esc(x.symbol)}</div><div class="top10-wkn" data-copy-wkn="${esc(x.wkn||'')}">WKN ${esc(x.wkn||'—')}</div></div><div><div class="top10-score">${Math.round(Number(x.score))}/100</div><div class="top10-meta"><span>${x.price?Number(x.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</span><span>${x.change==null?'':Number(x.change).toFixed(2)+'%'}</span></div><button class="top10-detail" type="button" data-wkn="${esc(x.wkn||x.symbol)}">＋ Detailanalyse</button></div></div>`).join('');
 grid.querySelectorAll('.top10-detail').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openTop10Detail(b.dataset.wkn)}));
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(load,350),{once:true});
})();
