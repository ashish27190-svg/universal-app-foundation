#!/usr/bin/env python3
import json, re, time
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

API = "https://api.gdeltproject.org/api/v2/doc/doc"
OUT = "site/daily-intelligence/news.json"

QUERIES = [
    ("India","India","India · politics / public affairs","India (government OR parliament OR supreme court OR policy OR security OR election OR cabinet)"),
    ("World","World","World · geopolitics","(geopolitics OR diplomacy OR conflict OR sanctions OR ceasefire OR treaty OR war OR tariff OR trade)"),
    ("Economy","Economy","India · economy / money","India (RBI OR inflation OR economy OR tax OR budget OR jobs OR rupee OR GDP)"),
    ("Technology","Technology + Science","India · technology / science","India (AI OR technology OR cybersecurity OR semiconductor OR space OR climate OR health OR energy)"),
]

NOISE = (
    "horoscope","astrology","celebrity","wedding","box office","movie review",
    "viral video","fashion look","reality show"
)

def parse_seen(v):
    if not v:
        return ""
    for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(v, fmt).replace(tzinfo=timezone.utc).isoformat().replace("+00:00","Z")
        except Exception:
            pass
    return v

def domain(url, supplied=""):
    if supplied:
        return supplied.replace("www.","")
    try:
        return urlparse(url).netloc.replace("www.","")
    except Exception:
        return "Publisher"

def key(title):
    return re.sub(r"[^a-z0-9 ]+"," ",(title or "").lower()).strip()

def fetch(bucket, label, reason, query):
    params = urlencode({
        "query": query,
        "mode": "ArtList",
        "format": "json",
        "maxrecords": "24",
        "sort": "DateDesc",
        "timespan": "24h",
    })
    req = Request(API + "?" + params, headers={"User-Agent":"DailyIntelligence/0.8"})
    with urlopen(req, timeout=14) as r:
        data = json.load(r)
    out=[]
    for a in data.get("articles", []):
        title=(a.get("title") or "").strip()
        url=a.get("url") or a.get("url_mobile") or ""
        if not title or not url.startswith(("http://","https://")):
            continue
        k=key(title)
        if any(x in k for x in NOISE):
            continue
        out.append({
            "title": title,
            "url": url,
            "published": parse_seen(a.get("seendate","")),
            "source": domain(url, a.get("domain","")),
            "category": bucket,
            "label": label,
            "reason": reason,
        })
    return out

def main():
    items=[]
    errors=[]
    for spec in QUERIES:
        try:
            items.extend(fetch(*spec))
        except Exception as e:
            errors.append(f"{spec[1]}: {e}")
        time.sleep(0.4)

    seen=set()
    per_domain={}
    clean=[]
    for x in sorted(items, key=lambda z:z.get("published",""), reverse=True):
        k=key(x["title"])
        if not k or k in seen:
            continue
        d=x.get("source") or "Publisher"
        if per_domain.get(d,0) >= 5:
            continue
        seen.add(k)
        per_domain[d]=per_domain.get(d,0)+1
        clean.append(x)
        if len(clean) >= 70:
            break

    payload={
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "window": "24h",
        "source": "GDELT DOC 2.0",
        "errors": errors,
        "items": clean,
    }
    with open(OUT,"w",encoding="utf-8") as f:
        json.dump(payload,f,ensure_ascii=False,separators=(",",":"))
        f.write("\n")
    print(f"Wrote {len(clean)} reports; {len(errors)} query warning(s)")

if __name__ == "__main__":
    main()
