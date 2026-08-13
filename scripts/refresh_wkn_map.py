import json, os, runpy, time, urllib.request
from datetime import datetime, timezone

ns=runpy.run_path('scripts/refresh_top10.py')
candidates=list(ns.get('CANDIDATES',[]))
api_key=os.environ.get('OPENFIGI_API_KEY','').strip()
headers={'Content-Type':'application/json','User-Agent':'AKT-Pro-WKN-Map/1.0'}
if api_key: headers['X-OPENFIGI-APIKEY']=api_key
out={}
chunk=100 if api_key else 5
for pos in range(0,len(candidates),chunk):
    batch=candidates[pos:pos+chunk]
    payload=[{'idType':'ID_WERTPAPIER','idValue':str(wkn)} for _,_,wkn in batch]
    response=[]
    for attempt in range(4):
        try:
            req=urllib.request.Request('https://api.openfigi.com/v3/mapping',data=json.dumps(payload).encode(),headers=headers,method='POST')
            with urllib.request.urlopen(req,timeout=25) as r: response=json.load(r)
            break
        except Exception:
            if attempt<3: time.sleep(3*(attempt+1))
    for candidate,result in zip(batch,response if isinstance(response,list) else []):
        name,symbol,wkn=candidate
        rows=result.get('data',[]) if isinstance(result,dict) else []
        equities=[x for x in rows if 'equity' in str(x.get('marketSector','')).lower() or 'stock' in str(x.get('securityType','')).lower()]
        if equities:
            e=equities[0]
            out[str(wkn).upper()]={'wkn':str(wkn),'name':e.get('name') or name,'ticker':e.get('ticker') or symbol,'exchCode':e.get('exchCode') or '','symbol':symbol,'figi':e.get('figi','')}
    if not api_key: time.sleep(2.6)

# Preserve the known candidate mapping even when OpenFIGI temporarily returns no result.
for name,symbol,wkn in candidates:
    out.setdefault(str(wkn).upper(),{'wkn':str(wkn),'name':name,'ticker':symbol,'exchCode':'','symbol':symbol,'figi':''})

with open('wkn-map.json','w',encoding='utf-8') as f:
    json.dump({'generatedAt':datetime.now(timezone.utc).isoformat(),'count':len(out),'items':out},f,ensure_ascii=False,separators=(',',':'))
    f.write('\n')
print('WKN map:',len(out))
