(function(){
'use strict';
const PERIOD_DAYS={30:30,90:90,180:180,365:365,1825:1825};
const fmt=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
function selectedDays(){return Number(document.querySelector('.tab.active')?.dataset.d||180)}
function update(group){
 const data=Array.isArray(group?._stock?.data)?group._stock.data.map(x=>({d:new Date(x.d).getTime(),c:Number(x.c)})).filter(x=>Number.isFinite(x.d)&&Number.isFinite(x.c)):[];
 if(data.length<2)return;
 data.sort((a,b)=>a.d-b.d);
 const end=data[data.length-1], cutoff=end.d-PERIOD_DAYS[selectedDays()]*86400000;
 const first=data.find(x=>x.d>=cutoff)||data[0];
 if(!first||first.c===0)return;
 const change=(end.c/first.c-1)*100;
 let card=group.querySelector('.period-change-card');
 if(!card){const course=[...group.querySelectorAll('.grid .card')].find(c=>(c.querySelector('.label')?.textContent||'').trim().toLowerCase()==='kurs');if(!course)return;card=document.createElement('div');card.className='card period-change-card';course.insertAdjacentElement('afterend',card)}
 const label=document.querySelector('.tab.active')?.textContent?.trim()||'6M';
 card.innerHTML='<span class="label">Veränderung '+label+'</span><div class="value '+(change>0.0001?'positive':change<-0.0001?'negative':'neutral')+'">'+(change>0?'+':'')+fmt(change)+' %</div><div class="sub">Handelsplatz: '+(group.querySelector('.venue-select option:checked')?.textContent||'aktueller Handelsplatz')+'</div>';
}
function updateAll(){document.querySelectorAll('.stock-group').forEach(update)}
function init(){const s=document.createElement('style');s.textContent='.period-change-card{padding:7px 8px!important;min-height:0}.period-change-card .label{font-size:8px}.period-change-card .value{font-size:14px;margin-top:1px}.period-change-card .sub{font-size:8px}.period-change-card .positive{color:#15803d}.period-change-card .negative{color:#b91c1c}.period-change-card .neutral{color:#64748b}.stock-group{font-size:75%}.stock-group summary{padding:10px 11px}.stock-group .stock-body{padding:0 8px 8px}.stock-group .grid{gap:6px;margin-top:7px}.stock-group .card{padding:7px}.stock-group .value{font-size:13px}.stock-group .score{font-size:19px}.stock-group .sub{font-size:8px}.stock-group .label{font-size:7px}.stock-group .why ul{font-size:9px}.stock-group .chart{padding:6px;height:205px}.stock-group .chart.small{height:155px}';document.head.appendChild(s);const root=document.getElementById('individuals');if(root)new MutationObserver(updateAll).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('.tab'))setTimeout(updateAll,650)});document.addEventListener('change',e=>{if(e.target.closest('.venue-select')||e.target.closest('select'))setTimeout(updateAll,650)});[300,700,1200,2000,3500].forEach(t=>setTimeout(updateAll,t))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
