(function(){
'use strict';
function groups(){const c=document.getElementById('individuals');return c?[...c.querySelectorAll(':scope > details.stock-group, :scope > .stock-group')]:[]}
function setAll(open){const g=groups();if(!g.length)return;g.forEach(x=>{if('open' in x)x.open=!!open})}
function init(){document.addEventListener('click',e=>{const b=e.target.closest('#openAll,#closeAll');if(!b)return;e.preventDefault();e.stopImmediatePropagation();setAll(b.id==='openAll')},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AKTOpenClose={open:()=>setAll(true),close:()=>setAll(false)};
})();
