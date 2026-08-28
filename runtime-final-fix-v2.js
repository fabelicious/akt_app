/* Final market-data/WKN runtime adapter v2.
   Primary browser-safe source: Jina Reader as a CORS-capable server-side fetch.
   Fallbacks remain available. */
(function(){
  'use strict';
  if(window.__AKT_FINAL_FIX_V2__) return;
  window.__AKT_FINAL_FIX_V2__=true;
  const nativeFetch=window.fetch.bind(window);
  const CHART=/\/v8\/finance\/chart\//i;
  const SEARCH=/\/v1\/finance\/search(?:\?|$)/i;
  const timeout=async(url,ms,init={})=>{
    const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
    try{return await nativeFetch(url,{...init,cache:'no-store',signal:c.signal});}
    finally{clearTimeout(t);}
  };
  function unwrap(url){try{const s=String(url),m=s.match(/[?&]url=([^&].*)$/);return m?decodeURIComponent(m[1]):s;}catch(_){return String(url);}}
  function validChart(j){const z=j?.chart?.result?.[0];return !!(z?.timestamp?.length>=60&&z?.indicators?.quote?.[0]?.close?.length>=60);}
  function csvToChart(text,symbol){
    const lines=String(text||'').trim().split(/\r?\n/).filter(Boolean);
    if(lines.length<61)return null;
    const h=lines.shift().split(',').map(x=>x.trim().toLowerCase()),di=h.indexOf('date'),ci=h.indexOf('close'),vi=h.indexOf('volume');
    if(di<0||ci<0)return null;
    const timestamp=[],close=[],volume=[];
    for(const line of lines){const p=line.split(','),d=p[di],c=Number(p[ci]);if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(c)){timestamp.push(Math.floor(Date.parse(d+'T00:00:00Z')/1000));close.push(c);volume.push(vi>=0&&Number.isFinite(Number(p[vi]))?Number(p[vi]):0);}}
    if(timestamp.length<60)return null;
    return {chart:{result:[{meta:{symbol},timestamp,indicators:{quote:[{close,volume}],adjclose:[{adjclose:close}]}}],error:null}};
  }
  async function readJina(url){
    const u='https://r.jina.ai/'+url;
    const r=await timeout(u,9000,{headers:{'Accept':'application/json','X-Engine':'direct','X-Respond-With':'text'}});
    if(!r.ok)throw Error('Jina HTTP '+r.status);
    const text=await r.text();
    try{return JSON.parse(text);}catch(_){
      const start=text.indexOf('{'),end=text.lastIndexOf('}');
      if(start>=0&&end>start)return JSON.parse(text.slice(start,end+1));
      throw Error('Jina returned non-JSON');
    }
  }
  async function chartRequest(target,symbol){
    const candidates=[
      ()=>readJina(target),
      ()=>readJina(target.replace('query1.finance.yahoo.com','query2.finance.yahoo.com')),
      async()=>{const r=await timeout(target,5000);if(!r.ok)throw Error('Yahoo HTTP '+r.status);return r.json();},
      async()=>{const u='https://corsproxy.io/?url='+encodeURIComponent(target);const r=await timeout(u,5000);if(!r.ok)throw Error('proxy HTTP '+r.status);return r.json();}
    ];
    for(const get of candidates){try{const j=await get();if(validChart(j))return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}catch(_){} }
    for(const s of [symbol.toLowerCase()+'.us',symbol.toLowerCase()]){
      const u='https://stooq.com/q/d/l/?s='+encodeURIComponent(s)+'&d1=20190101&d2=20991231&i=d';
      for(const get of [()=>timeout(u,7000),()=>timeout('https://r.jina.ai/'+u,9000)]){
        try{const r=await get();if(r.ok){const text=await r.text();const j=csvToChart(text,symbol);if(j)return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}}catch(_){}
      }
    }
    throw Error('Kursdaten für '+symbol+' konnten nicht geladen werden.');
  }
  async function searchRequest(q,target){
    for(const u of [target,target.replace('query1.finance.yahoo.com','query2.finance.yahoo.com')]){
      try{const j=await readJina(u);if(j)return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}catch(_){}
    }
    try{const r=await timeout('https://corsproxy.io/?url='+encodeURIComponent(target),5000);if(r.ok)return r;}catch(_){}
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
