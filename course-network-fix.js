/* Targeted course/search fallback. Keeps the existing analysis code unchanged. */
(function(){
  'use strict';
  if(window.__aktCourseNetworkFix)return;
  window.__aktCourseNetworkFix=true;
  const nativeFetch=window.fetch.bind(window);
  const YAHOO=/^https:\/\/query1\.finance\.yahoo\.com\//i;
  const PROXY=/^(https:\/\/corsproxy\.io\/\?url=|https:\/\/api\.allorigins\.win\/raw\?url=)/i;
  function targetOf(url){try{const m=url.match(/\?url=(.*)$/i);return m?decodeURIComponent(m[1]):url}catch(_){return url}}
  function withTimeout(ms){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);return {signal:c.signal,clear:()=>clearTimeout(t)}}
  async function request(url,init={}){
    const target=targetOf(url);
    if(!YAHOO.test(target))return nativeFetch(url,init);
    const candidates=[];
    if(PROXY.test(url)){
      candidates.push(url);
      if(/^https:\/\/corsproxy\.io\//i.test(url))candidates.push('https://api.allorigins.win/raw?url='+encodeURIComponent(target));
      candidates.push(target);
    }else{
      candidates.push('https://corsproxy.io/?url='+encodeURIComponent(target));
      candidates.push('https://api.allorigins.win/raw?url='+encodeURIComponent(target));
      candidates.push(target);
    }
    let last=null;
    // Do not forward the caller's AbortSignal: app.js uses a short 2.5s timeout,
    // while the fallback may legitimately need more than one network hop.
    const base={...init};delete base.signal;
    for(const u of candidates){
      const ctl=withTimeout(5000);
      try{
        const r=await nativeFetch(u,{...base,signal:ctl.signal,cache:'no-store'});
        if(r.ok)return r;
        last=r;
      }catch(e){last=e}
      finally{ctl.clear()}
    }
    if(last instanceof Response)return last;
    throw last||Error('Kursdaten konnten nicht geladen werden.');
  }
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return YAHOO.test(targetOf(url))?request(url,init):nativeFetch(input,init);
  };
})();
