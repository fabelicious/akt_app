(function(){
  'use strict';
  // Anzeigezeitraum = echte Kalender-Spanne rückwärts ab heute.
  const MONTHS={30:1,90:3,180:6,365:12,1825:60};
  function cutoff(months){const d=new Date();d.setHours(0,0,0,0);d.setMonth(d.getMonth()-months);return d}
  function redraw(days){
    const cut=cutoff(MONTHS[days]||6);
    document.querySelectorAll('.stock-charts canvas').forEach(canvas=>{
      const chart=Chart.getChart(canvas); if(!chart||!chart.data?.labels?.length)return;
      const labels=chart.data.labels, keep=[];
      labels.forEach((label,i)=>{
        const p=String(label).split('.');
        if(p.length===3){const d=new Date(+p[2],+p[1]-1,+p[0]);if(d>=cut)keep.push(i)}
      });
      if(!keep.length)return;
      chart.data.labels=keep.map(i=>labels[i]);
      chart.data.datasets.forEach(ds=>ds.data=keep.map(i=>ds.data[i]));
      chart.update('none');
    });
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.tab'); if(!tab)return;
    setTimeout(()=>redraw(Number(tab.dataset.d)),60);
  },true);
})();
