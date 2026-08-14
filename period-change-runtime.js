(function(){
  'use strict';
  const PERIOD_DAYS={30:30,90:90,180:180,365:365,1825:1825};
  const fmt=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  function getSelectedDays(){const active=document.querySelector('.tab.active');return Number(active?.dataset.d||180)}
  function getChartSeries(group){
    const priceCanvas=group.querySelector('.stock-charts .chart:not(.small) canvas');
    if(!priceCanvas||!window.Chart?.getChart)return null;
    const chart=window.Chart.getChart(priceCanvas); if(!chart)return null;
    const labels=chart.data?.labels||[],values=chart.data?.datasets?.[0]?.data||[],rows=[];
    for(let i=0;i<Math.min(labels.length,values.length);i++){const value=Number(values[i]),date=new Date(labels[i]);if(Number.isFinite(value)&&!Number.isNaN(date.getTime()))rows.push({d:date,c:value})}
    return rows.length?rows:null;
  }
  function getSeries(group){const idx=[...document.querySelectorAll('.stock-group')].indexOf(group);if(idx>=0&&window.stocks?.[idx]?.data?.length)return window.stocks[idx].data;return getChartSeries(group)}
  function updateGroup(group){
    const data=getSeries(group);if(!data?.length)return;
    const days=PERIOD_DAYS[getSelectedDays()]||180,cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-days);
    const first=data.find(x=>new Date(x.d)>=cutoff)||data[0],last=data[data.length-1];if(!first||!last)return;
    const a=Number(first.c),b=Number(last.c);if(!Number.isFinite(a)||!Number.isFinite(b)||!a)return;
    const change=(b/a-1)*100;let card=group.querySelector('.period-change-card');
    if(!card){const course=[...group.querySelectorAll('.grid .card')].find(c=>(c.querySelector('.label')?.textContent||'').trim().toLowerCase()==='kurs');if(!course)return;card=document.createElement('div');card.className='card period-change-card';course.insertAdjacentElement('afterend',card)}
    const label=document.querySelector('.tab.active')?.textContent?.trim()||'6M',cls=change>0?'positive':change<0?'negative':'neutral';
    card.innerHTML='<span class="label">Veränderung '+label+'</span><div class="value '+cls+'">'+(change>0?'+':'')+fmt(change)+' %</div><div class="sub">gegenüber Beginn des Zeitraums</div>';
  }
  function updateAll(){document.querySelectorAll('.stock-group').forEach(updateGroup)}
  function init(){const style=document.createElement('style');style.textContent='.period-change-card .positive{color:#15803d}.period-change-card .negative{color:#b91c1c}.period-change-card .neutral{color:#64748b}';document.head.appendChild(style);const root=document.getElementById('individuals');if(root)new MutationObserver(()=>setTimeout(updateAll,50)).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('.tab'))setTimeout(updateAll,300)});document.addEventListener('change',e=>{if(e.target.closest('select'))setTimeout(updateAll,300)});setTimeout(updateAll,700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
