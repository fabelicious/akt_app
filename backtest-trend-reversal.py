import os, random, json
import pandas as pd
import numpy as np
import yfinance as yf

SEED = 42
N_STOCKS = int(os.getenv('N_STOCKS', '1000'))
START = '2023-01-01'
END = '2026-08-01'
random.seed(SEED)

def ema(a, n):
    if len(a) < n: return np.array([])
    return pd.Series(a).ewm(span=n, adjust=False).mean().to_numpy()

def rsi(a, n=14):
    if len(a) < n + 1: return 50.0
    d = np.diff(a); g = np.maximum(d, 0); l = np.maximum(-d, 0)
    ag, al = g[:n].mean(), l[:n].mean()
    for xg, xl in zip(g[n:], l[n:]):
        ag = (ag*(n-1)+xg)/n; al = (al*(n-1)+xl)/n
    return 100.0 if al == 0 else 100-100/(1+ag/al)

def macd(a):
    if len(a) < 35: return 0, 0, 0, 0
    e12, e26 = ema(a,12), ema(a,26); vals = e12[14:] - e26; sig = ema(vals,9)
    return float(vals[-1]), float(sig[-1]), float(vals[-1]-sig[-1]), float(vals[-2]-sig[-2])

def score(df):
    c = df['close'].to_numpy(float); v = df['volume'].to_numpy(float)
    if len(c) < 60: return None
    last=c[-1]; s20=c[-20:].mean(); s50=c[-50:].mean(); s200=c[-200:].mean() if len(c)>=200 else None
    r=rsi(c); mv,ms,mh,mhp=macd(c); low1=c[-20:-10].min(); low2=c[-10:].min(); hi1=c[-20:-10].max(); hi2=c[-10:].max()
    v20=v[-20:].mean(); v60=v[-60:].mean(); vr=v20/v60 if v60 else 1
    dd=(last/c[-60:].max()-1)*100; mom5=(last/c[-6]-1)*100; s=0
    if s200 is not None and last>s200:s+=12
    if last>s50:s+=10
    if last>s20:s+=12
    if 45<=r<=68:s+=10
    elif 30<=r<45:s+=6
    elif r<30:s+=3
    if mh>0 and mv>0:s+=15
    elif mh>0:s+=10
    elif mh>mhp:s+=5
    if low2>low1*1.01:s+=8
    if hi2>hi1*1.01:s+=8
    if mom5>3:s+=8
    elif mom5>0:s+=4
    if vr>=1.15 and mom5>0:s+=7
    elif vr>=.9:s+=4
    if -35>=dd>=-10:s+=5
    elif dd>-10:s+=2
    return int(max(0,min(100,round(s))))

def universe():
    frames=[]
    for url,col in [('https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt','Symbol'),('https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt','ACT Symbol')]:
        x=pd.read_csv(url,sep='|'); x=x[x.get('Test Issue','N')=='N']; frames.append(x[col].astype(str))
    s=pd.concat(frames).drop_duplicates(); s=s[~s.str.contains(r'[\^$+=/]',regex=True)]; s=s[~s.str.contains(r'[-.]W$|[-.]R$|[-.]U$|[-.]WS$|\.RT$',regex=True)]
    return s.sample(frac=1,random_state=SEED).head(N_STOCKS).tolist()

def main():
    tickers=universe(); data={}
    for i in range(0,len(tickers),100):
        batch=tickers[i:i+100]
        try:
            raw=yf.download(batch,start=START,end=END,auto_adjust=True,group_by='ticker',threads=True,progress=False)
            for t in batch:
                try:
                    x=raw[t].rename(columns={c:c.lower() for c in raw[t].columns})[['close','volume']].dropna()
                    if len(x)>=260:data[t]=x
                except Exception: pass
        except Exception as e: print('download error',e)
        print('progress',min(i+100,len(tickers)),len(tickers),'usable',len(data),flush=True)
    rows=[]
    for t,df in data.items():
        if getattr(df.index,'tz',None): df=df.copy(); df.index=df.index.tz_localize(None)
        dates=pd.date_range(max(pd.Timestamp('2024-01-02'),df.index.min()+pd.Timedelta(days=260)),min(pd.Timestamp('2026-07-31'),df.index.max()-pd.Timedelta(days=61)),freq='10B')
        for d in dates:
            hist=df[df.index<=d]
            if len(hist)<60: continue
            sc=score(hist); pos=hist.index[-1]; fut=df[df.index>pos]
            if sc is None or len(fut)<60: continue
            p=float(hist.close.iloc[-1]); f5=float(fut.close.iloc[4]); f20=float(fut.close.iloc[19]); f60=float(fut.close.iloc[59])
            rows.append([t,pos.date(),sc,p,f5/p-1,f20/p-1,f60/p-1,float(fut.close.iloc[:20].min()/p-1)])
    out=pd.DataFrame(rows,columns=['ticker','date','score','price','ret5','ret20','ret60','mdd20']); out.to_csv('trend-reversal-backtest.csv',index=False)
    summary=[]
    for th in [42,58,72]:
        z=out[out.score>=th]; summary.append({'threshold':th,'signals':len(z),'stocks':z.ticker.nunique(),'avg5':z.ret5.mean(),'avg20':z.ret20.mean(),'avg60':z.ret60.mean(),'median20':z.ret20.median(),'win20':(z.ret20>0).mean(),'avg_mdd20':z.mdd20.mean()})
    z=out; summary.append({'threshold':'all','signals':len(z),'stocks':z.ticker.nunique(),'avg5':z.ret5.mean(),'avg20':z.ret20.mean(),'avg60':z.ret60.mean(),'median20':z.ret20.median(),'win20':(z.ret20>0).mean(),'avg_mdd20':z.mdd20.mean()})
    pd.DataFrame(summary).to_csv('trend-reversal-summary.csv',index=False); print(pd.DataFrame(summary).to_string(index=False))
    json.dump({'stocks':len(data),'observations':len(out),'summary':summary},open('trend-reversal-backtest.json','w'),indent=2,default=str)

if __name__=='__main__': main()
