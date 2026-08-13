import datetime
import json
import math
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

CANDIDATES = [
    ("Microsoft Corporation", "MSFT", "870747"),("Apple Inc.", "AAPL", "865985"),("Alphabet Inc. Class A", "GOOGL", "A14Y6F"),
    ("Meta Platforms, Inc.", "META", "A1JWVX"),("Amazon.com, Inc.", "AMZN", "906866"),("Tesla, Inc.", "TSLA", "A1CX3T"),
    ("NVIDIA Corporation", "NVDA", "918422"),("Broadcom Inc.", "AVGO", "A2JG9Z"),("Advanced Micro Devices, Inc.", "AMD", "863186"),
    ("Taiwan Semiconductor Manufacturing Company Limited", "TSM", "909800"),("ASML Holding N.V.", "ASML", "A1J4U4"),("SAP SE", "SAP", "716460"),
    ("Siemens AG", "SIE.DE", "723610"),("Allianz SE", "ALV.DE", "840400"),("Airbus SE", "AIR.PA", "938914"),
    ("Berkshire Hathaway Inc. Class A", "BRK-A", "854075"),("Berkshire Hathaway Inc. Class B", "BRK-B", "A0YJQ2"),
    ("JPMorgan Chase & Co.", "JPM", "850628"),("Visa Inc.", "V", "A2J7M9"),("Mastercard Incorporated", "MA", "A0F602"),
    ("Eli Lilly and Company", "LLY", "858560"),("Novo Nordisk A/S", "NVO", "A3EU6F"),("Oracle Corporation", "ORCL", "871460"),
    ("Netflix, Inc.", "NFLX", "552484"),("Salesforce, Inc.", "CRM", "A0B87V"),("Adobe Inc.", "ADBE", "871981"),
    ("Cisco Systems, Inc.", "CSCO", "878841"),("Qualcomm Incorporated", "QCOM", "883121"),("Texas Instruments Incorporated", "TXN", "852654"),
    ("Costco Wholesale Corporation", "COST", "888351"),("McDonald's Corporation", "MCD", "856958"),("Coca-Cola Company", "KO", "850663"),
    ("Procter & Gamble Company", "PG", "852062"),("Walmart Inc.", "WMT", "860853"),("Johnson & Johnson", "JNJ", "853260"),
    ("GE Aerospace", "GE", "A3CSML"),("Arista Networks, Inc.", "ANET", "A11099"),("Palantir Technologies Inc.", "PLTR", "A2QA4J"),
    ("Uber Technologies, Inc.", "UBER", "A2PHHG"),("Booking Holdings Inc.", "BKNG", "A2JEXP"),("Caterpillar Inc.", "CAT", "850598"),
    ("Honeywell International Inc.", "HON", "870153"),("Lockheed Martin Corporation", "LMT", "894648"),("Linde plc", "LIN", "A2DSYC"),
    ("Thermo Fisher Scientific Inc.", "TMO", "857209"),("Intuitive Surgical, Inc.", "ISRG", "888024"),("PepsiCo, Inc.", "PEP", "851995"),
]

def mean(a): return sum(a) / len(a) if a else 0.0
def sma(a,n): return mean(a[-n:]) if len(a)>=n else None

def rsi(a,n=14):
    if len(a)<n+1:return 50.0
    gain=loss=0.0
    for i in range(1,n+1):
        d=a[i]-a[i-1];gain+=max(d,0.0);loss+=max(-d,0.0)
    gain/=n;loss/=n
    for i in range(n+1,len(a)):
        d=a[i]-a[i-1];gain=(gain*(n-1)+max(d,0.0))/n;loss=(loss*(n-1)+max(-d,0.0))/n
    return 100.0 if loss==0 else 100.0-100.0/(1.0+gain/loss)

def ema(a,n):
    if len(a)<n:return []
    k=2.0/(n+1);e=mean(a[:n]);out=[e]
    for x in a[n:]:e=x*k+e*(1-k);out.append(e)
    return out

def macd(a):
    if len(a)<35:return 0.0,0.0
    e12,e26=ema(a,12),ema(a,26);values=[e12[i+14]-e26[i] for i in range(len(e26))];signal=ema(values,9)
    return values[-1],signal[-1] if signal else 0.0

def volatility(a,n=20):
    if len(a)<n+1:return 0.0
    r=[a[i]/a[i-1]-1 for i in range(len(a)-n,len(a))];m=mean(r)
    return math.sqrt(mean([(x-m)**2 for x in r]))*math.sqrt(252)*100

def score(rows):
    close=[x[0] for x in rows if isinstance(x[0],(int,float)) and math.isfinite(x[0])];volume=[x[1] for x in rows if isinstance(x[0],(int,float)) and math.isfinite(x[0])]
    if len(close)<252:return None
    last=close[-1];a20=sma(close,20);a50=sma(close,50);a200=sma(close,200);rr=rsi(close);mm,ss=macd(close);vol=volatility(close);m3=(last/close[-63]-1)*100;m12=(last/close[-252]-1)*100;v20=mean(volume[-20:]);v60=mean(volume[-60:]);vr=v20/v60 if v60 else 1
    s=0;s+=5 if last>a20 else 0;s+=10 if last>a50 else 0;s+=15 if last>a200 else 0;s+=10 if m3>=8 else 6 if m3>0 else 0;s+=10 if m12>=15 else 6 if m12>0 else 0;s+=15 if 50<=rr<=65 else 10 if 45<=rr<=70 else 5 if 35<=rr<45 else 0;s+=15 if mm>ss and mm>0 else 10 if mm>ss else 6 if mm>0 else 0;s+=10 if vol<20 else 7 if vol<30 else 4 if vol<45 else 1;s+=10 if vr>=1.15 and last>a20 else 6 if vr>=0.9 else 2
    return max(0,min(100,round(s))),rr

def fetch(candidate):
    name,symbol,wkn=candidate
    try:
        url='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol,safe='')+'?range=1900d&interval=1d&events=history&includeAdjustedClose=true';req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=10) as r:z=json.load(r)['chart']['result'][0]
        q=z.get('indicators',{}).get('quote',[{}])[0];adj=(z.get('indicators',{}).get('adjclose') or [{}])[0].get('adjclose',[]);rawv=q.get('volume',[]);rows=[]
        for i,x in enumerate(q.get('close',[])):
            c=adj[i] if i<len(adj) and adj[i] is not None else x
            if isinstance(c,(int,float)) and math.isfinite(c):rows.append((float(c),float(rawv[i] or 0) if i<len(rawv) else 0.0))
        if len(rows)<252:return None
        sc,rr=score(rows);current=rows[-1][0];previous=rows[-2][0]
        return {'name':name,'symbol':symbol,'wkn':wkn,'score':sc,'price':current,'change':round((current/previous-1)*100,2),'rsi':round(rr,1)}
    except Exception as exc:print('skip',symbol,exc);return None

with ThreadPoolExecutor(max_workers=8) as pool:results=[f.result() for f in as_completed([pool.submit(fetch,c) for c in CANDIDATES])]
items=[x for x in results if x];items.sort(key=lambda x:(-x['score'],-x['rsi'],x['symbol']));items=[x for x in items if x['score']>=90][:10]
out={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'criteria':'Top 10 nach identischem AKTScore 0-100; Adjusted Close + Momentum + RSI + MACD + Volatilität + Volumen','items':items}
with open('top10.json','w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'));f.write('\n')
print('Top10:',[(x['symbol'],x['score']) for x in items])
