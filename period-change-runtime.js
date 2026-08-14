(function(){
'use strict';
const fmt=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
function activeDays(){return Number(document.querySelector('.tab.active')?.dataset.d||180)}
function getSeries(group){
 const canvas=group.querySelector('.stock-charts .chart:not(.small) canvas');
 if(!canvas||!window.Chart||!Chart.getChart)return [];
 const chart=Chart.getChart(canvas);if(!chart?.data)return [];
 const labels=chart.data.labels||[];const ds=(chart.data.datasets||[]).find(d=>Array.isArray(d.data));if(!ds)return [];
 return labels.map((label,i)=>{let y=ds.data[i];if(y&&typeof y==='object')y=y.y??y.c??y.close;return {d:new Date(label).getTime(),c:Number(y)}}).filter(x=>Number.isFinite(x.d)&&Number.isFinite(x.c)).sort((a,b)=>a.d-b.d);
}
function update(group){
 const data=getSeries(group);if(data.length<2)return;
 const end=data[data.length-1],cut=end.d-activeDays()*86400000,first=data.find(x=>x.d>=cut)||data[0];
 if(!first||!Number.isFinite(first.c)||first.c===0)return;
 const change=(end.c/first.c-1)*100,label=document.querySelector('.tab.active')?.textContent?.trim()||'6M';
 const venue=group.querySelector('.venue-select option:checked')?.textContent||group.querySelector('.venue-select')?.value||'aktueller Handelsplatz';
 const cls=change>0.0001?'positive':change<-0.0001?'negative':'neutral';
 let card=group.querySelector('.period-change-card');
 if(!card){const course=[...group.querySelectorAll('.grid .card')].find(c=>(c.querySelector('.label')?.textContent||'').trim().toLowerCase()==='kurs');if(!course)return;card=document.createElement('div');card.className='card period-change-card';course.insertAdjacentElement('afterend',card)}
 const html='<span class="label">Veränderung '+label+'</span><div class="value '+cls+'">'+(change>0?'+':'')+fmt(change)+' %</div><div class="sub">Datenbasis: '+venue+'</div>';
 if(card.innerHTML!==html)card.innerHTML=html;
}
function updateAll(){document.querySelectorAll('.stock-group').forEach(update)}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(updateAll,120)}
function init(){
 const s=document.createElement('style');s.textContent='.period-change-card{padding:7px 8px!important;min-height:0}.period-change-card .label{font-size:8px}.period-change-card .value{font-size:14px;margin-top:1px}.period-change-card .sub{font-size:8px}.period-change-card .positive{color:#15803d}.period-change-card .negative{color:#b91c1c}.period-change-card .neutral{color:#64748b}.stock-group{font-size:75%}.stock-group summary{padding:10px 11px}.stock-group .stock-body{padding:0 8px 8px}.stock-group .grid{gap:6px;margin-top:7px}.stock-group .card{padding:7px}.stock-group .value{font-size:13px}.stock-group .score{font-size:19px}.stock-group .sub{font-size:8px}.stock-group .label{font-size:7px}.stock-group .why ul{font-size:9px}.stock-group .chart{padding:6px;height:205px}.stock-group .chart.small{height:155px}';document.head.appendChild(s);
 const root=document.getElementById('individuals');if(root){const mo=new MutationObserver(schedule);mo.observe(root,{childList:true,subtree:true})}
 document.addEventListener('click',e=>{if(e.target.closest('.tab'))schedule()});
 document.addEventListener('change',e=>{if(e.target.closest('select'))schedule()});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();