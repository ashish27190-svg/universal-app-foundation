#!/usr/bin/env python3
import json, re, time, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

OUT = "site/daily-intelligence/news.json"

FEEDS = [
    ("India","India","India · national affairs","https://news.google.com/rss/search?" + urlencode({"q":"India government parliament supreme court policy security election","hl":"en-IN","gl":"IN","ceid":"IN:en"})),
    ("World","World","World · geopolitics","https://news.google.com/rss/search?" + urlencode({"q":"geopolitics diplomacy conflict sanctions ceasefire treaty war tariff trade","hl":"en-IN","gl":"IN","ceid":"IN:en"})),
    ("Economy","Economy","India · economy / money","https://news.google.com/rss/search?" + urlencode({"q":"India RBI inflation economy tax budget jobs rupee GDP","hl":"en-IN","gl":"IN","ceid":"IN:en"})),
    ("Technology","Technology + Science","India · technology / science","https://news.google.com/rss/search?" + urlencode({"q":"India AI technology cybersecurity semiconductor space climate health energy","hl":"en-IN","gl":"IN","ceid":"IN:en"})),
]

NOISE=("horoscope","astrology","celebrity","wedding","box office","movie review","viral video","fashion look","reality show")

def key(title):
    return re.sub(r"[^a-z0-9 ]+"," ",(title or "").lower()).strip()

def fetch_feed(bucket,label,reason,url):
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 DailyIntelligence/0.8"})
    with urlopen(req,timeout=12) as r:
        root=ET.fromstring(r.read())
    out=[]
    for item in root.findall(".//item"):
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        pub=(item.findtext("pubDate") or "").strip()
        if not title or not link.startswith(("http://","https://")):
            continue
        k=key(title)
        if any(x in k for x in NOISE):
            continue
        source="Google News"
        # Google News titles usually append publisher after " - "
        if " - " in title:
            head,pubname=title.rsplit(" - ",1)
            if head.strip():
                title=head.strip()
            if pubname.strip():
                source=pubname.strip()
        try:
            from email.utils import parsedate_to_datetime
            dt=parsedate_to_datetime(pub)
            if dt.tzinfo is None:
                dt=dt.replace(tzinfo=timezone.utc)
            published=dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
        except Exception:
            published=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
        out.append({
            "title":title,
            "url":link,
            "published":published,
            "source":source,
            "category":bucket,
            "label":label,
            "reason":reason,
        })
    return out

def main():
    items=[]; errors=[]
    for spec in FEEDS:
        try:
            items.extend(fetch_feed(*spec))
        except Exception as e:
            errors.append(f"{spec[1]}: {e}")
        time.sleep(1.0)

    seen=set(); per_source={}; clean=[]
    for x in sorted(items,key=lambda z:z.get("published",""),reverse=True):
        k=key(x["title"])
        if not k or k in seen:
            continue
        src=x.get("source") or "Publisher"
        if per_source.get(src,0)>=5:
            continue
        seen.add(k); per_source[src]=per_source.get(src,0)+1; clean.append(x)
        if len(clean)>=60:
            break

    payload={
        "schemaVersion":2,
        "generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "window":"24h",
        "source":"Google News RSS discovery",
        "errors":errors,
        "items":clean,
    }
    with open(OUT,"w",encoding="utf-8") as fh:
        json.dump(payload,fh,ensure_ascii=False,separators=(",",":"))
        fh.write("\n")
    print(f"Wrote {len(clean)} reports; {len(errors)} warning(s)")

if __name__=="__main__":
    main()
