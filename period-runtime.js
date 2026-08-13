(function(){
  'use strict';
  // Kalenderbasierte Zeiträume. 6M ist der Lade-Default; beim Umschalten
  // wird die vollständige bereits verfügbare Historie verwendet.
  const MONTHS={30:1,90:3,180:6,365:12,1825:60};
  const cache=new Map();
  const cutoffDate=months=>{const d=new Date();d.setHours(0,0,0,0);d.setMonth(d.getMonth()-months);return d};
  const periodData=async(symbol,months)=>{
    const key=String(symbol).toUpperCase()+'|'+months;
    if(cache.has(key))return cache.get(key);
    const end=Math.floor(Date.now()/1000), start=end-60*60*24*1900;
    const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?period1='+start+'&period2='+end+'&interval=1d&events=history&includeAdjustedClose=true';
    const load=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
    let z;
    try{z=(await load(url)).chart?.result?.[0]}catch(_){z=(await load('https://corsproxy.io/?url='+encodeURIComponent(url))).chart?.result?.[0]}
    if(!z)throw Error('Keine Kursdaten');
    const q=z.indicators?.quote?.[0]||{},adj=z.indicators?.adjclose?.[0]?.adjclose||[],vol=q.volume||[],cut=cutoffDate(months);
    const data=(z.timestamp||[]).map((t,i)=>({d:new Date(t*1000),c:Number.isFinite(adj[i])?adj[i]:q.close?.[i],v:Number.isFinite(vol[i])?vol[i]:0})).filter(x=>Number.isFinite(x.c)&&x.d>=cut);
    cache.set(key,data);return data;
  };
  const updateChart=(chart,data)=>{
    if(!chart||!data.length)return;
    const a=data.map(x=>x.c),labels=data.map(x=>x.d.toLocaleDateString('de-DE'));
    const sma=n=>a.map((_,i)=>i<n-1?null:AKTScoreModel.sma(a.slice(0,i+1),n));
    const rsi=a.map((_,i)=>i<14?null:AKTScoreModel.rsi(a.slice(0,i+1)));
    const macd=AKTScoreModel.macd(a);
    if(chart.canvas.id.startsWith('price-')){
      chart.data.labels=labels;
      chart.data.datasets[0].data=a;chart.data.datasets[1].data=sma(20);chart.data.datasets[2].data=sma(50);chart.data.datasets[3].data=sma(200);
    }else if(chart.canvas.id.startsWith('rsi-')){
      chart.data.labels=labels;chart.data.datasets[0].data=rsi;chart.data.datasets[1].data=labels.map(()=>70);chart.data.datasets[2].data=labels.map(()=>30);
    }else if(chart.canvas.id.startsWith('macd-')){
      // MACD needs its own full period calculation; align signal/value arrays to the labels.
      chart.data.labels=labels;
      const offset=Math.max(0,labels.length-macd.values.length);
      chart.data.datasets[0].data=Array(offset).fill(null).concat(macd.values);
      chart.data.datasets[1].data=Array(offset).fill(null).concat(macd.signalValues);
    }
    chart.update('none');
  };
  async function redraw(months){
    const canvases=[...document.querySelectorAll('.stock-charts canvas')];
    const groups=new Map();
    canvases.forEach(c=>{const i=c.id.match(/-(\d+)$/)?.[1];if(i!=null){if(!groups.has(i))groups.set(i,[]);groups.get(i).push(c)}});
    for(const [i,cs] of groups){
      const symbol=document.querySelectorAll('.stock-group')[Number(i)]?.querySelector('.summary-main span')?.textContent?.trim();
      if(!symbol)continue;
      try{const data=await periodData(symbol,months);cs.forEach(c=>updateChart(Chart.getChart(c),data))}catch(_){/* existing chart remains visible if a transient request fails */}
    }
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.tab');if(!tab)return;
    const months=MONTHS[Number(tab.dataset.d)]||6;
    // app.js first renders the selected period; afterwards replace the
    // trading-day approximation with the exact calendar period.
    setTimeout(()=>redraw(months),120);
  });
})();
