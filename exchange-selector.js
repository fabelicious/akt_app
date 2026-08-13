(function(){
  'use strict';
  const venues=[['AUTO','Automatisch'],['XETRA','Xetra'],['FRANKFURT','Frankfurt'],['VIENNA','Wien'],['NYSE','NYSE'],['NASDAQ','NASDAQ'],['LONDON','London'],['PARIS','Paris'],['AMSTERDAM','Amsterdam'],['MILAN','Mailand'],['ZURICH','Zürich'],['TOKYO','Tokio'],['HONGKONG','Hongkong'],['TORONTO','Toronto']];
  const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:1fr 150px;gap:8px;margin-top:4px';
  const inputs=['wkn1','wkn2','wkn3'];
  function add(input,i){
    const parent=input.parentElement;
    const select=document.createElement('select');select.id='exchange'+(i+1);select.title='Handelsplatz';select.style.cssText='width:100%;padding:12px 8px;border-radius:9px;border:1px solid #475569;background:#1f2937;color:#fff;font-size:13px';
    venues.forEach(v=>{const o=document.createElement('option');o.value=v[0];o.textContent=v[1];select.appendChild(o)});
    input.parentElement.style.display='grid';input.parentElement.style.gridTemplateColumns='1fr';
    const holder=document.createElement('div');holder.style.cssText='display:grid;grid-template-columns:1fr 150px;gap:8px;align-items:end';
    parent.insertBefore(holder,input);holder.appendChild(input);holder.appendChild(select);
    input.dataset.exchangeSelect=select.id;
  }
  function selectedSuffix(ex){return ({XETRA:'.DE',FRANKFURT:'.F',LONDON:'.L',PARIS:'.PA',AMSTERDAM:'.AS',MILAN:'.MI',ZURICH:'.SW',VIENNA:'.VI',TOKYO:'.T',HONGKONG:'.HK',TORONTO:'.TO'})[ex]||''}
  window.addEventListener('DOMContentLoaded',()=>{
    inputs.forEach((id,i)=>{const el=document.getElementById(id);if(el)add(el,i)});
    const form=document.getElementById('form');if(!form)return;
    form.addEventListener('submit',()=>{
      inputs.forEach((id,i)=>{const el=document.getElementById(id),sel=document.getElementById('exchange'+(i+1));if(!el||!sel)return;const v=el.value.trim();if(!v||sel.value==='AUTO'||/^[A-Z0-9]{6}$/.test(v))return;const suffix=selectedSuffix(sel.value);if(!suffix)return;const bare=v.replace(/\.(DE|F|L|PA|AS|MI|SW|VI|T|HK|TO)$/i,'');if(/^[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(bare))el.value=bare+suffix});
    },true);
  });
})();
