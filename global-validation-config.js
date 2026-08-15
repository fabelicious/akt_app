/* Global validation specification for AKTScore.
   This module does not invent market data. It defines the reproducible sampling
   and scoring rules used when a global historical dataset is supplied.
*/
(function(){
  'use strict';
  const CONFIG={
    maxTitlesPerExchange:1000,
    dedupeKey:'ISIN',
    includeSmallerExchanges:true,
    horizons:[5,20,60,120],
    scoreBands:[
      {min:85,max:100,label:'KAUFEN'},
      {min:65,max:84,label:'BEOBACHTEN'},
      {min:0,max:64,label:'NICHT KAUFEN'}
    ],
    requiredHistoryDays:756,
    balanceBy:['market-cap','liquidity','sector'],
    separateUniverses:['ADR/GDR','REIT'],
    excludeLookAhead:true
  };
  function dedupe(rows){
    const seen=new Set();
    return rows.filter(r=>{const k=String(r[CONFIG.dedupeKey]||r.isin||r.symbol||'').toUpperCase();if(!k||seen.has(k))return false;seen.add(k);return true});
  }
  function selectByExchange(rows){
    const groups=new Map();
    for(const r of dedupe(rows)){const ex=String(r.exchange||r.exchCode||'UNKNOWN').toUpperCase();if(!groups.has(ex))groups.set(ex,[]);groups.get(ex).push(r)}
    const out=[];
    for(const [exchange,list] of groups){
      list.sort((a,b)=>Number(b.liquidityScore||b.avgDollarVolume||0)-Number(a.liquidityScore||a.avgDollarVolume||0));
      out.push(...list.slice(0,CONFIG.maxTitlesPerExchange));
    }
    return out;
  }
  function forwardReturn(closes,signalIndex,horizon){const a=closes?.[signalIndex],b=closes?.[signalIndex+horizon];return Number.isFinite(a)&&Number.isFinite(b)?(b/a-1)*100:null}
  function validateSignal(score,ret){return{score:Number(score),returnPct:ret,label:score>=85?'KAUFEN':score>=65?'BEOBACHTEN':'NICHT KAUFEN'}}
  function summarize(rows){
    const buckets=CONFIG.scoreBands.map(b=>({label:b.label,min:b.min,max:b.max,n:0,avg5:null,avg20:null,avg60:null,avg120:null,win20:null}));
    for(const r of rows){const b=buckets.find(x=>r.score>=x.min&&r.score<=x.max);if(!b)continue;b.n++;for(const h of CONFIG.horizons){const k='ret'+h;if(Number.isFinite(r[k])){const old=b['avg'+h];b['avg'+h]=old==null?r[k]:(old*(b.n-1)+r[k])/b.n}}if(Number.isFinite(r.ret20))b.win20=(b.win20==null?0:b.win20)+ (r.ret20>0?1:0)}
    buckets.forEach(b=>{if(b.n)b.win20=(b.win20/b.n)*100});
    return buckets;
  }
  window.AKTGlobalValidation={CONFIG,dedupe,selectByExchange,forwardReturn,validateSignal,summarize};
})();
