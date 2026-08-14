(function(){
  'use strict';
  function ensureDetails(){
    const app=document.getElementById('app');
    const groups=document.querySelectorAll('#individuals .stock-group');
    if(!app||!groups.length)return false;
    app.style.display='block';
    // Bei einer Mehrfachanalyse alle erzeugten Detailanalysen sichtbar öffnen.
    if(groups.length>1) groups.forEach(g=>{g.open=true});
    // Bei einer Einzelanalyse bleibt das bisherige Verhalten erhalten: erste Analyse offen.
    else if(groups.length===1) groups[0].open=true;
    return true;
  }
  function init(){
    const form=document.getElementById('form');
    if(!form)return;
    form.addEventListener('submit',function(){
      let tries=0;
      const timer=setInterval(function(){
        if(ensureDetails()||++tries>=30)clearInterval(timer);
      },100);
    },false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
