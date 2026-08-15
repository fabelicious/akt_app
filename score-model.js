(function(){
  'use strict';
  const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  function sma(a,n){return a.length>=n?mean(a.slice(-n)):null}
  function ema(a,n){if(a.length<n)return[];const k=2/(n+1);let e=mean(a.slice(0,n)),out=[e];for(let i=n;i<a.length;i++){e=a[i]*k+e*(1-k);out.push(e)}return out}
  function rsi(a,n=14){if(a.length<n+1)return 50;let gain=0,loss=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}gain/=n;loss/=n;for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];gain=(gain*(n-1)+Math.max(d,0))/n;loss=(loss*(n-1)+Math.max(-d,0))/n}return loss===0?100:100-100/(1+gain/loss)}
  function macd(a){if(a.length<35)return{value:0,signal:0,histogram:0,values:[],signalValues:[]};const e12=ema(a,12),e26=ema(a,26),values=[];for(let i=0;i<e26.length;i++)values.push(e12[i+14]-e26[i]);const signal=ema(values,9);return{value:values.at(-1),signal:signal.at(-1),histogram:values.at(-1)-signal.at(-1),values,signalValues:signal}}
  function volatility(a,n=20){if(a.length<n+1)return 0;const r=[];for(let i=a.length-n;i<a.length;i++)r.push(a[i]/a[i-1]-1);const m=mean(r);return Math.sqrt(mean(r.map(x=>(x-m)**2)))*Math.sqrt(252)*100}
  function drawdown(a,n=252){if(!a.length)return 0;const x=a.slice(-Math.min(n,a.length));let peak=x[0],minDD=0;for(const p of x){peak=Math.max(peak,p);minDD=Math.min(minDD,(p/peak-1)*100)}return minDD}
  function momentum(a,n){return a.length>n&&a.at(-1)>0&&a.at(-1-n)>0?(a.at(-1)/a.at(-1-n)-1)*100:null}
  function scoreBand(v,levels){if(v==null)return 0;for(const x of levels)if(v>=x[0])return x[1];return 0}
  function analyse(raw){
    const rows=raw.filter(x=>Number.isFinite(Number(x?.c))).map(x=>({c:Number(x.c),v:Number(x.v)||0})),close=rows.map(x=>x.c),volume=rows.map(x=>x.v);
    const last=close.at(-1),sma20=sma(close,20),sma50=sma(close,50),sma200=sma(close,200),r=rsi(close),m=macd(close),vol=volatility(close,20),mom3=momentum(close,63),mom6=momentum(close,126),mom12=momentum(close,252),v20=mean(volume.slice(-20)),v60=mean(volume.slice(-60)),volumeRatio=v60>0?v20/v60:1,dd=drawdown(close,252);
    let score=0,reasons=[];
    // 20 pts: long-term trend
    let trend20=0;if(sma200!=null){if(last>sma200)trend20+=12;else if(last>sma200*0.95)trend20+=5;if(sma50!=null){if(sma50>sma200)trend20+=8;else if(sma50>sma200*0.97)trend20+=3}}score+=trend20;
    if(last>sma200)reasons.push('Langfristiger Trend über SMA 200.');else reasons.push('Kurs unter SMA 200 – langfristiger Trend schwach.');
    // 15 pts: medium/short trend
    let trend15=0;if(sma50!=null){if(last>sma50)trend15+=8;else if(last>sma50*0.97)trend15+=3}if(sma20!=null){if(last>sma20)trend15+=7;else if(last>sma20*0.97)trend15+=3}score+=trend15;
    // 20 pts: multi-horizon momentum
    let mom20=0;mom20+=scoreBand(mom3,[[8,8],[3,5],[0,2]]);mom20+=scoreBand(mom6,[[15,7],[5,4],[0,2]]);mom20+=scoreBand(mom12,[[25,5],[10,3],[0,1]]);score+=Math.min(20,mom20);
    if(mom3!=null&&mom3>0)reasons.push('3-Monats-Momentum positiv.');else if(mom3!=null)reasons.push('3-Monats-Momentum negativ.');
    // 10 pts: momentum confirmation
    if(m.histogram>0&&m.value>0)score+=10;else if(m.histogram>0)score+=6;else if(m.value>0)score+=3;
    if(m.histogram>0)reasons.push('MACD-Momentum bestätigt die Aufwärtsbewegung.');else reasons.push('MACD bestätigt den Aufwärtstrend nicht.');
    // 10 pts: RSI is trend-aware; avoid rewarding overbought blindly
    if(r>=50&&r<=65)score+=10;else if(r>=45&&r<50)score+=7;else if(r>65&&r<=72&&last>sma50)score+=7;else if(r>=35&&r<45)score+=4;else if(r>72)score+=2;
    if(r>72)reasons.push('RSI hoch – Überhitzungsrisiko.');else if(r<35)reasons.push('RSI niedrig – Erholungsrisiko.');else reasons.push('RSI im konstruktiven Bereich.');
    // 10 pts: volume confirmation
    if(volumeRatio>=1.3&&last>sma20)score+=10;else if(volumeRatio>=1.15&&last>sma20)score+=8;else if(volumeRatio>=0.9)score+=5;else score+=2;
    if(volumeRatio>=1.15&&last>sma20)reasons.push('Volumen bestätigt den kurzfristigen Trend.');else reasons.push('Volumen bestätigt den Trend nur eingeschränkt.');
    // 10 pts: risk/volatility
    if(vol<18)score+=10;else if(vol<28)score+=8;else if(vol<40)score+=5;else if(vol<55)score+=3;else score+=1;
    if(dd>-12)score+=0;else if(dd>-25)score-=1;else score-=3;
    // 5 pts: price structure proxy using recent range / distance to high
    const recent=close.slice(-60),hi=recent.length?Math.max(...recent):last,lo=recent.length?Math.min(...recent):last,range=hi-lo,position=range>0?(last-lo)/range:0.5;
    if(position>=0.8)score+=5;else if(position>=0.6)score+=3;else if(position>=0.4)score+=1;
    if(position>=0.8)reasons.push('Kurs nahe dem 60-Tage-Hoch – Breakout-Nähe.');else if(position<0.4)reasons.push('Kurs im unteren Bereich der 60-Tage-Spanne.');
    score=Math.max(0,Math.min(100,Math.round(score)));
    const quality=close.length>=756?'hoch':close.length>=504?'gut':close.length>=252?'ausreichend':'kurz';
    return{score,displayScore:score,close,volume,last,sma20,sma50,sma200,rsi:r,momentum3:mom3,momentum6:mom6,momentum12:mom12,volatility:vol,volumeRatio,drawdown:dd,rangePosition:position,reasons,quality,macd:m};
  }
  function rec(score){return score>=85?'KAUFEN':score>=65?'BEOBACHTEN':'NICHT KAUFEN'}
  window.AKTScoreModel={mean,sma,ema,rsi,macd,volatility,analyse,rec};
})();
