(function(){
'use strict';
function moveLevels(){
 document.querySelectorAll('.stock-group').forEach(function(group){
  var charts=group.querySelector('.stock-charts'),price=charts&&charts.querySelector('.chart:not(.small)');if(!charts||!price)return;
  var levels=[...group.querySelectorAll('.grid .card, .sr-between-price .card, .sr-above-price .card')].filter(function(card){var t=(card.querySelector('.label')?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return t.includes('unterstützung')||t.includes('unterstezung')||t.includes('widerstand')});
  if(!levels.length)return;
  var wrap=charts.querySelector('.sr-above-price');
  if(!wrap){wrap=document.createElement('div');wrap.className='sr-above-price';wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 6px'}
  price.parentNode.insertBefore(wrap,price);
  levels.forEach(function(card){card.style.margin='0';card.style.padding='7px 8px';var v=card.querySelector('.value');if(v)v.style.fontSize='14px';wrap.appendChild(card)});
  var old=charts.querySelector('.sr-between-price');if(old&&!old.children.length)old.remove();
 });
}
function init(){var root=document.getElementById('individuals');if(!root)return;moveLevels();new MutationObserver(moveLevels).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
