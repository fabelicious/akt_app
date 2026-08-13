(function(){'use strict';
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.indexOf('api.openfigi.com/v3/mapping')!==-1){
      const c=new AbortController();
      const originalSignal=init&&init.signal;
      const timer=setTimeout(()=>c.abort(),1800);
      const opts=Object.assign({},init||{}, {signal:c.signal});
      return nativeFetch(input,opts).finally(()=>clearTimeout(timer));
    }
    return nativeFetch(input,init);
  };
})();