(function(){
  'use strict';
  function moveLevelsBeforeRecommendation(){
    document.querySelectorAll('.stock-group .grid').forEach(function(grid){
      var cards=Array.from(grid.children);
      var recommendation=cards.find(function(card){
        var label=card.querySelector('.label');
        return label && label.textContent.trim()==='Technische Empfehlung';
      });
      if(!recommendation)return;
      var levels=cards.filter(function(card){
        var label=card.querySelector('.label');
        var text=label ? label.textContent.trim() : '';
        return text==='Unterstützung' || text==='Widerstand';
      });
      levels.forEach(function(card){grid.insertBefore(card,recommendation)});
    });
  }
  function init(){
    var root=document.getElementById('individuals');
    if(!root)return;
    moveLevelsBeforeRecommendation();
    new MutationObserver(moveLevelsBeforeRecommendation).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
