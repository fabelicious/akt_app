(function(){
  'use strict';
  function openAll(){
    const app=document.getElementById('app');
    const container=document.getElementById('individuals');
    if(!app||!container)return false;
    const groups=container.querySelectorAll(':scope > .stock-group');
    if(!groups.length)return false;
    app.style.display='block';
    groups.forEach(g=>{g.open=true});
    return true;
  }
  function hook(){
    const form=document.getElementById('form');
    if(!form||form.dataset.multiDetailHook)return;
    form.dataset.multiDetailHook='1';
    form.addEventListener('submit',function(){
      let n=0;
      const timer=setInterval(function(){
        if(openAll()||++n>80)clearInterval(timer);
      },100);
    },true);
  }
  function init(){
    hook();
    const c=document.getElementById('individuals');
    if(c){
      new MutationObserver(function(){openAll()}).observe(c,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
