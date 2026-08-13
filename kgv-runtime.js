(function(){
'use strict';

/* Unabhängiges KGV-Modul. Keine Änderung an Score, Kursdaten, Charts, WKN oder Handelsplatz. */
const CACHE_TTL=6*60*60*1000;
const cache=new Map(),pending=new Map();

async function fetchText(url,timeout=4500){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.text();}
  finally{clearTimeout(t)}
}
async function fetchJson(url,timeout=4000){return JSON.parse(await fetchText(url,timeout));}
function valid(v){const n=Number(v);return Number.isFinite(n)&&n>0&&n<10000?n:null;}
function fromQuote(r){return valid(r?.trailingPE)||valid(r?.forwardPE)||null;}

async function yahoo(symbol){
  const quote='https://query1.finance.yahoo.com/v7/finance/quote?symbols='+encodeURIComponent(symbol);
  const summary='https://query2.finance.yahoo.com/v10/finance/quoteSummary/'+encodeURIComponent(symbol)+'?modules=summaryDetail,defaultKeyStatistics,financialData';
  const proxies=[u=>'https://corsproxy.io/?url='+encodeURIComponent(u),u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)];
  for(const make of proxies){try{const j=await fetchJson(make(quote));const v=fromQuote(j?.quoteResponse?.result?.[0]);if(v!==null)return v;}catch(_){}}
  for(const make of proxies){try{const j=await fetchJson(make(summary));const r=j?.quoteSummary?.result?.[0];const vals=[r?.summaryDetail?.trailingPE?.raw,r?.defaultKeyStatistics?.trailingPE?.raw,r?.defaultKeyStatistics?.forwardPE?.raw,r?.financialData?.forwardPE?.raw];for(const x of vals){const v=valid(x);if(v!==null)return v;}}catch(_) {}}
  return null;
}

async function yahooPage(symbol){
  const page='https://finance.yahoo.com/quote/'+encodeURIComponent(symbol)+'/';
  const proxies=[u=>'https://corsproxy.io/?url='+encodeURIComponent(u),u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)];
  for(const make of proxies){
    try{
      const html=await fetchText(make(page),5000);
      const patterns=[
        /"trailingPE"\s*:\s*\{?\s*"raw"\s*:\s*([0-9.]+)/i,
        /"forwardPE"\s*:\s*\{?\s*"raw"\s*:\s*([0-9.]+)/i,
        /"trailingPE"\s*:\s*([0-9.]+)/i,
        /"forwardPE"\s*:\s*([0-9.]+)/i
      ];
      for(const re of patterns){const m=html.match(re);const v=valid(m?.[1]);if(v!==null)return v;}
    }catch(_){ }
  }
  return null;
}

async function getKgv(symbol){
  const key=String(symbol||'').trim().toUpperCase();if(!key)return null;
  const old=cache.get(key);if(old&&Date.now()-old.time<CACHE_TTL)return old.value;
  if(pending.has(key))return pending.get(key);
  const p=(async()=>{let v=await yahoo(key);if(v===null)v=await yahooPage(key);return v;})().catch(()=>null).then(v=>{cache.set(key,{time:Date.now(),value:v});return v}).finally(()=>pending.delete(key));
  pending.set(key,p);return p;
}
function format(v){return Number(v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2});}
function add(group,value){
  if(!group||!document.body.contains(group)||!Number.isFinite(Number(value))||Number(value)<=0)return;
  const target=group.querySelector('.card.wide .score')||group.querySelector('.score');if(!target)return;
  let node=group.querySelector('.kgv-value');
  if(!node){node=document.createElement('span');node.className='kgv-value';node.style.cssText='display:inline-block;margin-left:12px;font-size:14px;font-weight:800;white-space:nowrap';target.insertAdjacentElement('afterend',node);}
  node.textContent='KGV: '+format(value);
}
function scan(){document.querySelectorAll('.stock-group').forEach(group=>{const symbol=group.querySelector('.summary-main span')?.textContent?.trim();if(symbol)getKgv(symbol).then(v=>add(group,v)).catch(()=>{});});}
function init(){const root=document.getElementById('individuals');if(!root)return;let timer=0;const schedule=d=>{clearTimeout(timer);timer=setTimeout(scan,d||250)};new MutationObserver(ms=>{if(ms.some(m=>Array.from(m.addedNodes||[]).some(n=>n.nodeType===1&&(n.classList?.contains('stock-group')||n.querySelector?.('.stock-group')))))schedule(200)}).observe(root,{childList:true,subtree:true});schedule(500);document.addEventListener('click',e=>{if(e.target.closest('.tab,.top10-detail'))schedule(600)});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AKTKGV={get:getKgv,scan};
})();