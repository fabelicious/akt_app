import json,runpy,datetime
from collections import defaultdict
ns=runpy.run_path('scripts/refresh_top10.py')
results=[x for x in ns.get('results',[]) if x and isinstance(x.get('score'),(int,float)) and x['score']>=90]
def country(symbol):
 s=str(symbol).upper()
 suffix={' .DE':'DE','.F':'DE','.PA':'FR','.SW':'CH','.L':'GB','.AS':'NL','.MI':'IT','.MC':'ES','.ST':'SE','.OL':'NO','.CO':'DK','.T':'JP','.HK':'HK','.TO':'CA','.AX':'AU'}
 for k,v in suffix.items():
  if s.endswith(k.strip()): return v
 return 'US'
groups=defaultdict(list)
for x in results:
 y=dict(x);y['country']=country(x.get('symbol',''));groups[y['country']].append(y)
for k in groups:groups[k]=sorted(groups[k],key=lambda x:(-x['score'],-float(x.get('rsi',0)),x.get('symbol','')))[:10]
out={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'criteria':'Je Land maximal 10 Titel; nur AKTScore >=90/100; exakt dieselbe Score-Berechnung wie die Einzelanalyse.','countries':dict(groups),'items':sorted(results,key=lambda x:(-x['score'],-float(x.get('rsi',0)),x.get('symbol','')))[:10]}
with open('country-top10.json','w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'));f.write('\n')
print('Country Top10:',{k:len(v) for k,v in groups.items()})
