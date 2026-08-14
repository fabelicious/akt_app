(function(){
  'use strict';
  // UI-only ordering fix. Analysis/scoring/data remain untouched.
  // Support + resistance are moved directly between the price chart and indicators.
  function moveLevelsBetweenPriceAndIndicators(){
    document.querySelectorAll('.stock-group').forEach(function(group){
      var grid=group.querySelector('.grid');
      var charts=group.querySelector('.stock-charts');
      if(!grid||!charts)return;
      var price=charts.querySelector('.chart:not(.small)');
      if(!price)return;
      var cards=Array.from(grid.children);
      var levels=cards.filter(function(card){
        var label=card.querySelector('.label');
        var text=label ? label.textContent.replace(/\s+/g,' ').trim().toLowerCase() : '';
        return text.indexOf('unterstezung')!==-1 || text.indexOf('unterstützung')!==-1 || text.indexOf('widerstand')!==-1;
      });
      if(!levels.length)return;
      var levelWrap=charts.querySelector('.sr-between-charts');
      if(!levelWrap){
        levelWrap=document.createElement('div');
        levelWrap.className='sr-between-charts';
        levelWrap.style.display='grid';
        levelWrap.style.gridTemplateColumns='1fr 1fr';
        levelWrap.style.gap='8px';
        levelWrap.style.marginTop='8px';
        price.insertAdjacentElement('afterend',levelWrap);
      }
      levels.forEach(function(card){
        card.style.margin='0';
        levelWrap.appendChild(card);
      });
    });
  }
  function init(){
    var root=document.getElementById('individuals');
    if(!root)return;
    moveLevelsBetweenPriceAndIndicators();
    new MutationObserver(function(){moveLevelsBetweenPriceAndIndicators();}).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
