/* Narrow WKN resolver bridge: only intercepts OpenFIGI mapping requests.
   Existing chart/search/network behaviour remains untouched. */
(function(){
  'use strict';
  const nativeFetch=window.fetch.bind(window);
  let mapPromise=null;
  function loadMap(){
    if(!mapPromise) mapPromise=nativeFetch('./wkn-map.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    return mapPromise;
  }
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url==='https://api.openfigi.com/v3/mapping' && init && String(init.method||'GET').toUpperCase()==='POST'){
      try{
        const body=JSON.parse(init.body||'{}');
        const id=String(body?.[0]?.idValue||'').trim().toUpperCase();
        if(/^[A-Z0-9]{6}$/.test(id)){
          const map=await loadMap();
          const item=map?.items?.[id];
          if(item){
            return new Response(JSON.stringify([{data:[{ticker:item.ticker,name:item.name,securityDescription:item.name,exchCode:'',marketSector:'Equity',securityType:'Common Stock',securityType2:'Common Stock'}]}]),{status:200,headers:{'Content-Type':'application/json'}});
          }
        }
      }catch(_){/* fall through to original OpenFIGI request */}
    }
    return originalFetch(input,init);
  };
})();
