// Paired prospective binary-event scoring. This is an audit tool, not an astrology model.
// No real person data belongs in repository fixtures.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const time=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(s)&&Number.isFinite(Date.parse(s));
const nonempty=s=>typeof s==='string'&&s.trim().length>0;
const prob=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const loss=(p,y)=>y===1?-Math.log(Math.max(p,1e-15)):-Math.log(Math.max(1-p,1e-15));
export function scoreProspectiveCohort(pack){
  if(pack?.format!=='astroproof-prospective-cohort-v1'||!time(pack.protocol_frozen_at)||!time(pack.evaluated_at)||!Array.isArray(pack.records)||!nonempty(pack.cohort_id)||!nonempty(pack.cohort_registry_ref)||!nonempty(pack.endpoint_definition)||!nonempty(pack.baseline_method)||!nonempty(pack.model_method)||!nonempty(pack.cohort_registry_frozen_at)||!time(pack.cohort_registry_frozen_at)||Date.parse(pack.protocol_frozen_at)>Date.parse(pack.cohort_registry_frozen_at)||Date.parse(pack.cohort_registry_frozen_at)>Date.parse(pack.evaluated_at))throw Error('Malformed pre-registered cohort');
  const ids=new Set(),participants=new Set(),eligible=[],excluded=[];
  for(const r of pack.records){
    if(!nonempty(r.id)||ids.has(r.id))throw Error('Missing or duplicate record id');
    ids.add(r.id);
    if(!nonempty(r.subject_id)||participants.has(r.subject_id))throw Error('One record per participant per cohort/endpoint; missing or duplicate subject');
    participants.add(r.subject_id);
    const why=[];
    if(!time(r.frozen_at)||!iso(r.window_start)||!iso(r.window_end)||r.window_start>r.window_end||r.window_start<=r.frozen_at?.slice(0,10)||Date.parse(r.frozen_at)<Date.parse(pack.cohort_registry_frozen_at)||Date.parse(r.frozen_at)>Date.parse(pack.evaluated_at))why.push('invalid_freeze_or_window');
    if(!nonempty(r.freeze_receipt_ref)||!nonempty(r.forecast_version)||r.forecast_version==='astroproof-hosted-provisional-1.0')why.push('missing_or_retired_forecast_provenance');
    if(!prob(r.model_probability)||!prob(r.baseline_probability)||!nonempty(r.baseline_provenance_ref))why.push('paired_probability_or_baseline_missing');
    if(r.endpoint_definition!==pack.endpoint_definition)why.push('endpoint_mismatch');
    if(!iso(r.window_end)||r.window_end>=pack.evaluated_at.slice(0,10))why.push('window_not_complete');
    if(![0,1].includes(r.outcome)||!time(r.reviewed_at)||r.reviewed_at?.slice(0,10)<=r.window_end||Date.parse(r.reviewed_at)>Date.parse(pack.evaluated_at)||!nonempty(r.outcome_evidence_ref)||!nonempty(r.independent_review_ref)||r.full_window_observed!==true)why.push('outcome_or_independent_review_incomplete');
    if(r.outcome===1&&(!iso(r.event_date)||r.event_date<r.window_start||r.event_date>r.window_end))why.push('event_date_outside_window');
    if(r.outcome===0&&r.event_date!=null)why.push('negative_event_date_conflict');
    if(r.used_for_calibration!==false)why.push('calibration_leakage_or_unknown');
    if(why.length)excluded.push({id:r.id,reasons:why});else eligible.push(r);
  }
  const n=eligible.length,missing=pack.records.length-n;
  const model=eligible.map(r=>(r.model_probability-r.outcome)**2),base=eligible.map(r=>(r.baseline_probability-r.outcome)**2);
  const modelBrier=avg(model),baselineBrier=avg(base);
  const complete=pack.records.length>0&&missing===0;
  return {protocol:'astroproof-paired-prospective-score-v1',cohort_id:pack.cohort_id,
    registered_records:pack.records.length,eligible_records:n,excluded_records:missing,complete,
    observed_event_rate:avg(eligible.map(r=>r.outcome)),
    model_brier:modelBrier,baseline_brier:baselineBrier,
    brier_skill:n&&baselineBrier>0?1-modelBrier/baselineBrier:null,
    model_log_loss:avg(eligible.map(r=>loss(r.model_probability,r.outcome))),
    baseline_log_loss:avg(eligible.map(r=>loss(r.baseline_probability,r.outcome))),
    exclusions:excluded,
    status:!complete?'incomplete_cohort_no_validation_claim':'descriptive_complete_cohort_not_certified',
    caveats:['Pointer presence is not authentication; independent reviewers must verify cohort completeness, timestamp receipts and evidence authenticity.','Selected eligible-record scores are descriptive only when cohort is incomplete.','No inferential significance, generalization, causal effect or certified predictive accuracy is claimed.','Baseline probabilities and model probabilities must both be frozen before observing outcomes.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{if(!process.argv[2])throw Error('Usage: node score-prospective-cohort.mjs cohort.json');console.log(JSON.stringify(scoreProspectiveCohort(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}catch(e){console.error(e.message);process.exitCode=2;}
}
