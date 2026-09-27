'use strict';
(()=>{
const KEY='astroproof.web.v05';
const Z=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const NAK=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const DASHA_LORDS=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'], DASHA_YEARS=[7,20,6,10,7,18,16,19,17];
const TOPICS={overview:['✦','Life overview'],career:['◈','Career & work'],relationships:['♡','Relationships'],money:['◇','Money & resources'],family:['⌂','Home & family'],wellbeing:['☽','Wellbeing'],learning:['✎','Learning & ideas'],travel:['✧','Travel & exploration']};
const PLACES={Delhi:[28.6139,77.2090,'Asia/Kolkata'],Ghaziabad:[28.6692,77.4538,'Asia/Kolkata'],Mumbai:[19.0760,72.8777,'Asia/Kolkata'],Bengaluru:[12.9716,77.5946,'Asia/Kolkata'],Chennai:[13.0827,80.2707,'Asia/Kolkata'],Kolkata:[22.5726,88.3639,'Asia/Kolkata'],London:[51.5074,-0.1278,'Europe/London'],'New York':[40.7128,-74.0060,'America/New_York'],Beijing:[39.9042,116.4074,'Asia/Shanghai'],Sydney:[-33.8688,151.2093,'Australia/Sydney'],Singapore:[1.3521,103.8198,'Asia/Singapore']};
const THEMES={Aries:['initiative','independence','action'],Taurus:['stability','resources','persistence'],Gemini:['communication','learning','adaptability'],Cancer:['care','security','belonging'],Leo:['visibility','creativity','leadership'],Virgo:['analysis','service','precision'],Libra:['partnership','balance','negotiation'],Scorpio:['depth','transformation','focus'],Sagittarius:['exploration','learning','expansion'],Capricorn:['structure','discipline','responsibility'],Aquarius:['systems','community','innovation'],Pisces:['imagination','empathy','reflection']};
const NUM_THEMES={1:['initiative','independence'],2:['partnership','balance'],3:['communication','creativity'],4:['structure','stability'],5:['adaptability','exploration'],6:['care','responsibility'],7:['analysis','reflection'],8:['resources','leadership'],9:['service','perspective'],11:['intuition','communication'],22:['structure','leadership'],33:['care','service']};
const CH_ELEMENTS=['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
const VEDIC_LORD={Aries:'Mars',Taurus:'Venus',Gemini:'Mercury',Cancer:'Moon',Leo:'Sun',Virgo:'Mercury',Libra:'Venus',Scorpio:'Mars',Sagittarius:'Jupiter',Capricorn:'Saturn',Aquarius:'Saturn',Pisces:'Jupiter'};
const VEDIC_EXALT={Sun:'Aries',Moon:'Taurus',Mars:'Capricorn',Mercury:'Virgo',Jupiter:'Cancer',Venus:'Pisces',Saturn:'Libra'};
const VEDIC_DEBIL={Sun:'Libra',Moon:'Scorpio',Mars:'Cancer',Mercury:'Pisces',Jupiter:'Capricorn',Venus:'Virgo',Saturn:'Aries'};
const COMBUSTION_ORB={Mars:{direct:17,retrograde:17},Mercury:{direct:14,retrograde:12},Jupiter:{direct:11,retrograde:11},Venus:{direct:10,retrograde:8},Saturn:{direct:15,retrograde:15}};
const MAHAPURUSHA_NAME={Mars:'Ruchaka',Mercury:'Bhadra',Jupiter:'Hamsa',Venus:'Malavya',Saturn:'Sasa'};
const GOCHAR_FAVORABLE={Sun:[3,6,10,11],Moon:[1,3,6,7,10,11],Mars:[3,6,11],Mercury:[2,4,6,8,10,11],Jupiter:[2,5,7,9,11],Venus:[1,2,3,4,5,8,9,11,12],Saturn:[3,6,11],Rahu:[3,6,10,11],Ketu:[3,6,10,11]};
const GOCHAR_VEDHA={
  Jupiter:{2:12,5:4,7:3,9:10,11:8},
  Saturn:{3:12,6:9,11:5}
};


const AREA_HOUSES={overview:[1,10,7,2],career:[10,6,2,11],relationships:[7,5,2],money:[2,11,5,9],family:[4,2],wellbeing:[1,6,8],learning:[3,5,9],travel:[3,9,12]};
const HOUSE_MEANING={1:'identity and approach',2:'resources, speech and accumulated wealth',3:'skills, communication and initiative',4:'home, roots and inner security',5:'creativity, study and children',6:'work routines, service and competition',7:'partnerships and contracts',8:'shared resources, change and vulnerability',9:'higher learning, beliefs and long journeys',10:'career, public role and responsibility',11:'gains, networks and long-range goals',12:'retreat, foreign links, endings and expenditure'};
const STEMS=['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'], BR=['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'], ANIMALS=['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={profile:null,records:[],lifeEvents:[]},chart=null,report=null,timer,nowRange='week';
function toast(s){const e=$('toast');e.textContent=s;e.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>e.classList.remove('show'),3500)}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}function load(){try{state=JSON.parse(localStorage.getItem(KEY)||'{"profile":null,"records":[],"lifeEvents":[]}');if(!Array.isArray(state.records))state.records=[];if(!Array.isArray(state.lifeEvents))state.lifeEvents=[]}catch{state={profile:null,records:[],lifeEvents:[]}}}
function page(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));$('crumb').textContent='PERSONAL ATLAS / '+id.toUpperCase();window.scrollTo(0,0);if(id==='reports')renderReport();if(id==='timeline')renderTimeline();if(id==='history')renderLifeEvents();if(id==='council')renderCouncil();if(id==='ledger')renderLedger()}
function mod(n,m){return ((n%m)+m)%m}function reduce(n){while(n>9&&![11,22,33].includes(n))n=String(n).split('').reduce((a,b)=>a+Number(b),0);return n}function signInfo(lon){lon=mod(lon,360);const i=Math.floor(lon/30);return {longitude:lon,sign:Z[i],sign_index:i,degree_in_sign:lon-i*30}}
function nameNumber(name,mode='all'){const vowels='AEIOU';let sum=0;for(const ch of (name||'').toUpperCase().normalize('NFKD'))if(ch>='A'&&ch<='Z'&&(mode==='all'||(mode==='vowel')===vowels.includes(ch)))sum+=((ch.charCodeAt(0)-65)%9)+1;return sum?reduce(sum):null}
function numerology(dateStr,name){const [y,m,d]=dateStr.split('-').map(Number), lp=reduce(reduce(m)+reduce(d)+reduce(y)),py=reduce(reduce(m)+reduce(d)+reduce(new Date().getFullYear()));return {life_path:lp,birthday:reduce(d),personal_year:py,expression:nameNumber(name),soul_urge:nameNumber(name,'vowel'),personality:nameNumber(name,'consonant')}}
function zoneParts(date,tz){const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const o={};for(const x of p)if(x.type!=='literal')o[x.type]=Number(x.value);return o}
function localToUtc(dateStr,timeStr,tz){const [y,m,d]=dateStr.split('-').map(Number),[hh,mm]=timeStr.split(':').map(Number);let guess=new Date(Date.UTC(y,m-1,d,hh,mm,0));for(let i=0;i<3;i++){const q=zoneParts(guess,tz);const got=Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,q.second);const want=Date.UTC(y,m-1,d,hh,mm,0);guess=new Date(guess.getTime()+(want-got))}return guess}
function ayanamsaApprox(date){const y=date.getUTCFullYear()+(date.getUTCMonth()+0.5)/12;return 23.85675+(y-2000)*50.29/3600}
function ascendant(date,lat,lon){const theta=mod(Astronomy.SiderealTime(date)*15+lon,360)*Math.PI/180;const phi=lat*Math.PI/180;const T=(date.getTime()-Date.UTC(2000,0,1,12))/86400000/36525;const eps=(23.439291-0.0130042*T)*Math.PI/180;let lam=Math.atan2(-Math.cos(theta),Math.sin(theta)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps))*180/Math.PI;return mod(lam,360)}
function geoLon(name,date){const body=Astronomy.Body[name],vec=Astronomy.GeoVector(body,date,true),ecl=Astronomy.Ecliptic(vec);return mod(ecl.elon,360)}
function signedAngularDelta(a,b){return mod(b-a+180,360)-180}
function planetary(date,withMotion=false){const names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'],out={};for(const name of names){const lon=geoLon(name,date),p=signInfo(lon);if(withMotion&& !['Sun','Moon'].includes(name)){const before=geoLon(name,new Date(date.getTime()-43200000)),after=geoLon(name,new Date(date.getTime()+43200000));p.retrograde=signedAngularDelta(before,after)<0}out[name]=p}return out}
function julianDay(date){return date.getTime()/86400000+2440587.5}
function meanLunarNodeTropical(date){const T=(julianDay(date)-2451545.0)/36525;return mod(125.0445479-1934.1362891*T+0.0020754*T*T+(T*T*T)/467441-(T*T*T*T)/60616000,360)}
function angularSep(a,b){let d=Math.abs(a-b);return Math.min(d,360-d)}

function houses(group,asc){if(asc==null)return;const asi=Math.floor(asc/30);for(const p of Object.values(group))p.house=mod(p.sign_index-asi,12)+1}
function aspects(planets){const types=[['Conjunction',0,8],['Sextile',60,5],['Square',90,6],['Trine',120,6],['Opposition',180,8]],keys=Object.keys(planets),a=[];for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){let d=Math.abs(planets[keys[i]].longitude-planets[keys[j]].longitude);d=Math.min(d,360-d);for(const [n,x,o] of types)if(Math.abs(d-x)<=o){a.push({bodies:[keys[i],keys[j]],aspect:n,angle:d,deviation:Math.abs(d-x)});break}}return a.sort((x,y)=>x.deviation-y.deviation)}
function divisional(lon,n){const sign=Math.floor(mod(lon,360)/30),deg=mod(lon,30);let idx;if(n===9){idx=mod(sign*9+Math.floor(deg/(30/9)),12)}else if(n===10){const part=Math.min(9,Math.floor(deg/3));const start=(sign%2===0)?sign:mod(sign+8,12);idx=mod(start+part,12)}else{throw new Error('Unsupported divisional chart D'+n)}return Z[idx]}
function divisionalChart(sid,n,ascLon){const out={};for(const [name,p] of Object.entries(sid))out[name]=divisional(p.longitude,n);out.Ascendant=ascLon==null?null:divisional(ascLon,n);return out}
function vedicConditionsPure(sid){
  const out={};
  for(const name of ['Mars','Mercury','Jupiter','Venus','Saturn']){
    const p=sid[name],sun=sid.Sun,retrograde=!!p.retrograde,solar_separation=angularSep(p.longitude,sun.longitude),threshold=COMBUSTION_ORB[name][retrograde?'retrograde':'direct'];
    out[name]={retrograde,solar_separation,combust:solar_separation<=threshold,combustion_threshold:threshold};
  }
  return out;
}
function vedicConjunctionsPure(sid){const names=Object.keys(sid),out=[];for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){const a=sid[names[i]],b=sid[names[j]];if(a.sign_index===b.sign_index)out.push({bodies:[names[i],names[j]],sign:a.sign,separation:angularSep(a.longitude,b.longitude)})}return out.sort((a,b)=>a.separation-b.separation)}
function vedicDrishtiPure(sid){
  const rules={Sun:[7],Moon:[7],Mercury:[7],Venus:[7],Mars:[4,7,8],Jupiter:[5,7,9],Saturn:[3,7,10]},out=[];
  for(const [from,counts] of Object.entries(rules)){const p=sid[from];if(!p)continue;for(const [to,q] of Object.entries(sid)){if(from===to)continue;const count=mod(q.sign_index-p.sign_index,12)+1;if(counts.includes(count))out.push({from,to,count,from_sign:p.sign,to_sign:q.sign,rule_id:'VED-DRISHTI-PARASHARI-FULL'})}}
  return out;
}
function vedicYogaCandidatesPure(sid,ascSid,conditions){
  const out=[],kendra=[1,4,7,10];
  if(ascSid){
    for(const planet of Object.keys(MAHAPURUSHA_NAME)){const p=sid[planet],dignity=VEDIC_EXALT[planet]===p.sign?'exalted':(VEDIC_LORD[p.sign]===planet?'own sign':'other');if(kendra.includes(p.house)&&dignity!=='other')out.push({rule_id:'VED-YOGA-MAHAPURUSHA-01',name:MAHAPURUSHA_NAME[planet]+' Mahapurusha',status:'structural match',bodies:[planet],evidence:`${planet} is ${dignity} in whole-sign house ${p.house} from Lagna.`,convention:'Lagna kendra + own/exaltation baseline'})}
  }
  const moon=sid.Moon,jup=sid.Jupiter,fromMoon=mod(jup.sign_index-moon.sign_index,12)+1;
  if([1,4,7,10].includes(fromMoon))out.push({rule_id:'VED-YOGA-GAJAKESARI-SIMPLE-01',name:'Gajakesari — simple Moon/Jupiter kendra variant',status:'candidate; stricter source qualifications not fully evaluated',bodies:['Moon','Jupiter'],evidence:`Jupiter is ${fromMoon} from the Moon.`,convention:'simple kendra-from-Moon variant'});
  if(sid.Sun.sign_index===sid.Mercury.sign_index)out.push({rule_id:'VED-YOGA-SUN-MERCURY-01',name:'Sun–Mercury conjunction / Budha-Aditya structural candidate',status:conditions.Mercury?.combust?'structural match; Mercury also combust under selected orb convention':'structural match',bodies:['Sun','Mercury'],evidence:`Sun and Mercury share ${sid.Sun.sign}; separation ${angularSep(sid.Sun.longitude,sid.Mercury.longitude).toFixed(2)}°.`,convention:'same-sign conjunction; effect claims deliberately not inferred'});
  if(sid.Moon.sign_index===sid.Mars.sign_index)out.push({rule_id:'VED-YOGA-MOON-MARS-CONJ-01',name:'Moon–Mars conjunction',status:'structural match; named-yoga/effect traditions disagree',bodies:['Moon','Mars'],evidence:`Moon and Mars share ${sid.Moon.sign}; separation ${angularSep(sid.Moon.longitude,sid.Mars.longitude).toFixed(2)}°.`,convention:'conjunction-only conservative detector'});
  return out;
}
function moonRelativeHouse(transitPos,natalMoon){return mod(transitPos.sign_index-natalMoon.sign_index,12)+1}
function currentVedicGochar(natalSid,date=new Date()){
  const ay=ayanamsaApprox(date),trop=planetary(date,true),sid={};for(const [k,v] of Object.entries(trop)){sid[k]=signInfo(v.longitude-ay);if('retrograde' in v)sid[k].retrograde=v.retrograde}
  const rahu=signInfo(meanLunarNodeTropical(date)-ay);rahu.retrograde=true;sid.Rahu=rahu;sid.Ketu=signInfo(rahu.longitude+180);sid.Ketu.retrograde=true;
  const houseByPlanet={};for(const [name,p] of Object.entries(sid))houseByPlanet[name]=moonRelativeHouse(p,natalSid.Moon);
  const rows=['Jupiter','Saturn','Rahu','Ketu'].map(name=>{
    const h=houseByPlanet[name],baseline=GOCHAR_FAVORABLE[name].includes(h),vedhaHouse=GOCHAR_VEDHA[name]?.[h]||null;
    let blockers=[];
    if(baseline&&vedhaHouse)blockers=Object.entries(houseByPlanet).filter(([other,oh])=>other!==name&&oh===vedhaHouse&&!(name==='Saturn'&&other==='Sun')).map(([other])=>other);
    return {planet:name,sign:sid[name].sign,house_from_moon:h,baseline_favorable:baseline,vedha_house:vedhaHouse,vedha_blocked_by:blockers,effective_favorable:baseline&&blockers.length===0,retrograde:!!sid[name].retrograde};
  });
  const sh=rows.find(x=>x.planet==='Saturn').house_from_moon;
  const sade=sh===12?'phase 1 — Saturn 12th from Moon':sh===1?'phase 2 — Saturn over Moon sign':sh===2?'phase 3 — Saturn 2nd from Moon':null;
  return {date:date.toISOString(),rows,sade_sati:sade,convention:'Moon-relative whole-sign gochar. Jupiter/Saturn Vedha applied where the chapter-26 mapping is explicit; Rahu/Ketu remain baseline-only. Ashtakavarga not yet applied.'};
}
function engineSelfTest(){
  const checks=[];
  const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
  const node=meanLunarNodeTropical(new Date('2000-01-01T12:00:00Z'));
  add('Meeus mean node J2000',Math.abs(node-125.0445479)<0.01,node.toFixed(6)+'°');
  add('D9 Aries 0°',divisional(0,9)==='Aries',divisional(0,9));
  add('D9 Taurus 0°',divisional(30,9)==='Capricorn',divisional(30,9));
  add('D10 Taurus 0°',divisional(30,10)==='Capricorn',divisional(30,10));
  const fixture={Sun:signInfo(0),Moon:signInfo(30),Mercury:signInfo(60),Venus:signInfo(90),Mars:signInfo(0),Jupiter:signInfo(120),Saturn:signInfo(300),Rahu:signInfo(210),Ketu:signInfo(30)};
  const dr=vedicDrishtiPure(fixture);
  add('Mars 4th drishti',dr.some(x=>x.from==='Mars'&&x.to==='Venus'&&x.count===4));
  add('Jupiter 9th drishti',dr.some(x=>x.from==='Jupiter'&&x.to==='Sun'&&x.count===9));
  add('Saturn 3rd drishti',dr.some(x=>x.from==='Saturn'&&x.to==='Sun'&&x.count===3));
  return {passed:checks.filter(x=>x.ok).length,total:checks.length,ok:checks.every(x=>x.ok),checks};
}
function vimshottari(date,moonLon,atDate=new Date()){
  const span=360/27,ix=Math.floor(mod(moonLon,360)/span),li=ix%9,elapsed=mod(moonLon,span)/span;
  let mdStart=new Date(date.getTime()-DASHA_YEARS[li]*elapsed*365.2425*86400000),now=atDate,active=null;
  for(let n=0;n<18;n++){
    const mdIx=(li+n)%9,mdYears=DASHA_YEARS[mdIx],mdEnd=new Date(mdStart.getTime()+mdYears*365.2425*86400000);
    let adStart=new Date(mdStart);
    for(let j=0;j<9;j++){
      const adIx=(mdIx+j)%9,adYears=mdYears*DASHA_YEARS[adIx]/120,adEnd=new Date(adStart.getTime()+adYears*365.2425*86400000);
      if(adStart<=now&&now<adEnd){
        let pdStart=new Date(adStart),pd=null;
        for(let k=0;k<9;k++){
          const pdIx=(adIx+k)%9,pdYears=adYears*DASHA_YEARS[pdIx]/120,pdEnd=new Date(pdStart.getTime()+pdYears*365.2425*86400000);
          if(pdStart<=now&&now<pdEnd)pd={lord:DASHA_LORDS[pdIx],start:pdStart.toISOString().slice(0,10),end:pdEnd.toISOString().slice(0,10)};
          pdStart=pdEnd;
        }
        active={mahadasha:DASHA_LORDS[mdIx],antardasha:DASHA_LORDS[adIx],pratyantar:pd?.lord||null,start:adStart.toISOString().slice(0,10),end:adEnd.toISOString().slice(0,10),pratyantar_start:pd?.start||null,pratyantar_end:pd?.end||null};
      }
      adStart=adEnd;
    }
    if(active)break;
    mdStart=mdEnd;
  }
  return {nakshatra:NAK[ix],pada:Math.floor((mod(moonLon,span))/(span/4))+1,first_lord:DASHA_LORDS[li],active}
}
function chinese(date,timeKnown,localHour){const y=date.getUTCFullYear(),cy=mod(y-1984,60),ys=cy%10,yb=cy%12;const dayNum=Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000);const ref=Math.floor(Date.UTC(1984,1,2)/86400000);const dc=mod(dayNum-ref,60),ds=dc%10,db=dc%12;let hour=null;if(timeKnown){const hb=localHour>=23||localHour<1?0:Math.floor((localHour+1)/2)%12,hs=mod((ds%5)*2+hb,10);hour={stem:STEMS[hs],branch:BR[hb]}}return {year:{stem:STEMS[ys],branch:BR[yb],animal:ANIMALS[yb]},day:{stem:STEMS[ds],branch:BR[db],element:CH_ELEMENTS[ds],polarity:ds%2?'Yin':'Yang'},hour,method:'Sexagenary year/day/hour browser research convention; month pillar and true-solar-time refinement remain pending in this hosted build.'}}
function calculateChart(p,options={}){
  const timeKnown=!p.timeunknown,t=timeKnown?p.birthtime:'12:00',date=localToUtc(p.birthdate,t,p.timezone);
  const trop=planetary(date,true),asc=timeKnown?ascendant(date,p.latitude,p.longitude):null;
  houses(trop,asc);
  const ay=ayanamsaApprox(date),sid={};
  for(const [k,v] of Object.entries(trop)){sid[k]=signInfo(v.longitude-ay);if('retrograde' in v)sid[k].retrograde=v.retrograde}
  const rahu=signInfo(meanLunarNodeTropical(date)-ay);rahu.retrograde=true;rahu.node_convention='mean lunar ascending node (Meeus polynomial)';
  sid.Rahu=rahu;sid.Ketu=signInfo(rahu.longitude+180);sid.Ketu.retrograde=true;sid.Ketu.node_convention='opposite mean lunar node';
  const ascSid=asc==null?null:mod(asc-ay,360);houses(sid,ascSid);
  const conditions=vedicConditionsPure(sid),drishti=vedicDrishtiPure(sid),conjunctions=vedicConjunctionsPure(sid),yogas=vedicYogaCandidatesPure(sid,ascSid,conditions);
  const vd=vimshottari(date,sid.Moon.longitude),n=numerology(p.birthdate,p.birth_name),chineseProfile=chinese(date,timeKnown,Number(t.split(':')[0]));
  return {meta:{utc:date.toISOString(),time_known:timeKnown,place:p.place,latitude:p.latitude,longitude:p.longitude,timezone:p.timezone,ayanamsa_deg:ay,engine:'Astronomy Engine (MIT) tropical + approximate Lahiri-style sidereal conversion; mean lunar node from Meeus polynomial'},western:{planets:trop,ascendant:asc==null?null:signInfo(asc),aspects:aspects(trop)},vedic:{planets:sid,ascendant:ascSid==null?null:signInfo(ascSid),moon_nakshatra:vd.nakshatra,moon_pada:vd.pada,dasha:vd,conditions,drishti,conjunctions,yogas,gochar:options.skipDynamic?null:currentVedicGochar(sid),divisional:{D9:divisionalChart(sid,9,ascSid),D10:divisionalChart(sid,10,ascSid)}},numerology:n,chinese:chineseProfile,warnings:['Astrology/numerology interpretations are traditional frameworks, not established predictors of individual outcomes.','Hosted Vedic sidereal conversion is an approximation pending independent production certification.','Rahu/Ketu use the mean-node convention; true-node charts can differ.','Yoga detectors report rule-specific structural candidates, not guaranteed life outcomes.']};
}
function wheel(group,label){const polar=(d,r)=>{const a=(d-90)*Math.PI/180;return[180+r*Math.cos(a),180+r*Math.sin(a)]};let s=`<svg class="wheel" viewBox="0 0 360 360" role="img" aria-label="${esc(label)} zodiac wheel"><circle cx="180" cy="180" r="164" fill="#0e1020" stroke="#8f7cff"/><circle cx="180" cy="180" r="126" fill="none" stroke="#4b5278"/>`;Z.forEach((z,i)=>{const[a,b]=polar(i*30,126),[c,d]=polar(i*30,164),[x,y]=polar(i*30+15,145);s+=`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#4b5278"/><text x="${x}" y="${y}" text-anchor="middle" fill="#e0c279" font-size="9">${z.slice(0,3)}</text>`});Object.entries(group.planets).forEach(([n,p],i)=>{const[x,y]=polar(p.longitude,105-(i%3)*8);s+=`<circle cx="${x}" cy="${y}" r="3" fill="#f0d492"/><text x="${x}" y="${y-6}" text-anchor="middle" fill="#eee8ff" font-size="7">${n.slice(0,2)}</text>`});return s+`<text x="180" y="179" text-anchor="middle" fill="#fff" font-size="12">${esc(label)}</text></svg>`}

