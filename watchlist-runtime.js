(function(){
  'use strict';
  const KEY='aktpro_watchlist_v1';
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return[]}};
  const save=a=>{localStorage.setItem(KEY,JSON.stringify([...new Set(a.filter(Boolean))]));render()};
  let list=load();
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function keyFor(el){return (el.dataset.watchKey||el.querySelector('.top10-wkn')?.textContent||el.querySelector('.summary-main b')?.textContent||'').trim()}
  function toggle(key){if(!key)return;list=list.includes(key)?list.filter(x=>x!==key):[...list,key];save(list)}
  function addButtons(){
    document.querySelectorAll('#top10Grid .top10-item,#individuals .stock-group').forEach(el=>{
      if(el.querySelector('.watch-star'))return;
      const key=keyFor(el);if(!key)return;el.dataset.watchKey=key;
      const b=document.createElement('button');b.type='button';b.className='watch-star';b.title='Watchlist';b.textContent=list.includes(key)?'★':'☆';
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle(key)});
      const target=el.querySelector('summary')||el.querySelector('.top10-detail')||el;
      target.parentNode.insertBefore(b,target);
    });
  }
  function render(){
    const panel=document.getElementById('watchlistPanel');if(!panel)return;
    const body=panel.querySelector('.watchlist-items');
    body.innerHTML=list.length?list.map(x=>'<span class="watch-item">'+esc(x)+'</span>').join(''):'<span class="watch-empty">Noch keine Titel markiert.</span>';
    addButtons();
    document.querySelectorAll('.watch-star').forEach(b=>{const parent=b.closest('.top10-item,.stock-group');b.textContent=list.includes(keyFor(parent))?'★':'☆'});
  }
  function exportCode(){return btoa(unescape(encodeURIComponent(JSON.stringify(list))))}
  function importCode(v){try{const a=JSON.parse(decodeURIComponent(escape(atob(v.trim()))));if(!Array.isArray(a))throw 0;list=[...new Set(a.map(String).filter(Boolean))];save(list);return true}catch(_){return false}}
  function initPanel(){
    if(document.getElementById('watchlistPanel'))return;
    const top=document.getElementById('top10Panel');if(!top)return;
    const p=document.createElement('section');p.id='watchlistPanel';p.className='watchlist-panel';p.innerHTML='<details open><summary>⭐ Meine Watchlist <span class="watch-count"></span></summary><div class="watchlist-body"><div class="watchlist-items"></div><div class="watch-sync"><button type="button" class="action-btn" data-wl-export>Sync-Code erzeugen</button><input data-wl-code placeholder="Sync-Code für anderen Browser/Gerät"><button type="button" class="action-btn" data-wl-import>Importieren</button></div><div class="watch-note">Kostenlos ohne Konto. Die Watchlist bleibt dauerhaft in diesem Browser. Für einen anderen Browser/Gerät den Sync-Code einmal übertragen. Eine echte automatische Cloud-Synchronisation benötigt zusätzlich ein Backend/Konto.</div></div></details>';
    top.insertAdjacentElement('afterend',p);
    p.querySelector('[data-wl-export]').onclick=()=>{const i=p.querySelector('[data-wl-code');i.value=exportCode();i.select()};
    p.querySelector('[data-wl-import]').onclick=()=>{const i=p.querySelector('[data-wl-code');if(importCode(i.value))alert('Watchlist übernommen.');else alert('Ungültiger Sync-Code.')};
    render();
  }
  const css=document.createElement('style');css.textContent='.watchlist-panel{margin-top:11px;background:#fff;border:1px solid #e5e7eb;border-radius:14px}.watchlist-panel summary{cursor:pointer;padding:13px 15px;font-weight:850}.watchlist-body{padding:0 15px 14px}.watchlist-items{display:flex;flex-wrap:wrap;gap:6px}.watch-item{background:#f1f5f9;border-radius:7px;padding:5px 8px;font-size:11px}.watch-empty,.watch-note{font-size:10px;color:#64748b}.watch-sync{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.watch-sync input{flex:1;min-width:180px;padding:8px;border:1px solid #cbd5e1;border-radius:7px}.watch-star{float:right;border:0;background:transparent;color:#d99b00;font-size:20px;cursor:pointer;line-height:1;padding:2px 5px;position:relative;z-index:4}.watch-note{margin-top:8px}@media(max-width:700px){.watch-sync>*{width:100%}.watch-sync input{min-width:0}}';document.head.appendChild(css);
  function boot(){initPanel();addButtons();const c=document.getElementById('individuals');const t=document.getElementById('top10Grid');if(c)new MutationObserver(addButtons).observe(c,{childList:true,subtree:true});if(t)new MutationObserver(addButtons).observe(t,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
