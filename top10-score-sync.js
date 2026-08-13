(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const chartUrl=s=>`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=${Math.floor(Date.now()/1000)-60*60*24*1900}&period2=${Math.floor(Date.now()/1000)}&interval=1d&events=history&includeAdjustedClose=true`;
  async function getJson(url,ms=5000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch('https://corsproxy.io/?url='+encodeURIComponent(url),{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error();return await r.json()}finally{clearTimeout(t)}}
  function rows(r){const z=r?.chart?.result?.[0],q=z?.indicators?.quote?.[0]||{},a=z?.indicators?.adjclose?.[0]?.adjclose||[],v=q.volume||[];return(z?.timestamp||[]).map((t,i)=>({d:new Date(t*1000),c:Number.isFinite(a[i])?a[i]:q.close?.[i],v:Number.isFinite(v[i])?v[i]:0})).filter(x=>Number.isFinite(x.c))}
  async function sync(){
    if(!window.AKTScoreModel)return;
    let source;
    try{source=await fetch('./top10.json?scoreSync='+Date.now(),{cache:'no-store'}).then(r=>r.json())}catch(_){return}
    const candidates=(source.items||[]).slice(0,20);
    const scored=[];
    for(const item of candidates){
      try{const data=rows(await getJson(chartUrl(item.symbol))),z=AKTScoreModel.analyse(data);if(z.score>=90)scored.push({...item,score:z.score,price:z.last,rsi:z.rsi})}catch(_){}
    }
    scored.sort((a,b)=>b.score-a.score);
    const grid=$('top10Grid');if(!grid)return;
    if(!scored.length){grid.innerHTML='<div class="top10-empty">Aktuell kein Titel mit mindestens 90/100.</div>';return}
    grid.innerHTML=scored.slice(0,10).map((x,i)=>`<div class="top10-item"><div><div class="top10-rank">#${i+1}</div><div class="top10-name">${esc(x.name)}</div><div class="top10-symbol">${esc(x.symbol)}</div><div class="top10-wkn" data-copy-wkn="${esc(x.wkn||'')}">WKN ${esc(x.wkn||'—')}</div></div><div><div class="top10-score">${x.score}/100</div><div class="top10-meta"><span>${x.price?Number(x.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</span><span>${x.change==null?'':Number(x.change).toFixed(2)+'%'}</span></div><button class="top10-detail" type="button" data-wkn="${esc(x.wkn||x.symbol)}">＋ Detailanalyse</button></div></div>`).join('');
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,900),{once:true});
})();
