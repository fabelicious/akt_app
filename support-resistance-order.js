(function(){
  'use strict';
  // UI-only ordering fix. Analysis/scoring/data remain untouched.
  function moveLevelsBeforeRecommendation(){
    document.querySelectorAll('.stock-group .grid').forEach(function(grid){
      var cards=Array.from(grid.children);
      if(!cards.length)return;
      var info=cards.map(function(card,index){
        var label=card.querySelector('.label');
        var text=label ? label.textContent.replace(/\s+/g,' ').trim().toLowerCase() : '';
        return {card:card,index:index,text:text};
      });
      var recommendation=info.find(function(x){return x.text.indexOf('technische empfehlung')!==-1;});
      if(!recommendation)return;
      var support=info.filter(function(x){return x.text.indexOf('unterstützung')!==-1;});
      var resistance=info.filter(function(x){return x.text.indexOf('widerstand')!==-1;});
      // CSS grid order is used so the generated DOM and all existing handlers stay intact.
      cards.forEach(function(card,index){card.style.order=index+10;});
      support.forEach(function(x){x.card.style.order=1;});
      resistance.forEach(function(x){x.card.style.order=2;});
      recommendation.card.style.order=3;
    });
  }
  function init(){
    var root=document.getElementById('individuals');
    if(!root)return;
    moveLevelsBeforeRecommendation();
    new MutationObserver(function(){moveLevelsBeforeRecommendation();}).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
