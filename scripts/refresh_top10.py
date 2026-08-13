import datetime,json,math,urllib.parse,urllib.request
from concurrent.futures import ThreadPoolExecutor,as_completed

# Weltweites Kandidatenuniversum. Das Scoring bleibt identisch zur Detailanalyse.
CANDIDATES=[
("Microsoft Corporation","MSFT","870747"),("Apple Inc.","AAPL","865985"),("Alphabet Inc. Class A","GOOGL","A14Y6F"),("Meta Platforms, Inc.","META","A1JWVX"),("Amazon.com, Inc.","AMZN","906866"),("Tesla, Inc.","TSLA","A1CX3T"),("NVIDIA Corporation","NVDA","918422"),("Broadcom Inc.","AVGO","A2JG9Z"),("Advanced Micro Devices, Inc.","AMD","863186"),("JPMorgan Chase & Co.","JPM","850628"),("Visa Inc.","V","A2J7M9"),("Mastercard Incorporated","MA","A0F602"),("Eli Lilly and Company","LLY","858560"),("Oracle Corporation","ORCL","871460"),("Netflix, Inc.","NFLX","552484"),("Salesforce, Inc.","CRM","A0B87V"),("Adobe Inc.","ADBE","871981"),("Cisco Systems, Inc.","CSCO","878841"),("Qualcomm Incorporated","QCOM","883121"),("Texas Instruments Incorporated","TXN","852654"),("Costco Wholesale Corporation","COST","888351"),("McDonald's Corporation","MCD","856958"),("Coca-Cola Company","KO","850663"),("Procter & Gamble Company","PG","852062"),("Walmart Inc.","WMT","860853"),("Johnson & Johnson","JNJ","853260"),("GE Aerospace","GE","A3CSML"),("Arista Networks, Inc.","ANET","A11099"),("Palantir Technologies Inc.","PLTR","A2QA4J"),("Uber Technologies, Inc.","UBER","A2PHHG"),("Booking Holdings Inc.","BKNG","A2JEXP"),("Caterpillar Inc.","CAT","850598"),("Honeywell International Inc.","HON","870153"),("Lockheed Martin Corporation","LMT","894648"),("Linde plc","LIN","A2DSYC"),("Thermo Fisher Scientific Inc.","TMO","857209"),("Intuitive Surgical, Inc.","ISRG","888024"),("PepsiCo, Inc.","PEP","851995"),("IBM","IBM","851399"),("AT&T Inc.","T","868440"),("Verizon Communications Inc.","VZ","868402"),("Exxon Mobil Corporation","XOM","852549"),("Chevron Corporation","CVX","852552"),("Berkshire Hathaway Inc. Class A","BRK-A","854075"),("Berkshire Hathaway Inc. Class B","BRK-B","A0YJQ2"),
("SAP SE","SAP","716460"),("Siemens AG","SIE.DE","723610"),("Allianz SE","ALV.DE","840400"),("Airbus SE","AIR.PA","938914"),("ASML Holding N.V.","ASML","A1J4U4"),("LVMH","MC.PA","853292"),("Schneider Electric","SU.PA","860180"),("Hermes International","RMS.PA","886670"),("TotalEnergies SE","TTE.PA","850727"),("Sanofi","SAN.PA","920657"),("EssilorLuxottica","EL.PA","863195"),("Air Liquide","AI.PA","850133"),("BNP Paribas","BNP.PA","887771"),("AXA","CS.PA","855705"),("Vinci","DG.PA","867475"),("Deutsche Telekom AG","DTE.DE","555750"),("Munich Re","MUV2.DE","843002"),("Infineon Technologies AG","IFX.DE","623100"),("Mercedes-Benz Group AG","MBG.DE","710000"),("BMW AG","BMW.DE","519000"),("Volkswagen AG","VOW3.DE","766403"),("BASF SE","BAS.DE","515100"),("DHL Group","DHL.DE","555200"),("Rheinmetall AG","RHM.DE","703000"),("Deutsche Bank AG","DBK.DE","514000"),("Commerzbank AG","CBK.DE","CBK100"),("Adyen N.V.","ADYEN.AS","A2JNF4"),("Prosus N.V.","PRX.AS","A2PRDK"),("Novo Nordisk A/S","NOVO-B.CO","A3EU6F"),("DSV A/S","DSV.CO","A1C0ZC"),("Roche Holding AG","ROG.SW","855167"),("Novartis AG","NOVN.SW","904278"),("UBS Group AG","UBSG.SW","A12DFH"),("Zurich Insurance Group","ZURN.SW","579919"),("ABB Ltd","ABBN.SW","919730"),("Rio Tinto plc","RIO.L","852147"),("AstraZeneca PLC","AZN.L","886455"),("Shell plc","SHEL.L","A3C99G"),("Unilever PLC","ULVR.L","A0JNE2"),("HSBC Holdings plc","HSBA.L","923893"),("BP p.l.c.","BP.L","850517"),("RELX plc","REL.L","A3EQR4"),("London Stock Exchange Group","LSEG.L","A0JEJF"),("Ferrari N.V.","RACE.MI","A2ACKK"),
("Taiwan Semiconductor Manufacturing Company Limited","TSM","909800"),("Alibaba Group Holding Limited","BABA","A117ME"),("Tencent Holdings Limited","0700.HK","A1138D"),("Toyota Motor Corporation","7203.T","853510"),("Sony Group Corporation","6758.T","853687"),("Keyence Corporation","6861.T","878610"),("Tokyo Electron Limited","8035.T","865510"),("Mitsubishi UFJ Financial Group","8306.T","657892"),("Hitachi, Ltd.","6501.T","853219"),("Recruit Holdings Co., Ltd.","6098.T","A12B2R"),("Nintendo Co., Ltd.","7974.T","864009"),("SoftBank Group Corp.","9984.T","891624"),("Shin-Etsu Chemical Co., Ltd.","4063.T","859579"),("Samsung Electronics Co., Ltd.","005930.KS","888322"),("SK Hynix Inc.","000660.KS","A0MZ1Y"),("Hyundai Motor Company","005380.KS","885166"),("PDD Holdings Inc.","PDD","A2JR2L"),("JD.com, Inc.","JD","A112ST"),("Baidu, Inc.","BIDU","A0F5DE"),("Meituan","3690.HK","A2N5NR"),("ICICI Bank Limited","IBN","A0MN2Z"),("HDFC Bank Limited","HDB","A0X9JL"),("Infosys Limited","INFY","919730"),("Reliance Industries Limited","RELIANCE.NS","946271"),("BHP Group Limited","BHP.AX","850524"),("Commonwealth Bank of Australia","CBA.AX","882695"),("CSL Limited","CSL.AX","890068"),("Macquarie Group Limited","MQG.AX","A0F5K1"),("Woodside Energy Group Ltd","WDS.AX","A3C6AE"),
("Shopify Inc.","SHOP","A14TJP"),("Royal Bank of Canada","RY","852173"),("Toronto-Dominion Bank","TD","852684"),("Canadian Natural Resources","CNQ","865114"),("Enbridge Inc.","ENB","885427"),("MercadoLibre, Inc.","MELI","A0MYNP"),("Vale S.A.","VALE","897998"),("Petroleo Brasileiro S.A.","PBR","899026"),
("Atlas Copco AB","ATCO-A.ST","886561"),("Volvo AB","VOLV-B.ST","855689"),("Sandvik AB","SAND.ST","865956"),("EQT AB","EQT.ST","A2P4AH"),("KONE Oyj","KNEBV.HE","881050"),("Nokia Oyj","NOKIA.HE","870737"),("Wärtsilä Oyj","WRT1V.HE","881360")
]

