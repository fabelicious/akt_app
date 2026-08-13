/* Narrow WKN resolver cache: only intercepts the OpenFIGI mapping endpoint.
   All other network requests, including Yahoo/chart requests, are untouched. */
(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  let mapPromise=null;
  async function getMap(){
    if(!mapPromise) mapPromise=originalFetch('./wkn-map.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    return mapPromise;
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
    return originalFetch(input,init);
  };
})();
