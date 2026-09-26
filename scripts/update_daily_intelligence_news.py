#!/usr/bin/env python3
import json, re, html as htmlmod, xml.etree.ElementTree as ET
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
    "viral video","fashion look","reality show","lottery result",
    "actor ","actress ","film premiere","movie premiere","web series","trailer launch",
    "fashion week","award show","reality tv",
    "फिल्म","बॉक्स ऑफिस","अभिनेता","अभिनेत्री","सेलिब्रिटी","राशिफल","ज्योतिष",
    "पेंटिंग प्रतियोगिता","भाषण प्रतियोगिता","सांस्कृतिक कार्यक्रम","फैशन"
)

LOW_VALUE_BY_CATEGORY = {
    "Consumer": ("smartphone","phone launch","car launched","suv launched","laptop launched","sale starts","discount offer"),
    "Education": ("college fest","campus fest","annual fest","cultural fest","tech fest","प्रतियोगिता","कॉलेज फेस्ट","स्कूल कार्यक्रम","सांस्कृतिक कार्यक्रम"),
    "Local": ("actor ","actress ","film ","movie ","premiere","celebrity","अभिनेता","अभिनेत्री","फिल्म","प्रीमियर","सेलिब्रिटी"),
}

HIGH_SIGNAL = (
    "government","court","policy","regulation","rbi","inflation","budget","tax","security",
    "war","ceasefire","sanction","treaty","tariff","trade","diplomacy","pollution","metro",
    "infrastructure","cybersecurity","energy","earthquake","cyclone","flood","outage",
    "emergency","gst","aadhaar","fuel","lpg","jobs","defence","border","isro","semiconductor",
    "interest rate","health","outbreak","recall","ban","fraud","data breach","evacuation",
    "सरकार","अदालत","नीति","आरबीआई","महंगाई","बजट","टैक्स","सुरक्षा","युद्ध","प्रतिबंध",
    "व्यापार","कूटनीति","प्रदूषण","मेट्रो","इन्फ्रास्ट्रक्चर","ऊर्जा","भूकंप","चक्रवात",
    "बाढ़","आपातकाल","जीएसटी","आधार","ईंधन","नौकरी","रक्षा","सीमा","इसरो","नियम"
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

def rss_url(query, lang="en"):
    if lang=="hi":
        params={"q":query,"hl":"hi","gl":"IN","ceid":"IN:hi"}
    else:
        params={"q":query,"hl":"en-IN","gl":"IN","ceid":"IN:en"}
    return "https://news.google.com/rss/search?" + urlencode(params)


HI_TOPIC_QUERIES = {
    "India":"भारत (सरकार OR संसद OR सुप्रीम कोर्ट OR नीति OR चुनाव OR कैबिनेट) when:1d",
    "Geopolitics":"(भूराजनीति OR कूटनीति OR युद्ध OR प्रतिबंध OR संघर्षविराम OR संधि OR व्यापार) when:1d",
    "World":"(दुनिया OR अंतरराष्ट्रीय) (सरकार OR संकट OR आपदा OR कूटनीति OR अर्थव्यवस्था OR सुरक्षा) when:1d",
    "Economy":"भारत (आरबीआई OR महंगाई OR जीडीपी OR अर्थव्यवस्था OR टैक्स OR बजट OR नौकरी OR रुपया) when:1d",
    "Business":"भारत (व्यापार OR कंपनी OR निवेश OR विनिर्माण OR स्टार्टअप OR उद्योग) when:1d",
    "Markets":"भारत (सेंसेक्स OR निफ्टी OR शेयर बाजार OR बॉन्ड OR रुपया OR कमोडिटी) when:1d",
    "Policy":"भारत (नीति OR नियम OR सुप्रीम कोर्ट OR हाई कोर्ट OR कानून OR मंत्रालय OR नियामक) when:1d",
    "Security":"भारत (रक्षा OR सुरक्षा OR सेना OR सीमा OR साइबर हमला OR आतंकवाद) when:1d",
    "Technology":"भारत (एआई OR कृत्रिम बुद्धिमत्ता OR तकनीक OR साइबर सुरक्षा OR सेमीकंडक्टर OR डिजिटल नीति) when:1d",
    "Science":"भारत (विज्ञान OR अनुसंधान OR इसरो OR अंतरिक्ष OR खोज OR मिशन) when:1d",
    "Health":"भारत (स्वास्थ्य OR बीमारी OR अस्पताल OR दवा OR प्रकोप OR सार्वजनिक स्वास्थ्य) when:1d",
    "Climate":"भारत (जलवायु OR प्रदूषण OR पर्यावरण OR हीटवेव OR बाढ़ OR चक्रवात OR वायु गुणवत्ता) when:1d",
    "Energy":"भारत (ऊर्जा OR बिजली OR तेल OR गैस OR सौर OR नवीकरणीय OR परमाणु) when:1d",
    "Infrastructure":"भारत (इन्फ्रास्ट्रक्चर OR मेट्रो OR रेलवे OR एयरपोर्ट OR हाईवे OR एक्सप्रेसवे OR परिवहन) when:1d",
    "Consumer":"भारत (उपभोक्ता OR कीमत OR जीएसटी OR बैंकिंग OR टेलीकॉम OR ईंधन OR एलपीजी OR आधार) when:1d",
    "Education":"भारत (शिक्षा OR स्कूल OR विश्वविद्यालय OR परीक्षा OR रोजगार OR नौकरी OR श्रम) when:1d",
    "PublicSafety":"भारत (भूकंप OR चक्रवात OR बाढ़ OR आग OR दुर्घटना OR आउटेज OR आपातकाल OR निकासी) when:1d",
}

IMPACT_EN = {
    "India":"It can affect national policy, institutions or public life.",
    "Geopolitics":"It can affect diplomacy, security, trade, energy or India’s external interests.",
    "World":"It is a major international development with possible spillover beyond one country.",
    "Economy":"It can affect growth, inflation, interest rates, jobs, taxes or the rupee.",
    "Business":"It can affect investment, industry, competition, jobs or supply chains.",
    "Markets":"It can affect equities, currency, rates, commodities or investor sentiment.",
    "Policy":"It can change rules, rights, compliance obligations or public administration.",
    "Security":"It can affect national security, defence posture, borders or cyber risk.",
    "Technology":"It can affect AI, digital policy, cybersecurity, productivity or strategic technology.",
    "Science":"It matters for research, space, innovation or scientific capability.",
    "Health":"It can affect public health, healthcare access, disease risk or medical policy.",
    "Climate":"It can affect air quality, weather risk, environment, health or economic activity.",
    "Energy":"It can affect power supply, fuel prices, energy security or industrial costs.",
    "Infrastructure":"It can affect mobility, logistics, travel time, safety or regional growth.",
    "Consumer":"It can affect household costs, banking, telecom, fuel, taxes or public services.",
    "Education":"It can affect students, exams, universities, jobs or labour markets.",
    "PublicSafety":"It can have immediate consequences for safety, travel, services or emergency response.",
    "State":"It can affect state policy, courts, infrastructure, economy or public services.",
    "Region":"It can affect multiple cities through transport, pollution, infrastructure or administration.",
    "Local":"It can directly affect local services, mobility, pollution, infrastructure or civic life.",
}
WATCH_EN = {
    "India":"Watch for official orders, implementation dates and institutional responses.",
    "Geopolitics":"Watch for official statements, military or diplomatic moves, sanctions and trade consequences.",
    "World":"Watch for confirmed government actions and measurable spillover effects.",
    "Economy":"Watch for official data, RBI/government response and price or market reaction.",
    "Business":"Watch for confirmed filings, investment decisions, jobs and competitive response.",
    "Markets":"Watch for sustained market moves, official data and whether the reaction broadens.",
    "Policy":"Watch for the final order, notification, effective date and implementation details.",
    "Security":"Watch for official confirmation, operational changes and verified security impact.",
    "Technology":"Watch for product/policy implementation, security implications and adoption evidence.",
    "Science":"Watch for primary research, mission updates and independent confirmation.",
    "Health":"Watch for health-authority guidance, case data, treatment evidence and local impact.",
    "Climate":"Watch for official advisories, measured conditions and service disruptions.",
    "Energy":"Watch for price, supply, regulatory and capacity changes.",
    "Infrastructure":"Watch for opening dates, closures, disruptions, costs and authority notices.",
    "Consumer":"Watch for effective dates, eligibility, prices, fees and official consumer guidance.",
    "Education":"Watch for official schedules, eligibility, exam/job notices and implementation.",
    "PublicSafety":"Watch for official alerts, closures, casualty/service updates and recovery guidance.",
    "State":"Watch for state notifications, court orders and implementation on the ground.",
    "Region":"Watch for authority advisories and cross-city service or mobility impact.",
    "Local":"Watch for local authority notices, traffic/service changes and practical impact.",
}
IMPACT_HI = {
    "India":"इसका असर राष्ट्रीय नीति, संस्थानों या सार्वजनिक जीवन पर पड़ सकता है।",
    "Geopolitics":"इसका असर कूटनीति, सुरक्षा, व्यापार, ऊर्जा या भारत के बाहरी हितों पर पड़ सकता है।",
    "World":"यह बड़ा अंतरराष्ट्रीय घटनाक्रम है जिसका असर एक देश से आगे जा सकता है।",
    "Economy":"इसका असर विकास, महंगाई, ब्याज दरों, नौकरियों, टैक्स या रुपये पर पड़ सकता है।",
    "Business":"इसका असर निवेश, उद्योग, प्रतिस्पर्धा, नौकरियों या सप्लाई चेन पर पड़ सकता है।",
    "Markets":"इसका असर शेयर बाजार, मुद्रा, ब्याज दरों, कमोडिटी या निवेशक धारणा पर पड़ सकता है।",
    "Policy":"यह नियमों, अधिकारों, अनुपालन या प्रशासन को बदल सकता है।",
    "Security":"इसका असर राष्ट्रीय सुरक्षा, रक्षा, सीमा या साइबर जोखिम पर पड़ सकता है।",
    "Technology":"इसका असर एआई, डिजिटल नीति, साइबर सुरक्षा, उत्पादकता या रणनीतिक तकनीक पर पड़ सकता है।",
    "Science":"यह अनुसंधान, अंतरिक्ष, नवाचार या वैज्ञानिक क्षमता के लिए महत्वपूर्ण है।",
    "Health":"इसका असर सार्वजनिक स्वास्थ्य, स्वास्थ्य सेवाओं या बीमारी के जोखिम पर पड़ सकता है।",
    "Climate":"इसका असर वायु गुणवत्ता, मौसम जोखिम, पर्यावरण, स्वास्थ्य या अर्थव्यवस्था पर पड़ सकता है।",
    "Energy":"इसका असर बिजली आपूर्ति, ईंधन कीमत, ऊर्जा सुरक्षा या औद्योगिक लागत पर पड़ सकता है।",
    "Infrastructure":"इसका असर आवागमन, लॉजिस्टिक्स, यात्रा समय, सुरक्षा या क्षेत्रीय विकास पर पड़ सकता है।",
    "Consumer":"इसका असर घरेलू खर्च, बैंकिंग, टेलीकॉम, ईंधन, टैक्स या सार्वजनिक सेवाओं पर पड़ सकता है।",
    "Education":"इसका असर छात्रों, परीक्षाओं, विश्वविद्यालयों, नौकरियों या श्रम बाजार पर पड़ सकता है।",
    "PublicSafety":"इसका तुरंत असर सुरक्षा, यात्रा, सेवाओं या आपात प्रतिक्रिया पर पड़ सकता है।",
    "State":"इसका असर राज्य की नीति, अदालतों, इन्फ्रास्ट्रक्चर, अर्थव्यवस्था या सेवाओं पर पड़ सकता है।",
    "Region":"इसका असर कई शहरों में परिवहन, प्रदूषण, इन्फ्रास्ट्रक्चर या प्रशासन पर पड़ सकता है।",
    "Local":"इसका सीधा असर स्थानीय सेवाओं, आवागमन, प्रदूषण, इन्फ्रास्ट्रक्चर या नागरिक जीवन पर पड़ सकता है।",
}
WATCH_HI = {
    "India":"आगे आधिकारिक आदेश, लागू होने की तारीख और संस्थागत प्रतिक्रिया देखें।",
    "Geopolitics":"आगे आधिकारिक बयान, सैन्य या कूटनीतिक कदम, प्रतिबंध और व्यापार असर देखें।",
    "World":"आगे सरकारों की पुष्टि और मापने योग्य प्रभाव देखें।",
    "Economy":"आगे आधिकारिक आंकड़े, RBI/सरकार की प्रतिक्रिया और कीमत या बाजार असर देखें।",
    "Business":"आगे आधिकारिक फाइलिंग, निवेश फैसले, नौकरियां और प्रतिस्पर्धी प्रतिक्रिया देखें।",
    "Markets":"आगे देखें कि बाजार की चाल टिकती है या नहीं और क्या असर व्यापक होता है।",
    "Policy":"आगे अंतिम आदेश, अधिसूचना, लागू होने की तारीख और नियमों का विवरण देखें।",
    "Security":"आगे आधिकारिक पुष्टि, ऑपरेशनल बदलाव और सत्यापित सुरक्षा असर देखें।",
    "Technology":"आगे लागू होने की स्थिति, सुरक्षा असर और वास्तविक अपनाने के संकेत देखें।",
    "Science":"आगे मूल शोध, मिशन अपडेट और स्वतंत्र पुष्टि देखें।",
    "Health":"आगे स्वास्थ्य प्राधिकरण की सलाह, केस डेटा और स्थानीय असर देखें।",
    "Climate":"आगे आधिकारिक सलाह, मापी गई स्थिति और सेवा व्यवधान देखें।",
    "Energy":"आगे कीमत, सप्लाई, नियमन और क्षमता में बदलाव देखें।",
    "Infrastructure":"आगे खुलने की तारीख, बंदी, व्यवधान, लागत और प्राधिकरण नोटिस देखें।",
    "Consumer":"आगे लागू तारीख, पात्रता, कीमत, फीस और आधिकारिक उपभोक्ता सलाह देखें।",
    "Education":"आगे आधिकारिक शेड्यूल, पात्रता, परीक्षा/नौकरी नोटिस और लागू होने की स्थिति देखें।",
    "PublicSafety":"आगे आधिकारिक अलर्ट, बंदी, सेवा अपडेट और रिकवरी गाइडेंस देखें।",
    "State":"आगे राज्य की अधिसूचना, अदालत आदेश और जमीन पर लागू होने की स्थिति देखें।",
    "Region":"आगे प्राधिकरण सलाह और कई शहरों पर सेवा/यातायात असर देखें।",
    "Local":"आगे स्थानीय प्राधिकरण नोटिस, ट्रैफिक/सेवा बदलाव और व्यावहारिक असर देखें।",
}

def clean_description(raw):
    if not raw:
        return ""
    text=re.sub(r"<[^>]+>"," ",raw)
    text=htmlmod.unescape(text)
    text=re.sub(r"\s+"," ",text).strip()
    return text[:800]

def keyword_hit(text, keyword):
    k=(keyword or "").lower().strip()
    if not k:
        return False
    # Unicode-aware word/phrase boundaries. Prevents "कर" matching inside "सरकार",
    # and "ai" matching inside "air".
    return re.search(r"(?<!\\w)"+re.escape(k)+r"(?!\\w)", text, flags=re.UNICODE) is not None

CATEGORY_RULES=[
    ("Policy",("supreme court","high court","court","tribunal","regulation","bill","act ","ordinance","सुप्रीम कोर्ट","हाई कोर्ट","अदालत","कानून","नियम")),
    ("PublicSafety",("crash","accident","collision","fire","evacuation","emergency","दुर्घटना","हादसा","टक्कर","आग","निकासी","आपातकाल")),
    ("Climate",("pollution","aqi","air quality","smog","cyclone","flood","heatwave","प्रदूषण","वायु गुणवत्ता","चक्रवात","बाढ़","हीटवेव")),
    ("Markets",("nifty","sensex","stock market","equities","bond yield","shares","निफ्टी","सेंसेक्स","शेयर बाजार")),
    ("Economy",("rbi","repo rate","inflation","gdp","rupee","fiscal","आरबीआई","रेपो","महंगाई","जीडीपी","रुपया")),
    ("Technology",("artificial intelligence"," ai ","semiconductor","cybersecurity","data breach","chip","कृत्रिम बुद्धिमत्ता"," एआई ","सेमीकंडक्टर","साइबर सुरक्षा","डेटा ब्रीच")),
    ("Health",("outbreak","disease","hospital","vaccine","public health","health ministry","प्रकोप","बीमारी","अस्पताल","टीका","सार्वजनिक स्वास्थ्य","स्वास्थ्य मंत्रालय")),
    ("Infrastructure",("metro","expressway","highway","airport","railway","train","bridge","infrastructure","मेट्रो","एक्सप्रेसवे","हाईवे","एयरपोर्ट","रेलवे","ट्रेन","पुल","इन्फ्रास्ट्रक्चर")),
    ("Security",("defence","military","border","terror","security forces","रक्षा","सेना","सीमा","आतंक","सुरक्षा बल")),
    ("Energy",("power plant","electricity","renewable","solar","oil price","gas price","green hydrogen","बिजली","नवीकरणीय","सौर","तेल की कीमत","गैस की कीमत","ग्रीन हाइड्रोजन")),
    ("Education",("exam","university","school","admission","student","employment","jobs","परीक्षा","विश्वविद्यालय","स्कूल","प्रवेश","छात्र","रोजगार","नौकरी")),
]

TOPIC_ANCHORS={
    "Economy":("rbi","inflation","gdp","economy","tax","budget","jobs","rupee","trade","आरबीआई","महंगाई","जीडीपी","अर्थव्यवस्था","बजट","रुपया"),
    "Business":("business","company","merger","acquisition","investment","manufacturing","startup","industry","व्यापार","कंपनी","विलय","अधिग्रहण","निवेश","विनिर्माण","उद्योग"),
    "Markets":("nifty","sensex","stock market","shares","equity","bond","commodities","निफ्टी","सेंसेक्स","शेयर बाजार","बॉन्ड"),
    "Policy":("policy","regulation","court","law","ministry","regulator","नीति","नियम","अदालत","कानून","मंत्रालय"),
    "Security":("defence","security","military","border","terror","cyberattack","रक्षा","सुरक्षा","सेना","सीमा","आतंक","साइबर हमला"),
    "Technology":("artificial intelligence","technology","cybersecurity","semiconductor","digital policy","कृत्रिम बुद्धिमत्ता","तकनीक","साइबर सुरक्षा","सेमीकंडक्टर","डिजिटल नीति"),
    "Science":("science","research","isro","space","discovery","mission","विज्ञान","अनुसंधान","इसरो","अंतरिक्ष","खोज","मिशन"),
    "Health":("health","disease","hospital","medicine","outbreak","public health","स्वास्थ्य","बीमारी","अस्पताल","दवा","प्रकोप","सार्वजनिक स्वास्थ्य"),
    "Climate":("climate","pollution","environment","heatwave","flood","cyclone","air quality","जलवायु","प्रदूषण","पर्यावरण","हीटवेव","बाढ़","चक्रवात","वायु गुणवत्ता"),
    "Energy":("energy","power","electricity","oil","gas","solar","renewable","nuclear","green hydrogen","ऊर्जा","बिजली","तेल","गैस","सौर","नवीकरणीय","परमाणु","ग्रीन हाइड्रोजन"),
    "Infrastructure":("infrastructure","metro","railway","airport","highway","expressway","transport","इन्फ्रास्ट्रक्चर","मेट्रो","रेलवे","एयरपोर्ट","हाईवे","एक्सप्रेसवे","परिवहन"),
    "Consumer":("consumer","price","gst","banking","telecom","fuel","lpg","aadhaar","उपभोक्ता","कीमत","जीएसटी","बैंकिंग","टेलीकॉम","ईंधन","एलपीजी","आधार"),
    "Education":("education","school","university","exam","student","employment","jobs","labour","शिक्षा","स्कूल","विश्वविद्यालय","परीक्षा","छात्र","रोजगार","नौकरी","श्रम"),
    "PublicSafety":("earthquake","cyclone","flood","fire","crash","accident","outage","emergency","evacuation","भूकंप","चक्रवात","बाढ़","आग","दुर्घटना","हादसा","आउटेज","आपातकाल","निकासी"),
}

def topic_supported(bucket, title, context):
    terms=TOPIC_ANCHORS.get(bucket)
    if not terms:
        return True
    text=(" "+(title or "")+" "+(context or "")+" ").lower()
    return any(keyword_hit(text,t) for t in terms)

def infer_category(bucket, title, context):
    text=(" "+(title or "")+" "+(context or "")+" ").lower()
    for cat,terms in CATEGORY_RULES:
        if any(keyword_hit(text,t) for t in terms):
            return cat
    return bucket

def impact_for_story(category, title, context, lang):
    t=(" "+(title or "")+" "+(context or "")+" ").lower()
    hi=(lang=="hi")
    rules=[
        (("rbi","repo rate","interest rate","आरबीआई","रेपो","ब्याज दर"),
         "RBI or interest-rate changes can alter loan EMIs, deposit returns, the rupee and market expectations.",
         "आरबीआई या ब्याज दर में बदलाव लोन EMI, जमा रिटर्न, रुपये और बाजार की उम्मीदों को बदल सकता है।",
         "Watch the official policy statement, bank lending/deposit rates and market reaction.",
         "आधिकारिक नीति बयान, बैंक लोन/जमा दरें और बाजार की प्रतिक्रिया देखें।"),
        (("tariff","import duty","export duty","trade restriction","टैरिफ","आयात शुल्क","निर्यात शुल्क","व्यापार प्रतिबंध"),
         "Trade restrictions can change import costs, export demand, supply chains and consumer prices.",
         "व्यापार प्रतिबंध आयात लागत, निर्यात मांग, सप्लाई चेन और उपभोक्ता कीमतों को बदल सकते हैं।",
         "Watch the final rate, affected products, exemptions and India’s response.",
         "अंतिम दर, प्रभावित उत्पाद, छूट और भारत की प्रतिक्रिया देखें।"),
        (("supreme court","high court","court order","tribunal","सुप्रीम कोर्ट","हाई कोर्ट","अदालत का आदेश","ट्रिब्यूनल"),
         "The legal outcome can change how a law, policy or government action is applied, and may affect similar cases.",
         "कानूनी नतीजा किसी कानून, नीति या सरकारी कार्रवाई के लागू होने का तरीका बदल सकता है और समान मामलों पर असर डाल सकता है।",
         "Watch the written order, implementation timeline and any appeal or compliance action.",
         "लिखित आदेश, लागू होने की समयसीमा और अपील या अनुपालन की अगली कार्रवाई देखें।"),
        (("pollution","aqi","air quality","smog","प्रदूषण","वायु गुणवत्ता"),
         "Air-quality changes can affect health, schools, construction, traffic restrictions and outdoor activity.",
         "वायु गुणवत्ता में बदलाव स्वास्थ्य, स्कूल, निर्माण, ट्रैफिक प्रतिबंध और बाहरी गतिविधियों को प्रभावित कर सकता है।",
         "Watch official AQI readings, GRAP/local restrictions, school advisories and weather conditions.",
         "आधिकारिक AQI, GRAP/स्थानीय प्रतिबंध, स्कूल सलाह और मौसम की स्थिति देखें।"),
        (("railway safety","kavach","train collision","rail accident","रेल सुरक्षा","कवच","ट्रेन दुर्घटना","रेल हादसा"),
         "Rail-safety changes can affect accident risk, network operations and passenger safety.",
         "रेल सुरक्षा में बदलाव दुर्घटना जोखिम, नेटवर्क संचालन और यात्री सुरक्षा को प्रभावित कर सकता है।",
         "Watch official safety findings, deployment coverage and operational changes.",
         "आधिकारिक सुरक्षा निष्कर्ष, तैनाती का दायरा और संचालन में बदलाव देखें।"),
        (("metro","expressway","highway","airport","bridge opening","मेट्रो","एक्सप्रेसवे","हाईवे","एयरपोर्ट","पुल"),
         "Transport infrastructure can change commute time, logistics costs, connectivity and nearby economic activity.",
         "परिवहन इन्फ्रास्ट्रक्चर यात्रा समय, लॉजिस्टिक्स लागत, कनेक्टिविटी और आसपास की आर्थिक गतिविधि बदल सकता है।",
         "Watch opening dates, fares/tolls, diversions and actual usage after launch.",
         "खुलने की तारीख, किराया/टोल, डायवर्जन और वास्तविक उपयोग देखें।"),
        (("gst rate","income tax","tax rate","tax slab","जीएसटी दर","आयकर","टैक्स दर","कर स्लैब"),
         "Tax changes can directly affect household prices, business margins, compliance and government revenue.",
         "टैक्स बदलाव सीधे घरेलू कीमत, व्यवसाय मार्जिन, अनुपालन और सरकारी राजस्व को प्रभावित कर सकते हैं।",
         "Watch the notification, effective date, affected slabs/sectors and compliance guidance.",
         "अधिसूचना, लागू तारीख, प्रभावित स्लैब/सेक्टर और अनुपालन निर्देश देखें।"),
        (("petrol price","diesel price","lpg price","oil price","पेट्रोल की कीमत","डीजल की कीमत","एलपीजी कीमत","तेल की कीमत"),
         "Fuel-price changes feed into household budgets, transport costs and inflation.",
         "ईंधन कीमत में बदलाव घरेलू बजट, परिवहन लागत और महंगाई पर असर डालता है।",
         "Watch retail-price changes, taxes/subsidies and inflation or transport-cost effects.",
         "खुदरा कीमत, टैक्स/सब्सिडी और महंगाई या परिवहन लागत पर असर देखें।"),
        (("layoff","hiring","job cuts","employment data","छंटनी","भर्ती","रोजगार डेटा"),
         "Employment changes affect household income, labour demand, wages and consumer confidence.",
         "रोजगार में बदलाव घरेलू आय, श्रम मांग, वेतन और उपभोक्ता भरोसे को प्रभावित करते हैं।",
         "Watch official job data, company hiring plans and wage trends.",
         "आधिकारिक रोजगार डेटा, कंपनी भर्ती योजना और वेतन रुझान देखें।"),
        (("data breach","cyberattack","hack","डेटा ब्रीच","साइबर हमला","हैक"),
         "A cyber incident can disrupt services, expose personal or business data and trigger security or regulatory action.",
         "साइबर घटना सेवाएं बाधित कर सकती है, निजी/व्यावसायिक डेटा उजागर कर सकती है और सुरक्षा या नियामक कार्रवाई ला सकती है।",
         "Watch the confirmed scope, affected users, restoration status and official security guidance.",
         "पुष्ट दायरा, प्रभावित उपयोगकर्ता, सेवा बहाली और आधिकारिक सुरक्षा सलाह देखें।"),
        (("war","ceasefire","military strike","armed conflict","युद्ध","संघर्षविराम","सैन्य हमला","सशस्त्र संघर्ष"),
         "Conflict can affect security, energy prices, trade routes, markets and diplomatic choices.",
         "संघर्ष सुरक्षा, ऊर्जा कीमत, व्यापार मार्ग, बाजार और कूटनीतिक फैसलों को प्रभावित कर सकता है।",
         "Watch verified military/diplomatic developments, ceasefire terms, sanctions and commodity-market reaction.",
         "पुष्ट सैन्य/कूटनीतिक घटनाक्रम, संघर्षविराम शर्तें, प्रतिबंध और कमोडिटी बाजार प्रतिक्रिया देखें।"),
        (("police post","police deployment","law and order","पुलिस चौकी","पुलिस तैनाती","कानून व्यवस्था"),
         "Policing changes can affect local security, enforcement, emergency response and how public spaces are managed.",
         "पुलिसिंग में बदलाव स्थानीय सुरक्षा, प्रवर्तन, आपात प्रतिक्रिया और सार्वजनिक स्थानों के प्रबंधन को प्रभावित कर सकता है।",
         "Watch where measures are implemented, staffing details and whether response times or incident levels change.",
         "कहां उपाय लागू होते हैं, स्टाफ का विवरण और प्रतिक्रिया समय या घटनाओं में बदलाव देखें।"),
        (("crash","accident","collision","दुर्घटना","हादसा","टक्कर"),
         "A major transport accident can expose safety, maintenance, training or regulatory gaps and may lead to operational changes.",
         "बड़ी परिवहन दुर्घटना सुरक्षा, रखरखाव, प्रशिक्षण या नियामक खामियां उजागर कर सकती है और संचालन में बदलाव ला सकती है।",
         "Watch the official investigation, confirmed cause, safety recommendations and any operating changes.",
         "आधिकारिक जांच, पुष्ट कारण, सुरक्षा सिफारिशें और संचालन में बदलाव देखें।"),
        (("flood","cyclone","earthquake","wildfire","बाढ़","चक्रवात","भूकंप","जंगल की आग"),
         "A major disaster can immediately affect safety, transport, power, public services and local economic activity.",
         "बड़ी आपदा तुरंत सुरक्षा, परिवहन, बिजली, सार्वजनिक सेवाओं और स्थानीय आर्थिक गतिविधि को प्रभावित कर सकती है।",
         "Watch official alerts, closures, damage updates and restoration timelines.",
         "आधिकारिक अलर्ट, बंदी, नुकसान अपडेट और सेवा बहाली की समयसीमा देखें।"),
        (("artificial intelligence","semiconductor","chip fabrication","कृत्रिम बुद्धिमत्ता","सेमीकंडक्टर","चिप निर्माण"),
         "AI or semiconductor developments can affect productivity, investment, jobs, cybersecurity and strategic technology capability.",
         "एआई या सेमीकंडक्टर घटनाक्रम उत्पादकता, निवेश, नौकरियों, साइबर सुरक्षा और रणनीतिक तकनीकी क्षमता पर असर डाल सकते हैं।",
         "Watch real deployment, investment commitments, regulation and measurable adoption.",
         "वास्तविक तैनाती, निवेश, नियमन और मापने योग्य अपनाने के संकेत देखें।"),
        (("outbreak","vaccine approval","disease spread","प्रकोप","टीका मंजूरी","बीमारी फैलाव"),
         "A public-health development can affect disease risk, healthcare capacity, treatment access and official guidance.",
         "सार्वजनिक स्वास्थ्य घटनाक्रम बीमारी के जोखिम, स्वास्थ्य क्षमता, इलाज की उपलब्धता और आधिकारिक सलाह को प्रभावित कर सकता है।",
         "Watch health-authority guidance, case/severity data and treatment evidence.",
         "स्वास्थ्य प्राधिकरण की सलाह, केस/गंभीरता डेटा और इलाज के प्रमाण देखें।"),
        (("merger","acquisition","factory investment","plant investment","विलय","अधिग्रहण","फैक्ट्री निवेश","प्लांट निवेश"),
         "A major investment or consolidation can affect jobs, capacity, competition, supply chains and regional growth.",
         "बड़ा निवेश या विलय नौकरियों, उत्पादन क्षमता, प्रतिस्पर्धा, सप्लाई चेन और क्षेत्रीय विकास को प्रभावित कर सकता है।",
         "Watch confirmed investment, location, timelines, jobs and regulatory approvals.",
         "पुष्ट निवेश, स्थान, समयसीमा, नौकरियां और नियामक मंजूरी देखें।"),
    ]
    for keys,en_why,hi_why,en_watch,hi_watch in rules:
        if any(keyword_hit(t,k) for k in keys):
            return (hi_why if hi else en_why, hi_watch if hi else en_watch, "high")
    return ("","","low")

def report_fields(category, title, context, lang):
    why,watch,confidence=impact_for_story(category,title,context,lang)
    return {
        "report":"",
        "why":why,
        "watch":watch,
        "impactConfidence":confidence,
    }

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
        specs.append((category,label,reason,None,None,rss_url(q,"en"),FRESH_GLOBAL_HOURS,18,"en"))
        hq=HI_TOPIC_QUERIES.get(category,q)
        specs.append((category,label,reason,None,None,rss_url(hq,"hi"),FRESH_GLOBAL_HOURS,14,"hi"))

    states=sorted(set(CITY_STATE.values()))
    for state in states:
        q=f'"{state}" (government OR policy OR court OR infrastructure OR economy OR pollution OR transport OR public safety) when:2d'
        hq=f'"{state}" (सरकार OR नीति OR अदालत OR इन्फ्रास्ट्रक्चर OR अर्थव्यवस्था OR प्रदूषण OR परिवहन OR सुरक्षा) when:2d'
        specs.append(("State",state,f"{state} · state affairs","State",state,rss_url(q,"en"),FRESH_LOCAL_HOURS,10,"en"))
        specs.append(("State",state,f"{state} · राज्य","State",state,rss_url(hq,"hi"),FRESH_LOCAL_HOURS,8,"hi"))

    for region,cities in REGIONS.items():
        city_terms=" OR ".join(f'"{x}"' for x in cities[:8])
        q=f'("{region}" OR {city_terms}) (policy OR civic OR pollution OR transport OR infrastructure OR court OR economy) when:2d'
        hq=f'("{region}" OR {city_terms}) (नीति OR नागरिक OR प्रदूषण OR परिवहन OR इन्फ्रास्ट्रक्चर OR अदालत OR अर्थव्यवस्था) when:2d'
        specs.append(("Region",region,f"{region} · regional affairs","Region",region,rss_url(q,"en"),FRESH_LOCAL_HOURS,12,"en"))
        specs.append(("Region",region,f"{region} · क्षेत्रीय","Region",region,rss_url(hq,"hi"),FRESH_LOCAL_HOURS,10,"hi"))

    for city,state in CITY_STATE.items():
        q=f'"{city}" "{state}" (civic OR government OR policy OR pollution OR transport OR infrastructure OR court OR economy OR public safety) when:2d'
        hq=f'"{city}" "{state}" (सरकार OR नीति OR प्रदूषण OR परिवहन OR इन्फ्रास्ट्रक्चर OR अदालत OR अर्थव्यवस्था OR सुरक्षा) when:2d'
        specs.append(("Local",city,f"{city} · city affairs","City",city,rss_url(q,"en"),FRESH_LOCAL_HOURS,8,"en"))
        specs.append(("Local",city,f"{city} · स्थानीय","City",city,rss_url(hq,"hi"),FRESH_LOCAL_HOURS,6,"hi"))
    return specs

def fetch_feed(spec):
    bucket,label,reason,scope_level,scope_key,url,max_hours,max_items,lang=spec
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 DailyIntelligence/1.0"})
    with urlopen(req,timeout=12) as r:
        root=ET.fromstring(r.read())
    out=[]
    cutoff=NOW-timedelta(hours=max_hours)
    for item in root.findall(".//item"):
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        pub=(item.findtext("pubDate") or "").strip()
        context=clean_description(item.findtext("description") or "")
        if not title or not link.startswith(("http://","https://")):
            continue
        if lang=="hi" and not re.search(r"[\u0900-\u097F]", title):
            continue
        k=key(title)
        if any(x in k for x in NOISE):
            continue
        low_terms=LOW_VALUE_BY_CATEGORY.get(bucket,())
        if any(x in k for x in low_terms) and not any(x in k for x in HIGH_SIGNAL):
            continue
        dt=parse_pub(pub)
        if dt < cutoff or dt > NOW+timedelta(hours=1):
            continue
        source="Google News"
        if " - " in title:
            head,pubname=title.rsplit(" - ",1)
            if head.strip(): title=head.strip()
            if pubname.strip(): source=pubname.strip()
        category=infer_category(bucket,title,context)
        if scope_level is None and bucket in TOPIC_ANCHORS:
            supported_original=topic_supported(bucket,title,context)
            supported_inferred=(category!=bucket and topic_supported(category,title,context))
            if not (supported_original or supported_inferred):
                continue
        report=report_fields(category,title,context,lang)
        out.append({
            "title":title,
            "url":link,
            "published":dt.isoformat().replace("+00:00","Z"),
            "source":source,
            "category":category,
            "label":label,
            "reason":reason,
            "context":context,
            "scope":{"level":scope_level,"key":scope_key} if scope_level and scope_key else None,
            "language":lang,
            **report,
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
        k=key(x["title"]); lang=x.get("language","en")
        skey=(lang,k)
        if not k or skey in seen: continue
        src=x.get("source") or "Publisher"
        if per_source.get(src,0)>=12: continue
        scope=x.get("scope") or {}
        sk=(scope.get("level"),scope.get("key"))
        scope_limit=10 if scope else 999
        if scope and per_scope.get(sk,0)>=scope_limit: continue
        seen.add(skey)
        per_source[src]=per_source.get(src,0)+1
        if scope: per_scope[sk]=per_scope.get(sk,0)+1
        clean.append(x)
        if len(clean)>=420: break

    payload={
        "schemaVersion":5,
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
