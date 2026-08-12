/* AKT-Pro score validation helpers. */
(function(){'use strict';
function mean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:null}
function sma(a,n){return a.length>=n?mean(a.slice(-n)):null}
function wilderRSI(c,n){if(!Array.isArray(c)||c.length<n+1)return null;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=n;l/=n;for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n}return l===0?100:100-100/(1+g/l)}
function emaSeries(a,n){if(a.length<n)return[];const k=2/(n+1);let e=mean(a.slice(0,n)),o=[e];for(let i=n;i<a.length;i++){e=a[i]*k+e*(1-k);o.push(e)}return o}
function macdStandard(c){if(c.length<35)return{macd:null,signal:null};const e12=emaSeries(c,12),e26=emaSeries(c,26),m=[];for(let i=0;i<e26.length;i++)m.push(e12[i+14]-e26[i]);const s=emaSeries(m,9);return{macd:m.at(-1),signal:s.at(-1)}}
function volatility(c,n=20){if(c.length<n+1)return null;const r=[];for(let i=c.length-n;i<c.length;i++)r.push(c[i]/c[i-1]-1);const m=mean(r);return Math.sqrt(mean(r.map(x=>(x-m)**2)))*Math.sqrt(252)*100}
function validate(close){const c=close.map(Number).filter(Number.isFinite),errors=[];if(c.length<200)errors.push('Mindestens 200 gültige Schlusskurse erforderlich.');if(c.some(x=>x<=0))errors.push('Nicht-positive Kurse gefunden.');const m=macdStandard(c),r=wilderRSI(c,14),v=volatility(c);if(r!==null&&(r<0||r>100))errors.push('RSI außerhalb 0–100.');if(v!==null&&v<0)errors.push('Volatilität negativ.');return{valid:errors.length===0,errors,metrics:{sma20:sma(c,20),sma50:sma(c,50),sma200:sma(c,200),rsi14:r,macd:m.macd,signal:m.signal,volatility:v}}}
window.AKTScoreValidation={validate,wilderRSI,macdStandard,volatility};
})();
