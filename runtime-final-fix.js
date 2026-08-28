(function(){
  'use strict';
  if(window.__AKT_FINAL_FIX__) return;
  window.__AKT_FINAL_FIX__=true;
  const nativeFetch=window.fetch.bind(window);
  const CHART=/\/v8\/finance\/chart\//i;
  const SEARCH=/\/v1\/finance\/search(?:\?|$)/i;
  const timeout=async(url,ms=6500,init={})=>{
    const c=new AbortController(), t=setTimeout(()=>c.abort(),ms);
    try{return await nativeFetch(url,{...init,cache:'no-store',signal:c.signal});}
    finally{clearTimeout(t);}
  };
  function unwrap(url){try{const s=String(url),m=s.match(/[?&]url=([^&].*)$/);return m?decodeURIComponent(m[1]):s;}catch(_){return String(url);}}
  function validChart(j){const z=j?.chart?.result?.[0];return !!(z?.timestamp?.length>=60&&z?.indicators?.quote?.[0]?.close);}
  function csvToChart(text,symbol){
    const lines=String(text||'').trim().split(/\r?\n/).filter(Boolean); if(lines.length<61)return null;
    const h=lines.shift().split(',').map(x=>x.trim().toLowerCase()),di=h.indexOf('date'),ci=h.indexOf('close'),vi=h.indexOf('volume'); if(di<0||ci<0)return null;
    const timestamp=[],close=[],volume=[];
    for(const line of lines){const p=line.split(','),d=p[di],c=Number(p[ci]);if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(c)){timestamp.push(Math.floor(Date.parse(d+'T00:00:00Z')/1000));close.push(c);volume.push(vi>=0&&Number.isFinite(Number(p[vi]))?Number(p[vi]):0);}}
    if(timestamp.length<60)return null;
    return {chart:{result:[{meta:{symbol},timestamp,indicators:{quote:[{close,volume}],adjclose:[{adjclose:close}]}}],error:null}};
  }
  async function chartRequest(target,symbol){
    const candidates=[target,target.replace('query1.finance.yahoo.com','query2.finance.yahoo.com'),'https://corsproxy.io/?url='+encodeURIComponent(target),'https://api.allorigins.win/raw?url='+encodeURIComponent(target),'https://corsproxy.org/?url='+encodeURIComponent(target),'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(target),'https://cors.isomorphic-git.org/'+target];
    for(const url of candidates){try{const r=await timeout(url,6500);if(r.ok){const j=await r.json();if(validChart(j))return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}}catch(_){} }
    for(const s of [symbol.toLowerCase()+'.us',symbol.toLowerCase()]){const u='https://stooq.com/q/d/l/?s='+encodeURIComponent(s)+'&d1=20190101&d2=20991231&i=d';for(const url of [u,'https://api.allorigins.win/raw?url='+encodeURIComponent(u)]){try{const r=await timeout(url,7000);if(r.ok){const j=csvToChart(await r.text(),symbol);if(j)return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}}catch(_){} }}
    throw Error('Kursdaten für '+symbol+' konnten nicht geladen werden.');
  }
  async function searchRequest(q,target){
    const candidates=[target,target.replace('query1.finance.yahoo.com','query2.finance.yahoo.com'),'https://autoc.finance.yahoo.com/autoc?query='+encodeURIComponent(q)+'&region=1&lang=en'];
    for(const url of candidates){try{const r=await timeout(url,5000);if(r.ok){const j=await r.json();if(Array.isArray(j?.quotes)||Array.isArray(j?.ResultSet?.Result))return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}}catch(_){} }
    for(const proxy of ['https://corsproxy.io/?url=','https://api.allorigins.win/raw?url=','https://corsproxy.org/?url=','https://api.codetabs.com/v1/proxy?quest=']){try{const r=await timeout(proxy+encodeURIComponent(target),6000);if(r.ok){const j=await r.json();if(j)return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}}catch(_){} }
    throw Error('Aktiensuche für '+q+' nicht verfügbar.');
  }
  window.fetch=async function(input,init){
    const raw=typeof input==='string'?input:(input&&input.url)||'',target=unwrap(raw);
    if(CHART.test(target)){const m=target.match(/\/chart\/([^?]+)/i),symbol=decodeURIComponent(m?.[1]||'');if(symbol)return chartRequest(target,symbol);}
    if(SEARCH.test(target)){const q=new URL(target).searchParams.get('q')||'';if(q)return searchRequest(q,target);}
    return nativeFetch(input,init);
  };
  document.addEventListener('submit',function(e){if(e.target?.id!=='form')return;document.querySelectorAll('#wkn1,#wkn2,#wkn3').forEach(el=>{el.value=String(el.value||'').trim().replace(/^WKN\s*[:#-]?\s*/i,'').trim();});},true);
})();
