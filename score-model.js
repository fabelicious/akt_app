(function(){'use strict';
function mean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:null}
function sma(a,n){return a.length>=n?mean(a.slice(-n)):null}
function rsi(a,n=14){if(a.length<n+1)return null;let g=0,l=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=n;l/=n;for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n}return l===0?100:100-100/(1+g/l)}
function ema(a,n){if(a.length<n)return[];const k=2/(n+1);let e=mean(a.slice(0,n)),out=[e];for(let i=n;i<a.length;i++){e=a[i]*k+e*(1-k);out.push(e)}return out}
function macd(a){if(a.length<35)return{value:null,signal:null};const e12=ema(a,12),e26=ema(a,26),m=[];for(let i=0;i<e26.length;i++)m.push(e12[i+14]-e26[i]);const sig=ema(m,9);return{value:m.at(-1),signal:sig.at(-1)}}
function volatility(a,n=20){if(a.length<n+1)return null;const r=[];for(let i=a.length-n;i<a.length;i++)r.push(a[i]/a[i-1]-1);const m=mean(r);return Math.sqrt(mean(r.map(x=>(x-m)**2)))*Math.sqrt(252)*100}
function analyse(raw){const c=raw.map(x=>Number(x?.c)).filter(Number.isFinite),last=c.at(-1),a20=sma(c,20),a50=sma(c,50),a200=sma(c,200),r=rsi(c,14),m=macd(c),v=volatility(c,20);let sc=0,w=[];
if(last>a20){sc+=10;w.push('Kurs über SMA 20.')}else w.push('Kurs unter SMA 20.');
if(last>a50){sc+=10;w.push('Kurs über SMA 50.')}else w.push('Kurs unter SMA 50.');
if(last>a200){sc+=20;w.push('Kurs über SMA 200 – langfristiger Trend positiv.')}else w.push('Kurs unter SMA 200 – langfristiger Trend negativ.');
if(r>=50&&r<=65){sc+=20;w.push('RSI 14 im konstruktiven Bereich 50–65.')}else if(r>=40&&r<50){sc+=15;w.push('RSI 14 leicht unter dem konstruktiven Bereich.')}else if(r>65&&r<=70){sc+=15;w.push('RSI 14 erhöht, aber noch nicht überkauft.')}else if(r>=30&&r<40){sc+=10;w.push('RSI 14 schwach.')}else if(r<30){sc+=6;w.push('RSI 14 überverkauft – mögliches Erholungssignal.')}else{sc+=6;w.push('RSI 14 über 70 – überkauft.');}
if(Number.isFinite(m.value)&&Number.isFinite(m.signal)&&m.value>m.signal){sc+=20;w.push('MACD über Signallinie – Momentum positiv.')}else{sc+=5;w.push('MACD unter Signallinie – Momentum schwach.');}
if(v<20){sc+=20;w.push('Volatilität niedrig.')}else if(v<35){sc+=15;w.push('Volatilität moderat.')}else if(v<50){sc+=8;w.push('Volatilität erhöht.')}else{sc+=3;w.push('Volatilität hoch – erhöhtes Risiko.');}
sc=Math.max(0,Math.min(100,Math.round(sc)));return{c,a20,a50,a200,r,mm:m.value,ss:m.signal,v,sc,w};}
function rec(score){return score>=70?'KAUFEN':score>=45?'BEOBACHTEN':'NICHT KAUFEN'}
window.AKTScoreModel={analyse,rec,sma,rsi,macd,volatility};
window.analyse=analyse;window.recFor=rec;
setTimeout(()=>{
  window.analyse=analyse;window.recFor=rec;
  if(typeof window.scanTop10==='function'&&!window.__aktScoreTop10Patched){
    window.__aktScoreTop10Patched=true;
    const oldScan=window.scanTop10;
    window.scanTop10=async function(){
      if(window.top10Busy)return;window.top10Busy=true;
      try{
        const r=await fetch('./top10.json?ts='+Date.now(),{cache:'no-store'});const j=await r.json();
        const items=[];
        for(const x of (j.items||[])){
          try{const d=await window.chartData(x.symbol);const z=analyse(d.data);items.push({...x,price:d.data.at(-1).c,change:d.data.length>1?(d.data.at(-1).c/d.data.at(-2).c-1)*100,rsi:z.r,score:z.sc})}catch(_){}
        }
        items.sort((a,b)=>b.score-a.score);const out=items.filter(x=>x.score>=90).slice(0,10);
        if(window.$){$('top10Date').textContent='Live · '+new Date().toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});$('top10Grid').innerHTML=out.length?out.map(window.top10Card).join(''):'<div class="top10-empty">Aktuell keine Treffer ≥90/100.</div>'}
      }catch(_){try{await oldScan()}catch(e){}}finally{window.top10Busy=false}
    };
    window.scanTop10();
  }
},0);
})();