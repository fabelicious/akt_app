(function(){
'use strict';
function num(v){const n=Number(String(v??'').replace(',','.').replace(/[^0-9+\-.]/g,''));return Number.isFinite(n)?n:null}
function band(v,levels){if(v==null)return 0;for(const x of levels)if(v>=x[0])return x[1];return 0}
function chartData(group,prefix){const c=group.querySelector(`canvas[id^="${prefix}-"]`);const chart=c&&window.Chart?.getChart(c);return chart?.data?.datasets?.[0]?.data||[]}
function lastNumber(a){for(let i=a.length-1;i>=0;i--){const n=Number(a[i]);if(Number.isFinite(n))return n}return null}
function drawdown(a,n=252){const x=a.slice(-Math.min(n,a.length)).map(Number).filter(Number.isFinite);if(!x.length)return 0;let peak=x[0],minDD=0;for(const p of x){peak=Math.max(peak,p);minDD=Math.min(minDD,(p/peak-1)*100)}return minDD}
function calc(group){
  const cards=[...group.querySelectorAll('.grid .card')];
  const get=(label)=>{const c=cards.find(x=>x.querySelector('.label')?.textContent?.trim()===label);return c?.querySelector('.value')?.textContent||''};
  const last=num(get('Kurs')),rsi=num(get('RSI 14')),mom3=num(get('Momentum 3M')),mom6Visible=num(get('Momentum 6M')),mom12=num(get('Momentum 12M')),vol=num(get('Volatilität')),vr=num(get('Volumen-Bestätigung'));
  const smaText=get('SMA 20 / 50 / 200').split('/').map(num),sma20=smaText[0],sma50=smaText[1],sma200=smaText[2];
  const prices=chartData(group,'price').map(Number).filter(Number.isFinite);
  let trend20=0;if(sma200!=null){if(last>sma200)trend20+=12;else if(last>sma200*.95)trend20+=5;if(sma50!=null){if(sma50>sma200)trend20+=8;else if(sma50>sma200*.97)trend20+=3}}
  let trend15=0;if(sma50!=null){if(last>sma50)trend15+=8;else if(last>sma50*.97)trend15+=3}if(sma20!=null){if(last>sma20)trend15+=7;else if(last>sma20*.97)trend15+=3}
  let mom6=mom6Visible;if(mom6==null&&prices.length>126&&prices.at(-127)>0)mom6=(prices.at(-1)/prices.at(-127)-1)*100;
  let mom20=band(mom3,[[8,8],[3,5],[0,2]])+band(mom6,[[15,7],[5,4],[0,2]])+band(mom12,[[25,5],[10,3],[0,1]]);mom20=Math.min(20,mom20);
  const macdCanvas=group.querySelector('canvas[id^="macd-"]'),mc=macdCanvas&&window.Chart?.getChart(macdCanvas),mv=lastNumber(mc?.data?.datasets?.[0]?.data||[]),ms=lastNumber(mc?.data?.datasets?.[1]?.data||[]),mh=mv!=null&&ms!=null?mv-ms:null;let macdPts=0;if(mh>0&&mv>0)macdPts=10;else if(mh>0)macdPts=6;else if(mv>0)macdPts=3;
  let rsiPts=0;if(rsi!=null){if(rsi>=50&&rsi<=65)rsiPts=10;else if(rsi>=45&&rsi<50)rsiPts=7;else if(rsi>65&&rsi<=72&&last>sma50)rsiPts=7;else if(rsi>=35&&rsi<45)rsiPts=4;else if(rsi>72)rsiPts=2}
  let volPts=0;if(vr!=null){if(vr>=1.3&&last>sma20)volPts=10;else if(vr>=1.15&&last>sma20)volPts=8;else if(vr>=.9)volPts=5;else volPts=2}
  let riskVol=0;if(vol!=null){if(vol<18)riskVol=10;else if(vol<28)riskVol=8;else if(vol<40)riskVol=5;else if(vol<55)riskVol=3;else riskVol=1}
  const dd=drawdown(prices,252);let risk=riskVol,ddAdj=0;if(dd<=-25){risk-=3;ddAdj=-3}else if(dd<=-12){risk-=1;ddAdj=-1}
  const recent=prices.slice(-60),hi=recent.length?Math.max(...recent):last,lo=recent.length?Math.min(...recent):last,range=hi-lo,position=range>0?(last-lo)/range:.5;let structure=0;if(position>=.8)structure=5;else if(position>=.6)structure=3;else if(position>=.4)structure=1;
  const raw=trend20+trend15+mom20+macdPts+rsiPts+volPts+risk+structure,total=Math.max(0,Math.min(100,Math.round(raw)));
  return {total,raw,items:[{name:'Langfristiger Trend',points:trend20,max:20},{name:'Kurz-/Mittelfristiger Trend',points:trend15,max:15},{name:'Momentum',points:mom20,max:20},{name:'MACD',points:macdPts,max:10},{name:'RSI',points:rsiPts,max:10},{name:'Volumen',points:volPts,max:10},{name:'Risiko / Volatilität',points:risk,max:10,detail:`Volatilität ${riskVol}/10${ddAdj?` · Drawdown-Abzug ${ddAdj}`:''}`},{name:'Kursstruktur',points:structure,max:5}]};
}
function inject(group){const summary=group.querySelector('.summary-result')?.textContent?.match(/(\d+)\s*\/\s*100/);if(!summary)return;const model=calc(group);const total=Number(summary[1]);let box=group.querySelector('.score-breakdown');if(!box){box=document.createElement('section');box.className='card score-breakdown';const body=group.querySelector('.stock-body');const why=group.querySelector('.why');if(why)body.insertBefore(box,why);else body.appendChild(box)}const sum=model.items.reduce((s,x)=>s+x.points,0);const ok=sum===total;box.innerHTML='<b>Warum '+total+'/100?</b><div class="score-breakdown-list">'+model.items.map(x=>`<div class="score-breakdown-row"><span>${x.name}${x.detail?`<small>${x.detail}</small>`:''}</span><strong>${x.points}/${x.max}</strong></div>`).join('')+`</div><div class="score-breakdown-total"><span>Prüfsumme</span><strong>${sum}/100${ok?' ✓':' · Abweichung'}</strong></div>`}
function style(){if(document.getElementById('score-breakdown-style'))return;const s=document.createElement('style');s.id='score-breakdown-style';s.textContent='.score-breakdown{margin-top:8px}.score-breakdown-list{margin-top:7px;display:grid;gap:4px}.score-breakdown-row,.score-breakdown-total{display:flex;justify-content:space-between;gap:10px;padding:5px 7px;border-radius:6px;background:#f8fafc;font-size:11px}.score-breakdown-row small{display:block;color:#64748b;font-size:9px;margin-top:2px}.score-breakdown-total{margin-top:6px;font-weight:900;border-top:1px solid #cbd5e1;background:#eef2f7}';document.head.appendChild(s)}
function run(){style();document.querySelectorAll('.stock-group').forEach(g=>{try{inject(g)}catch(_){}})}
const obs=new MutationObserver(()=>setTimeout(run,30));function init(){run();const root=document.getElementById('individuals');if(root)obs.observe(root,{childList:true,subtree:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
