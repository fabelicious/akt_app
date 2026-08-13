(function(){
  'use strict';

  const PERIODS={30:1,90:3,180:6,365:12,1825:60};
  const periodCache=new Map();
  const $=id=>document.getElementById(id);
  let top10Scores=new Map();

  async function getJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
  async function loadTop10Scores(){
    try{
      const j=await getJson('./top10.json');
      top10Scores=new Map((j.items||[]).map(x=>[String(x.wkn||x.symbol||'').toUpperCase(),Number(x.score)]).filter(x=>Number.isFinite(x[1])));
      document.querySelectorAll('.stock-group').forEach(applyTop10Score);
    }catch(_){top10Scores=new Map()}
  }
  function cutoff(months){const d=new Date();d.setHours(0,0,0,0);d.setMonth(d.getMonth()-months);return d}
  async function loadPeriod(symbol,months){
    const key=String(symbol||'').toUpperCase()+'|'+months;if(periodCache.has(key))return periodCache.get(key);
    const end=Math.floor(Date.now()/1000),start=end-60*60*24*365*8;
    const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?period1='+start+'&period2='+end+'&interval=1d&events=history&includeAdjustedClose=true';
    let z;try{z=(await getJson(url)).chart?.result?.[0]}catch(_){z=(await getJson('https://corsproxy.io/?url='+encodeURIComponent(url))).chart?.result?.[0]}
    if(!z)throw Error('Keine Kursdaten');
    const q=z.indicators?.quote?.[0]||{},adj=z.indicators?.adjclose?.[0]?.adjclose||[],vol=q.volume||[],all=(z.timestamp||[]).map((t,i)=>({d:new Date(t*1000),c:Number.isFinite(adj[i])?adj[i]:q.close?.[i],v:Number.isFinite(vol[i])?vol[i]:0})).filter(x=>Number.isFinite(x.c));
    const result={all,data:all.filter(x=>x.d>=cutoff(months))};periodCache.set(key,result);return result;
  }
  function applyTop10Score(group){
    const wkn=(group.textContent.match(/WKN\s+([A-Z0-9]+)/i)||[])[1]?.toUpperCase();
    const symbol=group.querySelector('.summary-main span')?.textContent?.trim()?.toUpperCase();
    const score=top10Scores.get(wkn)||top10Scores.get(symbol);if(!Number.isFinite(score))return;
    const rec=score>=90?'KAUFEN':score>=65?'BEOBACHTEN':'NICHT KAUFEN';
    const result=group.querySelector('.summary-result');
    if(result){result.textContent=rec+' · '+score+'/100';result.className='summary-result '+(rec==='KAUFEN'?'buy':rec==='NICHT KAUFEN'?'no':'watch')}
    const card=[...group.querySelectorAll('.card')].find(c=>(c.querySelector('.label')?.textContent||'').trim()==='Technische Empfehlung');
    if(card){const v=card.querySelector('.score');if(v)v.textContent=rec;const sub=card.querySelector('.sub');if(sub)sub.textContent='Modellscore '+score+'/100';const meter=card.querySelector('.meter span');if(meter)meter.style.width=score+'%'}
  }
  function updateCharts(groupIndex,data){
    const canvases=[...document.querySelectorAll('.stock-group')][groupIndex]?.querySelectorAll('.stock-charts canvas');if(!canvases?.length)return;
    const a=data.map(x=>x.c),labels=data.map(x=>x.d.toLocaleDateString('de-DE')),sma=n=>a.map((_,i)=>i<n-1?null:AKTScoreModel.sma(a.slice(0,i+1),n)),rsi=a.map((_,i)=>i<14?null:AKTScoreModel.rsi(a.slice(0,i+1))),macd=AKTScoreModel.macd(a);
    canvases.forEach(canvas=>{const chart=Chart.getChart(canvas);if(!chart)return;chart.data.labels=labels;if(canvas.id.startsWith('price-')){chart.data.datasets[0].data=a;chart.data.datasets[1].data=sma(20);chart.data.datasets[2].data=sma(50);chart.data.datasets[3].data=sma(200)}else if(canvas.id.startsWith('rsi-')){chart.data.datasets[0].data=rsi;chart.data.datasets[1].data=labels.map(()=>70);chart.data.datasets[2].data=labels.map(()=>30)}else if(canvas.id.startsWith('macd-')){const off=Math.max(0,labels.length-macd.values.length);chart.data.datasets[0].data=Array(off).fill(null).concat(macd.values);chart.data.datasets[1].data=Array(off).fill(null).concat(macd.signalValues)}chart.update('none')});
  }
  async function refreshPeriods(days){const months=PERIODS[days]||6;const groups=[...document.querySelectorAll('.stock-group')];await Promise.all(groups.map(async(group,i)=>{const symbol=group.querySelector('.summary-main span')?.textContent?.trim();if(!symbol)return;try{const p=await loadPeriod(symbol,months);updateCharts(i,p.data)}catch(_){}}))}
  function addCacheButton(){
    if($('clearCacheBtn'))return;const actions=document.querySelector('.search-actions');if(!actions)return;const b=document.createElement('button');b.type='button';b.id='clearCacheBtn';b.className='btn';b.textContent='🧹 Cache leeren';b.style.marginRight='8px';b.style.background='#64748b';b.style.color='#fff';
    b.addEventListener('click',async()=>{b.disabled=true;b.textContent='🧹 wird geleert …';try{try{localStorage.clear()}catch(_){ }try{sessionStorage.clear()}catch(_){ }try{document.cookie.split(';').forEach(c=>{const n=c.split('=')[0].trim();if(n)document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'});}catch(_){ }try{if(window.caches){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}}catch(_){ }}finally{location.replace(location.pathname+'?cacheReset='+Date.now())}});actions.insertBefore(b,actions.firstChild)
  }
  function openAllDetails(){const groups=[...document.querySelectorAll('.stock-group')];if(groups.length>=2)groups.forEach(g=>g.open=true)}
  async function copyWkn(wkn,el){
    try{await navigator.clipboard.writeText(wkn)}catch(_){const t=document.createElement('textarea');t.value=wkn;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}
    const old=el.textContent;el.textContent='WKN '+wkn+' ✓';setTimeout(()=>el.textContent=old,900)
  }
  function makeWknCopyable(root){
    root.querySelectorAll('.top10-wkn').forEach(el=>{if(el.dataset.copyReady)return;const m=el.textContent.match(/WKN\s+([A-Z0-9]+)/i);if(!m)return;el.dataset.copyReady='1';el.title='Klicken zum Kopieren';el.addEventListener('click',e=>{e.stopPropagation();copyWkn(m[1].toUpperCase(),el)})});
    root.querySelectorAll('.stock-group .sub').forEach(el=>{if(el.dataset.copyReady)return;const m=el.textContent.match(/WKN\s+([A-Z0-9]+)/i);if(!m)return;const wkn=m[1].toUpperCase(),text=el.textContent,idx=text.toUpperCase().lastIndexOf('WKN '+wkn);if(idx<0)return;el.textContent='';el.append(document.createTextNode(text.slice(0,idx)));const span=document.createElement('span');span.textContent='WKN '+wkn;span.title='Klicken zum Kopieren';span.style.cursor='pointer';span.addEventListener('click',e=>{e.stopPropagation();copyWkn(wkn,span)});el.append(span);el.append(document.createTextNode(text.slice(idx+4+wkn.length)));el.dataset.copyReady='1'});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    addCacheButton();loadTop10Scores();makeWknCopyable(document);
    const target=$('individuals');
    if(target)new MutationObserver(()=>{openAllDetails();[...target.querySelectorAll('.stock-group')].forEach(applyTop10Score);makeWknCopyable(target)}).observe(target,{childList:true,subtree:true});
    setTimeout(openAllDetails,250);
    document.addEventListener('click',e=>{const tab=e.target.closest('.tab');if(tab)setTimeout(()=>refreshPeriods(Number(tab.dataset.d)),150);const w=e.target.closest('.top10-wkn');if(w)e.stopPropagation()});
  },{once:true});
})();
