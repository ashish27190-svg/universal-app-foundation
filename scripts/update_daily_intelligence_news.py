#!/usr/bin/env python3
import json, re, xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUT = "site/daily-intelligence/news.json"
NOW = datetime.now(timezone.utc)
FRESH_GLOBAL_HOURS = 36
FRESH_LOCAL_HOURS = 72

NOISE = (
    "horoscope","astrology","celebrity","wedding","box office","movie review",
    "viral video","fashion look","reality show","lottery result"
)

CITY_STATE = {
    "Faridabad":"Haryana","Gurugram":"Haryana","Sonipat":"Haryana","Palwal":"Haryana",
    "Rohtak":"Haryana","Rewari":"Haryana","Panipat":"Haryana","Nuh":"Haryana",
    "Jhajjar":"Haryana","Bhiwani":"Haryana","Charkhi Dadri":"Haryana",
    "Mahendragarh":"Haryana","Jind":"Haryana","Karnal":"Haryana",
    "Delhi":"Delhi","Noida":"Uttar Pradesh","Greater Noida":"Uttar Pradesh",
    "Ghaziabad":"Uttar Pradesh","Meerut":"Uttar Pradesh","Bulandshahr":"Uttar Pradesh",
    "Baghpat":"Uttar Pradesh","Hapur":"Uttar Pradesh","Shamli":"Uttar Pradesh",
    "Muzaffarnagar":"Uttar Pradesh","Lucknow":"Uttar Pradesh",
    "Alwar":"Rajasthan","Bharatpur":"Rajasthan","Jaipur":"Rajasthan",
    "Bengaluru":"Karnataka","Mangaluru":"Karnataka","Chennai":"Tamil Nadu",
    "Hyderabad":"Telangana","Mumbai":"Maharashtra","Pune":"Maharashtra",
    "Kolkata":"West Bengal","Ahmedabad":"Gujarat",
    "Thiruvananthapuram":"Kerala"
}

REGIONS = {
    "Delhi-NCR": [
        "Delhi","Faridabad","Gurugram","Sonipat","Palwal","Rohtak","Rewari","Panipat",
        "Nuh","Jhajjar","Bhiwani","Charkhi Dadri","Mahendragarh","Jind","Karnal",
        "Noida","Greater Noida","Ghaziabad","Meerut","Bulandshahr","Baghpat","Hapur",
        "Shamli","Muzaffarnagar","Alwar","Bharatpur"
    ]
}

TOPIC_FEEDS = [
    ("India","India","India · top public-interest developments",
     "India (government OR parliament OR supreme court OR policy OR regulation OR election OR cabinet) when:1d"),
    ("Geopolitics","Geopolitics","World · geopolitics",
     "(geopolitics OR diplomacy OR conflict OR sanctions OR ceasefire OR treaty OR war OR tariff OR NATO OR UN) when:1d"),
    ("World","World","World · major developments",
     "(world OR international) (government OR crisis OR disaster OR diplomacy OR economy OR security) when:1d"),
    ("Economy","Economy","India · economy",
     "India (RBI OR inflation OR GDP OR economy OR tax OR budget OR jobs OR rupee OR trade) when:1d"),
    ("Business","Business","India · business",
     "India (business OR company OR merger OR investment OR manufacturing OR startup OR industry) when:1d"),
    ("Markets","Markets","India · markets",
     "India (Sensex OR Nifty OR stock market OR bond OR rupee OR commodities) when:1d"),
    ("Policy","Policy & Law","India · policy / law / courts",
     "India (policy OR regulation OR Supreme Court OR High Court OR law OR ministry OR regulator) when:1d"),
    ("Security","Security & Defence","India / world · security",
     "India (defence OR security OR military OR border OR cyberattack OR terrorism) when:1d"),
    ("Technology","Technology & AI","India · technology / AI",
     "India (AI OR artificial intelligence OR technology OR cybersecurity OR semiconductor OR digital policy) when:1d"),
    ("Science","Science & Space","India / world · science",
     "India (science OR research OR ISRO OR space OR discovery OR mission) when:1d"),
    ("Health","Health","India · public health",
     "India (health OR disease OR hospital OR medicine OR outbreak OR public health) when:1d"),
    ("Climate","Climate & Environment","India · climate / environment",
     "India (climate OR pollution OR environment OR heatwave OR flood OR cyclone OR air quality) when:1d"),
    ("Energy","Energy","India · energy",
     "India (energy OR power OR electricity OR oil OR gas OR solar OR renewable OR nuclear) when:1d"),
    ("Infrastructure","Infrastructure & Transport","India · infrastructure",
     "India (infrastructure OR metro OR railway OR airport OR highway OR expressway OR transport) when:1d"),
    ("Consumer","Consumer Impact","India · consumer / practical impact",
     "India (consumer OR price OR tariff OR GST OR banking OR telecom OR fuel OR LPG OR Aadhaar) when:1d"),
    ("Education","Education & Jobs","India · education / employment",
     "India (education OR school OR university OR exam OR employment OR jobs OR labour) when:1d"),
    ("PublicSafety","Public Safety","India · major safety / disruption",
     "India (earthquake OR cyclone OR flood OR fire OR crash OR outage OR emergency OR evacuation) when:1d"),
]

