import os, random, json
import pandas as pd
import numpy as np
import yfinance as yf
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

SEED = 42
N_STOCKS = int(os.getenv('N_STOCKS', '1000'))
START = '2023-01-01'
END = '2026-08-01'
TRAIN_END = pd.Timestamp('2025-12-31')
random.seed(SEED)

FEATURES = ['trend200','trend50','trend20','rsi','macd','structure','momentum5','volume','drawdown']


def ema(a, n):
    if len(a) < n:
        return np.array([])
    return pd.Series(a).ewm(span=n, adjust=False).mean().to_numpy()


def rsi(a, n=14):
    if len(a) < n + 1:
        return 50.0
    d = np.diff(a)
    g = np.maximum(d, 0)
    l = np.maximum(-d, 0)
    ag, al = g[:n].mean(), l[:n].mean()
    for xg, xl in zip(g[n:], l[n:]):
        ag = (ag * (n - 1) + xg) / n
        al = (al * (n - 1) + xl) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)


def macd(a):
    if len(a) < 35:
        return 0, 0, 0, 0
    e12, e26 = ema(a, 12), ema(a, 26)
    vals = e12[14:] - e26[:len(e12) - 14]
    sig = ema(vals, 9)
    if len(vals) < 2 or len(sig) < 2:
        return 0, 0, 0, 0
    return float(vals[-1]), float(sig[-1]), float(vals[-1] - sig[-1]), float(vals[-2] - sig[-2])


def feature_values(df):
    c = df['close'].to_numpy(float)
    v = df['volume'].to_numpy(float)
    if len(c) < 60:
        return None
    last = c[-1]
    s20 = c[-20:].mean()
    s50 = c[-50:].mean()
    s200 = c[-200:].mean() if len(c) >= 200 else last
    r = rsi(c)
    _, _, mh, _ = macd(c)
    low1 = c[-20:-10].min()
    low2 = c[-10:].min()
    hi1 = c[-20:-10].max()
    hi2 = c[-10:].max()
    v20 = v[-20:].mean()
    v60 = v[-60:].mean()
    vr = v20 / v60 if v60 else 1
    dd = (last / c[-60:].max() - 1) * 100
    mom5 = (last / c[-6] - 1) * 100
    return np.array([
        np.clip(last / s200 - 1, -1, 1),
        np.clip(last / s50 - 1, -1, 1),
        np.clip(last / s20 - 1, -1, 1),
        np.clip((r - 50) / 25, -2, 2),
        np.clip(mh / max(abs(last), 1e-9) * 100, -2, 2),
        (1 if low2 > low1 * 1.01 else 0) + (1 if hi2 > hi1 * 1.01 else 0) - 1,
        np.clip(mom5 / 5, -2, 2),
        np.clip(vr - 1, -1, 2),
        np.clip(dd / 20, -2, 0)
    ], dtype=float)


def score(df):
    f = feature_values(df)
    if f is None:
        return None
    w = np.array([1.0, 1.0, 1.0, 0.5, 1.0, 0.5, 1.0, 0.5, 0.5])
    z = float(np.dot(f, w))
    return int(np.clip(50 + 20 * z, 0, 100))


def universe():
    frames = []
    for url, col in [
        ('https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt', 'Symbol'),
        ('https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt', 'ACT Symbol')
    ]:
        x = pd.read_csv(url, sep='|')
        x = x[x.get('Test Issue', 'N') == 'N']
        frames.append(x[col].astype(str))
    s = pd.concat(frames).drop_duplicates()
    s = s[~s.str.contains(r'[\^$+=/]', regex=True)]
    s = s[~s.str.contains(r'[-.]W$|[-.]R$|[-.]U$|[-.]WS$|\.RT$', regex=True)]
    return s.sample(frac=1, random_state=SEED).head(N_STOCKS).tolist()


def collect():
    tickers = universe()
    data = {}
    for i in range(0, len(tickers), 100):
        batch = tickers[i:i + 100]
        try:
            raw = yf.download(
                batch, start=START, end=END, auto_adjust=True,
                group_by='ticker', threads=True, progress=False
            )
            for t in batch:
                try:
                    x = raw[t].rename(columns={c: c.lower() for c in raw[t].columns})[['close', 'volume']].dropna()
                    if len(x) >= 260:
                        data[t] = x
                except Exception:
                    pass
        except Exception as e:
            print('download error', e)
        print('progress', min(i + 100, len(tickers)), len(tickers), 'usable', len(data), flush=True)

    rows = []
    for t, df in data.items():
        if getattr(df.index, 'tz', None):
            df = df.copy()
            df.index = df.index.tz_localize(None)
        dates = pd.date_range(
            max(pd.Timestamp('2024-01-02'), df.index.min() + pd.Timedelta(days=260)),
            min(pd.Timestamp('2026-07-31'), df.index.max() - pd.Timedelta(days=61)),
            freq='10B'
        )
        for d in dates:
            hist = df[df.index <= d]
            fut = df[df.index > d]
            if len(hist) < 200 or len(fut) < 60:
                continue
            f = feature_values(hist)
            if f is None:
                continue
            p = float(hist.close.iloc[-1])
            f5 = float(fut.close.iloc[4])
            f20 = float(fut.close.iloc[19])
            f60 = float(fut.close.iloc[59])
            rows.append([
                t, hist.index[-1].date(), *f, p,
                f5 / p - 1, f20 / p - 1, f60 / p - 1,
                float(fut.close.iloc[:20].min() / p - 1)
            ])
    return data, pd.DataFrame(rows, columns=['ticker', 'date', *FEATURES, 'price', 'ret5', 'ret20', 'ret60', 'mdd20'])


