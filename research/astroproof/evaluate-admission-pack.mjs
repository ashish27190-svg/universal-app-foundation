#!/usr/bin/env node
// AstroProof admission-pack evaluator: read-only, deterministic, fail-closed.
// No private source data or birth charts are included in this program.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const FROZEN=['claim','pass_fail_criteria','life_area','window_start','window_end','peak_at',
  'rule_ids','source_ref','calibration_event_ids','assumptions','competing_interpretations','calculation_version'];
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const instant=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const overlap=(a,b,c,d)=>a<=d&&c<=b;
function criterion(c){
  if(c?.review?.criterion_assessment)return c.review;
  return c?.criterion_audit||null;
}
function reviewDecision(c){
  if(!c||!c.review)return false;
  const r=c.review,ev=criterion(c);
  if(!['match','miss','indeterminate'].includes(r.decision)||!nonempty(r.reviewer)||!nonempty(r.note)||
     !nonempty(r.evidence_ref)||!ev||!nonempty(ev.criterion_observation))return false;
  if(ev===c.criterion_audit&&(ev.original_decision!==r.decision||!nonempty(ev.reviewer)||
    !nonempty(ev.evidence_ref)||!nonempty(ev.note)))return false;
  return (r.decision==='match'&&ev.criterion_assessment==='yes')||
    (r.decision==='miss'&&ev.criterion_assessment==='no')||
    (r.decision==='indeterminate'&&ev.criterion_assessment==='unknown');
}
function assess(row,generatedAt){
  const reasons=[],add=x=>{if(!reasons.includes(x))reasons.push(x)};
  const p=row||{},c=p.case||null,e=c?.observed_event||null;
  // The hosted pre-fix engine returned the antipodal Ascendant; do not score its old forecasts.
  if(p.calculation_version==='astroproof-hosted-provisional-1.0')add('legacy_calculation_version_quarantined');
  const today=generatedAt.slice(0,10);
  if(p.status!=='frozen'||!instant(p.frozen_at))add('draft_or_invalid_freeze');
  if(!nonempty(p.claim)||!nonempty(p.pass_fail_criteria)||!nonempty(p.calculation_version)||
    !date(p.window_start)||!date(p.window_end)||p.window_start>p.window_end)add('invalid_frozen_claim');
  if(FROZEN.some(field=>!same(p[field],p.freeze_snapshot?.[field]))){
    // The website's export uses supporting_rule_ids while the frozen snapshot uses rule_ids.
    const restored={...p,rule_ids:p.supporting_rule_ids};
    const otherFields=FROZEN.filter(field=>field!=='rule_ids');
    if(!same(p.supporting_rule_ids,p.freeze_snapshot?.rule_ids)||
      otherFields.some(field=>!same(restored[field],restored.freeze_snapshot?.[field])))
      add('frozen_snapshot_mismatch');
  }
  if(!(p.supporting_rule_ids||[]).length)add('rule_ids_missing');
  if(!nonempty(p.source_ref))add('calculation_source_missing');
  if(instant(p.frozen_at)&&date(p.window_start)&&p.window_start<=p.frozen_at.slice(0,10))
    add('retrospective_not_prospective');
  if(!c){add('outcome_case_missing');return {admitted:false,reasons}};
  if(c.evaluation_mode!=='prospective')add('stored_mode_not_prospective');
  if(!reviewDecision(c))add('no_complete_criterion_specific_review');
  if(!nonempty(c.outcome_evidence_ref)||!instant(c.review?.reviewed_at))add('outcome_evidence_or_review_date_missing');
  if(c.outcome_kind==='event'){
    if(!e){add('observed_event_missing');return {admitted:false,reasons}};
    if(e.purpose!=='validation_holdout'||e.used_for_rectification===true||
      (p.calibration_event_ids||[]).includes(e.event_id))add('rectification_or_calibration_leakage');
    if(!nonempty(e.source_ref)||e.source_review?.decision!=='source_accepted'||
      !nonempty(e.source_review?.reviewer)||!nonempty(e.source_review?.source_ref)||
      !nonempty(e.source_review?.note))add('event_source_not_reviewed');
    if(!date(e.event_start)||!date(e.event_end)||e.event_start>e.event_end||
      !instant(e.recorded_at))add('invalid_event_dates');
    if(instant(p.frozen_at)&&instant(e.recorded_at)&&e.recorded_at<=p.frozen_at)
      add('event_was_known_before_freeze');
    if(instant(p.frozen_at)&&date(e.event_start)&&e.event_start<p.frozen_at.slice(0,10))
      add('event_occurred_before_freeze');
    if(p.life_area!=='any'&&p.life_area!=='overview'&&p.life_area!==e.life_area)
      add('life_area_mismatch');
    if(c.review?.decision==='match'&&!(date(p.window_start)&&date(p.window_end)&&
      date(e.event_start)&&date(e.event_end)&&overlap(p.window_start,p.window_end,e.event_start,e.event_end)))
      add('date_overlap_not_proven');
  }else if(c.outcome_kind==='no_event'){
    if(e)add('unexpected_event_for_no_event_case');
    if(!nonempty(c.follow_up_coverage))add('negative_coverage_missing');
    if(!date(p.window_end)||p.window_end>=today||
       !instant(c.review?.reviewed_at)||c.review.reviewed_at.slice(0,10)<=p.window_end)
       add('negative_window_not_completed_or_reviewed');
    if(c.review?.decision==='match')add('cannot_call_absence_a_match');
  }else add('unknown_outcome_kind');
  if(c.review?.decision==='miss'){
    const submittedAfter=instant(c.reported_at)&&date(p.window_end)&&c.reported_at.slice(0,10)>p.window_end;
    const appendedAfter=Array.isArray(c.evidence_addenda)&&c.evidence_addenda.some(a=>
      instant(a.recorded_at)&&date(p.window_end)&&a.recorded_at.slice(0,10)>p.window_end&&nonempty(a.follow_up_coverage));
    if(!nonempty(c.follow_up_coverage)||!(submittedAfter||appendedAfter))
      add('full_window_negative_followup_missing_or_premature');
    if(!date(p.window_end)||p.window_end>=today)add('miss_before_window_end');
  }
  if(c.review?.decision==='indeterminate')add('indeterminate_not_binary');
  return {admitted:reasons.length===0,reasons};
}
export function evaluateAdmissionPack(pack){
  if(!pack||pack.format!=='astroproof-evidence-admission-pack-v1'||!instant(pack.generated_at)||
    !Array.isArray(pack.records))throw new Error('Unsupported or malformed AstroProof admission pack.');
  const ids=new Set(),out=[],rules=new Map(),mismatch=[];
  for(const row of pack.records){
    if(!nonempty(row.prediction_id)||ids.has(row.prediction_id))
      throw new Error('Missing or duplicate prediction_id in admission export.');
    ids.add(row.prediction_id);
    const result=assess(row,pack.generated_at),decision=result.admitted?row.case.review.decision:null;
    if(!!row.admission?.admitted_binary_prospective!==result.admitted)
      mismatch.push({prediction_id:row.prediction_id,declared:!!row.admission?.admitted_binary_prospective,
        recomputed:result.admitted,reasons:result.reasons});
    for(const id of row.supporting_rule_ids||[]){
      if(!rules.has(id))rules.set(id,{rule_id:id,submitted:0,admitted:0,matches:0,misses:0});
      const r=rules.get(id);r.submitted++;
      if(result.admitted){r.admitted++;r[decision==='match'?'matches':'misses']++;}
    }
    out.push({prediction_id:row.prediction_id,admitted:result.admitted,
      decision,claimed_admission:!!row.admission?.admitted_binary_prospective,exclusion_reasons:result.reasons});
  }
  const admitted=out.filter(r=>r.admitted);
  const matches=admitted.filter(r=>r.decision==='match').length,misses=admitted.filter(r=>r.decision==='miss').length;
  const excludedByReason={};
  for(const r of out)for(const reason of r.exclusion_reasons)
    excludedByReason[reason]=(excludedByReason[reason]||0)+1;
  return {
    protocol:'astroproof-independent-admission-audit-v1',
    generated_at:new Date().toISOString(),
    source_pack_generated_at:pack.generated_at,
    summary:{
      predictions_in_inventory:out.length,admitted_binary_prospective:admitted.length,
      matches,misses,not_admitted:out.length-admitted.length,
      observed_hit_fraction_among_admitted:admitted.length?matches/admitted.length:null,
      admission_label_discrepancies:mismatch.length,excluded_by_reason:excludedByReason
    },
    rule_sample_counts:[...rules.values()].sort((a,b)=>a.rule_id.localeCompare(b.rule_id)),
    declared_vs_recomputed_discrepancies:mismatch,
    case_admission:out,
    limitations:[
      'Browser exports are operator-entered; this evaluator verifies consistency, not source authenticity.',
      'No independent blinded cohort, complete outcome surveillance or tamper-proof timestamp has been established.',
      'Observed admitted-case fraction is NOT calibrated prediction accuracy, chance-adjusted skill or scientific proof.',
      'No p-value, recall or shuffled-date baseline is computed from these selected cases.'
    ]
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const file=process.argv[2];
    if(!file)throw new Error('Usage: node evaluate-admission-pack.mjs <admission-pack.json> [--strict]');
    const result=evaluateAdmissionPack(JSON.parse(fs.readFileSync(file,'utf8')));
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(process.argv.includes('--strict')&&result.summary.admission_label_discrepancies>0)process.exitCode=1;
  }catch(e){console.error('ADMISSION ERROR:',e.message);process.exitCode=2;}
}
