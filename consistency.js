(function(){'use strict';
const $=s=>document.querySelector(s);
const monthYear=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString('de-DE',{month:'short',year:'numeric'})};
async function loadTop10(){
  const grid=$('#top10Grid');
  if(!grid)return;
  try{
    const r=await fetch('./top10.json?stable=2026-08-13',{cache:'no-store'});
    if(!r.ok)throw Error('Top-10-Daten konnten nicht geladen werden (HTTP '+r.status+')');
    const j=await r.json();
    const items=(Array.isArray(j.items)?j.items:[])
      .filter(x=>x&&x.symbol&&Number.isFinite(Number(x.score))&&Number(x.score)>=90)
      .map((x,i)=>({...x,_sourceRank:i}))
      .sort((a,b)=>Number(b.score)-Number(a.score)||a._sourceRank-b._sourceRank)
      .slice(0,10);
    if(typeof window.renderTop10Enhanced!=='function')return;
    window.renderTop10Enhanced({generatedAt:j.generatedAt,criteria:j.criteria,items});
    const d=$('#top10Date');
    if(d&&j.generatedAt)d.textContent=monthYear(j.generatedAt);
  }catch(e){console.error('Top10:',e);grid.innerHTML='<div class="top10-error">Top-10-Daten konnten nicht geladen werden.</div>'}
}
function formatDates(){document.querySelectorAll('canvas').forEach(c=>{const ch=window.Chart?.getChart(c);if(!ch?.options?.scales?.x)return;const x=ch.options.scales.x;x.ticks=x.ticks||{};x.ticks.callback=function(value){let raw=value;try{raw=this.getLabelForValue(value)}catch(_){}return monthYear(raw)};ch.update('none')})}
function stabilize(){loadTop10();formatDates();setTimeout(()=>{loadTop10();formatDates()},600)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stabilize,{once:true});else stabilize();
})();
