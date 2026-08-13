(function(){'use strict';
  const setSixMonthsDefault=()=>{
    try{if(typeof days!=='undefined') days=180}catch(_){ }
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.d==='180'));
  };
  window.applyDefault6M=function(){setSixMonthsDefault();};
  window.formatChartMonths=function(){
    document.querySelectorAll('canvas').forEach(c=>{
      const ch=window.Chart?.getChart(c); if(!ch?.options?.scales?.x)return;
      ch.options.scales.x.ticks=ch.options.scales.x.ticks||{};
      ch.options.scales.x.ticks.callback=function(value){
        let raw=value; try{raw=this.getLabelForValue(value)}catch(_){}
        const d=new Date(raw); return Number.isNaN(d.getTime())?raw:d.toLocaleDateString('de-DE',{month:'short',year:'numeric'});
      };
      ch.update('none');
    });
  };
  async function renderStableTop10(){
    if(window.__aktStableTop10Busy||typeof window.renderTop10Enhanced!=='function')return;
    window.__aktStableTop10Busy=true;
    try{
      const r=await fetch('./top10.json?stable-ui=20260813',{cache:'no-store'}); if(!r.ok)throw Error('Top10 HTTP '+r.status);
      const j=await r.json();
      const items=(Array.isArray(j.items)?j.items:[]).filter(x=>x&&x.symbol).slice(0,10);
      if(items.length===10)window.renderTop10Enhanced({generatedAt:j.generatedAt,criteria:j.criteria,items});
      const d=document.getElementById('top10Date'); if(d&&j.generatedAt){const dt=new Date(j.generatedAt);if(!Number.isNaN(dt.getTime()))d.textContent=dt.toLocaleDateString('de-DE',{month:'short',year:'numeric'});}
    }catch(e){console.warn('Stable Top10:',e)}finally{window.__aktStableTop10Busy=false}
  }
  setSixMonthsDefault();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setSixMonthsDefault();window.formatChartMonths();setTimeout(renderStableTop10,900)},{once:true});
  else{window.formatChartMonths();setTimeout(renderStableTop10,900)}
  const observer=new MutationObserver(()=>{
    if(!window.__aktUiFixQueued){
      window.__aktUiFixQueued=true;
      requestAnimationFrame(()=>{window.__aktUiFixQueued=false;window.formatChartMonths();});
    }
    const g=document.getElementById('top10Grid');
    if(g&&!window.__aktStableTop10Busy&&g.children.length!==10)setTimeout(renderStableTop10,350);
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
})();
