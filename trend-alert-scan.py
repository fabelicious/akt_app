#!/usr/bin/env python3
import concurrent.futures,json,math,time,urllib.parse,urllib.request
UNIVERSE_FILE="country-trend-universe-v3.json"; WKN_MAP_FILE="wkn-map.json"; STATE_FILE="trend-alert-state.json"; NTFY_BASE="https://ntfy.sh/"; LOOKBACK_DAYS=420

def mean(v): return sum(v)/len(v) if v else None
def ema(v,n):
    if len(v)<n:return []
    k=2/(n+1);e=mean(v[:n]);o=[e]
    for x in v[n:]:e=x*k+e*(1-k);o.append(e)
    return o
def rsi(v,n=14):
    if len(v)<n+1:return 50.0
    g=l=0
    for i in range(1,n+1):d=v[i]-v[i-1];g+=max(d,0);l+=max(-d,0)
    g/=n;l/=n
    for i in range(n+1,len(v)):
        d=v[i]-v[i-1];g=(g*(n-1)+max(d,0))/n;l=(l*(n-1)+max(-d,0))/n
    return 100 if l==0 else 100-100/(1+g/l)
def macd(v):
    if len(v)<35:return 0,0,0,0
    a,b=ema(v,12),ema(v,26);m=[a[i+14]-b[i] for i in range(len(b))];s=ema(m,9)
    return (m[-1],s[-1],m[-1]-s[-1],m[-2]-s[-2]) if len(s)>=2 else (0,0,0,0)
def analyse(c,vol):
    if len(c)<60:return None
    last=c[-1];s20=mean(c[-20:]);s50=mean(c[-50:]);s200=mean(c[-200:]) if len(c)>=200 else None;r=rsi(c);mv,_,mh,ph=macd(c);lo1,lo2=min(c[-20:-10]),min(c[-10:]);hi1,hi2=max(c[-20:-10]),max(c[-10:]);v20,v60=mean(vol[-20:]),mean(vol[-60:]);vr=v20/v60 if v60 else 1;dd=(last/max(c[-60:])-1)*100;mom=(last/c[-6]-1)*100;score=0
    if s200 and last>s200:score+=12
    if s50 and last>s50:score+=10
    if last>s20:score+=12
    if 45<=r<=68:score+=10
    elif 30<=r<45:score+=6
    elif r<30:score+=3
    if mh>0 and mv>0:score+=15
    elif mh>0:score+=10
    elif mh>ph:score+=5
    if lo2>lo1*1.01:score+=8
    if hi2>hi1*1.01:score+=8
    if mom>3:score+=8
    elif mom>0:score+=4
    if vr>=1.15 and mom>0:score+=7
    elif vr>=.9:score+=4
    if -35<=dd<=-10:score+=5
    elif dd>-10:score+=2
    score=max(0,min(100,round(score)));status="BESTÄTIGTER KAUF" if score>=72 else "FRÜHES KAUFSIGNAL" if score>=58 else "BODENBILDUNG / ABWARTEN" if score>=42 else "ABWÄRTSTREND / KEIN KAUF";return score,status
def yahoo(symbol):
    end=int(time.time());start=end-LOOKBACK_DAYS*86400;url="https://query1.finance.yahoo.com/v8/finance/chart/"+urllib.parse.quote(symbol,safe="")+f"?period1={start}&period2={end}&interval=1d&events=history&includeAdjustedClose=true";req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"});err=None
    for a in range(3):
        try:
            with urllib.request.urlopen(req,timeout=20) as r:p=json.load(r)
            q=p["chart"]["result"][0];qq=q.get("indicators",{}).get("quote",[{}])[0];adj=q.get("indicators",{}).get("adjclose",[{}])[0].get("adjclose",[]);raw=qq.get("volume",[]);c=[];v=[]
            for i,x in enumerate(adj):
                if isinstance(x,(int,float)) and math.isfinite(x):c.append(float(x));v.append(float(raw[i] or 0) if i<len(raw) else 0)
            return c,v
        except Exception as e:err=e;time.sleep(1.5*(a+1)) if a<2 else None
    raise err
def topic(key):return "aktpro-trend-"+"".join(ch if ch.isalnum() or ch in "_-" else "-" for ch in str(key).upper()).lower()
def publish(key,symbol,old,cur):
    score,status=cur;os,ost=old;body=f"{symbol}: {ost} -> {status} | Score {os} -> {score}"
    req=urllib.request.Request(NTFY_BASE+topic(key),data=body.encode("utf-8"),method="POST",headers={"Title":f"Trendwende {symbol}","Priority":"high" if score>=72 else "default","Tags":"chart_with_upwards_trend","Click":"https://fabelicious.github.io/akt_app/"})
    with urllib.request.urlopen(req,timeout=20) as r:return r.status
def main():
    with open(UNIVERSE_FILE,encoding="utf-8") as f:universe=json.load(f)
    try:
        with open(WKN_MAP_FILE,encoding="utf-8") as f:items=json.load(f).get("items",{})
        symbol_to_wkn={str(v.get("symbol")):str(k) for k,v in items.items() if v.get("symbol")}
    except Exception:symbol_to_wkn={}
    symbols=sorted({s for values in universe.values() for s in values})
    try:
        with open(STATE_FILE,encoding="utf-8") as f:state=json.load(f);state=state if isinstance(state,dict) else {}
    except Exception:state={}
    next_state=dict(state);alerts=[];failed=[]
    def one(s):
        try:c,v=yahoo(s);return s,analyse(c,v),None
        except Exception as e:return s,None,str(e)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for s,z,e in pool.map(one,symbols):
            if z is None:failed.append((s,e));continue
            score,status=z;pr=state.get(s)
            if pr:
                old=(int(pr.get("score",0)),str(pr.get("status","")));changed=old[1]!=status;cross=(old[0]<58<=score)or(old[0]>=58>score)or(old[0]<72<=score)or(old[0]>=72>score)
                if changed or cross:alerts.append((s,old,z))
                else:next_state[s]={"score":score,"status":status,"checked_at":int(time.time())}
            else:next_state[s]={"score":score,"status":status,"checked_at":int(time.time())}
    push_failures=[]
    for s,old,z in alerts:
        ok=True
        for key in dict.fromkeys([s]+([symbol_to_wkn[s]] if symbol_to_wkn.get(s) else [])):
            try:publish(key,s,old,z);print("PUSH",key,s,old,"->",z)
            except Exception as e:ok=False;push_failures.append((key,s,str(e)));print("push failed",key,s,e)
        if ok:next_state[s]={"score":z[0],"status":z[1],"checked_at":int(time.time())}
    with open(STATE_FILE,"w",encoding="utf-8") as f:json.dump(next_state,f,ensure_ascii=False,indent=2,sort_keys=True)
    print(f"Scanned {len(symbols)} symbols; successful={len(next_state)}; data_failures={len(failed)}; alerts={len(alerts)}; push_failures={len(push_failures)}")
    if failed:print("Data failures:",", ".join(s for s,_ in failed[:20]))
    if push_failures:raise RuntimeError(f"{len(push_failures)} push notification(s) failed; baseline retained for retry")
if __name__=="__main__":main()
