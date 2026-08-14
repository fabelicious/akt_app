(function(){
'use strict';
function setAll(open){document.querySelectorAll('#individuals .stock-group').forEach(g=>{g.open=open});}
function init(){
 const root=document.getElementById('individuals');
 document.addEventListener('click',e=>{
   const b=e.target.closest('#openAll,#closeAll');
   if(!b)return;
   e.preventDefault();e.stopPropagation();setAll(b.id==='openAll');
 },true);
 if(root){root.addEventListener('click',e=>{const s=e.target.closest('summary');if(s)e.stopPropagation();});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
