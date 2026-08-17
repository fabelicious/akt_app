/* Top 10 is cache-only at startup. No network work and no automatic analysis. */
(function(){
'use strict';
const grid=document.getElementById('top10Grid');
if(!grid)return;
const loading=grid.querySelector('.top10-loading');
if(loading)loading.textContent='Top 10 bereit – Analyse wird bei Bedarf geladen.';
})();
