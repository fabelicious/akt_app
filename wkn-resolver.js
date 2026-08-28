/* Deterministic local-first WKN resolver.
   The app still uses its normal OpenFIGI interface, but known WKNs are resolved
   locally so browser/API/network failures cannot break WKN lookup. */
(function(){
  'use strict';
  const nativeFetch=window.fetch.bind(window);
  let mapPromise;
  const normalize=v=>String(v??'').replace(/^WKN\s*[:#-]?\s*/i,'').trim().toUpperCase();
  function loadMap(){
    if(!mapPromise){
      mapPromise=nativeFetch('./wkn-map.json?v=local',{cache:'no-store'})
        .then(r=>{if(!r.ok) throw Error('WKN map HTTP '+r.status);return r.json();})
        .catch(()=>null);
    }
    return mapPromise;
  }
  async function bodyOf(input,init){
    if(init && init.body!=null) return typeof init.body==='string'?init.body:JSON.stringify(init.body);
    if(input && typeof input.clone==='function'){
      try{return await input.clone().text();}catch(_){ }
    }
    return '';
  }
  function responseFor(item){
    return new Response(JSON.stringify([{data:[{
      figi:item.figi||'',
      securityType:'Common Stock',
      marketSector:'Equity',
      securityType2:'Common Stock',
      ticker:item.symbol||item.ticker||'',
      name:item.name||'',
      securityDescription:item.name||'',
      exchCode:item.exchCode||''
    }]}]),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(/^https:\/\/api\.openfigi\.com\/v3\/mapping\/?$/i.test(url)){
      try{
        const body=await bodyOf(input,init);
        const jobs=JSON.parse(body||'[]');
        if(Array.isArray(jobs)){
          const job=jobs.find(x=>x && String(x.idType||'').toUpperCase()==='ID_WERTPAPIER');
          if(job){
            const key=normalize(job.idValue);
            const map=await loadMap();
            const item=map?.items?.[key];
            if(item) return responseFor(item);
          }
        }
      }catch(_){ }
    }
    return nativeFetch(input,init);
  };
})();