def mean(a):return sum(a)/len(a) if a else 0.0
def sma(a,n):return mean(a[-n:]) if len(a)>=n else None
def rsi(a,n=14):
 if len(a)<n+1:return 50.0
 g=l=0.0
 for i in range(1,n+1):
  d=a[i]-a[i-1];g+=max(d,0);l+=max(-d,0)
 g/=n;l/=n
 for i in range(n+1,len(a)):
  d=a[i]-a[i-1];g=(g*(n-1)+max(d,0))/n;l=(l*(n-1)+max(-d,0))/n
 return 100.0 if l==0 else 100.0-100.0/(1.0+g/l)
def ema(a,n):
 if len(a)<n:return []
 k=2/(n+1);e=mean(a[:n]);out=[e]
 for x in a[n:]:e=x*k+e*(1-k);out.append(e)
 return out
def macd(a):
 if len(a)<35:return 0.0,0.0
 e12,e26=ema(a,12),ema(a,26);values=[e12[i+14]-e26[i] for i in range(len(e26))];sig=ema(values,9);return values[-1],sig[-1] if sig else 0.0
def volatility(a,n=20):
 if len(a)<n+1:return 0.0
 r=[a[i]/a[i-1]-1 for i in range(len(a)-n,len(a))];m=mean(r);return math.sqrt(mean([(x-m)**2 for x in r]))*math.sqrt(252)*100
