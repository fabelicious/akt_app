/* Targeted network compatibility fix: only Yahoo/known proxy requests are rerouted.
   No application-wide fetch timeout or DOM manipulation. */
(function(){
  'use strict';
  if(window.__aktNetworkFixInstalled)return;
  window.__aktNetworkFixInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  const YAHOO=/^https:\/\/query1\.finance\.yahoo\.com\//i;
  const CORS=/^https:\/\/corsproxy\.io\/\?url=/i;
  window.fetch=function(input,init){
    let url=typeof input==='string'?input:(input&&input.url)||'';
    if(CORS.test(url)){
      try{
        const target=decodeURIComponent(url.split('?url=')[1]||'');
        if(YAHOO.test(target)) url='https://api.allorigins.win/raw?url='+encodeURIComponent(target);
      }catch(_){ }
    }else if(YAHOO.test(url)){
      url='https://api.allorigins.win/raw?url='+encodeURIComponent(url);
    }
    return nativeFetch(url,init);
  };
})();
