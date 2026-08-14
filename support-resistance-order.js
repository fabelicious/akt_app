(function(){
'use strict';
if(window.__AKT_SR_ORDER_LOADED)return;window.__AKT_SR_ORDER_LOADED=true;
let timer=0;
function moveLevels(){
 document.querySelectorAll('.stock-group').forEach(group=>{
  const charts=group.querySelector('.stock-charts');if(!charts)return;
  const price=charts.querySelector('.chart:not(.small)');if(!price)return;
  const all=[...group.querySelectorAll('.grid .card,.sr-between-price .card,.sr-above-price .card')];
  const levels=all.filter(card=>{const t=(card.querySelector('.label')?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return t==='unterstützung'||t==='widerstand'||t.includes('unterstützung')||t.includes('widerstand')});
  if(!levels.length)return;
  let wrap=charts.querySelector(':scope > .sr-above-price');
  if(!wrap){wrap=document.createElement('div');wrap.className='sr-above-price';wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 6px'}
  if(wrap.nextElementSibling!==price)price.insertAdjacentElement('beforebegin',wrap);
  levels.forEach(card=>{if(card.parentNode!==wrap){card.style.margin='0';card.style.padding='7px 8px';const v=card.querySelector('.value');if(v)v.style.fontSize='14px';wrap.appendChild(card)}});
  charts.querySelectorAll(':scope > .sr-between-price').forEach(old=>{if(old!==wrap)old.remove()});
  charts.querySelectorAll(':scope > .sr-above-price').forEach(x=>{if(x!==wrap)x.remove()});
 });
}
function schedule(){clearTimeout(timer);timer=setTimeout(moveLevels,120)}
function init(){const root=document.getElementById('individuals');if(!root)return;schedule();new MutationObserver(schedule).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();