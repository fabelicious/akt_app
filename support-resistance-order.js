(function(){
'use strict';
function moveLevels(){
 document.querySelectorAll('.stock-group').forEach(function(group){
  var grid=group.querySelector('.grid'), charts=group.querySelector('.stock-charts'); if(!grid||!charts)return;
  var price=charts.querySelector('.chart:not(.small)'); if(!price)return;
  var levels=[...grid.children].filter(function(card){var t=(card.querySelector('.label')?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return t.includes('unterstützung')||t.includes('unterstezung')||t.includes('widerstand')});
  if(!levels.length)return;
  var wrap=charts.querySelector('.sr-between-price');
  if(!wrap){wrap=document.createElement('div');wrap.className='sr-between-price';wrap.style.display='grid';wrap.style.gridTemplateColumns='1fr 1fr';wrap.style.gap='6px';wrap.style.marginBottom='6px';charts.insertBefore(wrap,price)}
  levels.forEach(function(card){card.style.margin='0';card.style.padding='7px 8px';card.querySelector('.value')&&(card.querySelector('.value').style.fontSize='14px');wrap.appendChild(card)});
 });
}
function init(){var root=document.getElementById('individuals');if(!root)return;moveLevels();new MutationObserver(function(){moveLevels()}).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
