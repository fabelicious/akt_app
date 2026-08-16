#!/usr/bin/env python3
import concurrent.futures
import json
import math
import os
import time
import urllib.parse
import urllib.request

UNIVERSE_FILE = "country-trend-universe-v3.json"
STATE_FILE = "trend-alert-state.json"
NTFY_BASE = "https://ntfy.sh/"
LOOKBACK_DAYS = 420


def mean(values):
    return sum(values) / len(values) if values else None


def ema(values, n):
    if len(values) < n:
        return []
    k = 2 / (n + 1)
    e = mean(values[:n])
    out = [e]
    for x in values[n:]:
        e = x * k + e * (1 - k)
        out.append(e)
    return out


def rsi(values, n=14):
    if len(values) < n + 1:
        return 50.0
    g = l = 0.0
    for i in range(1, n + 1):
        d = values[i] - values[i - 1]
        g += max(d, 0)
        l += max(-d, 0)
    g /= n
    l /= n
    for i in range(n + 1, len(values)):
        d = values[i] - values[i - 1]
        g = (g * (n - 1) + max(d, 0)) / n
        l = (l * (n - 1) + max(-d, 0)) / n
    return 100.0 if l == 0 else 100 - 100 / (1 + g / l)


def macd(values):
    if len(values) < 35:
        return 0.0, 0.0, 0.0, 0.0
    e12, e26 = ema(values, 12), ema(values, 26)
    v = [e12[i + 14] - e26[i] for i in range(len(e26))]
    s = ema(v, 9)
    if len(s) < 2:
        return 0.0, 0.0, 0.0, 0.0
    return v[-1], s[-1], v[-1] - s[-1], v[-2] - s[-2]


def analyse(closes, volumes):
    if len(closes) < 60:
        return None
    last = closes[-1]
    s20 = mean(closes[-20:])
    s50 = mean(closes[-50:])
    s200 = mean(closes[-200:]) if len(closes) >= 200 else None
    r = rsi(closes)
    mv, ms, mh, prev_h = macd(closes)
    low1, low2 = min(closes[-20:-10]), min(closes[-10:])
    hi1, hi2 = max(closes[-20:-10]), max(closes[-10:])
    higher_low = low2 > low1 * 1.01
    higher_high = hi2 > hi1 * 1.01
    v20, v60 = mean(volumes[-20:]), mean(volumes[-60:])
    vr = v20 / v60 if v60 else 1
    hi60 = max(closes[-60:])
    dd = (last / hi60 - 1) * 100
    mom5 = (last / closes[-6] - 1) * 100

    score = 0
    if s200 is not None and last > s200: score += 12
    if s50 is not None and last > s50: score += 10
    if s20 is not None and last > s20: score += 12
    if 45 <= r <= 68: score += 10
    elif 30 <= r < 45: score += 6
    elif r < 30: score += 3
    if mh > 0 and mv > 0: score += 15
    elif mh > 0: score += 10
    elif mh > prev_h: score += 5
    if higher_low: score += 8
    if higher_high: score += 8
    if mom5 > 3: score += 8
    elif mom5 > 0: score += 4
    if vr >= 1.15 and mom5 > 0: score += 7
    elif vr >= .9: score += 4
    if -35 <= dd <= -10: score += 5
    elif dd > -10: score += 2
    score = max(0, min(100, round(score)))
    if score >= 72: status = "BESTÄTIGTER KAUF"
    elif score >= 58: status = "FRÜHES KAUFSIGNAL"
    elif score >= 42: status = "BODENBILDUNG / ABWARTEN"
    else: status = "ABWÄRTSTREND / KEIN KAUF"
    return score, status


def yahoo(symbol):
    end = int(time.time())
    start = end - LOOKBACK_DAYS * 86400
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol, safe='')}?period1={start}&period2={end}&interval=1d&events=history&includeAdjustedClose=true"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        q = json.load(r)["chart"]["result"][0]
    quote = q.get("indicators", {}).get("quote", [{}])[0]
    adj = q.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
    closes, volumes = [], []
    for i, c in enumerate(adj):
        if isinstance(c, (int, float)) and math.isfinite(c):
            closes.append(float(c))
            v = quote.get("volume", [])[i] if i < len(quote.get("volume", [])) else 0
            volumes.append(float(v or 0))
    return closes, volumes


def topic(symbol):
    # ntfy topics may contain letters, numbers, _ and -; symbols like BRK-B are safe.
    safe = "".join(ch if ch.isalnum() or ch in "_-" else "-" for ch in symbol.upper())
    return "aktpro-trend-" + safe.lower()


def publish(symbol, previous, current):
    score, status = current
    old_score, old_status = previous
    body = f"{symbol}: {old_status} → {status} · Score {old_score} → {score}"
    data = body.encode("utf-8")
    req = urllib.request.Request(NTFY_BASE + topic(symbol), data=data, method="POST", headers={
        "Title": f"📈 {symbol} · Trendwende",
        "Priority": "high" if score >= 72 else "default",
        "Tags": "chart_with_upwards_trend",
        "Click": "https://fabelicious.github.io/akt_app/"
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def main():
    with open(UNIVERSE_FILE, encoding="utf-8") as f:
        universe = json.load(f)
    symbols = sorted({s for values in universe.values() for s in values})
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            state = json.load(f)
    except Exception:
        state = {}

    results = {}
    alerts = []

    def one(symbol):
        try:
            c, v = yahoo(symbol)
            z = analyse(c, v)
            return symbol, z, None
        except Exception as e:
            return symbol, None, str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for symbol, z, err in pool.map(one, symbols):
            if z is None:
                continue
            score, status = z
            results[symbol] = {"score": score, "status": status, "checked_at": int(time.time())}
            prev = state.get(symbol)
            if prev:
                old = (int(prev.get("score", 0)), str(prev.get("status", "")))
                changed = old[1] != status
                crossed = ((old[0] < 58 <= score) or (old[0] >= 58 > score) or
                           (old[0] < 72 <= score) or (old[0] >= 72 > score))
                if changed or crossed:
                    alerts.append((symbol, old, z))

    for symbol, old, z in alerts:
        try:
            publish(symbol, old, z)
            print("PUSH", symbol, old, "->", z)
        except Exception as e:
            print("push failed", symbol, e)

    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, sort_keys=True)
    print(f"Scanned {len(results)}/{len(symbols)} symbols; alerts={len(alerts)}")


if __name__ == "__main__":
    main()
