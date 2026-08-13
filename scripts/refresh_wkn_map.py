import json,datetime,runpy

# Kostenlose lokale WKN-Grunddaten aus dem bestehenden weltweiten Kandidatenuniversum.
# Beliebige andere WKNs werden weiterhin live über OpenFIGI versucht.
ns=runpy.run_path('scripts/refresh_top10.py')
rows=list(ns.get('CANDIDATES',[]))
EXTRA=[
('Samsung Electronics Co., Ltd.','005930.KS','881823'),('SK hynix Inc.','000660.KS','A0B5A1'),
('Tencent Holdings Limited','0700.HK','A0YF5J'),('Alibaba Group Holding Limited','9988.HK','A2PV5D'),('BYD Company Limited','1211.HK','A0M4W9'),
('Tata Consultancy Services Limited','TCS.NS','A2N7W6'),('Reliance Industries Limited','RELIANCE.NS','946078'),('Infosys Limited','INFY.NS','919730'),('HDFC Bank Limited','HDFCBANK.NS','A0M6K4'),
('Petroleo Brasileiro S.A.','PETR4.SA','899026'),('Vale S.A.','VALE3.SA','897998')]
rows.extend(EXTRA)
out={}
for name,symbol,wkn in rows:
    w=str(wkn or '').strip().upper()
    if w:
        out[w]={'wkn':w,'name':name,'ticker':symbol}
with open('wkn-map.json','w',encoding='utf-8') as f:
    json.dump({'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'count':len(out),'items':out},f,ensure_ascii=False,separators=(',',':'))
    f.write('\n')
print('WKN map:',len(out))
