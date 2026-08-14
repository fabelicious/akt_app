(function(){
'use strict';
function groups(){const c=document.getElementById('individuals');return c?[...c.querySelectorAll(':scope > details.stock-group, :scope > .stock-group')]:[]}
function show(){const a=document.getElementById('app');if(a)a.style.display='block'}
function openAll(){const g=groups();if(!g.length)return false;show();g.forEach(x=>{if('open' in x)x.open=true});return true}
function hook(){const f=document.getElementById('form');if(!f||f.dataset.multiDetailHook)return;f.dataset.multiDetailHook='1';f.addEventListener('submit',()=>{let n=0;const t=setInterval(()=>{if(openAll()||++n>=60)clearInterval(t)},100)},{capture:true})}
function init(){hook()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AKTMultiDetail={openAll,groups};
})();
