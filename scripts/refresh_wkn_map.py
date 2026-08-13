import json,datetime,runpy

# Kostenlose, lokale WKN-Grunddaten aus dem bestehenden weltweiten Kandidatenuniversum.
# Unbekannte WKNs werden weiterhin live über OpenFIGI aufgelöst.
ns=runpy.run_path('scripts/refresh_top10.py')
rows=list(ns.get('CANDIDATES',[]))
try:
    country=runpy.run_path('scripts/refresh_country_top10.py')
except Exception:
    country={}
for x in country.get('EXTRA',[]):
    if len(x)>=4:
        rows.append((x[0],x[1],x[2]))

out={}
for name,symbol,wkn in rows:
    w=str(wkn or '').strip().upper()
    if w:
        out[w]={'wkn':w,'name':name,'ticker':symbol}

with open('wkn-map.json','w',encoding='utf-8') as f:
    json.dump({'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'count':len(out),'items':out},f,ensure_ascii=False,separators=(',',':'))
    f.write('\n')
print('WKN map:',len(out))
