(function(){
  'use strict';

  const PERIODS={30:1,90:3,180:6,365:12,1825:60};
  const periodCache=new Map();
  const $=id=>document.getElementById(id);

  async function getJson(url){
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw Error('HTTP '+r.status);
    return r.json();
  }

  function cutoff(months){
    const d=new Date();
    d.setHours(0,0,0,0);
    d.setMonth(d.getMonth()-months);
    return d;
  }

  async function loadPeriod(symbol,months){
    const key=String(symbol||'').toUpperCase()+'|'+months;
    if(periodCache.has(key))return periodCache.get(key);
    const end=Math.floor(Date.now()/1000);
    // Load enough history for 200-day indicators, then display the exact calendar period.
    const start=end-60*60*24*365*8;
    const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?period1='+start+'&period2='+end+'&interval=1d&events=history&includeAdjustedClose=true';
    let z;
    try{z=(await getJson(url)).chart?.result?.[0]}
    catch(_){z=(await getJson('https://corsproxy.io/?url='+encodeURIComponent(url))).chart?.result?.[0]}
    if(!z)throw Error('Keine Kursdaten');
    const q=z.indicators?.quote?.[0]||{},adj=z.indicators?.adjclose?.[0]?.adjclose||[],vol=q.volume||[],all=(z.timestamp||[]).map((t,i)=>({d:new Date(t*1000),c:Number.isFinite(adj[i])?adj[i]:q.close?.[i],v:Number.isFinite(vol[i])?vol[i]:0})).filter(x=>Number.isFinite(x.c));
    const cut=cutoff(months);
    const data=all.filter(x=>x.d>=cut);
    const result={all,data};
    periodCache.set(key,result);
    return result;
  }

  function updateCharts(groupIndex,data){
    const canvases=[...document.querySelectorAll('.stock-group')][groupIndex]?.querySelectorAll('.stock-charts canvas');
    if(!canvases||!canvases.length)return;
    const a=data.map(x=>x.c),labels=data.map(x=>x.d.toLocaleDateString('de-DE'));
    const sma=n=>a.map((_,i)=>i<n-1?null:AKTScoreModel.sma(a.slice(0,i+1),n));
    const rsi=a.map((_,i)=>i<14?null:AKTScoreModel.rsi(a.slice(0,i+1)));
    const macd=AKTScoreModel.macd(a);
    canvases.forEach(canvas=>{
      const chart=Chart.getChart(canvas);if(!chart)return;
      chart.data.labels=labels;
      if(canvas.id.startsWith('price-')){
        chart.data.datasets[0].data=a;
        chart.data.datasets[1].data=sma(20);
        chart.data.datasets[2].data=sma(50);
        chart.data.datasets[3].data=sma(200);
      }else if(canvas.id.startsWith('rsi-')){
        chart.data.datasets[0].data=rsi;
        chart.data.datasets[1].data=labels.map(()=>70);
        chart.data.datasets[2].data=labels.map(()=>30);
      }else if(canvas.id.startsWith('macd-')){
        const off=Math.max(0,labels.length-macd.values.length);
        chart.data.datasets[0].data=Array(off).fill(null).concat(macd.values);
        chart.data.datasets[1].data=Array(off).fill(null).concat(macd.signalValues);
      }
      chart.update('none');
    });
  }

  async function refreshPeriods(days){
    const months=PERIODS[days]||6;
    const groups=[...document.querySelectorAll('.stock-group')];
    await Promise.all(groups.map(async(group,i)=>{
      const symbol=group.querySelector('.summary-main span')?.textContent?.trim();
      if(!symbol)return;
      try{const p=await loadPeriod(symbol,months);updateCharts(i,p.data)}catch(_){/* keep existing chart on transient failure */}
    }));
  }

  function addCacheButton(){
    if($('clearCacheBtn'))return;
    const actions=document.querySelector('.search-actions');
    if(!actions)return;
    const b=document.createElement('button');
    b.type='button';b.id='clearCacheBtn';b.className='btn';
    b.textContent='🧹 Cache leeren';
    b.style.marginRight='8px';b.style.background='#64748b';b.style.color='#fff';
    b.addEventListener('click',async()=>{
      b.disabled=true;b.textContent='🧹 wird geleert …';
      try{
        try{localStorage.clear()}catch(_){ }
        try{sessionStorage.clear()}catch(_){ }
        try{document.cookie.split(';').forEach(c=>{const n=c.split('=')[0].trim();if(n)document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'});}catch(_){ }
        try{if(window.caches){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}}catch(_){ }
      }finally{
        location.replace(location.pathname+'?cacheReset='+Date.now());
      }
    });
    actions.insertBefore(b,actions.firstChild);
  }

  function openAllDetails(){
    const groups=[...document.querySelectorAll('.stock-group')];
    if(groups.length>=2)groups.forEach(g=>g.open=true);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    addCacheButton();
    const target=$('individuals');
    if(target){
      new MutationObserver(()=>openAllDetails()).observe(target,{childList:true,subtree:true});
      setTimeout(openAllDetails,250);
    }
    document.addEventListener('click',e=>{
      const tab=e.target.closest('.tab');
      if(tab)setTimeout(()=>refreshPeriods(Number(tab.dataset.d)),150);
    });
  },{once:true});
})();
