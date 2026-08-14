(function(){
'use strict';
const PERIOD_DAYS={30:30,90:90,180:180,365:365,1825:1825};
const fmt=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
function days(){return Number(document.querySelector('.tab.active')?.dataset.d||180)}
function rowsFromChart(group){
 const canvas=group.querySelector('.stock-charts .chart:not(.small) canvas');
 const chart=canvas&&window.Chart&&window.Chart.getChart?window.Chart.getChart(canvas):null;
 if(!chart)return [];
 const labels=chart.data?.labels||[], vals=chart.data?.datasets?.[0]?.data||[], out=[];
 for(let i=0;i<Math.min(labels.length,vals.length);i++){
  const v=Number(vals[i]), d=new Date(labels[i]);
  if(Number.isFinite(v)&&Number.isFinite(d.getTime()))out.push({d:d.getTime(),c:v});
 }
 return out;
}
function rowsFromStock(group){
 const groups=[...document.querySelectorAll('.stock-group')], idx=groups.indexOf(group), s=window.stocks?.[idx];
 const data=s?.data||s?.history||[];
 return Array.isArray(data)?data.map(x=>({d:new Date(x.d??x.date??x.t??x.timestamp).getTime(),c:Number(x.c??x.close??x.price??x.Close)})).filter(x=>Number.isFinite(x.d)&&Number.isFinite(x.c)):[];
}
function getRows(g){
 const chart=rowsFromChart(g), stock=rowsFromStock(g);
 // Prefer the visible chart because it is tied to the currently selected period/exchange.
 return chart.length>=2?chart:stock;
}
function update(g){
 const data=getRows(g); if(data.length<2)return;
 data.sort((a,b)=>a.d-b.d);
 const end=data[data.length-1], cutoff=end.d-PERIOD_DAYS[days()]*86400000;
 let first=data.find(x=>x.d>=cutoff)||data[0];
 if(!first||!Number.isFinite(first.c)||first.c===0||!Number.isFinite(end.c))return;
 const change=(end.c/first.c-1)*100;
 let card=g.querySelector('.period-change-card');
 if(!card){
  const course=[...g.querySelectorAll('.grid .card')].find(c=>(c.querySelector('.label')?.textContent||'').trim().toLowerCase()==='kurs');
  if(!course)return;
  card=document.createElement('div');card.className='card period-change-card';course.insertAdjacentElement('afterend',card);
 }
 const label=document.querySelector('.tab.active')?.textContent?.trim()||'6M';
 const cls=change>0.0001?'positive':change<-0.0001?'negative':'neutral';
 card.innerHTML='<span class="label">Veränderung '+label+'</span><div class="value '+cls+'">'+(change>0?'+':'')+fmt(change)+' %</div><div class="sub">gegenüber Beginn des Zeitraums</div>';
}
function updateAll(){document.querySelectorAll('.stock-group').forEach(update)}
function init(){
 const style=document.createElement('style');style.textContent='.period-change-card{padding:7px 8px!important;min-height:0}.period-change-card .label{font-size:8px}.period-change-card .value{font-size:14px;margin-top:1px}.period-change-card .sub{font-size:9px}.period-change-card .positive{color:#15803d}.period-change-card .negative{color:#b91c1c}.period-change-card .neutral{color:#64748b}';document.head.appendChild(style);
 const root=document.getElementById('individuals');
 if(root)new MutationObserver(()=>setTimeout(updateAll,80)).observe(root,{childList:true,subtree:true});
 document.addEventListener('click',e=>{if(e.target.closest('.tab'))setTimeout(updateAll,500)});
 document.addEventListener('change',e=>{if(e.target.closest('select'))setTimeout(updateAll,500)});
 [300,900,1800,3000].forEach(t=>setTimeout(updateAll,t));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
