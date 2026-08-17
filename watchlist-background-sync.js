(function(){'use strict';
if(window.__AKT_WATCHLIST_BACKGROUND_SYNC__)return;
window.__AKT_WATCHLIST_BACKGROUND_SYNC__=1;

const ENDPOINT='https://akt-watchlist-alerts.sp-am.workers.dev';
const WL='aktpro_watchlist_v5';
const TOKEN='aktpro_watchlist_alert_token_v1';
const TOPIC='aktpro_watchlist_ntfy_topic_v1';
const ENABLED='aktpro_watchlist_background_enabled_v1';
const LAST_SYNC='aktpro_watchlist_background_last_sync_v1';
const LAST_TEST='aktpro_watchlist_background_last_test_v1';
const TEST_COOLDOWN=6*60*60*1000;

const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function getList(){
  try{
    const x=JSON.parse(localStorage.getItem(WL)||'[]');
    if(!Array.isArray(x))return[];
    const seen=new Set();
    return x.map(v=>({
      key:String(v.key||v.wkn||v.symbol||'').trim().toUpperCase(),
      title:String(v.title||v.name||v.symbol||v.key||'').trim(),
      symbol:String(v.symbol||'').trim().toUpperCase()
    })).filter(v=>{
      if(!v.key||seen.has(v.key))return false;
      seen.add(v.key);return true;
    }).slice(0,1000);
  }catch(_){return[]}
}

function token(){
  let t=localStorage.getItem(TOKEN);
  if(!t){
    t=crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
    localStorage.setItem(TOKEN,t);
  }
  return t;
}

function topic(){
  let t=localStorage.getItem(TOPIC);
  if(!t){
    t='aktpro-'+token().replace(/-/g,'').slice(0,20);
    localStorage.setItem(TOPIC,t);
  }
  return t;
}

function enabled(){return localStorage.getItem(ENABLED)==='1'}

function setEnabled(v){
  localStorage.setItem(ENABLED,v?'1':'0');
  return sync(true);
}

async function post(path,body){
  const url=ENDPOINT+path;
  let r;
  try{
    r=await fetch(url,{
      method:'POST',
      mode:'cors',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify(body),
      cache:'no-store',
      credentials:'omit',
      redirect:'follow'
    });
  }catch(e){
    throw Error('Verbindung zum Hintergrunddienst fehlgeschlagen: '+String(e?.message||e));
  }

  const text=await r.text();
  let data;
  try{data=text?JSON.parse(text):{}}catch(_){data={raw:text}}

  if(!r.ok){
    const detail=data?.error||data?.message||data?.raw||('HTTP '+r.status);
    throw Error('Hintergrunddienst HTTP '+r.status+': '+detail);
  }

  return data;
}

async function sync(force){
  try{
    const items=getList();
    const fingerprint=JSON.stringify({items,topic:topic(),enabled:enabled()});
    const previous=localStorage.getItem(LAST_SYNC);

    // Do not hammer the worker. Re-sync only when state changed or explicitly forced.
    if(!force && previous===fingerprint){
      setStatus('Hintergrundprüfung: '+(enabled()?'EIN':'AUS')+' · '+items.length+' Titel · Prüfung 1× pro Stunde');
      return {ok:true,skipped:true,items:items.length};
    }

    const data=await post('/sync',{
      token:token(),
      topic:topic(),
      enabled:enabled(),
      items
    });

    localStorage.setItem(LAST_SYNC,fingerprint);
    setStatus('Hintergrundprüfung: '+(enabled()?'EIN':'AUS')+' · '+(data.items??items.length)+' Titel · Prüfung 1× pro Stunde');
    return data;
  }catch(e){
    setStatus('Hintergrunddienst: '+String(e.message||e));
    console.warn('Watchlist background sync:',e);
    throw e;
  }
}

function setStatus(t){
  const e=document.getElementById('wlBgStatus');
  if(e)e.textContent=t;
}

function install(){
  const p=document.getElementById('watchlistPanel');
  if(!p||document.getElementById('wlBgBox'))return;

  const box=document.createElement('div');
  box.id='wlBgBox';
  box.className='watch-bg-box';
  box.innerHTML='<b>🔔 Trendwende-Benachrichtigung</b><span id="wlBgStatus">Wird verbunden …</span><label>ntfy Topic <input id="wlBgTopic" value="'+esc(topic())+'" autocomplete="off"></label><div class="watch-bg-actions"><button type="button" id="wlBgToggle" class="action-btn"></button><button type="button" id="wlBgTest" class="action-btn">Test senden</button><button type="button" id="wlBgOpen" class="action-btn">ntfy öffnen</button></div><small>Die Prüfung läuft serverseitig weiter, auch wenn Browser und Handy geschlossen bzw. gesperrt sind. Wiederholte Tests werden zum Schutz des kostenlosen ntfy-Limits begrenzt.</small>';

  p.querySelector('.watch-sync')?.insertAdjacentElement('afterend',box);

  const inp=box.querySelector('#wlBgTopic');
  inp.onchange=async()=>{
    const v=inp.value.trim().replace(/[^A-Za-z0-9._-]/g,'-').slice(0,80);
    if(v){
      localStorage.setItem(TOPIC,v);
      inp.value=v;
      localStorage.removeItem(LAST_SYNC);
      try{await sync(true)}catch(_){}
    }
  };

  const b=box.querySelector('#wlBgToggle');
  const paint=()=>b.textContent=enabled()?'🔔 Alarm EIN':'🔕 Alarm AUS';
  paint();

  b.onclick=async()=>{
    b.disabled=true;
    try{await setEnabled(!enabled())}catch(_){}
    paint();
    b.disabled=false;
  };

  box.querySelector('#wlBgTest').onclick=async()=>{
    const test=box.querySelector('#wlBgTest');
    const last=Number(localStorage.getItem(LAST_TEST)||0);
    const remaining=TEST_COOLDOWN-(Date.now()-last);

    if(remaining>0){
      const minutes=Math.ceil(remaining/60000);
      setStatus('⚠ Test bereits gesendet. Nächster Test in ca. '+minutes+' Min. möglich.');
      return;
    }

    test.disabled=true;
    test.textContent='Sende …';

    try{
      // Do not call /sync here: testing must not create unnecessary traffic.
      const result=await post('/test',{token:token()});

      if(!result?.ok){
        throw Error(result?.error||'Test wurde vom Hintergrunddienst abgelehnt');
      }

      localStorage.setItem(LAST_TEST,String(Date.now()));
      setStatus('✓ Test erfolgreich an ntfy übergeben · HTTP '+(result.status||200));
    }catch(e){
      const msg=String(e?.message||e);
      setStatus('✕ Test fehlgeschlagen: '+msg);
      console.error('AKT-Pro notification test:',e);
    }finally{
      test.disabled=false;
      test.textContent='Test senden';
    }
  };

  box.querySelector('#wlBgOpen').onclick=()=>window.open('https://ntfy.sh/'+encodeURIComponent(topic()),'_blank','noopener');

  sync(true).catch(()=>{});
}

const css=document.createElement('style');
css.textContent='.watch-bg-box{margin-top:10px;padding:10px;border:1px solid #334155;border-radius:10px;background:#0f172a;display:flex;flex-direction:column;gap:6px;font-size:10px;color:#cbd5e1}.watch-bg-box>b{color:#fff;font-size:11px}.watch-bg-box label{display:flex;align-items:center;gap:6px}.watch-bg-box input{flex:1;min-width:0;padding:7px;border:1px solid #475569;border-radius:7px;background:#111827;color:#fff}.watch-bg-actions{display:flex;gap:6px;flex-wrap:wrap}.watch-bg-actions .action-btn{font-size:10px}.watch-bg-actions .action-btn:disabled{opacity:.55;cursor:wait}.watch-bg-box small{color:#94a3b8}.watch-bg-box span{color:#94a3b8;word-break:break-word}';
document.head.appendChild(css);

function boot(){
  install();
  const p=document.getElementById('watchlistPanel');
  if(p){
    let last='';
    new MutationObserver(()=>{
      const now=JSON.stringify(getList());
      if(now!==last){
        last=now;
        localStorage.removeItem(LAST_SYNC);
        setTimeout(()=>sync(true).catch(()=>{}),250);
      }
    }).observe(p,{childList:true,subtree:true});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
