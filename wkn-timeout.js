/* Narrow WKN resolver cache plus resilient browser market-data fallback. */
(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  let mapPromise=null;
  async function getMap(){
    if(!mapPromise) mapPromise=originalFetch('./wkn-map.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    return mapPromise;
  }
  function yahooUrlToStooq(url){
    try{
      const m=String(url).match(/\/v8\/finance\/chart\/([^?]+)/i);
      const s=decodeURIComponent(m?.[1]||'').trim();
      if(!s)return null;
      // Stooq uses US tickers as e.g. nvda.us. This fallback is intentionally
      // limited to US equities; non-US symbols continue through the normal path.
      if(/[.]/.test(s))return null;
      return 'https://stooq.com/q/d/l/?s='+encodeURIComponent(s.toLowerCase()+'.us')+'&d1=20190101&d2=20991231&i=d';
    }catch(_){return null}
  }
  function stooqToYahoo(csv,symbol){
    const lines=String(csv||'').trim().split(/\r?\n/).filter(Boolean);
    if(lines.length<61)throw Error('Stooq: zu wenig Historie');
    const head=lines.shift().split(',').map(x=>x.trim().toLowerCase());
    const di=head.indexOf('date'),ci=head.indexOf('close'),vi=head.indexOf('volume');
    if(di<0||ci<0)throw Error('Stooq: ungültiges Format');
    const timestamp=[],close=[],volume=[];
    for(const line of lines){
      const p=line.split(','),d=p[di],c=Number(p[ci]);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(c))continue;
      timestamp.push(Math.floor(new Date(d+'T00:00:00Z').getTime()/1000));
      close.push(c);volume.push(vi>=0&&Number.isFinite(Number(p[vi]))?Number(p[vi]):0);
    }
    if(timestamp.length<60)throw Error('Stooq: zu wenig valide Daten');
    return {chart:{result:[{timestamp,indicators:{quote:[{close,volume}],adjclose:[{adjclose:close}]},meta:{symbol,shortName:symbol,longName:symbol}}],error:null}};
  }
  async function stooqFallback(url){
    const target=yahooUrlToStooq(url);if(!target)return null;
    const candidates=[target,'https://api.allorigins.win/raw?url='+encodeURIComponent(target)];
    for(const u of candidates){
      const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);
      try{
        const r=await originalFetch(u,{cache:'no-store',signal:c.signal});
        if(r.ok){const text=await r.text();return new Response(JSON.stringify(stooqToYahoo(text,url)),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
      }catch(_){}finally{clearTimeout(t)}
    }
    return null;
  }
  async function marketFetch(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!/^https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\//i.test(url))return originalFetch(input,init);
    // Do not inherit app.js' short AbortSignal. The browser fallback owns its timeouts.
    const base={...(init||{})};delete base.signal;
    for(const u of [url,'https://corsproxy.io/?url='+encodeURIComponent(url),'https://api.allorigins.win/raw?url='+encodeURIComponent(url)]){
      const c=new AbortController(),t=setTimeout(()=>c.abort(),u===url?3000:5000);
      try{const r=await originalFetch(u,{...base,signal:c.signal,cache:'no-store'});if(r.ok)return r}catch(_){}finally{clearTimeout(t)}
    }
    return await stooqFallback(url) || Promise.reject(Error('Kursdaten konnten nicht geladen werden.'));
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url==='https://api.openfigi.com/v3/mapping' && init && typeof init.body==='string'){
      try{
        const jobs=JSON.parse(init.body);
        if(Array.isArray(jobs) && jobs.length===1 && jobs[0].idType==='ID_WERTPAPIER'){
          const map=await getMap();
          const key=String(jobs[0].idValue||'').trim().toUpperCase();
          const item=map?.items?.[key];
          if(item){
            const payload=[{data:[{figi:item.figi||'',securityType:'Common Stock',marketSector:'Equity',securityType2:'Common Stock',ticker:item.ticker||item.symbol,name:item.name||key,securityDescription:item.name||key,exchCode:item.exchCode||''}]}];
            return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json'}});
          }
        }
      }catch(_){ }
    }
    return marketFetch(input,init);
  };
})();
