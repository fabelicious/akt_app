/* Final browser market-data adapter: direct Yahoo first, then server-side Jina, then Stooq. */
(function(){
  'use strict';
  if(window.__AKT_FINAL_FIX_V3__) return;
  window.__AKT_FINAL_FIX_V3__=true;
  const nativeFetch=window.fetch.bind(window);
  const CHART=/\/v8\/finance\/chart\//i;
  const SEARCH=/\/v1\/finance\/search(?:\?|$)/i;
  const wait=async(url,ms,init={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await nativeFetch(url,{...init,cache:'no-store',signal:c.signal});}finally{clearTimeout(t)}};
  function valid(j){const z=j?.chart?.result?.[0];return !!(z?.timestamp?.length>=60&&z?.indicators?.quote?.[0]?.close?.length>=60)}
  function csv(text,symbol){const a=String(text||'').trim().split(/\r?\n/).filter(Boolean);if(a.length<61)return null;const h=a.shift().split(',').map(x=>x.trim().toLowerCase()),di=h.indexOf('date'),ci=h.indexOf('close'),vi=h.indexOf('volume');if(di<0||ci<0)return null;const timestamp=[],close=[],volume=[];for(const line of a){const p=line.split(','),d=p[di],c=Number(p[ci]);if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(c)){timestamp.push(Math.floor(Date.parse(d+'T00:00:00Z')/1000));close.push(c);volume.push(vi>=0&&Number.isFinite(Number(p[vi]))?Number(p[vi]):0)}}if(timestamp.length<60)return null;return{chart:{result:[{meta:{symbol},timestamp,indicators:{quote:[{close,volume}],adjclose:[{adjclose:close}]}}],error:null}}}
  async function jina(url){const r=await wait('https://r.jina.ai/'+url,10000);if(!r.ok)throw Error('Jina '+r.status);const text=await r.text();try{return JSON.parse(text)}catch(_){const s=text.indexOf('{'),e=text.lastIndexOf('}');if(s>=0&&e>s)return JSON.parse(text.slice(s,e+1));throw Error('invalid JSON')}}
  async function chart(target,symbol){
    const attempts=[
      async()=>{const r=await wait(target,5000);if(!r.ok)throw Error('Yahoo '+r.status);return r.json()},
      ()=>jina(target),
      ()=>jina(target.replace('query1.finance.yahoo.com','query2.finance.yahoo.com')),
      async()=>{const r=await wait('https://corsproxy.io/?url='+encodeURIComponent(target),6000);if(!r.ok)throw Error('proxy '+r.status);return r.json()},
      async()=>{const r=await wait('https://api.allorigins.win/raw?url='+encodeURIComponent(target),6000);if(!r.ok)throw Error('allorigins '+r.status);return r.json()}
    ];
    for(const fn of attempts){try{const j=await fn();if(valid(j))return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json'}})}catch(_){} }
    for(const suffix of ['.us','']){const u='https://stooq.com/q/d/l/?s='+encodeURIComponent(symbol.toLowerCase()+suffix)+'&d1=20190101&d2=20991231&i=d';for(const fn of [()=>wait(u,7000),()=>jina(u)]){try{const r=await fn();if(r.ok){const j=csv(await r.text(),symbol);if(j)return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json'}})}}catch(_){} }}
    throw Error('Kursdaten für '+symbol+' konnten nicht geladen werden.')
  }
  async function search(target){
    const attempts=[async()=>{const r=await wait(target,5000);if(!r.ok)throw Error();return r.json()},()=>jina(target),()=>jina(target.replace('query1.finance.yahoo.com','query2.finance.yahoo.com')),async()=>{const r=await wait('https://corsproxy.io/?url='+encodeURIComponent(target),6000);if(!r.ok)throw Error();return r.json()}];
    for(const fn of attempts){try{const j=await fn();if(j?.quotes)return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json'}})}catch(_){} }
    throw Error('Aktiensuche nicht verfügbar.')
  }
  window.fetch=async function(input,init){const raw=typeof input==='string'?input:(input&&input.url)||'';if(CHART.test(raw)){const m=raw.match(/\/chart\/([^?]+)/i),symbol=decodeURIComponent(m?.[1]||'');if(symbol)return chart(raw,symbol)}if(SEARCH.test(raw))return search(raw);return nativeFetch(input,init)};
})();
