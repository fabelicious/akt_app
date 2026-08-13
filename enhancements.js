(function(){
  if(window.__aktEnhancementsLoader)return;
  window.__aktEnhancementsLoader=true;
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  load('./enhancements-core.js?v=1').then(()=>load('./unified.js?v=1')).catch(e=>console.error('AKT-Pro Erweiterungen konnten nicht geladen werden',e));
})();