(function(){
  'use strict';
  // Adds GOLD and SILBER to the existing Yahoo Finance based resolver.
  var metals={
    GOLD:{symbol:'XAUUSD=X',name:'Gold (XAU/USD)'},
    SILBER:{symbol:'XAGUSD=X',name:'Silber (XAG/USD)'},
    XAU:{symbol:'XAUUSD=X',name:'Gold (XAU/USD)'},
    XAG:{symbol:'XAGUSD=X',name:'Silber (XAG/USD)'}
  };
  var originalFetch=window.fetch.bind(window);
  function metalForQuery(url){
    try{
      var decoded=decodeURIComponent(String(url));
      var m=decoded.match(/[?&]q=([^&]+)/i);
      if(!m)return null;
      var q=decodeURIComponent(m[1]).trim().toUpperCase();
      return metals[q]||null;
    }catch(_){return null}
  }
  window.fetch=function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var metal=metalForQuery(url);
    if(metal && /finance\/search/i.test(url)){
      return Promise.resolve(new Response(JSON.stringify({quotes:[{
        symbol:metal.symbol,longname:metal.name,shortname:metal.name,quoteType:'EQUITY'
      }],news:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return originalFetch(input,init);
  };
})();
