(function(){
'use strict';

const cache=new Map(),pending=new Map();
const TTL=6*60*60*1000;

async function json(url,timeout=3500){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{cache:'no-store',signal:c.signal});
    if(!r.ok)throw Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(t)}
}

async function quote(symbol){
  const base='https://query1.finance.yahoo.com/v7/finance/quote?symbols='+encodeURIComponent(symbol);
  for(const prefix of ['https://corsproxy.io/?url=','https://api.allorigins.win/raw?url=']){
    try{
      const j=await json(prefix+encodeURIComponent(base));
      const q=j?.quoteResponse?.result?.[0];
      if(q)return q;
    }catch(_){}
  }
  return null;
}

async function summary(symbol){
  const base='https://query2.finance.yahoo.com/v10/finance/quoteSummary/'+encodeURIComponent(symbol)+'?modules=summaryDetail,defaultKeyStatistics,financialData';
  for(const prefix of ['https://corsproxy.io/?url=','https://api.allorigins.win/raw?url=']){
    try{
      const j=await json(prefix+encodeURIComponent(base));
      const r=j?.quoteSummary?.result?.[0];
      if(r)return r;
    }catch(_){}
  }
  return null;
}

async function getKgv(symbol){
  const key=String(symbol||'').trim().toUpperCase();
  if(!key)return null;
  const c=cache.get(key);
  if(c&&Date.now()-c.ts<TTL)return c.value;
  if(pending.has(key))return pending.get(key);

  const p=(async()=>{
    try{
      const q=await quote(key);
      let value=Number(q?.trailingPE);
      if(!Number.isFinite(value)||value<=0)value=Number(q?.forwardPE);
      if(!Number.isFinite(value)||value<=0){
        const s=await summary(key);
        value=Number(s?.summaryDetail?.trailingPE?.raw);
        if(!Number.isFinite(value)||value<=0)value=Number(s?.defaultKeyStatistics?.forwardPE?.raw);
      }
      value=Number.isFinite(value)&&value>0&&value<10000?value:null;
      cache.set(key,{ts:Date.now(),value});
      return value;
    }catch(_){
      cache.set(key,{ts:Date.now(),value:null});
      return null;
    }finally{pending.delete(key)}
  })();
  pending.set(key,p);
  return p;
}

function fmt(v){return Number(v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2})}

async function update(group){
  if(!group||!document.body.contains(group))return;
  const symbol=group.querySelector('.summary-main span')?.textContent?.trim();
  if(!symbol)return;
  const value=await getKgv(symbol);
  if(value==null||!document.body.contains(group))return;
  const card=group.querySelector('.card.wide');
  if(!card)return;
  let box=card.querySelector('.kgv-value');
  if(!box){
    box=document.createElement('span');
    box.className='kgv-value';
    box.style.cssText='display:inline-block;margin-left:12px;font-size:14px;font-weight:800;white-space:nowrap;vertical-align:middle';
    card.querySelector('.score')?.after(box);
  }
  box.textContent='KGV: '+fmt(value);
}

function scan(){document.querySelectorAll('.stock-group').forEach(g=>update(g).catch(()=>{}))}

function init(){
  const root=document.getElementById('individuals');
  if(!root)return;
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(scan,180)};
  new MutationObserver(m=>{
    if(m.some(x=>Array.from(x.addedNodes||[]).some(n=>n.nodeType===1&&(n.classList?.contains('stock-group')||n.querySelector?.('.stock-group')))))schedule();
  }).observe(root,{childList:true});
  schedule();
  document.addEventListener('click',e=>{if(e.target.closest('.tab,.top10-detail'))schedule()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AKTKGV={get:getKgv,scan};
})();