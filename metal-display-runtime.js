(function(){
  'use strict';
  const METALS={
    'XAUUSD=X':{name:'Gold',unit:'USD/oz'},
    'XAGUSD=X':{name:'Silber',unit:'USD/oz'}
  };
  function findMetalCard(){
    const groups=document.querySelectorAll('#individuals .stock-group');
    for(const g of groups){
      const text=(g.textContent||'').toUpperCase();
      if(text.includes('GOLD')||text.includes('SILBER')||text.includes('XAU/USD')||text.includes('XAG/USD')) return g;
    }
    return null;
  }
  function addPriceCard(g){
    if(!g||g.querySelector('.metal-price-card'))return;
    const body=g.querySelector('.stock-body'); if(!body)return;
    const grid=body.querySelector('.grid'); if(!grid)return;
    const cards=[...grid.querySelectorAll('.card')];
    let price='';
    for(const c of cards){
      const t=(c.textContent||'').toLowerCase();
      if(t.includes('kurs')||t.includes('preis')){price=c.querySelector('.value')?.textContent||'';break}
    }
    const title=(g.textContent||'').toUpperCase();
    const meta=title.includes('SILBER')||title.includes('XAG')?METALS['XAGUSD=X']:METALS['XAUUSD=X'];
    const card=document.createElement('div');
    card.className='card metal-price-card';
    card.innerHTML='<span class="label">Edelmetallpreis</span><div class="value metal-live-price">'+(price||'—')+'</div><div class="sub">'+meta.name+' · '+meta.unit+'</div>';
    grid.insertBefore(card,grid.firstElementChild||null);
  }
  function run(){document.querySelectorAll('#individuals .stock-group').forEach(addPriceCard)}
  const css=document.createElement('style');css.textContent='.metal-price-card{border-left:3px solid #b08d57}.metal-price-card .value{font-size:20px}.metal-price-card .sub{font-size:10px}';document.head.appendChild(css);
  const mo=new MutationObserver(run);mo.observe(document.getElementById('individuals')||document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',run); setTimeout(run,500);setTimeout(run,1500);setTimeout(run,3000);
})();
