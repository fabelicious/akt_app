(function(){
'use strict';
if(window.__AKT_SR_ORDER_LOADED)return;window.__AKT_SR_ORDER_LOADED=true;
let running=false,timer=0;
function moveLevels(){
 if(running)return;running=true;
 document.querySelectorAll('.stock-group').forEach(function(group){
  var charts=group.querySelector('.stock-charts'),price=charts&&charts.querySelector('.chart:not(.small)');if(!charts||!price)return;
  var levels=[...group.querySelectorAll('.grid .card, .sr-between-price .card, .sr-above-price .card')].filter(function(card){var t=(card.querySelector('.label')?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return t.includes('unterstützung')||t.includes('unterstezung')||t.includes('widerstand')});
  if(!levels.length)return;
  var wrap=charts.querySelector('.sr-above-price');
  if(!wrap){wrap=document.createElement('div');wrap.className='sr-above-price';wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 6px';price.parentNode.insertBefore(wrap,price)}
  levels.forEach(function(card){if(card.parentNode!==wrap){card.style.margin='0';card.style.padding='7px 8px';var v=card.querySelector('.value');if(v)v.style.fontSize='14px';wrap.appendChild(card)}});
  var old=charts.querySelector('.sr-between-price');if(old&&old!==wrap&&!old.children.length)old.remove();
 });
 running=false;
}
function schedule(){clearTimeout(timer);timer=setTimeout(moveLevels,80)}
function init(){var root=document.getElementById('individuals');if(!root)return;schedule();new MutationObserver(schedule).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();