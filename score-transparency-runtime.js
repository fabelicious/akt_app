(function(){
'use strict';
function num(v){const n=Number(String(v??'').replace(',','.').replace(/[^0-9+\-.]/g,''));return Number.isFinite(n)?n:null}
function lastNumber(a){for(let i=a.length-1;i>=0;i--){const n=Number(a[i]);if(Number.isFinite(n))return n}return null}
function band(v,levels){if(v==null)return 0;for(const x of levels)if(v>=x[0])return x[1];return 0}
function calc(group,total){
  const cards=[...group.querySelectorAll('.grid .card')];
  const get=(label)=>{const c=cards.find(x=>x.querySelector('.label')?.textContent?.trim()===label);return c?.querySelector('.value')?.textContent||''};
  const last=num(get('Kurs')),rsi=num(get('RSI 14')),mom3=num(get('Momentum 3M')),mom12=num(get('Momentum 12M')),vol=num(get('Volatilität')),vr=num(get('Volumen-Bestätigung'));
  const smaText=get('SMA 20 / 50 / 200').split('/').map(num),sma20=smaText[0],sma50=smaText[1],sma200=smaText[2];
  let trend20=0;if(sma200!=null&&last!=null){if(last>sma200)trend20+=12;else if(last>sma200*.95)trend20+=5;if(sma50!=null){if(sma50>sma200)trend20+=8;else if(sma50>sma200*.97)trend20+=3}}
  let trend15=0;if(sma50!=null&&last!=null){if(last>sma50)trend15+=8;else if(last>sma50*.97)trend15+=3}if(sma20!=null&&last!=null){if(last>sma20)trend15+=7;else if(last>sma20*.97)trend15+=3}
  // 6M momentum is reconstructed from the visible price chart (about 126 trading days).
  let mom6=null;const price=group.querySelector('canvas[id^="price-"]');const pc=price&&window.Chart?.getChart(price);const pa=pc?.data?.datasets?.[0]?.data||[];if(pa.length>20){const clean=pa.map(Number).filter(Number.isFinite);if(clean.length>126&&clean.at(-127)>0)mom6=(clean.at(-1)/clean.at(-127)-1)*100;else if(clean.length>2&&clean[0]>0)mom6=(clean.at(-1)/clean[0]-1)*100}
  let mom20=band(mom3,[[8,8],[3,5],[0,2]])+band(mom6,[[15,7],[5,4],[0,2]])+band(mom12,[[25,5],[10,3],[0,1]]);mom20=Math.min(20,mom20);
  const macdCanvas=group.querySelector('canvas[id^="macd-"]'),mc=macdCanvas&&window.Chart?.getChart(macdCanvas),mv=lastNumber(mc?.data?.datasets?.[0]?.data||[]),ms=lastNumber(mc?.data?.datasets?.[1]?.data||[]),mh=mv!=null&&ms!=null?mv-ms:null;let macdPts=0;if(mh!=null&&mh>0&&mv>0)macdPts=10;else if(mh!=null&&mh>0)macdPts=6;else if(mv!=null&&mv>0)macdPts=3;
  let rsiPts=0;if(rsi!=null){if(rsi>=50&&rsi<=65)rsiPts=10;else if(rsi>=45&&rsi<50)rsiPts=7;else if(rsi>65&&rsi<=72&&last>sma50)rsiPts=7;else if(rsi>=35&&rsi<45)rsiPts=4;else if(rsi>72)rsiPts=2}
  let volPts=0;if(vr!=null&&last!=null&&sma20!=null){if(vr>=1.3&&last>sma20)volPts=10;else if(vr>=1.15&&last>sma20)volPts=8;else if(vr>=.9)volPts=5;else volPts=2}
  let riskBase=0;if(vol!=null){if(vol<18)riskBase=10;else if(vol<28)riskBase=8;else if(vol<40)riskBase=5;else if(vol<55)riskBase=3;else riskBase=1}
  let structure=0;const clean=pa.map(Number).filter(Number.isFinite).slice(-60);if(clean.length){const hi=Math.max(...clean),lo=Math.min(...clean),range=hi-lo,position=range>0?(clean.at(-1)-lo)/range:.5;if(position>=.8)structure=5;else if(position>=.6)structure=3;else if(position>=.4)structure=1}
  const known=trend20+trend15+mom20+macdPts+rsiPts+volPts+structure;const risk=Number.isFinite(total)?Math.max(-3,Math.min(10,total-known)):riskBase;const ddAdj=risk-riskBase;
  return [{name:'Langfristiger Trend',points:trend20,max:20},{name:'Kurz-/Mittelfristiger Trend',points:trend15,max:15},{name:'Momentum',points:mom20,max:20},{name:'MACD',points:macdPts,max:10},{name:'RSI',points:rsiPts,max:10},{name:'Volumen',points:volPts,max:10},{name:'Risiko / Volatilität',points:risk,max:10,detail:`Volatilität ${riskBase}/10${ddAdj<0?' · Drawdown-Abzug '+ddAdj:''}`},{name:'Kursstruktur',points:structure,max:5}];
}
function inject(group,items,total){let box=group.querySelector('.score-breakdown');if(!box){box=document.createElement('section');box.className='card score-breakdown';const body=group.querySelector('.stock-body');const why=group.querySelector('.why');if(why)body.insertBefore(box,why);else body.appendChild(box)}const sum=items.reduce((s,x)=>s+x.points,0);box.innerHTML='<b>Warum '+total+'/100?</b><div class="score-breakdown-list">'+items.map(x=>`<div class="score-breakdown-row"><span>${x.name}${x.detail?`<small>${x.detail}</small>`:''}</span><strong>${x.points}/${x.max}</strong></div>`).join('')+`</div><div class="score-breakdown-total"><span>Prüfsumme</span><strong>${sum}/100</strong></div>`}
function style(){if(document.getElementById('score-breakdown-style'))return;const s=document.createElement('style');s.id='score-breakdown-style';s.textContent='.score-breakdown{margin-top:8px}.score-breakdown-list{margin-top:7px;display:grid;gap:4px}.score-breakdown-row,.score-breakdown-total{display:flex;justify-content:space-between;gap:10px;padding:5px 7px;border-radius:6px;background:#f8fafc;font-size:11px}.score-breakdown-row small{display:block;color:#64748b;font-size:9px;margin-top:2px}.score-breakdown-total{margin-top:6px;font-weight:900;border-top:1px solid #cbd5e1;background:#eef2f7}';document.head.appendChild(s)}
function run(){style();document.querySelectorAll('.stock-group').forEach(g=>{const m=g.querySelector('.summary-result')?.textContent?.match(/(\d+)\s*\/\s*100/);if(!m)return;const total=Number(m[1]);try{inject(g,calc(g,total),total)}catch(_){}})}
const obs=new MutationObserver(()=>setTimeout(run,30));function init(){run();const root=document.getElementById('individuals');if(root)obs.observe(root,{childList:true,subtree:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
