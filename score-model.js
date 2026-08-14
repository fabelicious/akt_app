(function(){
  'use strict';
  const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  function sma(a,n){return a.length>=n?mean(a.slice(-n)):null}
  function ema(a,n){if(a.length<n)return[];const k=2/(n+1);let e=mean(a.slice(0,n)),out=[e];for(let i=n;i<a.length;i++){e=a[i]*k+e*(1-k);out.push(e)}return out}
  function rsi(a,n=14){if(a.length<n+1)return 50;let gain=0,loss=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}gain/=n;loss/=n;for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];gain=(gain*(n-1)+Math.max(d,0))/n;loss=(loss*(n-1)+Math.max(-d,0))/n}return loss===0?100:100-100/(1+gain/loss)}
  function macd(a){if(a.length<35)return{value:0,signal:0,values:[],signalValues:[]};const e12=ema(a,12),e26=ema(a,26),values=[];for(let i=0;i<e26.length;i++)values.push(e12[i+14]-e26[i]);const signal=ema(values,9);return{value:values.at(-1),signal:signal.at(-1),values,signalValues:signal}}
  function volatility(a,n=20){if(a.length<n+1)return 0;const r=[];for(let i=a.length-n;i<a.length;i++)r.push(a[i]/a[i-1]-1);const m=mean(r);return Math.sqrt(mean(r.map(x=>(x-m)**2)))*Math.sqrt(252)*100}
  function analyse(raw){
    const rows=raw.filter(x=>Number.isFinite(Number(x?.c))).map(x=>({c:Number(x.c),v:Number(x.v)||0})),close=rows.map(x=>x.c),volume=rows.map(x=>x.v),last=close.at(-1),sma20=sma(close,20),sma50=sma(close,50),sma200=sma(close,200),r=rsi(close),m=macd(close),vol=volatility(close,20),momentum3=(last/close.at(-63)-1)*100,momentum12=(last/close.at(-252)-1)*100,v20=mean(volume.slice(-20)),v60=mean(volume.slice(-60)),volumeRatio=v60>0?v20/v60:1;
    let score=0,reasons=[];
    if(last>sma20){score+=5;reasons.push('Kurs über SMA 20 – kurzfristiger Trend positiv.')}else reasons.push('Kurs unter SMA 20 – kurzfristiger Trend schwach.');
    if(last>sma50){score+=10;reasons.push('Kurs über SMA 50 – mittelfristiger Trend positiv.')}else reasons.push('Kurs unter SMA 50 – mittelfristiger Trend schwach.');
    if(last>sma200){score+=15;reasons.push('Kurs über SMA 200 – langfristiger Trend positiv.')}else reasons.push('Kurs unter SMA 200 – langfristiger Trend negativ.');
    if(momentum3>=8){score+=10;reasons.push('3-Monats-Momentum klar positiv.')}else if(momentum3>0){score+=6;reasons.push('3-Monats-Momentum positiv, aber moderat.')}else reasons.push('3-Monats-Momentum negativ.');
    if(momentum12>=15){score+=10;reasons.push('12-Monats-Momentum klar positiv.')}else if(momentum12>0){score+=6;reasons.push('12-Monats-Momentum positiv, aber moderat.')}else reasons.push('12-Monats-Momentum negativ.');
    if(r>=50&&r<=65){score+=15;reasons.push('RSI 14 konstruktiv zwischen 50 und 65.')}else if(r>=45&&r<=70){score+=10;reasons.push('RSI 14 neutral bis konstruktiv.')}else if(r>=35&&r<45){score+=5;reasons.push('RSI 14 eher schwach.')}else if(r>70){reasons.push('RSI 14 über 70 – Überhitzung.')}else reasons.push('RSI 14 unter 35 – Erholungsrisiko.');
    if(m.value>m.signal&&m.value>0){score+=15;reasons.push('MACD über Signallinie und Nulllinie – Momentum bestätigt.')}else if(m.value>m.signal){score+=10;reasons.push('MACD über Signallinie – Momentum positiv.')}else if(m.value>0){score+=6;reasons.push('MACD positiv, aber unter Signallinie.')}else reasons.push('MACD negativ – Momentum schwach.');
    if(vol<20){score+=10;reasons.push('Volatilität niedrig.')}else if(vol<30){score+=7;reasons.push('Volatilität moderat.')}else if(vol<45){score+=4;reasons.push('Volatilität erhöht.')}else{score+=1;reasons.push('Volatilität hoch – Risiko erhöht.');}
    if(volumeRatio>=1.15&&last>sma20){score+=10;reasons.push('Handelsvolumen bestätigt den positiven kurzfristigen Trend.')}else if(volumeRatio>=0.9){score+=6;reasons.push('Handelsvolumen unauffällig bis stabil.')}else{score+=2;reasons.push('Handelsvolumen bestätigt den Trend nicht.');}
    const quality=close.length>=756?'hoch':close.length>=504?'gut':'ausreichend';
    // Display-/Empfehlungsscore pauschal um 20 % anheben, maximal 100.
    score=Math.min(100,Math.round(score*1.2));
    return{score,close,volume,last,sma20,sma50,sma200,rsi:r,momentum3,momentum12,volatility:vol,volumeRatio,reasons,quality,macd:m};
  }
  function rec(score){return score>=90?'KAUFEN':score>=65?'BEOBACHTEN':'NICHT KAUFEN'}
  window.AKTScoreModel={mean,sma,ema,rsi,macd,volatility,analyse,rec};
})();