def rss_url(query):
    return "https://news.google.com/rss/search?" + urlencode({
        "q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"
    })

def key(title):
    return re.sub(r"[^a-z0-9 ]+"," ",(title or "").lower()).strip()

def parse_pub(pub):
    try:
        dt = parsedate_to_datetime(pub)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return NOW

def feed_specs():
    specs=[]
    for category,label,reason,q in TOPIC_FEEDS:
        specs.append((category,label,reason,None,None,rss_url(q),FRESH_GLOBAL_HOURS,18))

    states=sorted(set(CITY_STATE.values()))
    for state in states:
        q=f'"{state}" (government OR policy OR court OR infrastructure OR economy OR pollution OR transport OR public safety) when:2d'
        specs.append(("State",state,f"{state} · state affairs","State",state,rss_url(q),FRESH_LOCAL_HOURS,10))

    for region,cities in REGIONS.items():
        city_terms=" OR ".join(f'"{x}"' for x in cities[:8])
        q=f'("{region}" OR {city_terms}) (policy OR civic OR pollution OR transport OR infrastructure OR court OR economy) when:2d'
        specs.append(("Region",region,f"{region} · regional affairs","Region",region,rss_url(q),FRESH_LOCAL_HOURS,12))

    for city,state in CITY_STATE.items():
        q=f'"{city}" "{state}" (civic OR government OR policy OR pollution OR transport OR infrastructure OR court OR economy OR public safety) when:2d'
        specs.append(("Local",city,f"{city} · city affairs","City",city,rss_url(q),FRESH_LOCAL_HOURS,8))
    return specs

def fetch_feed(spec):
    bucket,label,reason,scope_level,scope_key,url,max_hours,max_items=spec
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 DailyIntelligence/1.0"})
    with urlopen(req,timeout=12) as r:
        root=ET.fromstring(r.read())
    out=[]
    cutoff=NOW-timedelta(hours=max_hours)
    for item in root.findall(".//item"):
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        pub=(item.findtext("pubDate") or "").strip()
        if not title or not link.startswith(("http://","https://")):
            continue
        k=key(title)
        if any(x in k for x in NOISE):
            continue
        dt=parse_pub(pub)
        if dt < cutoff or dt > NOW+timedelta(hours=1):
            continue
        source="Google News"
        if " - " in title:
            head,pubname=title.rsplit(" - ",1)
            if head.strip(): title=head.strip()
            if pubname.strip(): source=pubname.strip()
        out.append({
            "title":title,
            "url":link,
            "published":dt.isoformat().replace("+00:00","Z"),
            "source":source,
            "category":bucket,
            "label":label,
            "reason":reason,
            "scope":{"level":scope_level,"key":scope_key} if scope_level and scope_key else None,
        })
        if len(out)>=max_items:
            break
    return out

def main():
    specs=feed_specs()
    items=[]; errors=[]
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures={ex.submit(fetch_feed,s):s for s in specs}
        for fut in as_completed(futures):
            spec=futures[fut]
            try:
                items.extend(fut.result())
            except Exception as e:
                errors.append(f"{spec[1]}: {e}")

    seen=set(); per_source={}; per_scope={}; clean=[]
    for x in sorted(items,key=lambda z:z.get("published",""),reverse=True):
        k=key(x["title"])
        if not k or k in seen: continue
        src=x.get("source") or "Publisher"
        if per_source.get(src,0)>=12: continue
        scope=x.get("scope") or {}
        sk=(scope.get("level"),scope.get("key"))
        scope_limit=10 if scope else 999
        if scope and per_scope.get(sk,0)>=scope_limit: continue
        seen.add(k)
        per_source[src]=per_source.get(src,0)+1
        if scope: per_scope[sk]=per_scope.get(sk,0)+1
        clean.append(x)
        if len(clean)>=260: break

    payload={
        "schemaVersion":3,
        "generatedAt":NOW.isoformat().replace("+00:00","Z"),
        "window":"36h global / 72h local",
        "source":"Google News RSS discovery",
        "feedCount":len(specs),
        "errors":errors,
        "items":clean,
    }
    with open(OUT,"w",encoding="utf-8") as fh:
        json.dump(payload,fh,ensure_ascii=False,separators=(",",":"))
        fh.write("\n")
    print(f"Wrote {len(clean)} reports from {len(specs)} feeds; {len(errors)} warning(s)")

if __name__=="__main__":
    main()
