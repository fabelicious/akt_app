(function(){
'use strict';

/* Single, deterministic Top-10 renderer.
   It deliberately does not depend on the analysis runtime having finished. */
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const countries=[['WORLD','🌍 Weltweit'],['US','🇺🇸 USA'],['DE','🇩🇪 Deutschland'],['FR','🇫🇷 Frankreich'],['CH','🇨🇭 Schweiz'],['GB','🇬🇧 Großbritannien'],['NL','🇳🇱 Niederlande'],['IT','🇮🇹 Italien'],['ES','🇪🇸 Spanien'],['SE','🇸🇪 Schweden'],['NO','🇳🇴 Norwegen'],['DK','🇩🇰 Dänemark'],['FI','🇫🇮 Finnland'],['JP','🇯🇵 Japan'],['KR','🇰🇷 Südkorea'],['CN','🇨🇳 China'],['TW','🇹🇼 Taiwan'],['HK','🇭🇰 Hongkong'],['IN','🇮🇳 Indien'],['AU','🇦🇺 Australien'],['CA','🇨🇦 Kanada'],['BR','🇧🇷 Brasilien']];

async function getJson(path){
  const r=await fetch(path+'?ts='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();
  if(!j||typeof j!=='object')throw Error('Ungültige Top-10-Daten');
  return j;
}

async function load(){
  const panel=document.querySelector('.top10-panel');
  const grid=$('top10Grid');
  if(!panel||!grid)return;
  grid.innerHTML='<div class="top10-loading">Top 10 wird geladen …</div>';
  let data;
  try{data=await getJson('./country-top10.json');}
  catch(_){
    try{const fallback=await getJson('./top10.json');data={items:Array.isArray(fallback.items)?fallback.items:[],countries:{WORLD:Array.isArray(fallback.items)?fallback.items:[]},generatedAt:fallback.generatedAt};}
    catch(err){grid.innerHTML='<div class="top10-empty">Top-10-Daten konnten nicht geladen werden.</div>';const d=$('top10Date');if(d)d.textContent='Fehler';return;}
  }

  const summary=panel.querySelector('summary');
  if(!summary)return;
  let sel=$('top10Country');
  if(!sel){
    sel=document.createElement('select');
    sel.id='top10Country';
    sel.setAttribute('aria-label','Top 10 Land auswählen');
    sel.style.cssText='margin-left:auto;min-width:190px;padding:7px 9px;border-radius:8px;border:1px solid #475569;background:#1f2937;color:#fff;font-weight:800;font-size:11px;cursor:pointer';
    summary.appendChild(sel);
  }
  sel.innerHTML='';
  countries.forEach(([code,label])=>{
    const rows=code==='WORLD'?(data.items||[]):(data.countries?.[code]||[]);
    const ok=rows.some(x=>Number(x.score)>=85);
    const o=document.createElement('option');o.value=code;o.textContent=(ok?'🟢 ':'⚪ ')+label;sel.appendChild(o);
  });
  const render=()=>{
    const code=sel.value;
    const rows=code==='WORLD'?(data.items||[]):(data.countries?.[code]||[]);
    const items=(Array.isArray(rows)?rows:[]).filter(x=>Number.isFinite(Number(x.score))&&Number(x.score)>=85).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    grid.innerHTML=items.length?items.map((x,i)=>`<div class="top10-item"><div><div class="top10-rank">#${i+1}</div><div class="top10-name">${esc(x.name)}</div><div class="top10-symbol">${esc(x.symbol)}</div><div class="top10-wkn" data-copy-wkn="${esc(x.wkn||'')}">WKN ${esc(x.wkn||'—')}</div></div><div><div class="top10-score">${Math.round(Number(x.score))}/100</div><div class="top10-meta"><span>${x.price==null?'':Number(x.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}</span><span>${x.change==null?'':Number(x.change).toFixed(2)+'%'}</span></div><button class="top10-detail" type="button" data-wkn="${esc(x.wkn||x.symbol)}">＋ Detailanalyse</button></div></div>`).join(''):'<div class="top10-empty">Keine Aktie mit mindestens 85/100 gefunden.</div>';
  };
  sel.onchange=render;render();
  const d=$('top10Date');if(d&&data.generatedAt)d.textContent='Stand '+new Date(data.generatedAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}

function boot(){setTimeout(load,0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
