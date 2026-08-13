(function(){
'use strict';

/*
 * AKT-Pro – unabhängiges KGV-Modul
 *
 * Dieses Modul darf die bestehende Analyse NICHT beeinflussen.
 * Es liest ausschließlich das bereits gerenderte Symbol und ergänzt
 * bei erfolgreicher Abfrage eine optionale KGV-Anzeige.
 */

const CACHE_TTL=6*60*60*1000;
const cache=new Map();
const pending=new Map();

function request(url,timeout=4000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(url,{cache:'no-store',signal:controller.signal})
    .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
    .finally(()=>clearTimeout(timer));
}

async function getFromYahoo(symbol){
  const quoteUrl='https://query1.finance.yahoo.com/v7/finance/quote?symbols='+encodeURIComponent(symbol);
  const summaryUrl='https://query2.finance.yahoo.com/v10/finance/quoteSummary/'+encodeURIComponent(symbol)+'?modules=summaryDetail,defaultKeyStatistics,financialData';
  const proxies=[
    u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
    u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)
  ];

  for(const proxy of proxies){
    try{
      const q=await request(proxy(quoteUrl),3500);
      const row=q?.quoteResponse?.result?.[0];
      if(row){
        const trailing=Number(row.trailingPE);
        const forward=Number(row.forwardPE);
        if(Number.isFinite(trailing)&&trailing>0&&trailing<10000)return trailing;
        if(Number.isFinite(forward)&&forward>0&&forward<10000)return forward;
      }
    }catch(_){ }
  }

  for(const proxy of proxies){
    try{
      const q=await request(proxy(summaryUrl),3500);
      const row=q?.quoteSummary?.result?.[0];
      const values=[
        row?.summaryDetail?.trailingPE?.raw,
        row?.defaultKeyStatistics?.trailingPE?.raw,
        row?.defaultKeyStatistics?.forwardPE?.raw,
        row?.financialData?.forwardPE?.raw
      ];
      for(const raw of values){
        const n=Number(raw);
        if(Number.isFinite(n)&&n>0&&n<10000)return n;
      }
    }catch(_){ }
  }
  return null;
}

function getKgv(symbol){
  const key=String(symbol||'').trim().toUpperCase();
  if(!key)return Promise.resolve(null);

  const old=cache.get(key);
  if(old&&Date.now()-old.time<CACHE_TTL)return Promise.resolve(old.value);
  if(pending.has(key))return pending.get(key);

  const p=getFromYahoo(key).catch(()=>null).then(value=>{
    cache.set(key,{time:Date.now(),value});
    return value;
  }).finally(()=>pending.delete(key));

  pending.set(key,p);
  return p;
}

function format(value){
  return Number(value).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2});
}

function getSymbol(group){
  const el=group.querySelector('.summary-main span');
  if(!el)return '';
  return String(el.textContent||'').trim();
}

function addKgv(group,value){
  if(!group||!document.body.contains(group))return;
  if(!Number.isFinite(Number(value))||Number(value)<=0)return;

  const score=group.querySelector('.card.wide .score');
  if(!score)return;

  let node=score.parentElement.querySelector('.kgv-value');
  if(!node){
    node=document.createElement('span');
    node.className='kgv-value';
    node.style.cssText='display:inline-block;margin-left:12px;font-size:14px;font-weight:800;white-space:nowrap';
    score.insertAdjacentElement('afterend',node);
  }
  node.textContent='KGV: '+format(value);
}

function updateGroup(group){
  const symbol=getSymbol(group);
  if(!symbol)return;
  getKgv(symbol).then(value=>addKgv(group,value)).catch(()=>{});
}

function scan(){
  try{document.querySelectorAll('.stock-group').forEach(updateGroup)}catch(_){ }
}

function init(){
  const root=document.getElementById('individuals');
  if(!root)return;

  let timer=null;
  function schedule(delay=250){
    clearTimeout(timer);
    timer=setTimeout(scan,delay);
  }

  const observer=new MutationObserver(records=>{
    const changed=records.some(r=>Array.from(r.addedNodes||[]).some(n=>
      n.nodeType===1&&(n.classList?.contains('stock-group')||n.querySelector?.('.stock-group'))
    ));
    if(changed)schedule(150);
  });
  observer.observe(root,{childList:true});

  schedule(400);
  document.addEventListener('click',e=>{
    if(e.target.closest('.tab,.top10-detail'))schedule(500);
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init,{once:true});
}else{
  init();
}

window.AKTKGV={get:getKgv,scan};
})();
