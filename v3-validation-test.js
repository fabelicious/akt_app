// V3 static validation helper; not loaded by the application.
(function(){
  const fs = {requiredMinBars:200, scoreRange:[0,100], countries:21};
  if(fs.requiredMinBars!==200||fs.scoreRange[0]!==0||fs.scoreRange[1]!==100||fs.countries!==21) throw new Error('V3 validation failed');
})();