def calibrate(out):
    if out.empty:
        raise RuntimeError('Keine Backtest-Beobachtungen verfügbar.')

    dates = pd.to_datetime(out['date'], errors='coerce')
    out = out.loc[dates.notna()].copy()
    train = out[pd.to_datetime(out.date) <= TRAIN_END].copy()
    test = out[pd.to_datetime(out.date) > TRAIN_END].copy()

    if train.empty:
        raise RuntimeError(f'Keine Trainingsdaten bis {TRAIN_END.date()} verfügbar.')
    if test.empty:
        raise RuntimeError(f'Keine Validierungsdaten nach {TRAIN_END.date()} verfügbar.')

    train = train.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURES + ['ret20'])
    test = test.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURES + ['ret20'])
    if train.empty or test.empty:
        raise RuntimeError('Trainings- oder Validierungsdaten sind nach Bereinigung leer.')

    y = (train.ret20 > 0).astype(int)
    if y.nunique() < 2:
        raise RuntimeError('Kalibrierung nicht möglich: Trainingsdaten enthalten nur eine Zielklasse.')

    scaler = StandardScaler().fit(train[FEATURES])
    X = scaler.transform(train[FEATURES])
    model = LogisticRegression(
        C=0.5, max_iter=2000, class_weight='balanced', random_state=SEED
    ).fit(X, y)

    def predict(z):
        return np.clip(model.predict_proba(scaler.transform(z[FEATURES]))[:, 1] * 100, 0, 100)

    train['score_cal'] = predict(train)
    test['score_cal'] = predict(test)
    candidates = list(range(50, 96, 5))
    rows = []
    for th in candidates:
        z = test[test.score_cal >= th]
        rows.append({
            'threshold': th,
            'signals': len(z),
            'stocks': z.ticker.nunique(),
            'avg5': z.ret5.mean() if len(z) else np.nan,
            'avg20': z.ret20.mean() if len(z) else np.nan,
            'avg60': z.ret60.mean() if len(z) else np.nan,
            'median20': z.ret20.median() if len(z) else np.nan,
            'win20': (z.ret20 > 0).mean() if len(z) else np.nan,
            'avg_mdd20': z.mdd20.mean() if len(z) else np.nan
        })

    table = pd.DataFrame(rows)
    min_signals = max(100, int(len(test) * 0.01))
    viable = table[(table.signals >= min_signals) & table.win20.notna()].copy()
    best = int(viable.sort_values(['win20', 'avg20'], ascending=False).iloc[0].threshold) if len(viable) else 75
    buy = max(80, best)
    early = max(65, buy - 15)
    wait = max(45, early - 15)

    coef = (model.coef_[0] / scaler.scale_).tolist()
    intercept = float(model.intercept_[0] - np.sum(model.coef_[0] * scaler.mean_ / scaler.scale_))
    calibration = {
        'features': FEATURES,
        'coef': coef,
        'intercept': intercept,
        'thresholds': {'wait': wait, 'early': early, 'buy': buy},
        'train_until': str(TRAIN_END.date()),
        'validation_start': str((TRAIN_END + pd.Timedelta(days=1)).date()),
        'train_observations': len(train),
        'validation_observations': len(test),
        'validation_table': table.to_dict('records')
    }
    return train, test, calibration


def main():
    data, out = collect()
    out.to_csv('trend-reversal-backtest.csv', index=False)
    train, test, cal = calibrate(out)
    with open('trend-reversal-calibration.json', 'w') as f:
        json.dump(cal, f, indent=2)

    summary = []
    for th in [cal['thresholds']['wait'], cal['thresholds']['early'], cal['thresholds']['buy']]:
        z = test[test.score_cal >= th]
        summary.append({
            'threshold': th,
            'signals': len(z),
            'stocks': z.ticker.nunique(),
            'avg5': z.ret5.mean(),
            'avg20': z.ret20.mean(),
            'avg60': z.ret60.mean(),
            'median20': z.ret20.median(),
            'win20': (z.ret20 > 0).mean(),
            'avg_mdd20': z.mdd20.mean()
        })

    summary.append({
        'threshold': 'all',
        'signals': len(test),
        'stocks': test.ticker.nunique(),
        'avg5': test.ret5.mean(),
        'avg20': test.ret20.mean(),
        'avg60': test.ret60.mean(),
        'median20': test.ret20.median(),
        'win20': (test.ret20 > 0).mean(),
        'avg_mdd20': test.mdd20.mean()
    })
    pd.DataFrame(summary).to_csv('trend-reversal-summary.csv', index=False)
    with open('trend-reversal-backtest.json', 'w') as f:
        json.dump({
            'stocks': len(data),
            'observations': len(out),
            'train_observations': len(train),
            'validation_observations': len(test),
            'thresholds': cal['thresholds'],
            'summary': summary
        }, f, indent=2, default=str)
    print(pd.DataFrame(summary).to_string(index=False))
    print(json.dumps(cal, indent=2))


if __name__ == '__main__':
    main()
