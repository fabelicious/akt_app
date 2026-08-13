(function(){'use strict';
  // Stable UI defaults: 6 months for every newly created analysis/chart.
  const setSixMonthsDefault=()=>{
    try{
      if(typeof days!=='undefined') days=180;
    }catch(_){/* global lexical binding may not exist yet */}
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.d==='180'));
  };
  window.applyDefault6M=function(){setSixMonthsDefault();};
  window.formatChartMonths=function(){
    document.querySelectorAll('canvas').forEach(c=>{
      const ch=window.Chart?.getChart(c); if(!ch?.options?.scales?.x)return;
      ch.options.scales.x.ticks=ch.options.scales.x.ticks||{};
      ch.options.scales.x.ticks.callback=function(value){
        let raw=value; try{raw=this.getLabelForValue(value)}catch(_){}
        const d=new Date(raw); if(Number.isNaN(d.getTime()))return raw;
        return d.toLocaleDateString('de-DE',{month:'short',year:'numeric'});
      };
      ch.update('none');
    });
  };
  setSixMonthsDefault();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setSixMonthsDefault();window.formatChartMonths()},{once:true});
  const observer=new MutationObserver(()=>{
    if(!window.__aktUiFixQueued){
      window.__aktUiFixQueued=true;
      requestAnimationFrame(()=>{window.__aktUiFixQueued=false;window.formatChartMonths();});
    }
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
})();
