(function(){
'use strict';
function groups(){
  const c=document.getElementById('individuals');
  return c?[...c.querySelectorAll('.stock-group')]:[];
}
function setAll(open){
  groups().forEach(x=>{x.open=!!open;});
}
function handle(e){
  const b=e.target.closest?.('#openAll,#closeAll');
  if(!b)return;
  e.preventDefault();
  e.stopPropagation();
  setAll(b.id==='openAll');
}
function init(){
  document.addEventListener('click',handle,true);
  document.addEventListener('pointerup',handle,true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
window.AKTOpenClose={open:()=>setAll(true),close:()=>setAll(false)};
})();