function aspectOrbAt(when,mover,targetLon,angle){
  const p=planetary(when),lon=p[mover].longitude;
  let sep=Math.abs(lon-targetLon);sep=Math.min(sep,360-sep);
  return Math.abs(sep-angle);
}
function refineTransitPeak(center,mover,targetLon,angle,spanMs=86400000){
  let a=center.getTime()-spanMs,b=center.getTime()+spanMs;
  const gr=(Math.sqrt(5)-1)/2;
  let c1=b-gr*(b-a),c2=a+gr*(b-a);
  let f1=aspectOrbAt(new Date(c1),mover,targetLon,angle),f2=aspectOrbAt(new Date(c2),mover,targetLon,angle);
  for(let i=0;i<28;i++){
    if(f1>f2){a=c1;c1=c2;f1=f2;c2=a+gr*(b-a);f2=aspectOrbAt(new Date(c2),mover,targetLon,angle)}
    else{b=c2;c2=c1;f2=f1;c1=b-gr*(b-a);f1=aspectOrbAt(new Date(c1),mover,targetLon,angle)}
  }
  const t=(a+b)/2,when=new Date(t);
  return {when,orb:aspectOrbAt(when,mover,targetLon,angle)};
}
function transitForecast(days,stepDays){
  if(!chart)return[];
  const natal={Sun:chart.western.planets.Sun,Moon:chart.western.planets.Moon,Mercury:chart.western.planets.Mercury,Venus:chart.western.planets.Venus,Mars:chart.western.planets.Mars,Jupiter:chart.western.planets.Jupiter,Saturn:chart.western.planets.Saturn};
  if(chart.western.ascendant)natal.Ascendant=chart.western.ascendant;
  const movers=['Jupiter','Saturn','Mars','Uranus','Neptune','Pluto'];
  const asp=[['conjunction',0],['sextile',60],['square',90],['trine',120],['opposition',180]];
  const weight={Jupiter:5,Saturn:5,Mars:2,Uranus:4,Neptune:3,Pluto:4};
  const start=new Date(),end=new Date(start.getTime()+days*86400000),stepMs=Math.min(1,Math.max(.5,Number(stepDays)||1))*86400000;
  const active=new Map(),candidates=[];
  const finish=(key,run)=>{
    if(!run)return;
    candidates.push({...run,sample_score:(weight[run.mover]||1)+(3-run.best.orb)});
    active.delete(key);
  };
  for(let t=start.getTime();t<=end.getTime()+1;t+=stepMs){
    const when=new Date(Math.min(t,end.getTime())),p=planetary(when);
    for(const m of movers)for(const [n,np] of Object.entries(natal))for(const [an,aa] of asp){
      let sep=Math.abs(p[m].longitude-np.longitude);sep=Math.min(sep,360-sep);
      const orb=Math.abs(sep-aa),key=m+'|'+an+'|'+n,run=active.get(key);
      if(orb<=3){
        if(!run)active.set(key,{mover:m,aspect:an,target:n,targetLon:np.longitude,angle:aa,start:when,last:when,best:{when,orb}});
        else{run.last=when;if(orb<run.best.orb)run.best={when,orb}}
      }else if(run)finish(key,run);
    }
    if(when.getTime()===end.getTime())break;
  }
  for(const [key,run] of [...active.entries()])finish(key,run);
  const shortlist=candidates.sort((a,b)=>b.sample_score-a.sample_score).slice(0,30);
  const hits=shortlist.map(run=>{
    const refined=refineTransitPeak(run.best.when,run.mover,run.targetLon,run.angle,stepMs);
    return {mover:run.mover,aspect:run.aspect,target:run.target,date:refined.when.toISOString().slice(0,10),peak_at:refined.when.toISOString(),orb:refined.orb,window_start:run.start.toISOString().slice(0,10),window_end:run.last.toISOString().slice(0,10),timing_precision:'peak refined numerically; window boundaries day-resolution'};
  });
  return hits.sort((a,b)=>(weight[b.mover]-b.orb)-(weight[a.mover]-a.orb)).slice(0,18);
}
function forecastTopic(h){
  const p=chart.western.planets[h.target]||chart.western.ascendant;
  const house=p?.house||null;
  if([10,6].includes(house))return 'career';
  if([2,8,11].includes(house))return 'money';
  if([5,7].includes(house))return 'relationships';
  if(house===4)return 'family';
  if([3,9].includes(house))return 'learning';
  if(house===12)return 'travel';
  if(house===1)return 'overview';
  const bodyMap={Sun:'career',Moon:'family',Mercury:'learning',Venus:'relationships',Mars:'career',Jupiter:'learning',Saturn:'career',Ascendant:'overview'};
  return bodyMap[h.target]||'overview';
}
function dashaSupport(topic){
  const a=vedicAreaFacts(topic);
  if(!a.available)return {count:0,levels:[]};
  return {count:a.activated.length,levels:a.activated.map(x=>x.role+':'+x.planet)};
}
function rankForecasts(items){
  const w={Jupiter:5,Saturn:5,Uranus:4,Pluto:4,Neptune:3,Mars:2};
  return items.map(h=>{
    const topic=forecastTopic(h),ds=dashaSupport(topic);
    const exactness=Math.max(0,2.5-h.orb);
    const score=(w[h.mover]||1)+exactness+ds.count*1.75;
    return {...h,topic,dasha_support:ds,score};
  }).sort((a,b)=>b.score-a.score);
}
function evidenceLadder(h){
  return [
    ['Calculated timing','pass'],
    ['Traditional interpretation','pass'],
    ['Independent technique convergence',h.dasha_support?.count?'pass':'pending'],
    ['Historical holdout','pending'],
    ['Prospective Reality Check','pending'],
    ['Replication','pending']
  ];
}
function forecastMeaning(h){
  const pm={
    Jupiter:'expansion, opportunity, learning and broader perspective',
    Saturn:'responsibility, structure, limits and long-term consolidation',
    Mars:'drive, urgency, competition and decisive action',
    Uranus:'change, disruption, independence and experimentation',
    Neptune:'imagination, ambiguity, ideals and boundary-testing',
    Pluto:'deep pressure, transformation, control and renewal'
  };
  const am={
    conjunction:'concentrates the theme',
    trine:'is traditionally read as easier flow',
    sextile:'is traditionally read as an opening that still needs action',
    square:'is traditionally read as friction that pushes adjustment',
    opposition:'is traditionally read as a polarity requiring balance'
  };
  return pm[h.mover]+'. '+am[h.aspect]+'.';
}
function buildLifeBrief(){
  const w=chart.western, v=chart.vedic, n=chart.numerology, c=chart.chinese;
  const asc=w.ascendant?w.ascendant.sign:null;
  const base=[
    {t:'Core orientation',x:`Western Sun in ${w.planets.Sun.sign}, Moon in ${w.planets.Moon.sign}${asc?', Ascendant '+asc:''}. Traditional emphasis: ${THEMES[w.planets.Sun.sign].join(', ')} with an emotional style colored by ${THEMES[w.planets.Moon.sign].join(', ')}.`},
    {t:'Vedic anchor',x:`Sidereal Moon falls in ${v.moon_nakshatra}, pada ${v.moon_pada}. This is the timing anchor used for the current Vimshottari period.`},
    {t:'Recurring style',x:`Life Path ${n.life_path} adds a numerology theme of ${(NUM_THEMES[n.life_path]||['reflection']).join(', ')}.`},
    {t:'Chinese lens',x:`Day Master is ${c.day.polarity} ${c.day.element}; use this as a traditional pattern lens, not a deterministic personality fact.`}
  ];
  if(v.dasha.active)base.push({t:'Current life phase',x:`Vimshottari is in ${v.dasha.active.mahadasha}–${v.dasha.active.antardasha} from ${v.dasha.active.start} to ${v.dasha.active.end}. The app should treat this as a period theme and combine it with actual transits before making any forecast statement.`});
  return base;
}
function dashaTheme(lord){
  return {
    Sun:'visibility, authority, identity and responsibility',
    Moon:'home, emotional life, belonging and changing needs',
    Mars:'action, competition, courage, conflict and decisive movement',
    Mercury:'learning, communication, trade, analysis and negotiation',
    Jupiter:'growth, mentors, education, opportunity and expansion',
    Venus:'relationships, comforts, values, creativity and resources',
    Saturn:'duty, pressure, limits, endurance and long-term restructuring',
    Rahu:'ambition, novelty, uncertainty, foreign/unusual directions and appetite for change',
    Ketu:'detachment, simplification, endings, inward focus and reorientation'
  }[lord]||'a changing life emphasis';
}
function historicalPhases(years=12){
  if(!chart)return[];
  const birth=new Date(chart.meta.utc),moon=chart.vedic.planets.Moon.longitude,now=new Date();
  const floor=new Date(now);floor.setUTCFullYear(floor.getUTCFullYear()-years);
  const begin=new Date(Math.max(birth.getTime(),floor.getTime()));
  const seen=new Map();
  for(let t=begin.getTime();t<=now.getTime();t+=45*86400000){
    const d=vimshottari(birth,moon,new Date(t)).active;if(!d)continue;
    const key=d.mahadasha+'|'+d.antardasha;
    if(!seen.has(key))seen.set(key,{...d,key});
  }
  return [...seen.values()].sort((a,b)=>a.start.localeCompare(b.start)).slice(-6);
}
function phaseNarrative(p){
  if(!p)return 'No phase resolved.';
  return `${p.mahadasha}–${p.antardasha}: a traditional combination of ${dashaTheme(p.mahadasha)} with a secondary emphasis on ${dashaTheme(p.antardasha)}.`;
}
function forecastPlain(h){
  const manifestations={
    career:['responsibility or reporting changes','a demanding project or role shift','greater visibility or pressure to formalize work'],
    money:['income/expense priorities changing','a need to structure resources','a new opportunity that still needs independent financial checks'],
    relationships:['an important conversation or boundary','a relationship becoming more defined','a need to balance closeness and independence'],
    family:['changes in home responsibilities','family conversations or caregiving themes','attention returning to security and belonging'],
    wellbeing:['routines needing adjustment','pressure making rest and recovery more important','a need to make health decisions from qualified evidence, not astrology'],
    learning:['study, certification or mentoring','a new skill or intellectual direction','communication and decision-making becoming more important'],
    travel:['travel, relocation or foreign-link themes','planning around movement or distance','a change of environment becoming more relevant'],
    overview:['a broader change in priorities','identity and direction becoming more active','a period that asks for deliberate choices rather than autopilot']
  };
  const area=TOPICS[h.topic]?.[1]||'Life';
  return {area,meaning:forecastMeaning(h),examples:manifestations[h.topic]||manifestations.overview};
}
function birthTimeQuality(){
  const p=state.profile;if(!p)return 'Not set';
  return {recorded:'Recorded / high',approx5:'Approx ±5m',approx15:'Approx ±15m',approx30:'Approx ±30m',unknown:'Unknown'}[p.time_precision||'recorded']||'Recorded / high';
}
function phasePlainTitle(p){
  const map={Sun:'Visibility & responsibility',Moon:'Home & emotional priorities',Mars:'Action & pressure',Mercury:'Learning & decisions',Jupiter:'Growth & opportunity',Venus:'Relationships & values',Saturn:'Structure & responsibility',Rahu:'Change & experimentation',Ketu:'Simplification & reorientation'};
  if(!p)return 'Life transition';
  return (map[p.mahadasha]||'Life direction')+' → '+(map[p.antardasha]||'secondary theme');
}
function plainForecastSummary(h){
  if(!h)return {headline:'No unusually strong timing signal',body:'The current engine does not find a major concentrated window in this horizon. That is a valid result; you do not need to force a prediction.',watch:[]};
  const area=TOPICS[h.topic]?.[1]||'Life';
  const mode={
    Jupiter:'more room for growth, learning or opportunity',
    Saturn:'more responsibility, structure, delay or consolidation',
    Mars:'more urgency, action, competition or friction',
    Uranus:'a stronger push toward change, independence or disruption',
    Neptune:'more uncertainty, imagination, ideals or blurred boundaries',
    Pluto:'deeper restructuring, pressure or a change in what you can no longer ignore'
  }[h.mover]||'a stronger-than-usual emphasis';
  const tone={conjunction:'concentrated',trine:'comparatively smoother',sextile:'an opening that still needs action',square:'more demanding and adjustment-heavy',opposition:'a balancing or push-pull situation'}[h.aspect]||'active';
  const examples=(forecastPlain(h).examples||[]).slice(0,3);
  return {headline:area+' is the clearest theme',body:`This period puts extra emphasis on ${area.toLowerCase()}. Traditionally, the pattern points to ${mode}; the way it develops looks ${tone}. Read this as a theme to watch, not as a promise that one specific event must happen.`,watch:examples};
}
function renderOverview(){
  if(!chart)return;
  $('overview-note').innerHTML='<b>Your reading is ready.</b> Start with section 1 and move down. Technical astrology is hidden unless you open “How was this calculated?”';
  document.querySelectorAll('[data-now-range]').forEach(b=>b.classList.toggle('active',b.dataset.nowRange===nowRange));

  const cfg={today:[1,1,'today'],week:[7,1,'this week'],month:[30,1,'this month'],year:[365,1,'this year']}[nowRange]||[7,1,'this week'];
  const current=rankForecasts(transitForecast(cfg[0],cfg[1]));
  const year=cfg[0]===365?current:rankForecasts(transitForecast(365,1));
  const main=current[0]||year[0]||null;
  const upcoming=year.filter(x=>!main||x.mover!==main.mover||x.target!==main.target||x.aspect!==main.aspect).slice(0,3);
  const phase=chart.vedic.dasha.active;
  const history=historicalPhases().slice(-3);
  const nowText=plainForecastSummary(main);
  const advice=practiceLayer(main?.topic||'overview');

  $('metrics').innerHTML=[
    ['Main focus',main?(TOPICS[main.topic]?.[1]||'Life'):'No strong signal'],
    ['Next window',upcoming[0]?(upcoming[0].window_start||upcoming[0].date):'No major window'],
    ['Background theme',phase?phasePlainTitle(phase).split(' → ')[0]:'Not resolved'],
    ['Birth-time certainty',birthTimeQuality()]
  ].map(x=>`<div class="metric"><span>${x[0]}</span><b>${esc(x[1])}</b></div>`).join('');

  const tech=h=>`<details class="tech-details"><summary>How was this calculated?</summary><p class="muted">${esc(h.mover)} ${esc(h.aspect)} natal ${esc(h.target)} · calculated peak ${esc(h.date)} · orb ${h.orb.toFixed(3)}°. ${h.dasha_support.count?h.dasha_support.count+' current Vedic timing layer(s) also connect to the same life area.':'No direct MD/AD/PD house activation was found.'}</p><button class="ghost" data-page="charts">Open full calculation details</button></details>`;

  const futureCard=h=>{
    const p=plainForecastSummary(h);
    return `<div class="plain-card"><span class="outlook-pill">${esc(h.window_start||h.date)} → ${esc(h.window_end||h.date)}</span><h3>${esc(p.headline)}</h3><p class="lead">${esc(p.body)}</p>${p.watch.length?'<p><b>What this could look like:</b></p><ul class="simple-list">'+p.watch.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''}<p class="hint">This is a traditional timing interpretation, not an event probability.</p>${tech(h)}</div>`;
  };

  const pastCards=history.map(p=>`<div class="plain-card"><span class="outlook-pill">${esc(p.start)} → ${esc(p.end)}</span><h3>${esc(phasePlainTitle(p))}</h3><p class="lead">${esc(phaseNarrative(p).replace(/^.*?: /,''))}</p><p class="hint">This paragraph was generated from the timing model before consulting any validation-holdout events you recorded.</p><details class="tech-details"><summary>Show the technical period</summary><p class="muted">${esc(p.mahadasha)}–${esc(p.antardasha)} timing period.</p></details></div>`).join('');

  const nowWatch=nowText.watch.length?'<ul class="simple-list">'+nowText.watch.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';

  $('forecast-dashboard').innerHTML=`
    <div class="section reading-block" id="reading-now">
      <div class="section-head"><div class="big-no">1</div><div><span class="eyebrow">READ THIS FIRST</span><h2>What seems to be going on now</h2><p class="muted">This is the single most important message for ${esc(cfg[2])}.</p></div></div>
      <div class="plain-card"><span class="outlook-pill">Current reading</span><h3>${esc(nowText.headline)}</h3><p class="lead">${esc(nowText.body)}</p>${nowWatch}<p class="hint">If this does not resemble your current life, that matters. AstroProof should record misses as well as matches.</p>${main?tech(main):''}</div>
    </div>

    <div class="section reading-block" id="reading-next">
      <div class="section-head"><div class="big-no">2</div><div><span class="eyebrow">LOOK AHEAD</span><h2>What may become important next</h2><p class="muted">These are the three strongest windows found in the next 12 months—not three guaranteed events.</p></div></div>
      <div class="grid3">${upcoming.length?upcoming.map(futureCard).join(''):'<div class="notice">No concentrated upcoming window was found under the current rules.</div>'}</div>
      <div class="small-actions"><button class="ghost" data-page="timeline">Check a particular date</button><button class="ghost" data-page="council">Ask a specific question</button></div>
    </div>

    <div class="section reading-block" id="reading-past">
      <div class="section-head"><div class="big-no">3</div><div><span class="eyebrow">CHECK THE PAST</span><h2>Do these recent phases resemble your life?</h2><p class="muted">Do not try to make them fit. A mismatch is useful evidence too.</p></div></div>
      <div class="grid3">${pastCards||'<div class="notice">Not enough historical timing information is available.</div>'}</div>
      <div class="small-actions"><button class="ghost" data-page="history">Record what actually happened</button><button class="ghost" data-page="ledger">Check predictions later</button></div>
    </div>

    <div class="section reading-block" id="reading-action">
      <div class="section-head"><div class="big-no">4</div><div><span class="eyebrow">FINISH HERE</span><h2>What you can do with this</h2><p class="muted">Practical action comes first. Traditional practices are optional.</p></div></div>
      <div class="grid2"><div class="plain-card"><h3>Practical next steps</h3><ul class="simple-list">${advice.slice(0,2).map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></div><div class="plain-card"><h3>If traditional practice matters to you</h3><p class="lead">${esc(advice[2]||'No traditional practice suggested.')}</p><p class="hint">${esc(advice[3]||'')}</p></div></div>
    </div>

    <div class="notice"><b>What to do next:</b> If the reading makes sense, ask one specific question. If it does not, record that too. AstroProof is meant to become more testable, not simply more convincing.</div>`;
}
function transitHitsOn(target){
  if(!chart)return[];
  const p=planetary(target);
  const natal={...chart.western.planets};
  if(chart.western.ascendant)natal.Ascendant=chart.western.ascendant;
  const movers=['Jupiter','Saturn','Mars','Uranus','Neptune','Pluto'];
  const asp=[['conjunction',0],['sextile',60],['square',90],['trine',120],['opposition',180]];
  const out=[];
  for(const mover of movers)for(const [targetName,np] of Object.entries(natal)){
    let sep=Math.abs(p[mover].longitude-np.longitude);sep=Math.min(sep,360-sep);
    for(const [aspect,angle] of asp){
      const orb=Math.abs(sep-angle);
      if(orb<=3)out.push({mover,aspect,target:targetName,orb,topic:forecastTopic({target:targetName}),date:target.toISOString().slice(0,10)});
    }
  }
  const weight={Jupiter:5,Saturn:5,Uranus:4,Pluto:4,Neptune:3,Mars:2};
  return out.sort((a,b)=>(weight[b.mover]-b.orb)-(weight[a.mover]-a.orb)).slice(0,10);
}
function renderTimeline(){
  if(!chart){$('timeline-summary').textContent='Create a birth profile first.';$('timeline-area').innerHTML='';return}
  const input=$('timeline-date');
  if(!input.value)input.value=new Date().toISOString().slice(0,10);
  const target=new Date(input.value+'T12:00:00Z');
  const birth=new Date(chart.meta.utc);
  const d=vimshottari(birth,chart.vedic.planets.Moon.longitude,target).active;
  const hits=transitHitsOn(target);
  $('timeline-summary').innerHTML=`<b>${esc(input.value)}</b><br>Vimshottari: ${d?`${d.mahadasha}–${d.antardasha}${d.pratyantar?'–'+d.pratyantar:''}`:'not resolved'}<br><span class="hint">Selected-date research view. Western transit hits are exact-day snapshots; Vedic gochar/progressions/returns are not yet included.</span>`;
  $('timeline-area').innerHTML=`<div class="section"><span class="eyebrow">DATE VIEW</span><h2>What is active around this date</h2>${hits.length?'<div class="grid2">'+hits.map(h=>`<div class="card"><b>${TOPICS[h.topic]?.[1]||'Life'} · ${h.mover} ${h.aspect} natal ${h.target}</b><p>${esc(forecastMeaning(h))}</p><p class="muted">Orb ${h.orb.toFixed(2)}°</p></div>`).join('')+'</div>':'<div class="notice">No major exact-day transit hit found within 3° under the current settings.</div>'}</div>`;
}
function planetTable(g){return `<table class="table"><thead><tr><th>Body</th><th>Position</th><th>House</th><th>Motion</th></tr></thead><tbody>${Object.entries(g.planets).map(([k,v])=>`<tr><td>${k}</td><td>${v.sign} ${v.degree_in_sign.toFixed(2)}°</td><td>${v.house||'—'}</td><td>${v.retrograde?'R':'D'}</td></tr>`).join('')}</tbody></table>`}
function shiftedProfile(p,deltaMin){
  if(!p||p.timeunknown||!p.birthtime)return null;
  const [y,m,d]=p.birthdate.split('-').map(Number),[hh,mm]=p.birthtime.split(':').map(Number);
  const x=new Date(Date.UTC(y,m-1,d,hh,mm+deltaMin));
  const pad=n=>String(n).padStart(2,'0');
  return {...p,birthdate:x.getUTCFullYear()+'-'+pad(x.getUTCMonth()+1)+'-'+pad(x.getUTCDate()),birthtime:pad(x.getUTCHours())+':'+pad(x.getUTCMinutes())};
}
function birthTimeSensitivity(p){
  if(!p||p.timeunknown||!p.birthtime)return {available:false,reason:'Birth time is unknown; Ascendant, house and divisional-Ascendant conclusions should not be treated as resolved.'};
  const declared={recorded:2,approx5:5,approx15:15,approx30:30,unknown:30}[p.time_precision||'recorded']||2;
  const deltas=[-30,-15,-10,-5,-2,0,2,5,10,15,30],rows=[];
  for(const delta of deltas){
    const sp=shiftedProfile(p,delta),ch=calculateChart(sp,{skipDynamic:true});
    rows.push({delta,asc:ch.vedic.ascendant?.sign||'—',ascDeg:ch.vedic.ascendant?.degree_in_sign??null,d9:ch.vedic.divisional.D9.Ascendant||'—',d10:ch.vedic.divisional.D10.Ascendant||'—',sunHouse:ch.vedic.planets.Sun.house||null,moonHouse:ch.vedic.planets.Moon.house||null,saturnHouse:ch.vedic.planets.Saturn.house||null});
  }
  const inRange=rows.filter(r=>Math.abs(r.delta)<=declared),same=k=>new Set(inRange.map(r=>r[k])).size===1;
  return {available:true,declared,rows,stable:{asc:same('asc'),d9:same('d9'),d10:same('d10'),sunHouse:same('sunHouse'),moonHouse:same('moonHouse'),saturnHouse:same('saturnHouse')}};
}
function renderTimeSensitivity(){
  const box=$('time-sensitivity');if(!box)return;
  if(!chart||!state.profile){box.innerHTML='Calculate a profile to inspect birth-time sensitivity.';return}
  const s=birthTimeSensitivity(state.profile);
  if(!s.available){box.innerHTML='<b>Birth-time sensitivity:</b> '+esc(s.reason);return}
  const mark=x=>x?'Stable':'Changes';
  box.innerHTML=`<b>Birth-time sensitivity within ±${s.declared} min</b><p>Vedic Ascendant: <b>${mark(s.stable.asc)}</b> · D9 Ascendant: <b>${mark(s.stable.d9)}</b> · D10 Ascendant: <b>${mark(s.stable.d10)}</b> · Sun/Moon/Saturn houses: <b>${mark(s.stable.sunHouse&&s.stable.moonHouse&&s.stable.saturnHouse)}</b></p><details><summary>Inspect ±30-minute matrix</summary><div class="table-wrap"><table><thead><tr><th>Offset</th><th>Asc</th><th>D9 Asc</th><th>D10 Asc</th><th>Sun H</th><th>Moon H</th><th>Saturn H</th></tr></thead><tbody>${s.rows.map(r=>`<tr><td>${r.delta>0?'+':''}${r.delta}m</td><td>${r.asc}</td><td>${r.d9}</td><td>${r.d10}</td><td>${r.sunHouse||'—'}</td><td>${r.moonHouse||'—'}</td><td>${r.saturnHouse||'—'}</td></tr>`).join('')}</tbody></table></div></details><span class="hint">This is a sensitivity test, not birth-time rectification. It shows which outputs survive the declared uncertainty.</span>`;
}
function renderCharts(){
  if(!chart){$('charts-area').textContent='Create a birth profile first.';return}
  const self=engineSelfTest();
  const v=chart.vedic,cond=Object.entries(v.conditions).map(([n,x])=>`<tr><td>${n}</td><td>${x.retrograde?'Retrograde':'Direct'}</td><td>${x.solar_separation.toFixed(2)}°</td><td>${x.combust?'Combust':'Not combust'} (≤${x.combustion_threshold}°)</td></tr>`).join('');
  const yoga=v.yogas.map(y=>`<div class="record"><b>${esc(y.name)}</b><p>${esc(y.evidence)}</p><span class="hint">${esc(y.status)} · Rule ${esc(y.rule_id)} · ${esc(y.convention)}</span></div>`).join('')||'<p class="muted">No structural matches from the small audited yoga set.</p>';
  const go=v.gochar.rows.map(x=>`<tr><td>${x.planet}</td><td>${x.sign}</td><td>${x.house_from_moon}</td><td>${x.baseline_favorable?(x.vedha_blocked_by?.length?'Baseline favorable, Vedha by '+x.vedha_blocked_by.join(', '):'Favorable after implemented Vedha check'):'Not in baseline favorable set'}</td></tr>`).join('');
  const d9=Object.entries(v.divisional.D9).filter(([k])=>k!=='Ascendant').map(([k,s])=>k+' '+s).join(' · ');
  const d10=Object.entries(v.divisional.D10).filter(([k])=>k!=='Ascendant').map(([k,s])=>k+' '+s).join(' · ');
  $('charts-area').className='';
  $('charts-area').innerHTML=`<div class="notice"><b>Engine self-test:</b> ${self.ok?'PASS':'FAIL'} · ${self.passed}/${self.total} deterministic checks${self.ok?'':' · '+self.checks.filter(x=>!x.ok).map(x=>x.name).join(', ')}</div><div class="wheel-wrap"><div class="wheel-card"><span class="eyebrow">WESTERN · TROPICAL</span>${wheel(chart.western,'Western')}</div><div class="wheel-card"><span class="eyebrow">VEDIC · SIDEREAL APPROX</span>${wheel(chart.vedic,'Vedic')}</div></div>
  <div class="grid2" style="margin-top:14px"><div class="card"><h3>Western positions</h3>${planetTable(chart.western)}<p class="hint">Ascendant: ${chart.western.ascendant?chart.western.ascendant.sign+' '+chart.western.ascendant.degree_in_sign.toFixed(2)+'°':'unknown'}</p></div><div class="card"><h3>Vedic positions + mean nodes</h3>${planetTable(chart.vedic)}<p class="hint">Moon nakshatra: ${v.moon_nakshatra}, pada ${v.moon_pada}. Rahu/Ketu convention: mean lunar node / exact opposite.</p></div></div>
  <div class="grid2" style="margin-top:14px"><div class="card"><h3>Planet condition facts</h3><div class="table-wrap"><table><thead><tr><th>Planet</th><th>Motion</th><th>Sun separation</th><th>Combustion</th></tr></thead><tbody>${cond}</tbody></table></div><p class="hint">Combustion thresholds are an explicit working convention and remain source-versioned; they are not a universal astronomical property.</p></div><div class="card"><h3>Parāśari full graha drishti</h3><p>${v.drishti.slice(0,18).map(x=>`${x.from}→${x.to} (${x.count}th)`).join(' · ')||'—'}</p><p class="hint">Default: all classical grahas 7th; Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10. Node drishti is deliberately not asserted.</p></div></div>
  <div class="grid2" style="margin-top:14px"><div class="card"><h3>Audited yoga candidates</h3>${yoga}</div><div class="card"><h3>Current Vedic gochar baseline</h3><div class="table-wrap"><table><thead><tr><th>Planet</th><th>Sidereal sign</th><th>From natal Moon</th><th>Phaladeepika baseline</th></tr></thead><tbody>${go}</tbody></table></div><p><b>Sade Sati:</b> ${v.gochar.sade_sati||'Not in the 12th/1st/2nd Saturn-from-Moon zone.'}</p><p class="hint">${esc(v.gochar.convention)}. Jupiter/Saturn Vedha is now checked when the source mapping is explicit; Rahu/Ketu remain baseline-only. Ashtakavarga is not yet applied.</p></div></div>
  <div class="grid2" style="margin-top:14px"><div class="card"><h3>D9 · Navamsa evidence</h3><p><b>Ascendant:</b> ${v.divisional.D9.Ascendant||'—'}</p><p class="muted">${esc(d9)}</p></div><div class="card"><h3>D10 · Dasamsa evidence</h3><p><b>Ascendant:</b> ${v.divisional.D10.Ascendant||'—'}</p><p class="muted">${esc(d10)}</p></div></div>`;
}
function houseSign(group,h){if(!group.ascendant)return null;return Z[mod(group.ascendant.sign_index+h-1,12)]}
function vedicDignity(planet,pos){if(!pos)return 'unknown';if(VEDIC_EXALT[planet]===pos.sign)return 'exalted';if(VEDIC_DEBIL[planet]===pos.sign)return 'debilitated';if(VEDIC_LORD[pos.sign]===planet)return 'own sign';return 'ordinary sign'}
function vedicHouseLord(h){if(!chart?.vedic?.ascendant)return null;const sign=houseSign(chart.vedic,h),lord=VEDIC_LORD[sign],pos=chart.vedic.planets[lord];return {house:h,sign,lord,lord_house:pos?.house||null,lord_sign:pos?.sign||null,dignity:vedicDignity(lord,pos)}}
function vedicAreaFacts(topic){if(!chart?.vedic?.ascendant)return {available:false,reason:'Exact birth time is required for house-lord synthesis.'};const houses=AREA_HOUSES[topic]||AREA_HOUSES.overview;const facts=houses.map(h=>{const x=vedicHouseLord(h);const occupants=Object.entries(chart.vedic.planets).filter(([,p])=>p.house===h).map(([n])=>n);return {...x,occupants}});const active=chart.vedic.dasha.active,activated=[];if(active){for(const role of ['mahadasha','antardasha','pratyantar']){const planet=active[role];if(!chart.vedic.planets[planet])continue;const owns=Array.from({length:12},(_,i)=>i+1).filter(h=>vedicHouseLord(h)?.lord===planet);const occupies=chart.vedic.planets[planet].house||null;const touches=houses.filter(h=>owns.includes(h)||occupies===h);if(touches.length)activated.push({role,planet,houses:touches,owns,occupies,dignity:vedicDignity(planet,chart.vedic.planets[planet])})}}return {available:true,houses,facts,activated}}
function vedicAreaNarrative(topic){const a=vedicAreaFacts(topic);if(!a.available)return [a.reason];const out=[],primary=a.facts[0];out.push(`Primary house ${primary.house} (${HOUSE_MEANING[primary.house]}) is ${primary.sign}, ruled by ${primary.lord}. ${primary.lord} is in house ${primary.lord_house||'—'} in ${primary.lord_sign||'—'} and is ${primary.dignity}.`);if(primary.occupants.length)out.push(`Planets occupying the primary house: ${primary.occupants.join(', ')}.`);const secondary=a.facts.slice(1).map(x=>`H${x.house}→${x.lord} in H${x.lord_house||'—'} (${x.dignity})`).join(' · ');if(secondary)out.push('Supporting house lords: '+secondary+'.');const pc=chart.vedic.conditions[primary.lord];if(pc)out.push(`${primary.lord} condition: ${pc.retrograde?'retrograde':'direct'}, ${pc.combust?'combust':'not combust'} under the selected combustion convention.`);const aspects=chart.vedic.drishti.filter(x=>x.to===primary.lord||chart.vedic.planets[x.to]?.house===primary.house).slice(0,5);if(aspects.length)out.push('Relevant Parāśari drishti: '+aspects.map(x=>`${x.from}→${x.to} (${x.count}th)`).join('; ')+'.');if(a.activated.length)out.push('Current Vimshottari activation: '+a.activated.map(x=>`${x.role==='mahadasha'?'Mahadasha':(x.role==='antardasha'?'Antardasha':'Pratyantar')} lord ${x.planet} connects to relevant house(s) ${x.houses.join(', ')}`).join('; ')+'.');else out.push('The current Mahadasha/Antardasha/Pratyantar lords do not directly own or occupy the selected primary houses under this simplified activation test.');const d9=chart.vedic.divisional.D9[primary.lord],d10=chart.vedic.divisional.D10[primary.lord];out.push(`Divisional evidence for ${primary.lord}: D9 ${d9||'—'} · D10 ${d10||'—'}. These are confirmation layers, not standalone event predictions.`);return out}

