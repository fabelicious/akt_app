import datetime
import json
import math
import time
import urllib.parse
import urllib.request

CANDIDATES = [
    ("Microsoft Corporation", "MSFT", "870747"), ("Apple Inc.", "AAPL", "865985"),
    ("Alphabet Inc. Class A", "GOOGL", "A14Y6F"), ("Meta Platforms, Inc.", "META", "A1JWVX"),
    ("Tesla, Inc.", "TSLA", "A1CX3T"), ("Berkshire Hathaway Class B", "BRK-B", "854075"),
    ("Visa Inc.", "V", "A0NC7B"), ("Mastercard Incorporated", "MA", "A0F602"),
    ("Johnson & Johnson", "JNJ", "853260"), ("Walmart Inc.", "WMT", "860853"),
    ("Procter & Gamble Company", "PG", "852062"), ("Coca-Cola Company", "KO", "850663"),
    ("Oracle Corporation", "ORCL", "871460"), ("Netflix, Inc.", "NFLX", "552484"),
    ("Adobe Inc.", "ADBE", "871981"), ("Salesforce, Inc.", "CRM", "A0B87V"),
    ("Cisco Systems, Inc.", "CSCO", "878841"), ("AMD", "AMD", "863186"),
    ("Qualcomm Incorporated", "QCOM", "883121"), ("Texas Instruments Incorporated", "TXN", "852654"),
    ("ServiceNow, Inc.", "NOW", "A1JX4P"), ("Palantir Technologies Inc.", "PLTR", "A2QA4J"),
    ("Novo Nordisk A/S", "NVO", "A1XA8R"), ("LVMH", "MC.PA", "853292"),
    ("SAP SE", "SAP", "716460"), ("Siemens AG", "SIE.DE", "723610"),
    ("Allianz SE", "ALV.DE", "840400"), ("Airbus SE", "AIR.PA", "938914"),
    ("Toyota Motor Corporation", "TM", "853510"), ("Sony Group Corporation", "SONY", "853687"),
    ("Taiwan Semiconductor Manufacturing Company Limited", "TSM", "909800"),
    ("ASML Holding N.V.", "ASML", "A1J4U4"), ("NVIDIA Corporation", "NVDA", "918422"),
    ("Broadcom Inc.", "AVGO", "A2JG9Z"), ("Amazon.com, Inc.", "AMZN", "906866"),
    ("Arista Networks, Inc.", "ANET", "A11099"), ("GE Aerospace", "GE", "A3CSML"),
    ("JPMorgan Chase & Co.", "JPM", "850628"), ("Eli Lilly and Company", "LLY", "858560"),
]

def mean(a): return sum(a) / len(a) if a else None
def sma(a, n): return mean(a[-n:]) if len(a) >= n else None

def rsi(a, n=14):
    if len(a) < n + 1: return None
    gains = losses = 0.0
    for i in range(len(a) - n, len(a)):
        d = a[i] - a[i - 1]
        gains += max(d, 0)
        losses += max(-d, 0)
    gains /= n; losses /= n
    return 100 if losses == 0 else 100 - 100 / (1 + gains / losses)

def ema(a, n):
    if len(a) < n: return []
    k = 2 / (n + 1); value = mean(a[:n]); out = [value]
    for x in a[n:]:
        value = x * k + value * (1 - k); out.append(value)
    return out

def macd(a):
    if len(a) < 35: return None, None
    e12, e26 = ema(a, 12), ema(a, 26)
    values = [e12[i + 14] - e26[i] for i in range(len(e26))]
    signal = ema(values, 9)
    return values[-1], signal[-1] if signal else None

def volatility(a, n=20):
    if len(a) < n + 1: return None
    returns = [a[i] / a[i - 1] - 1 for i in range(len(a) - n, len(a))]
    m = mean(returns)
    return math.sqrt(mean([(x - m) ** 2 for x in returns])) * math.sqrt(252) * 100

def score(a):
    if not a: return None
    last = a[-1]; a20, a50, a200 = sma(a, 20), sma(a, 50), sma(a, 200)
    r = rsi(a); macd_value, macd_signal = macd(a); vol = volatility(a); points = 0
    if a20 is not None: points += 10 if last > a20 else 0
    if a50 is not None: points += 10 if last > a50 else 0
    if a200 is not None: points += 20 if last > a200 else 0
    if r is not None:
        if 50 <= r <= 65: points += 20
        elif 40 <= r < 50: points += 15
        elif 65 < r <= 70: points += 15
        elif 30 <= r < 40: points += 10
        elif r < 30: points += 6
        else: points += 6
    points += 20 if macd_value is not None and macd_signal is not None and macd_value > macd_signal else 5
    if vol is not None: points += 20 if vol < 20 else 15 if vol < 35 else 8 if vol < 50 else 3
    return max(0, min(100, round(points)))

def fetch(symbol):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(symbol, safe="") + "?range=1y&interval=1d&events=history"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=12) as response:
        payload = json.load(response)
    result = payload["chart"]["result"][0]
    closes = result["indicators"]["quote"][0].get("close", [])
    return [float(x) for x in closes if x is not None]

items = []
for name, symbol, wkn in CANDIDATES:
    try:
        closes = fetch(symbol)
        if len(closes) < 35: continue
        current = closes[-1]
        previous = closes[-2] if len(closes) > 1 else current
        current_rsi = rsi(closes)
        items.append({
            "name": name, "symbol": symbol, "wkn": wkn,
            "score": score(closes), "price": current,
            "change": round((current / previous - 1) * 100, 2),
            "rsi": round(current_rsi, 1) if current_rsi is not None else None
        })
    except Exception as exc:
        print(f"skip {symbol}: {exc}")
    time.sleep(0.05)

items.sort(key=lambda x: (x["score"], x["rsi"] if x["rsi"] is not None else -999), reverse=True)
items = items[:10]
out = {
    "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "criteria": "Top 10 nach einheitlichem AKTScore 0-100",
    "items": items,
}
with open("top10.json", "w", encoding="utf-8") as handle:
    json.dump(out, handle, ensure_ascii=False, separators=(",", ":"))
    handle.write("\n")
print("Top10:", [(x["symbol"], x["score"]) for x in items])
