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
  function yahooFromStooq(csv,symbol){
    const lines=String(csv||'').trim().split(/\r?\n/).filter(Boolean);
    if(lines.length<2)throw Error('Stooq: keine Kursdaten');
    const head=lines.shift().split(',').map(x=>x.trim().toLowerCase());
    const idx=n=>head.indexOf(n),di=idx('date'),ci=idx('close'),vi=idx('volume');
    if(di<0||ci<0)throw Error('Stooq: ungültiges Format');
    const timestamp=[],close=[],volume=[];
    for(const line of lines){
      const p=line.split(',');const d=p[di],c=Number(p[ci]);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(c))continue;
      timestamp.push(Math.floor(new Date(d+'T00:00:00Z').getTime()/1000));close.push(c);volume.push(Number.isFinite(Number(p[vi]))?Number(p[vi]):0);
    }
    if(timestamp.length<60)throw Error('Stooq: zu wenig Historie');
    return {chart:{result:[{timestamp,indicators:{quote:[{close,volume}],adjclose:[{adjclose:close}]},meta:{symbol,name:symbol,shortName:symbol,longName:symbol}}],error:null}};
  }
  async function stooqFallback(target){
    try{
      const m=target.match(/\/chart\/([^?]+)/i);const symbol=decodeURIComponent(m?.[1]||'').replace(/\^/g,'').replace(/-/g,'-');
      const stooq=symbol.includes('.')?symbol.split('.')[0].toLowerCase()+'.us':symbol.toLowerCase()+'.us';
      const url='https://stooq.com/q/d/l/?s='+encodeURIComponent(stooq)+'&d1=20190101&d2=20991231&i=d';
      for(const u of [url,'https://api.allorigins.win/raw?url='+encodeURIComponent(url)]){
        try{const ctl=withTimeout(7000);const r=await nativeFetch(u,{cache:'no-store',signal:ctl.signal});if(r.ok){const text=await r.text();ctl.clear();return new Response(JSON.stringify(yahooFromStooq(text,symbol)),{status:200,headers:{'Content-Type':'application/json'}})}ctl.clear()}catch(_){}
      }
    }catch(_){}
    return null;
  }
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
    const base={...init};delete base.signal;
    for(const u of candidates){
      const ctl=withTimeout(5000);
      try{const r=await nativeFetch(u,{...base,signal:ctl.signal,cache:'no-store'});if(r.ok)return r;last=r}catch(e){last=e}finally{ctl.clear()}
    }
    const fallback=await stooqFallback(target);if(fallback)return fallback;
    if(last instanceof Response)return last;
    throw last||Error('Kursdaten konnten nicht geladen werden.');
  }
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return YAHOO.test(targetOf(url))?request(url,init):nativeFetch(input,init);
  };
})();
