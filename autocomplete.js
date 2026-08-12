(function(){
  'use strict';
  const getEl=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const cache=new Map();
  const selected=new Map();
  const local=[
    ['a11099','Arista Networks, Inc.','ANET','A11099'],
    ['arista','Arista Networks, Inc.','ANET','A11099'],
    ['anet','Arista Networks, Inc.','ANET','A11099'],
    ['amazon','Amazon.com, Inc.','AMZN','906866'],
    ['ama','Amazon.com, Inc.','AMZN','906866'],
    ['nvidia','NVIDIA Corporation','NVDA','918422'],
    ['nvda','NVIDIA Corporation','NVDA','918422']
  ];
  function localMatches(q){
    q=q.toLowerCase();
    return local.filter(x=>x[0].startsWith(q)||x[1].toLowerCase().includes(q)||x[2].toLowerCase().startsWith(q));
  }
  async function remoteMatches(q){
    const key=q.toLowerCase();
    if(cache.has(key)) return cache.get(key);
    try{
      const url='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=20&newsCount=0';
      const proxies=[u=>'https://corsproxy.io/?url='+encodeURIComponent(u),u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)];
      for(const make of proxies){
        try{
          const r=await fetch(make(url),{cache:'no-store'});
          if(!r.ok) continue;
          const j=await r.json();
          const out=[];const seen=new Set();
          for(const x of (j.quotes||[])){
            if(x.quoteType!=='EQUITY'||!x.symbol) continue;
            const sym=String(x.symbol).toUpperCase();
            if(seen.has(sym)) continue;
            seen.add(sym);
            out.push(['',x.longname||x.shortname||sym,sym,'']);
            if(out.length>=12) break;
          }
          cache.set(key,out);return out;
        }catch(_){ }
      }
    }catch(_){ }
    cache.set(key,[]);return [];
  }
  function style(){
    if(document.getElementById('dynamicAutocompleteStyle')) return;
    const s=document.createElement('style');s.id='dynamicAutocompleteStyle';
    s.textContent='.dynamic-stock-suggestions{position:absolute;z-index:100000;left:0;right:0;top:calc(100% + 4px);display:none;background:#fff;color:#172033;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 30px rgba(15,23,42,.2);max-height:320px;overflow:auto}.dynamic-stock-suggestion{display:flex;width:100%;flex-direction:column;align-items:flex-start;padding:10px 12px;border:0;border-bottom:1px solid #eef2f7;background:#fff;color:#172033;text-align:left;cursor:pointer}.dynamic-stock-suggestion:hover{background:#f1f5f9}.dynamic-stock-suggestion b{font-size:14px}.dynamic-stock-suggestion span{font-size:11px;color:#64748b}';
    document.head.appendChild(s);
  }
  function setup(input){
    if(!input||input.dataset.dynamicAutocomplete==='1') return;
    input.dataset.dynamicAutocomplete='1';
    const parent=input.parentElement;if(!parent)return;
    parent.style.position='relative';style();
    const box=document.createElement('div');box.className='dynamic-stock-suggestions';parent.appendChild(box);
    let seq=0;
    const render=rows=>{box._rows=rows;box.innerHTML=rows.map((r,i)=>'<button type="button" class="dynamic-stock-suggestion" data-i="'+i+'"><b>'+esc(r[1])+'</b><span>'+esc(r[2])+(r[3]?' · WKN '+esc(r[3]):' · Aktie')+'</span></button>').join('');box.style.display=rows.length?'block':'none'};
    input.addEventListener('input',async()=>{
      const q=input.value.trim();
      selected.delete(q.toUpperCase());
      input.dataset.selectedSymbol='';input.dataset.selectedWkn='';
      if(!q){box.style.display='none';return;}
      const n=++seq;render(localMatches(q));
      if(q.length<2)return;
      const remote=await remoteMatches(q);if(n!==seq)return;
      const all=[...localMatches(q),...remote],seen=new Set(),merged=[];
      for(const r of all){const k=(r[2]||r[3]||r[1]).toUpperCase();if(seen.has(k))continue;seen.add(k);merged.push(r);if(merged.length>=12)break;}
      render(merged);
    });
    box.addEventListener('pointerdown',e=>{
      const b=e.target.closest('button');if(!b)return;e.preventDefault();
      const r=box._rows?.[Number(b.dataset.i)];if(!r)return;
      const value=(r[3]||r[2]||'').toUpperCase();
      input.value=value;
      input.dataset.selectedSymbol=(r[2]||'').toUpperCase();
      input.dataset.selectedWkn=(r[3]||'').toUpperCase();
      input.dataset.selectedName=r[1]||'';
      if(value) selected.set(value,{symbol:(r[2]||'').toUpperCase(),wkn:(r[3]||'').toUpperCase(),name:r[1]||''});
      box.style.display='none';
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    input.addEventListener('keydown',e=>{if(e.key==='Escape')box.style.display='none';});
    input.addEventListener('blur',()=>setTimeout(()=>box.style.display='none',180));
  }
  function init(){['wkn1','wkn2','wkn3'].forEach(id=>setup(getEl(id)));
    // The main app normally resolves a 6-character WKN. When the user selected
    // a Yahoo result without a WKN, use that verified ticker directly instead.
    const original=window.resolve;
    if(typeof original==='function' && !window.__aktAutocompleteResolvePatched){
      window.__aktAutocompleteResolvePatched=true;
      window.resolve=async function(value,onProgress){
        const hit=selected.get(String(value||'').trim().toUpperCase());
        if(hit && hit.symbol){
          onProgress?.(20,'Ausgewählter Titel wird übernommen …',2);
          try{
            const p=await window.chartData(hit.symbol,()=>onProgress?.(65,'Kursdaten werden geladen …',4));
            return {name:hit.name||p.meta?.longName||p.meta?.shortName||hit.symbol,symbol:hit.symbol,data:p.data,meta:p.meta||{}};
          }catch(e){
            // Fall back to the normal WKN resolver if the selected ticker fails.
          }
        }
        return original(value,onProgress);
      };
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
