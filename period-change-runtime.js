(function(){
'use strict';
const PERIOD_DAYS={30:30,90:90,180:180,365:365,1825:1825};
const fmt=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
function days(){return Number(document.querySelector('.tab.active')?.dataset.d||180)}
function chartSeries(group){
 const canvas=group.querySelector('.stock-charts .chart:not(.small) canvas');
 if(!canvas||!window.Chart||!Chart.getChart)return [];
 const chart=Chart.getChart(canvas);if(!chart?.data)return [];
 const labels=chart.data.labels||[];const ds=chart.data.datasets?.find(d=>Array.isArray(d.data));if(!ds)return [];
 return labels.map((label,i)=>{let y=ds.data[i];if(y&&typeof y==='object')y=y.y??y.c??y.close;return {d:new Date(label).getTime(),c:Number(y)}}).filter(x=>Number.isFinite(x.d)&&Number.isFinite(x.c));
}
function update(group){
 const data=chartSeries(group);if(data.length<2)return;
 data.sort((a,b)=>a.d-b.d);const end=data[data.length-1];const cutoff=end.d-days()*86400000;const first=data.find(x=>x.d>=cutoff)||data[0];if(!first||!Number.isFinite(first.c)||first.c===0)return;
 const change=(end.c/first.c-1)*100;let card=group.querySelector('.period-change-card');
 if(!card){const course=[...group.querySelectorAll('.grid .card')].find(c=>(c.querySelector('.label')?.textContent||'').trim().toLowerCase()==='kurs');if(!course)return;card=document.createElement('div');card.className='card period-change-card';course.insertAdjacentElement('afterend',card)}
 const label=document.querySelector('.tab.active')?.textContent?.trim()||'6M';const venue=group.querySelector('.venue-select option:checked')?.textContent||group.querySelector('select')?.value||'aktueller Handelsplatz';
 card.innerHTML='<span class="label">Veränderung '+label+'</span><div class="value '+(change>0.0001?'positive':change<-0.0001?'negative':'neutral')+'">'+(change>0?'+':'')+fmt(change)+' %</div><div class="sub">Datenbasis: '+venue+'</div>';
}
function updateAll(){document.querySelectorAll('.stock-group').forEach(update)}
function delayed(){[150,500,1000,1800,3000].forEach(t=>setTimeout(updateAll,t))}
function init(){const s=document.createElement('style');s.textContent='.period-change-card{padding:7px 8px!important;min-height:0}.period-change-card .label{font-size:8px}.period-change-card .value{font-size:14px;margin-top:1px}.period-change-card .sub{font-size:8px}.period-change-card .positive{color:#15803d}.period-change-card .negative{color:#b91c1c}.period-change-card .neutral{color:#64748b}.stock-group{font-size:75%}.stock-group summary{padding:10px 11px}.stock-group .stock-body{padding:0 8px 8px}.stock-group .grid{gap:6px;margin-top:7px}.stock-group .card{padding:7px}.stock-group .value{font-size:13px}.stock-group .score{font-size:19px}.stock-group .sub{font-size:8px}.stock-group .label{font-size:7px}.stock-group .why ul{font-size:9px}.stock-group .chart{padding:6px;height:205px}.stock-group .chart.small{height:155px}';document.head.appendChild(s);const root=document.getElementById('individuals');if(root)new MutationObserver(updateAll).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('.tab'))delayed()});document.addEventListener('change',e=>{if(e.target.closest('.venue-select'))delayed()});delayed()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
