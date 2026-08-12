(function(){
  const suggestionsCache=new Map();
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function setupInput(id){
    const input=document.getElementById(id); if(!input||input.dataset.enhanced)return; input.dataset.enhanced='1';
    input.placeholder='WKN oder Aktienname, z. B. ama'; input.removeAttribute('inputmode');
    const box=document.createElement('div'); box.className='stock-suggestions'; input.parentElement.style.position='relative'; input.parentElement.appendChild(box);
    let timer;
    async function suggest(){
      const q=input.value.trim(); if(q.length<2){box.innerHTML='';box.style.display='none';return;}
      clearTimeout(timer); timer=setTimeout(async()=>{
        try{
          let rows=suggestionsCache.get(q.toUpperCase());
          if(!rows){rows=(await yahooSearch(q)).filter(x=>x.quoteType==='EQUITY'&&x.symbol).slice(0,8);suggestionsCache.set(q.toUpperCase(),rows)}
          box.innerHTML=rows.map((x,i)=>`<button type="button" class="stock-suggestion" data-i="${i}"><b>${esc(x.longname||x.shortname||x.symbol)}</b><span>${esc(x.symbol)}${x.exchange?' · '+esc(x.exchange):''}</span></button>`).join('');
          box.style.display=rows.length?'block':'none';
          box.querySelectorAll('.stock-suggestion').forEach(b=>b.onclick=()=>{const x=rows[+b.dataset.i];input.value=x.symbol;box.style.display='none';input.dataset.selectedSymbol=x.symbol;input.dataset.selectedName=x.longname||x.shortname||x.symbol;});
        }catch(e){box.style.display='none'}
      },250);
    }
    input.addEventListener('input',()=>{delete input.dataset.selectedSymbol;suggest()});
    input.addEventListener('focus',suggest); input.addEventListener('blur',()=>setTimeout(()=>box.style.display='none',180));
  }
  function top10Detail(x,i){
    const score=Number(x.score)||0,last=Number(x.price)||0,name=x.name||x.symbol,wkn=x.wkn||'',chg=x.change==null?'':((Number(x.change)||0).toFixed(2)+'%');
    return `<details class="top10-detail" data-symbol="${esc(x.symbol||'')}" data-wkn="${esc(wkn)}"><summary><span class="top10-plus">+</span><span class="top10-rank">#${i+1}</span><span class="top10-name" title="${esc(name)}">${esc(name)}</span><span class="top10-symbol">${esc(x.symbol||'')}</span><span class="top10-wkn">WKN: <button type="button" class="wkn-copy" data-wkn="${esc(wkn)}">${esc(wkn||'—')}</button></span><span class="top10-score">${Math.round(score)}/100</span></summary><div class="top10-detail-body"><div class="top10-detail-loading">Detailanalyse wird geladen …</div></div></details>`;
  }
  async function loadDetail(d){
    const body=d.querySelector('.top10-detail-body'),sym=d.dataset.symbol,wkn=d.dataset.wkn;
    if(d.dataset.loaded==='1')return; d.dataset.loaded='1';
    try{
      let hit=null;
      if(sym)hit=await trySymbols([sym],d.querySelector('.top10-name')?.textContent||sym);
      if(!hit&&wkn)hit=await resolve(wkn);
      if(!hit)throw Error('Keine Kursdaten verfügbar');
      const temp=document.createElement('div'); temp.innerHTML=stockMarkup(hit,Math.floor(Math.random()*100000));
      const detail=temp.querySelector('.stock-group');
      if(detail){detail.open=true;body.innerHTML='';body.appendChild(detail);const idx=Number(detail.querySelector('canvas')?.id?.match(/-(\d+)$/)?.[1]);drawStockCharts(hit,idx);}
      else throw Error('Detailanalyse konnte nicht erstellt werden');
    }catch(e){d.dataset.loaded='0';body.innerHTML='<div class="top10-detail-error">Detailanalyse konnte nicht geladen werden. '+esc(e.message)+'</div>'}
  }
  window.renderTop10Enhanced=function(j){
    const out=(j.items||[]).filter(x=>Number(x.score)>=90).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    const grid=document.getElementById('top10Grid'); if(!grid)return;
    grid.innerHTML=out.length?out.map(top10Detail).join(''):'<div class="top10-empty">Aktuell keine Treffer ≥90/100.</div>';
    grid.querySelectorAll('.top10-detail').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)loadDetail(d)}));
    grid.querySelectorAll('.wkn-copy').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const w=b.dataset.wkn;if(!w)return;try{await navigator.clipboard.writeText(w);const old=b.textContent;b.textContent='kopiert ✓';setTimeout(()=>b.textContent=old,1000)}catch(_){}}));
  };
  function installStyles(){
    const s=document.createElement('style');s.textContent=`
      .stock-suggestions{display:none;position:absolute;z-index:1000;left:0;right:0;top:100%;background:#fff;border:1px solid #d1d5db;border-radius:10px;margin-top:4px;box-shadow:0 8px 25px rgba(0,0,0,.15);overflow:hidden}.stock-suggestion{display:flex;flex-direction:column;width:100%;text-align:left;border:0;background:#fff;padding:10px 12px;cursor:pointer;color:#172033}.stock-suggestion:hover{background:#f1f5f9}.stock-suggestion span{font-size:11px;color:#64748b;margin-top:2px}.top10-detail{grid-column:span 1;background:#1f2937;border:1px solid #374151;border-radius:12px;overflow:hidden}.top10-detail summary{list-style:none;cursor:pointer;padding:12px;display:grid;grid-template-columns:20px 28px 1fr auto;gap:4px 7px;align-items:center}.top10-detail summary::-webkit-details-marker{display:none}.top10-plus{font-size:24px;font-weight:800;line-height:1}.top10-detail[open] .top10-plus{transform:rotate(45deg)}.top10-detail .top10-rank{grid-column:2}.top10-detail .top10-name{grid-column:3}.top10-detail .top10-symbol{grid-column:3;font-size:11px;color:#94a3b8}.top10-detail .top10-wkn{grid-column:3;font-size:11px;color:#cbd5e1}.top10-detail .top10-score{grid-column:4;grid-row:1 / span 3}.top10-detail-body{padding:0 10px 10px;border-top:1px solid #374151}.top10-detail-body .stock-group{border:0;border-radius:0;background:transparent}.top10-detail-loading,.top10-detail-error{padding:14px;color:#94a3b8;font-size:12px}.top10-detail-error{color:#fca5a5}.top10-detail-body .stock-group summary{background:#fff;color:#172033;border-radius:10px;margin-top:10px}.top10-detail-body .stock-body{background:#fff;border-radius:0 0 10px 10px}
      @media(max-width:750px){.top10-detail{grid-column:span 1}.top10-detail summary{grid-template-columns:20px 25px 1fr auto}.top10-detail .top10-score{grid-column:4;grid-row:1 / span 3}}
    `;document.head.appendChild(s);
  }
  function patchScan(){
    const original=window.scanTop10;
    if(typeof original!=='function')return setTimeout(patchScan,100);
    window.scanTop10=async function(){await original();
      try{const j=JSON.parse(localStorage.getItem('aktpro_top10_cache')||'null');if(j)renderTop10Enhanced(j)}catch(e){}
    };
    renderTop10EnhancedFromCache();
  }
  function renderTop10EnhancedFromCache(){try{const j=JSON.parse(localStorage.getItem('aktpro_top10_cache')||'null');if(j)renderTop10Enhanced(j)}catch(e){}}
  function init(){installStyles();['wkn1','wkn2','wkn3'].forEach(setupInput);patchScan();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
