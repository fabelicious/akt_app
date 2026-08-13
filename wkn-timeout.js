(function(){
  'use strict';

  const nativeFetch=window.fetch.bind(window);
  const PROXY='https://corsproxy.io/?url=';
  const YAHOO=/^https:\/\/query1\.finance\.yahoo\.com\//i;
  const FIGI=/^https:\/\/api\.openfigi\.com\/v3\/mapping/i;

  function request(input, init, timeoutMs){
    const controller=new AbortController();
    const originalSignal=init&&init.signal;
    let onAbort;
    if(originalSignal){
      if(originalSignal.aborted) controller.abort();
      else {
        onAbort=()=>controller.abort();
        originalSignal.addEventListener('abort',onAbort,{once:true});
      }
    }
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    const options=Object.assign({},init||{}, {signal:controller.signal});
    return nativeFetch(input,options).finally(()=>{
      clearTimeout(timer);
      if(originalSignal&&onAbort) originalSignal.removeEventListener('abort',onAbort);
    });
  }

  window.fetch=function(input,init){
    const url=typeof input==='string' ? input : (input&&input.url)||'';

    // Yahoo blocks direct browser access intermittently. GitHub Pages is an
    // explicitly supported free origin for CORSPROXY, so use it directly.
    // This removes the old 9s direct-request + 9s fallback delay.
    if(YAHOO.test(url)){
      const proxied=PROXY+encodeURIComponent(url);
      return request(proxied,init,5000);
    }

    // WKN -> ticker resolution via OpenFIGI. Abort the real request, rather
    // than merely racing it, so a stalled connection cannot keep the page busy.
    if(FIGI.test(url)) return request(input,init,2500);

    return nativeFetch(input,init);
  };
})();