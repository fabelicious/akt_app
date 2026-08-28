/* AKT-Pro central market-data provider.
   One responsibility: make Yahoo chart/search requests reliable in the browser.
   It does not resolve WKNs; app.js owns symbol resolution. */
(function(){
  'use strict';
  if(window.__AKT_MARKET_DATA_PROVIDER__) return;
  window.__AKT_MARKET_DATA_PROVIDER__=true;
  const nativeFetch=window.fetch.bind(window);
  const CHART=/^https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\//i;
  const SEARCH=/^https:\/\/query1\.finance\.yahoo\.com\/v1\/finance\/search(?:\?|$)/i;
  const timeout=async(url,ms,init)=>{
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),ms);
    try{return await nativeFetch(url,{...(init||{}),cache:'no-store',signal:c.signal});}
    finally{clearTimeout(t)}
  };
  const validChart=j=>{
    const z=j?.chart?.result?.[0], q=z?.indicators?.quote?.[0];
    return !!(z?.timestamp?.length>=60 && q?.close?.filter(Number.isFinite).length>=60);
  };
  async function jsonVia(url,ms){
    const r=await timeout(url,ms); if(!r.ok) throw Error('HTTP '+r.status); return r.json();
  }
  async function jina(url){
    const r=await timeout('https://r.jina.ai/'+url,10000);
    if(!r.ok) throw Error('Jina '+r.status);
    const text=await r.text();
    try{return JSON.parse(text)}catch(_){
      const a=text.indexOf('{'),b=text.lastIndexOf('}');
      if(a>=0&&b>a)return JSON.parse(text.slice(a,b+1));
      throw Error('invalid JSON');
    }
  }
  async function chart(url){
    const attempts=[
      ()=>jsonVia(url,5000),
      ()=>jina(url),
      ()=>jina(url.replace('query1.finance.yahoo.com','query2.finance.yahoo.com')),
      ()=>jsonVia('https://corsproxy.io/?url='+encodeURIComponent(url),7000),
      ()=>jsonVia('https://api.allorigins.win/raw?url='+encodeURIComponent(url),7000)
    ];
    for(const fn of attempts){try{const j=await fn();if(validChart(j))return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}catch(_){} }
    throw Error('market data unavailable');
  }
  async function search(url){
    const attempts=[()=>jsonVia(url,5000),()=>jina(url),()=>jina(url.replace('query1.finance.yahoo.com','query2.finance.yahoo.com')),()=>jsonVia('https://corsproxy.io/?url='+encodeURIComponent(url),7000)];
    for(const fn of attempts){try{const j=await fn();if(Array.isArray(j?.quotes))return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}catch(_){} }
    throw Error('search unavailable');
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(CHART.test(url)) return chart(url);
    if(SEARCH.test(url)) return search(url);
    return nativeFetch(input,init);
  };
})();
