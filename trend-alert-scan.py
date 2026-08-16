#!/usr/bin/env python3
import concurrent.futures
import json
import math
import time
import urllib.parse
import urllib.request

UNIVERSE_FILE = "country-trend-universe-v3.json"
WKN_MAP_FILE = "wkn-map.json"
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
    mv, _, mh, prev_h = macd(closes)
    low1, low2 = min(closes[-20:-10]), min(closes[-10:])
    hi1, hi2 = max(closes[-20:-10]), max(closes[-10:])
    v20, v60 = mean(volumes[-20:]), mean(volumes[-60:])
    vr = v20 / v60 if v60 else 1
    dd = (last / max(closes[-60:]) - 1) * 100
    mom5 = (last / closes[-6] - 1) * 100
    score = 0
    if s200 is not None and last > s200:
        score += 12
    if s50 is not None and last > s50:
        score += 10
    if s20 is not None and last > s20:
        score += 12
    if 45 <= r <= 68:
        score += 10
    elif 30 <= r < 45:
        score += 6
    elif r < 30:
        score += 3
    if mh > 0 and mv > 0:
        score += 15
    elif mh > 0:
        score += 10
    elif mh > prev_h:
        score += 5
    if low2 > low1 * 1.01:
        score += 8
    if hi2 > hi1 * 1.01:
        score += 8
    if mom5 > 3:
        score += 8
    elif mom5 > 0:
        score += 4
    if vr >= 1.15 and mom5 > 0:
        score += 7
    elif vr >= 0.9:
        score += 4
    if -35 <= dd <= -10:
        score += 5
    elif dd > -10:
        score += 2
    score = max(0, min(100, round(score)))
    if score >= 72:
        status = "BESTÄTIGTER KAUF"
    elif score >= 58:
        status = "FRÜHES KAUFSIGNAL"
    elif score >= 42:
        status = "BODENBILDUNG / ABWARTEN"
    else:
        status = "ABWÄRTSTREND / KEIN KAUF"
    return score, status


def yahoo(symbol):
    end = int(time.time())
    start = end - LOOKBACK_DAYS * 86400
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol, safe='')}?period1={start}&period2={end}"
        "&interval=1d&events=history&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                payload = json.load(r)
            result = payload["chart"]["result"][0]
            quote = result.get("indicators", {}).get("quote", [{}])[0]
            adj = result.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
            closes, volumes = [], []
            raw_volumes = quote.get("volume", [])
            for i, c in enumerate(adj):
                if isinstance(c, (int, float)) and math.isfinite(c):
                    closes.append(float(c))
                    v = raw_volumes[i] if i < len(raw_volumes) else 0
                    volumes.append(float(v or 0))
            return closes, volumes
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))
    raise last_error


def topic(key):
    safe = "".join(ch if ch.isalnum() or ch in "_-" else "-" for ch in str(key).upper())
    return "aktpro-trend-" + safe.lower()


def publish(topic_key, symbol, previous, current):
    score, status = current
    old_score, old_status = previous
    body = f"{symbol}: {old_status} → {status} · Score {old_score} → {score}"
    req = urllib.request.Request(
        NTFY_BASE + topic(topic_key),
        data=body.encode("utf-8"),
        method="POST",
        headers={
            "Title": f"📈 {symbol} · Trendwende",
            "Priority": "high" if score >= 72 else "default",
            "Tags": "chart_with_upwards_trend",
            "Click": "https://fabelicious.github.io/akt_app/",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status


def main():
    with open(UNIVERSE_FILE, encoding="utf-8") as f:
        universe = json.load(f)
    try:
        with open(WKN_MAP_FILE, encoding="utf-8") as f:
            items = json.load(f).get("items", {})
        symbol_to_wkn = {
            str(v.get("symbol")): str(k)
            for k, v in items.items()
            if v.get("symbol")
        }
    except Exception:
        symbol_to_wkn = {}

    symbols = sorted({s for values in universe.values() for s in values})
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            state = json.load(f)
        if not isinstance(state, dict):
            state = {}
    except Exception:
        state = {}

    # Never erase the last known signal because of a transient market-data failure.
    next_state = dict(state)
    alerts = []
    failed = []

    def one(symbol):
        try:
            c, v = yahoo(symbol)
            return symbol, analyse(c, v), None
        except Exception as e:
            return symbol, None, str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for symbol, z, err in pool.map(one, symbols):
            if z is None:
                failed.append((symbol, err))
                continue
            score, status = z
            previous_raw = state.get(symbol)
            if previous_raw:
                old = (int(previous_raw.get("score", 0)), str(previous_raw.get("status", "")))
                changed = old[1] != status
                crossed = (
                    (old[0] < 58 <= score)
                    or (old[0] >= 58 > score)
                    or (old[0] < 72 <= score)
                    or (old[0] >= 72 > score)
                )
                if changed or crossed:
                    alerts.append((symbol, old, z))
                else:
                    next_state[symbol] = {
                        "score": score,
                        "status": status,
                        "checked_at": int(time.time()),
                    }
            else:
                # First observation establishes the baseline without sending a push.
                next_state[symbol] = {
                    "score": score,
                    "status": status,
                    "checked_at": int(time.time()),
                }

    push_failures = []
    for symbol, old, z in alerts:
        keys = [symbol]
        if symbol_to_wkn.get(symbol):
            keys.append(symbol_to_wkn[symbol])
        ok = True
        for key in dict.fromkeys(keys):
            try:
                publish(key, symbol, old, z)
                print("PUSH", key, symbol, old, "->", z)
            except Exception as e:
                ok = False
                push_failures.append((key, symbol, str(e)))
                print("push failed", key, symbol, e)
        # Only advance the baseline after every required notification was accepted.
        if ok:
            next_state[symbol] = {
                "score": z[0],
                "status": z[1],
                "checked_at": int(time.time()),
            }

    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(next_state, f, ensure_ascii=False, indent=2, sort_keys=True)

    print(
        f"Scanned {len(symbols)} symbols; successful={len(next_state)}; "
        f"data_failures={len(failed)}; alerts={len(alerts)}; push_failures={len(push_failures)}"
    )
    if failed:
        print("Data failures:", ", ".join(s for s, _ in failed[:20]))
    if push_failures:
        raise RuntimeError(f"{len(push_failures)} push notification(s) failed; baseline retained for retry")


if __name__ == "__main__":
    main()
