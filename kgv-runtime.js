(function(){
'use strict';

/* Unabhängiges KGV-Modul: verändert weder Score noch Kursdaten, Charts,
   WKN-Auflösung oder Handelsplatz. Bei fehlendem KGV wird nichts angezeigt. */
const CACHE_TTL=6*60*60*1000;
const cache=new Map(),pending=new Map();

async function request(url,timeout=4000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}
  finally{clearTimeout(t)}
}

async function yahoo(symbol){
  const quote='https://query1.finance.yahoo.com/v7/finance/quote?symbols='+encodeURIComponent(symbol);
  const summary='https://query2.finance.yahoo.com/v10/finance/quoteSummary/'+encodeURIComponent(symbol)+'?modules=summaryDetail,defaultKeyStatistics,financialData';
  const proxies=[u=>'https://corsproxy.io/?url='+encodeURIComponent(u),u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)];
  for(const make of proxies){
    try{
      const j=await request(make(quote),3500),r=j?.quoteResponse?.result?.[0];
      if(r){const a=Number(r.trailingPE),b=Number(r.forwardPE);if(Number.isFinite(a)&&a>0&&a<10000)return a;if(Number.isFinite(b)&&b>0&&b<10000)return b;}
    }catch(_){ }
  }
  for(const make of proxies){
    try{
      const j=await request(make(summary),3500),r=j?.quoteSummary?.result?.[0];
      const vals=[r?.summaryDetail?.trailingPE?.raw,r?.defaultKeyStatistics?.trailingPE?.raw,r?.defaultKeyStatistics?.forwardPE?.raw,r?.financialData?.forwardPE?.raw];
      for(const x of vals){const n=Number(x);if(Number.isFinite(n)&&n>0&&n<10000)return n;}
    }catch(_){ }
  }
  return null;
}

async function getKgv(symbol){
  const key=String(symbol||'').trim().toUpperCase();if(!key)return null;
  const old=cache.get(key);if(old&&Date.now()-old.time<CACHE_TTL)return old.value;
  if(pending.has(key))return pending.get(key);
  const p=yahoo(key).catch(()=>null).then(v=>{cache.set(key,{time:Date.now(),value:v});return v}).finally(()=>pending.delete(key));
  pending.set(key,p);return p;
}

function format(v){return Number(v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2});}
function add(group,value){
  if(!group||!document.body.contains(group)||!Number.isFinite(Number(value))||Number(value)<=0)return;
  const target=group.querySelector('.card.wide .score')||group.querySelector('.score');if(!target)return;
  let node=target.parentElement.querySelector('.kgv-value');
  if(!node){node=document.createElement('span');node.className='kgv-value';node.style.cssText='display:inline-block;margin-left:12px;font-size:14px;font-weight:800;white-space:nowrap';target.insertAdjacentElement('afterend',node);}
  node.textContent='KGV: '+format(value);
}
function scan(){document.querySelectorAll('.stock-group').forEach(group=>{const el=group.querySelector('.summary-main span');const symbol=el?.textContent?.trim();if(symbol)getKgv(symbol).then(v=>add(group,v)).catch(()=>{});});}
function init(){const root=document.getElementById('individuals');if(!root)return;let timer;const schedule=d=>{clearTimeout(timer);timer=setTimeout(scan,d||250)};new MutationObserver(ms=>{if(ms.some(m=>Array.from(m.addedNodes||[]).some(n=>n.nodeType===1&&(n.classList?.contains('stock-group')||n.querySelector?.('.stock-group')))))schedule(150)}).observe(root,{childList:true});schedule(400);document.addEventListener('click',e=>{if(e.target.closest('.tab,.top10-detail'))schedule(500);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AKTKGV={get:getKgv,scan};
})();