def score(rows):
 close=[x[0] for x in rows if math.isfinite(x[0])];volume=[x[1] for x in rows if math.isfinite(x[0])]
 if len(close)<252:return None
 last=close[-1];a20=sma(close,20);a50=sma(close,50);a200=sma(close,200);rr=rsi(close);mm,ss=macd(close);vol=volatility(close);m3=(last/close[-63]-1)*100;m12=(last/close[-252]-1)*100;v20=mean(volume[-20:]);v60=mean(volume[-60:]);vr=v20/v60 if v60 else 1
 s=(5 if last>a20 else 0)+(10 if last>a50 else 0)+(15 if last>a200 else 0)+(10 if m3>=8 else 6 if m3>0 else 0)+(10 if m12>=15 else 6 if m12>0 else 0)+(15 if 50<=rr<=65 else 10 if 45<=rr<=70 else 5 if 35<=rr<45 else 0)+(15 if mm>ss and mm>0 else 10 if mm>ss else 6 if mm>0 else 0)+(10 if vol<20 else 7 if vol<30 else 4 if vol<45 else 1)+(10 if vr>=1.15 and last>a20 else 6 if vr>=.9 else 2)
 return max(0,min(100,round(s))),rr

def fetch(candidate):
 name,symbol,wkn=candidate
 try:
  u='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol,safe='')+'?range=1900d&interval=1d&events=history&includeAdjustedClose=true';req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=10) as r:z=json.load(r)['chart']['result'][0]
  q=z.get('indicators',{}).get('quote',[{}])[0];adj=(z.get('indicators',{}).get('adjclose') or [{}])[0].get('adjclose',[]);rawv=q.get('volume',[]);rows=[]
  for i,x in enumerate(q.get('close',[])):
   c=adj[i] if i<len(adj) and adj[i] is not None else x
   if isinstance(c,(int,float)) and math.isfinite(c):rows.append((float(c),float(rawv[i] or 0) if i<len(rawv) else 0.0))
  if len(rows)<252:return None
  sc,rr=score(rows);cur=rows[-1][0];prev=rows[-2][0]
  return {'name':name,'symbol':symbol,'wkn':wkn,'score':sc,'price':cur,'change':round((cur/prev-1)*100,2),'rsi':round(rr,1)}
 except Exception:return None

with ThreadPoolExecutor(max_workers=16) as pool:
 results=[f.result() for f in as_completed([pool.submit(fetch,c) for c in CANDIDATES])]
valid=[x for x in results if x and x['score']>=85]
items=sorted(valid,key=lambda x:(-x['score'],-x['rsi'],x['symbol']))[:10]
try:
 previous=json.load(open('top10.json',encoding='utf-8')).get('items',[])
 previous=[x for x in previous if isinstance(x.get('score'),(int,float)) and x['score']>=85]
 previous=sorted(previous,key=lambda x:(-x['score'],-float(x.get('rsi',0)),x.get('symbol','')))[:10]
 if len(valid)<6 and len(previous)>=6: items=previous
except Exception: pass
out={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'criteria':'Weltweites Kandidatenuniversum; identisches AKTScore-Scoring 0-100; nur Titel mit Score >=85/100; maximal 10 Titel. Bei unvollständigem Abruf bleibt der letzte vollständige Snapshot erhalten.','items':items}
with open('top10.json','w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'));f.write('\n')
print('Candidates:',len(CANDIDATES),'>=85:',len(valid),'Top10:',[(x['symbol'],x['score']) for x in items])