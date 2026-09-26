#!/usr/bin/env node
import fs from 'node:fs';

function usage(){
  console.error('Usage: node evaluate-predictions.mjs <predictions.json> <outcomes.json> [--permutations=500] [--seed=42]');
  process.exit(2);
}
const args=process.argv.slice(2);
if(args.length<2) usage();
const predPath=args[0], outPath=args[1];
const permutations=Number((args.find(x=>x.startsWith('--permutations='))||'--permutations=500').split('=')[1]);
let seed=Number((args.find(x=>x.startsWith('--seed='))||'--seed=42').split('=')[1]);

const predictions=JSON.parse(fs.readFileSync(predPath,'utf8'));
const outcomes=JSON.parse(fs.readFileSync(outPath,'utf8'));
if(!Array.isArray(predictions)||!Array.isArray(outcomes)) throw new Error('Both files must contain JSON arrays.');

const msDay=86400000;
const toMs=s=>{const t=Date.parse(s);if(!Number.isFinite(t)) throw new Error('Invalid date: '+s);return t;};
const durDays=p=>Math.max(1,(toMs(p.window_end)-toMs(p.window_start))/msDay+1);
function outcomeRange(o){const s=toMs(o.event_start||o.event_date),e=toMs(o.event_end||o.event_date);return [Math.min(s,e),Math.max(s,e)];}
function predRange(p){const s=toMs(p.window_start),e=toMs(p.window_end);return [Math.min(s,e),Math.max(s,e)];}
function overlap(a,b){return Math.max(a[0],b[0])<=Math.min(a[1],b[1]);}
function sameArea(p,o){return p.life_area===o.life_area||p.life_area==='any'||o.life_area==='any';}
function compatible(p,o){return p.person_id===o.person_id&&sameArea(p,o)&&overlap(predRange(p),outcomeRange(o));}
function harmonic(p,r){return p+r?2*p*r/(p+r):0;}

function score(preds,outs){
  const predHits=new Set(),outHits=new Set(),matches=[];
  preds.forEach((p,pi)=>outs.forEach((o,oi)=>{if(compatible(p,o)){predHits.add(pi);outHits.add(oi);matches.push({prediction_id:p.prediction_id,event_id:o.event_id,person_id:p.person_id,life_area:p.life_area});}}));
  const precision=preds.length?predHits.size/preds.length:0,recall=outs.length?outHits.size/outs.length:0;
  const byPerson=new Map();
  for(const p of preds){if(!byPerson.has(p.person_id))byPerson.set(p.person_id,[]);byPerson.get(p.person_id).push(p);}
  const hitAt={1:0,3:0,5:0},persons=[...byPerson.keys()];
  for(const id of persons){
    const ps=byPerson.get(id).slice().sort((a,b)=>(b.rank_score??0)-(a.rank_score??0)),os=outs.filter(o=>o.person_id===id);
    for(const k of [1,3,5])if(ps.slice(0,k).some(p=>os.some(o=>compatible(p,o))))hitAt[k]++;
  }
  const windows=preds.map(durDays);
  return {
    n_predictions:preds.length,n_outcomes:outs.length,matched_predictions:predHits.size,matched_outcomes:outHits.size,
    precision,recall,f1:harmonic(precision,recall),false_positive_rate:preds.length?(preds.length-predHits.size)/preds.length:0,
    mean_window_days:windows.length?windows.reduce((a,b)=>a+b,0)/windows.length:0,
    median_window_days:windows.length?windows.slice().sort((a,b)=>a-b)[Math.floor(windows.length/2)]:0,
    hit_at_1:persons.length?hitAt[1]/persons.length:0,hit_at_3:persons.length?hitAt[3]/persons.length:0,hit_at_5:persons.length?hitAt[5]/persons.length:0,
    matches
  };
}

function rng(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const allTimes=[...predictions.flatMap(p=>[toMs(p.window_start),toMs(p.window_end)]),...outcomes.flatMap(o=>outcomeRange(o))];
const minT=Math.min(...allTimes),maxT=Math.max(...allTimes);
const areas=[...new Set([...predictions.map(p=>p.life_area),...outcomes.map(o=>o.life_area)].filter(Boolean))];

function permutePredictions(){
  return predictions.map(p=>{
    const d=durDays(p)*msDay,maxStart=Math.max(minT,maxT-d),start=minT+rng()*Math.max(msDay,maxStart-minT);
    return {...p,life_area:areas[Math.floor(rng()*areas.length)]||p.life_area,window_start:new Date(start).toISOString(),window_end:new Date(start+d-msDay).toISOString()};
  });
}

const observed=score(predictions,outcomes),sims=[];
for(let i=0;i<permutations;i++)sims.push(score(permutePredictions(),outcomes));
const mean=k=>sims.length?sims.reduce((a,x)=>a+x[k],0)/sims.length:0;
const ge=k=>sims.length?sims.filter(x=>x[k]>=observed[k]).length/sims.length:null;

console.log(JSON.stringify({
  protocol:'AstroProof historical holdout evaluator v0.1',
  warning:'This measures dataset performance only. It does not establish causal or scientific validity and should be interpreted with data-quality and leakage checks.',
  observed,
  random_control:{permutations,mean_precision:mean('precision'),mean_recall:mean('recall'),mean_f1:mean('f1'),mean_hit_at_3:mean('hit_at_3'),empirical_p_ge_observed_f1:ge('f1'),empirical_p_ge_observed_hit_at_3:ge('hit_at_3')}
},null,2));
