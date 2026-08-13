(function(){'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map();
function styles(){
  if($('top10RenderStyles'))return;
  const s=document.createElement('style');s.id='top10RenderStyles';
  s.textContent=`
    .top10-item{display:block!important;min-height:150px!important;height:150px!important;box-sizing:border-box!important}
    .top10-item>div{margin-top:8px}
    .top10-analysis-btn,.top10-copy-wkn,.wkn-copy{border:0;border-radius:7px;cursor:pointer;font-weight:800}
    .top10-analysis-btn{display:block;width:100%;margin-top:9px;padding:8px 9px;background:#166534;color:#dcfce7;font-size:10px}
    .top10-copy-wkn{padding:3px 6px;margin-left:4px;background:#334155;color:#fff;font-size:10px}
    .wkn-copy{background:transparent;color:#fff;padding:0;text-decoration:underline;font-size:11px}
    .top10-external-detail{display:none;margin:12px 0 0;padding:0;border-radius:16px;background:#fff;color:#172033;overflow:hidden}
    .top10-external-detail.is-open{display:block}
    .top10-external-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px;background:#111827;color:#fff}
    .top10-external-title{font-size:16px;font-weight:900}
    .top10-external-close{border:1px solid #475569;background:#1f2937;color:#fff;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer}
    .top10-external-body{padding:0}
    .top10-external-body .stock-group{margin:0;border-radius:0;border:0;width:100%;background:#fff;color:#172033}
    .top10-detail-loading,.top10-detail-error{padding:16px;font-size:12px}
    .top10-detail-error{color:#fecaca;background:#450a0a}
    @media(max-width:750px){.top10-item{height:150px!important}.top10-analysis-btn{font-size:10px}.top10-external-head{align-items:flex-start}.top10-external-title{font-size:14px}}
  `;
  document.head.appendChild(s)
}
function ensureExternalDetail(){
  let root=$('top10ExternalDetail');
  if(root)return root;
  const panel=$('top10Panel');if(!panel)return null;
  root=document.createElement('section');root.id='top10ExternalDetail';root.className='top10-external-detail';
  root.innerHTML='<div class="top10-external-head"><div class="top10-external-title">Einzelanalyse</div><button type="button" class="top10-external-close">Analyse schließen ↑</button></div><div class="top10-external-body"><div class="top10-detail-loading">Einzelanalyse wird geladen …</div></div>';
  panel.insertAdjacentElement('afterend',root);
  root.querySelector('.top10-external-close').addEventListener('click',()=>{root.classList.remove('is-open');root.querySelector('.top10-external-body').innerHTML='<div class="top10-detail-loading">Einzelanalyse wird geladen …</div>';window.__aktOpenTop10Symbol='';});
  return root
}
function card(x,i){
  const score=Number(x.score)||0,sym=String(x.symbol||'').toUpperCase(),name=x.name||sym,wkn=String(x.wkn||'');
  return `<article class="top10-item" data-symbol="${esc(sym)}" data-wkn="${esc(wkn)}"><div><div class="top10-rank">#${i+1}</div><div class="top10-name" title="${esc(name)}">${esc(name)}</div><div class="top10-symbol">${esc(sym)}</div><div class="top10-wkn">WKN: ${wkn?`<button type="button" class="wkn-copy" data-wkn="${esc(wkn)}">${esc(wkn)}</button> <button type="button" class="top10-copy-wkn" aria-label="WKN kopieren">Kopieren</button>`:'—'}</div></div><div><div class="top10-score">${Math.round(score)}/100</div><div class="top10-meta"><span>${x.price!=null?Number(x.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</span><span>${x.change==null?'':(Number(x.change)>=0?'+':'')+Number(x.change).toFixed(2)+'%'}</span></div><div class="top10-buy">KAUFEN · 90+ erreicht</div><button type="button" class="top10-analysis-btn">+ Detailanalyse</button></div></article>`
}
function copy(btn,wkn){
  const done=()=>{const old=btn.textContent;btn.textContent='Kopiert ✓';setTimeout(()=>btn.textContent=old,1200)};
  const fallback=()=>{const ta=document.createElement('textarea');ta.value=wkn;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done()};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(wkn).then(done).catch(fallback);else fallback()
}
async function loadChart(sym){
  const end=Math.floor(Date.now()/1000),start=end-60*60*24*1900,url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?period1='+start+'&period2='+end+'&interval=1d&events=history&includeAdjustedClose=true';
  const proxies=[u=>'https://corsproxy.io/?url='+encodeURIComponent(u),u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)];let last='';
  for(const p of proxies){const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);try{const r=await fetch(p(url),{cache:'no-store',signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);const z=(await r.json())?.chart?.result?.[0];clearTimeout(t);if(!z)throw Error('keine Kursdaten');const q=z.indicators?.quote?.[0]||{},a=z.indicators?.adjclose?.[0]?.adjclose||[];const data=(z.timestamp||[]).map((ts,i)=>({d:new Date(ts*1000),c:Number.isFinite(a[i])?a[i]:q.close?.[i]})).filter(v=>Number.isFinite(v.c));if(data.length<200)throw Error('zu wenig Historie');return{data,meta:z.meta||{}}}catch(e){clearTimeout(t);last=e.message}}
  throw Error(last||'Kursdaten nicht verfügbar')
}
async function openDetail(el){
  const root=ensureExternalDetail();if(!root)return;
  const body=root.querySelector('.top10-external-body'),title=root.querySelector('.top10-external-title'),sym=el.dataset.symbol,name=el.querySelector('.top10-name')?.textContent||sym;
  if(window.__aktOpenTop10Symbol===sym&&root.classList.contains('is-open')){root.classList.remove('is-open');window.__aktOpenTop10Symbol='';return}
  window.__aktOpenTop10Symbol=sym;root.classList.add('is-open');title.textContent='Einzelanalyse · '+name+' · WKN '+(el.dataset.wkn||'—');body.innerHTML='<div class="top10-detail-loading">Einzelanalyse wird geladen …</div>';
  root.scrollIntoView({behavior:'smooth',block:'start'});
  try{
    let hit=cache.get(sym);if(!hit){const p=await loadChart(sym);hit={name,symbol:sym,data:p.data,meta:p.meta};cache.set(sym,hit)}
    if(typeof stockMarkup!=='function')throw Error('Einzelanalyse-Funktion nicht verfügbar');
    const key='t10_'+sym.replace(/[^A-Z0-9]/g,'');
    window.__aktDetailHits=window.__aktDetailHits||{};window.__aktDetailHits[key]=hit;
    const holder=document.createElement('div');holder.innerHTML=stockMarkup(hit,key);const group=holder.querySelector('.stock-group');if(!group)throw Error('Einzelanalyse konnte nicht erstellt werden');
    body.replaceChildren(group);
    group.open=true;
    if(typeof drawStockCharts==='function')drawStockCharts(hit,key);
    setTimeout(()=>{try{if(typeof addTradeBars==='function')addTradeBars(key,hit);if(typeof addExchangeSelectorToChart==='function')addExchangeSelectorToChart(key,hit);if(typeof addDescriptions==='function')addDescriptions(body)}catch(e){console.warn('Top10 Detail-Erweiterung',e)}},0)
  }catch(e){body.innerHTML='<div class="top10-detail-error">Einzelanalyse konnte nicht geladen werden: '+esc(e.message||e)+'</div>'}
}
window.renderTop10Enhanced=function(j){
  styles();ensureExternalDetail();const grid=$('top10Grid');if(!grid)return;
  const out=(Array.isArray(j?.items)?j.items:[]).filter(x=>x&&x.symbol&&Number(x.score)>=90).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
  if(!out.length){grid.innerHTML='<div class="top10-empty">Keine Top-10-Daten verfügbar.</div>';return}
  grid.innerHTML=out.map(card).join('');
  grid.querySelectorAll('.top10-analysis-btn').forEach(b=>b.addEventListener('click',()=>openDetail(b.closest('.top10-item'))));
  grid.querySelectorAll('.top10-copy-wkn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();copy(b,b.closest('.top10-item').dataset.wkn)}));
  grid.querySelectorAll('.wkn-copy').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();copy(b,b.dataset.wkn)}));
};
})();