function practiceLayer(topic){
  const practical={
    overview:['Choose one concrete action for the strongest current life theme; do not try to act on every astrological signal.','Keep a dated journal so later Reality Check review compares the forecast with what actually happened.'],
    career:['Translate timing themes into controllable actions: clarify priorities, document commitments and build one durable skill.','Do not resign, hire, fire or make another consequential work decision solely because of an astrological reading.'],
    money:['Review cash flow, obligations and downside before acting; use the forecast only as a reflection prompt.','Do not buy, sell, borrow, lend or invest solely because AstroProof labels a period supportive or difficult.'],
    relationships:['Use the reading to identify a conversation worth having, not to infer another person’s motives.','Do not make commitment, separation or compatibility decisions solely from astrology.'],
    family:['Convert the theme into a practical check-in: responsibilities, schedules, support and unresolved conversations.'],
    wellbeing:['Use timing language only for reflection on routines such as sleep, movement and stress management. Seek qualified medical care for symptoms or health decisions.'],
    learning:['Pick one study target and one measurable output for the current period rather than treating “learning” as a vague prediction.'],
    travel:['Treat timing as a planning prompt: verify documents, budget, buffers and logistics independently of astrology.']
  };
  const md=chart?.vedic?.dasha?.active?.mahadasha;
  const devotional=md?`Optional traditional practice: if it fits your beliefs, BPHS chapter 84 describes graha worship, mantra recitation and charity for the relevant graha; the current Mahadasha lord is ${md}. AstroProof does not claim this practice scientifically changes predicted events.`:'Optional traditional practice: BPHS chapter 84 describes graha worship, mantra recitation and charity. AstroProof treats these as devotional traditions, not proven causal remedies.';
  return [...(practical[topic]||practical.overview),devotional,'Avoid expensive gemstones, paid rituals or fear-based remedies on the strength of this research prototype alone.'];
}
function reportFor(topic,depth,horizon){const label=TOPICS[topic][1],houseMap={overview:[1],career:[6,10],relationships:[5,7],money:[2,8,11],family:[4],wellbeing:[1,6],learning:[3,9],travel:[3,9,12]},hs=houseMap[topic],w=houseSign(chart.western,hs.at(-1)),v=houseSign(chart.vedic,hs.at(-1));const numThemes=NUM_THEMES[chart.numerology.life_path]||[];const synthesis=vedicAreaNarrative(topic);let sections=[{name:'Vedic synthesis',items:synthesis},{name:'Advice & practices',items:practiceLayer(topic)},{name:'Western',items:[`Sun ${chart.western.planets.Sun.sign} ${chart.western.planets.Sun.degree_in_sign.toFixed(2)}°`,`Moon ${chart.western.planets.Moon.sign} ${chart.western.planets.Moon.degree_in_sign.toFixed(2)}°`,w?`House ${hs.at(-1)} begins in ${w}; traditional themes: ${THEMES[w].join(', ')}.`:'Houses omitted because birth time is unknown.']},{name:'Vedic',items:[`Sidereal Sun ${chart.vedic.planets.Sun.sign} ${chart.vedic.planets.Sun.degree_in_sign.toFixed(2)}°`,`Moon in ${chart.vedic.moon_nakshatra}, pada ${chart.vedic.moon_pada}`,v?`Whole-sign house ${hs.at(-1)} corresponds to ${v}; traditional themes: ${THEMES[v].join(', ')}.`:'Houses omitted because birth time is unknown.',chart.vedic.dasha.active?`Current Vimshottari metadata: ${chart.vedic.dasha.active.mahadasha}–${chart.vedic.dasha.active.antardasha} (${chart.vedic.dasha.active.start} to ${chart.vedic.dasha.active.end}).`:'Current dasha not resolved in this browser build.']},{name:'Numerology',items:[`Life Path ${chart.numerology.life_path}; Birthday ${chart.numerology.birthday}; Personal Year ${chart.numerology.personal_year}.`,`Traditional Life Path themes: ${numThemes.join(', ')||'no controlled mapping'}.`,chart.numerology.expression?`Expression ${chart.numerology.expression}; Soul Urge ${chart.numerology.soul_urge}; Personality ${chart.numerology.personality}.`:'Name numbers skipped.']},{name:'Chinese',items:[`Year: ${chart.chinese.year.stem} ${chart.chinese.year.branch} (${chart.chinese.year.animal}).`,`Day Master: ${chart.chinese.day.polarity} ${chart.chinese.day.element} (${chart.chinese.day.stem}).`,chart.chinese.hour?`Hour pillar: ${chart.chinese.hour.stem} ${chart.chinese.hour.branch}.`:'Hour pillar omitted because birth time is unknown.',chart.chinese.method]}];if(depth==='brief')sections=sections.map(s=>({...s,items:s.items.slice(0,2)}));const timing=horizon==='life'?null:transits(horizon);return {label,topic,depth,horizon,sections,timing,limitations:['Traditional interpretations are not validated event predictions.','Different schools use different conventions; this hosted Vedic sidereal conversion is approximate.']}}
function transits(h){const now=new Date(),end=new Date(now.getTime()+(h==='90d'?90:h==='12m'?365:0)*86400000);const snap=d=>{const p=planetary(d);return {date:d.toISOString().slice(0,10),Sun:p.Sun.sign,Jupiter:p.Jupiter.sign,Saturn:p.Saturn.sign}};return h==='now'?[snap(now)]:[snap(now),snap(end)]}
function renderReport(){if(!chart){$('report-area').className='notice';$('report-area').textContent='Create a birth profile to generate a report.';return}report=reportFor($('topic').value,$('depth').value,$('horizon').value);$('report-area').className='';$('report-area').innerHTML=`<div class="notice"><b>${report.label}</b> · ${report.depth} · ${report.horizon}<br>Calculated facts are separated from traditional interpretation.</div>${report.sections.map(s=>`<div class="report-section"><h3>${s.name}</h3><ul>${s.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}${report.timing?`<div class="report-section"><h3>Timing context</h3><pre style="white-space:pre-wrap;color:#cfd4ec">${esc(JSON.stringify(report.timing,null,2))}</pre></div>`:''}<div class="notice"><b>Limitations</b><br>${report.limitations.map(esc).join('<br>')}</div>`}
function councilData(topic){const hs={overview:1,career:10,relationships:7,money:2,family:4,wellbeing:6,learning:9,travel:9}[topic],w=houseSign(chart.western,hs),v=houseSign(chart.vedic,hs),sets=[w?THEMES[w]:[],v?THEMES[v]:[],NUM_THEMES[chart.numerology.life_path]||[],[{Wood:'growth',Fire:'expression',Earth:'stability',Metal:'precision',Water:'adaptability'}[chart.chinese.day.element]]];const count={};for(const arr of sets)for(const x of new Set(arr))count[x]=(count[x]||0)+1;return Object.entries(count).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1])}
function renderCouncil(){if(!chart){$('council-area').textContent='Create a birth profile first.';return}const shared=councilData($('topic').value);$('council-area').innerHTML=`<b>Four-system structured review</b><br>Western Sun: ${chart.western.planets.Sun.sign}; Vedic Sun: ${chart.vedic.planets.Sun.sign}; Life Path: ${chart.numerology.life_path}; BaZi Day Master: ${chart.chinese.day.polarity} ${chart.chinese.day.element}.<br><br><b>Shared traditional themes:</b> ${shared.length?shared.map(x=>`${x[0]} (${x[1]} systems)`).join(', '):'No controlled theme appears in at least two systems.'}<br><br><span class="warning">Agreement is not converted into a probability of real-world events.</span>`;const qs=['Where do the four traditions agree and disagree?','What are the strongest career indicators in this chart?','What changes if my birth time is wrong?','What is calculated fact versus interpretation?','What does my current dasha mean traditionally?','What can this system not reliably predict?'];$('question-chips').innerHTML=qs.map(q=>`<button class="chip" data-question="${esc(q)}">${esc(q)}</button>`).join('')}
function answer(q){const x=q.toLowerCase();if(/will i|when will|guarantee|probability|predict|lottery|stock|die|disease/.test(x))return 'AstroProof cannot establish that real-world outcome or give a reliable probability. It can show calculated chart factors and traditional timing frameworks while keeping the decision or outcome separate.';if(/career|work|job|promotion/.test(x)){const w=houseSign(chart.western,10),v=houseSign(chart.vedic,10);return `Career view: Western 10th house ${w||'unknown'}; Vedic 10th house ${v||'unknown'}; D10 Ascendant ${chart.vedic.divisional.D10.Ascendant||'unknown'}; current Vimshottari ${chart.vedic.dasha.active?chart.vedic.dasha.active.mahadasha+'–'+chart.vedic.dasha.active.antardasha:'unresolved'}. These are traditional indicators, not proof of a promotion or job change.`}if(/dasha|period/.test(x))return chart.vedic.dasha.active?`Current Vimshottari metadata: ${chart.vedic.dasha.active.mahadasha} Mahadasha / ${chart.vedic.dasha.active.antardasha} Antardasha, ${chart.vedic.dasha.active.start} to ${chart.vedic.dasha.active.end}. Traditional timing metadata only.`:'Current dasha could not be resolved in this browser build.';if(/agree|disagree|council|difference/.test(x))return $('council-area').innerText;return `Relevant calculated anchors: Western Sun ${chart.western.planets.Sun.sign}, Moon ${chart.western.planets.Moon.sign}; Vedic Moon ${chart.vedic.moon_nakshatra}; Life Path ${chart.numerology.life_path}; Chinese Day Master ${chart.chinese.day.polarity} ${chart.chinese.day.element}. Use the Reports section to inspect the topic in more detail.`}
function renderLifeEvents(){
  if(!Array.isArray(state.lifeEvents))state.lifeEvents=[];
  const rect=state.lifeEvents.filter(e=>e.purpose==='rectification').length,hold=state.lifeEvents.filter(e=>e.purpose==='validation_holdout').length;
  $('life-event-summary').textContent=`${state.lifeEvents.length} events · ${hold} validation holdout · ${rect} rectification/calibration`;
  $('life-events').innerHTML=state.lifeEvents.slice().sort((a,b)=>b.event_date.localeCompare(a.event_date)).map(e=>`<div class="record" data-event-id="${esc(e.id)}"><b>${esc(e.event_type.replaceAll('_',' '))}</b><p class="muted">${esc(e.event_date)} · ${esc(e.date_precision)} · ${e.purpose==='validation_holdout'?'🔒 Validation holdout':'⚙ Rectification/calibration'}</p>${e.note?`<p>${esc(e.note)}</p>`:''}<button class="ghost delete-life-event">Delete</button></div>`).join('')||'<p class="muted">No life events recorded.</p>';
}
function renderLedger(){let reviewed=0;for(const r of state.records)if(r.events?.length)reviewed++;$('ledger-summary').textContent=`${state.records.length} statements · ${reviewed} reviewed`;$('records').innerHTML=state.records.slice().reverse().map(r=>`<div class="record" data-id="${r.id}"><b>${esc(r.statement)}</b><p class="muted">Criteria: ${esc(r.criteria)} · Deadline ${esc(r.deadline)}</p>${(r.events||[]).map(e=>`<div class="hint">${esc(e.at.slice(0,10))} · ${esc(e.result)} · ${esc(e.note)}</div>`).join('')}<div class="actions"><select class="outcome"><option value="unclear">Unclear</option><option value="yes">Yes</option><option value="no">No</option></select><button class="ghost review">Append review</button></div></div>`).join('')||'<p class="muted">No statements yet.</p>'}
function exportFile(name,data,type='application/json'){const b=new Blob([data],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function populate(){const p=$('preset');p.innerHTML='<option value="">Custom coordinates / timezone</option>'+Object.keys(PLACES).map(x=>`<option>${x}</option>`).join('');for(const [k,[,n]] of Object.entries(TOPICS))$('topic').insertAdjacentHTML('beforeend',`<option value="${k}">${n}</option>`);$('life-grid').innerHTML=Object.entries(TOPICS).map(([k,[s,n]])=>`<div class="life" data-topic="${k}"><div class="symbol">${s}</div><b>${n}</b><span>Open report →</span></div>`).join('')}
function fillProfile(){const p=state.profile;if(!p)return;$('nickname').value=p.nickname||'';$('birth-name').value=p.birth_name||'';$('birthdate').value=p.birthdate;$('birthtime').value=p.birthtime||'';$('timeunknown').checked=!!p.timeunknown;$('birthtime').disabled=!!p.timeunknown;$('preset').value=p.preset||'';$('custom-fields').hidden=!!p.preset;$('latitude').value=p.latitude;$('longitude').value=p.longitude;$('timezone').value=p.timezone;$('bazi-gender').value=p.bazi_gender||'';$('time-precision').value=p.time_precision||(p.timeunknown?'unknown':'recorded');$('consent').checked=true;renderTimeSensitivity()}
function formProfile(){const preset=$('preset').value;let lat=Number($('latitude').value),lon=Number($('longitude').value),tz=$('timezone').value.trim(),place='Custom place';if(preset){[lat,lon,tz]=PLACES[preset];place=preset}return {nickname:$('nickname').value.trim(),birth_name:$('birth-name').value.trim(),birthdate:$('birthdate').value,birthtime:$('birthtime').value,timeunknown:$('timeunknown').checked,time_precision:$('timeunknown').checked?'unknown':$('time-precision').value,preset,place,latitude:lat,longitude:lon,timezone:tz,bazi_gender:$('bazi-gender').value}}
function listeners(){document.addEventListener('click',e=>{const r=e.target.closest('[data-page]');if(r)return page(r.dataset.page);const sc=e.target.closest('[data-scroll-target]');if(sc){document.getElementById(sc.dataset.scrollTarget)?.scrollIntoView({behavior:'smooth',block:'start'});return}const nr=e.target.closest('[data-now-range]');if(nr){nowRange=nr.dataset.nowRange;renderOverview();return}const to=e.target.closest('[data-timeline-offset]');if(to){const d=new Date();d.setDate(d.getDate()+Number(to.dataset.timelineOffset));$('timeline-date').value=d.toISOString().slice(0,10);renderTimeline();return}const t=e.target.closest('[data-topic]');if(t){$('topic').value=t.dataset.topic;page('reports');return}const q=e.target.closest('[data-question]');if(q){$('question').value=q.dataset.question;page('council')}});$('preset').onchange=()=>{$('custom-fields').hidden=!!$('preset').value};$('timeunknown').onchange=()=>{const u=$('timeunknown').checked;$('birthtime').disabled=u;if(u)$('time-precision').value='unknown';else if($('time-precision').value==='unknown')$('time-precision').value='recorded'};$('birth-form').onsubmit=e=>{e.preventDefault();if(!$('consent').checked)return toast('Consent is required.');const p=formProfile();if(!p.birthdate)return toast('Birth date is required.');if(!p.timeunknown&&!p.birthtime)return toast('Enter birth time or mark it unknown.');if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||!p.timezone)return toast('Birthplace coordinates and timezone are required.');try{chart=calculateChart(p);state.profile=p;save();renderOverview();renderCharts();renderTimeSensitivity();renderReport();renderTimeline();renderCouncil();renderLifeEvents();page('overview');toast('Personal atlas calculated in your browser.')}catch(err){toast('Calculation error: '+err.message)}};['topic','depth','horizon'].forEach(id=>$(id).onchange=()=>{renderReport();renderCouncil()});$('timeline-date').onchange=renderTimeline;$('life-event-form').onsubmit=e=>{e.preventDefault();const event_type=$('life-event-type').value,event_date=$('life-event-date').value,date_precision=$('life-event-precision').value,purpose=$('life-event-purpose').value,note=$('life-event-note').value.trim();if(!event_date)return toast('Event date is required.');state.lifeEvents.push({id:'le-'+Date.now(),event_type,event_date,date_precision,purpose,note:note.slice(0,300),created_at:new Date().toISOString()});save();e.target.reset();renderLifeEvents();toast(purpose==='validation_holdout'?'Saved as validation holdout. Prediction code will not use it.':'Saved for rectification/calibration; it will not count as independent validation.');};
$('life-events').onclick=e=>{const b=e.target.closest('.delete-life-event');if(!b)return;const card=b.closest('[data-event-id]');state.lifeEvents=state.lifeEvents.filter(x=>x.id!==card.dataset.eventId);save();renderLifeEvents();};
$('ask').onclick=()=>{if(!chart)return toast('Create a profile first.');const q=$('question').value.trim();if(q.length<3)return toast('Type or choose a question.');$('answer-area').innerHTML=`<div class="notice"><b>Chart-based response</b><p>${esc(answer(q))}</p><span class="hint">Deterministic browser review; live AI astrologer agents are not connected yet.</span></div>`};$('export-chart').onclick=()=>chart?exportFile('astroproof-chart.json',JSON.stringify(chart,null,2)):toast('Create a chart first.');$('export-report').onclick=()=>report?exportFile('astroproof-report.txt',document.querySelector('#report-area').innerText,'text/plain'):toast('Generate a report first.');$('record-form').onsubmit=e=>{e.preventDefault();const s=$('statement').value.trim(),c=$('criteria').value.trim(),d=$('deadline').value;if(!s||!c||!d)return;state.records.push({id:String(Date.now()),statement:s,criteria:c,deadline:d,createdAt:new Date().toISOString(),events:[]});save();e.target.reset();renderLedger();toast('Statement frozen locally.')};$('records').onclick=e=>{const b=e.target.closest('.review');if(!b)return;const card=b.closest('[data-id]'),r=state.records.find(x=>x.id===card.dataset.id),res=card.querySelector('.outcome').value,note=prompt('What happened?');if(note===null)return;r.events.push({result:res,note:note.slice(0,500),at:new Date().toISOString()});save();renderLedger()};$('export-data').onclick=()=>exportFile('astroproof-backup.json',JSON.stringify(state,null,2));$('import-data').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j||!Array.isArray(j.records))throw Error('Invalid backup');state=j;if(!Array.isArray(state.lifeEvents))state.lifeEvents=[];save();fillProfile();chart=state.profile?calculateChart(state.profile):null;renderOverview();renderCharts();renderTimeSensitivity();renderReport();renderTimeline();renderLifeEvents();renderCouncil();renderLedger();toast('Backup imported.')}catch(err){toast('Import failed: '+err.message)}e.target.value=''};$('delete-data').onclick=()=>{if(prompt('Type DELETE to remove AstroProof data from this browser:')!=='DELETE')return;localStorage.removeItem(KEY);state={profile:null,records:[],lifeEvents:[]};chart=null;location.reload()}}
function init(){populate();listeners();load();fillProfile();renderLifeEvents();renderLedger();$('deadline').min=new Date(Date.now()+86400000).toISOString().slice(0,10);if(state.profile){try{chart=calculateChart(state.profile);renderOverview();renderCharts();renderTimeSensitivity();renderReport();renderTimeline();renderLifeEvents();renderCouncil()}catch(err){toast('Saved profile needs review: '+err.message)}}}
init();
})();