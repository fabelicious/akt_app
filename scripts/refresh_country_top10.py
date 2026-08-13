import json,runpy,datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor,as_completed
ns=runpy.run_path('scripts/refresh_top10.py')
fetch=ns['fetch'];base_results=list(ns.get('results',[]))
EXTRA=[('Samsung Electronics Co., Ltd.','005930.KS','881823','KR'),('SK hynix Inc.','000660.KS','A0B5A1','KR'),('Tencent Holdings Limited','0700.HK','A0YF5J','CN'),('Alibaba Group Holding Limited','9988.HK','A2PV5D','CN'),('BYD Company Limited','1211.HK','A0M4W9','CN'),('Tata Consultancy Services Limited','TCS.NS','A2N7W6','IN'),('Reliance Industries Limited','RELIANCE.NS','946078','IN'),('Infosys Limited','INFY.NS','919730','IN'),('HDFC Bank Limited','HDFCBANK.NS','A0M6K4','IN'),('Petroleo Brasileiro S.A.','PETR4.SA','899026','BR'),('Vale S.A.','VALE3.SA','897998','BR')]
def extra_fetch(c):
 name,symbol,wkn,country=c;x=fetch((name,symbol,wkn))
 if x:x['country']=country
 return x
with ThreadPoolExecutor(max_workers=8) as pool:extras=[f.result() for f in as_completed([pool.submit(extra_fetch,c) for c in EXTRA])]
results=[x for x in base_results if x]+[x for x in extras if x]
results=[x for x in results if isinstance(x.get('score'),(int,float)) and x['score']>=85]
def country(symbol):
 s=str(symbol).upper();suffix={'.DE':'DE','.F':'DE','.PA':'FR','.SW':'CH','.L':'GB','.AS':'NL','.MI':'IT','.MC':'ES','.ST':'SE','.OL':'NO','.CO':'DK','.HE':'FI','.T':'JP','.HK':'HK','.TO':'CA','.AX':'AU','.NS':'IN','.BO':'IN','.KS':'KR','.KQ':'KR','.SA':'BR'}
 for k,v in suffix.items():
  if s.endswith(k):return v
 if s=='TSM':return 'TW'
 if s in {'BABA','BIDU','PDD','JD'}:return 'CN'
 return 'US'
groups=defaultdict(list)
for x in results:
 y=dict(x);y['country']=y.get('country') or country(x.get('symbol',''));groups[y['country']].append(y)
for k in groups:groups[k]=sorted(groups[k],key=lambda x:(-x['score'],-float(x.get('rsi',0)),x.get('symbol','')))[:10]
world=sorted(results,key=lambda x:(-x['score'],-float(x.get('rsi',0)),x.get('symbol','')))[:10]
out={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'criteria':'Je Land maximal 10 Titel; nur AKTScore >=85/100; exakt dieselbe Score-Berechnung wie die Einzelanalyse.','countries':dict(groups),'items':world}
with open('country-top10.json','w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'));f.write('\n')
with open('top10.json','w',encoding='utf-8') as f:json.dump({'generatedAt':out['generatedAt'],'criteria':'Nur Titel mit AKTScore >=85/100; identisches Scoring wie Einzelanalyse; weltweite Kandidatenbasis; maximal 10 Titel.','items':world},f,ensure_ascii=False,separators=(',',':'));f.write('\n')
print('Country Top10:',{k:len(v) for k,v in groups.items()})
