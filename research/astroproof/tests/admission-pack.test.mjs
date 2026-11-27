import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAdmissionPack} from '../evaluate-admission-pack.mjs';

const deep=v=>JSON.parse(JSON.stringify(v));
function fixture(){
  const p={
    prediction_id:'fixture-pred-001',status:'frozen',
    frozen_at:'2026-11-19T09:00:00.000Z',
    claim:'A signed employment offer will be received',
    pass_fail_criteria:'An offer letter signed by employer received during window',
    life_area:'career',window_start:'2026-11-25',window_end:'2026-11-30',
    peak_at:'2026-11-27T10:00:00.000Z',
    rule_ids:['FICTIONAL-RULE'],supporting_rule_ids:['FICTIONAL-RULE'],
    calibration_event_ids:[],source_ref:'fictional-source',assumptions:'Synthetic only',
    competing_interpretations:'Other causes',calculation_version:'fixture-engine-v1'
  };
  const FIELDS=['claim','pass_fail_criteria','life_area','window_start','window_end','peak_at',
    'rule_ids','source_ref','calibration_event_ids','assumptions','competing_interpretations','calculation_version'];
  p.freeze_snapshot=Object.fromEntries(FIELDS.map(key=>[key,deep(p[key])]));
  const e={
    event_id:'fictional-event-1',event_type:'career_change',life_area:'career',
    event_start:'2026-11-27',event_end:'2026-11-27',date_precision:'exact',
    purpose:'validation_holdout',used_for_rectification:false,
    recorded_at:'2026-12-01T08:00:00.000Z',source_ref:'fictional-document',
    source_review:{decision:'source_accepted',reviewer:'Synthetic inspector',
      source_ref:'fictional-document',note:'This document was checked in the test fixture',
      reviewed_at:'2026-12-01T10:00:00.000Z'}
  };
  p.case={
    case_id:'fictional-case-1',evaluation_mode:'prospective',outcome_kind:'event',
    observed_event:e,observation:'An offer letter was received',outcome_evidence_ref:'fictional-document',
    reported_at:'2026-12-01T11:00:00.000Z',
    review:{decision:'match',criterion_assessment:'yes',
      criterion_observation:'Employer-signed offer letter received November 27',
      reviewer:'Test reviewer',evidence_ref:'fictional-document',
      note:'Meets original criterion',reviewed_at:'2026-12-02T09:00:00.000Z'}
  };
  p.admission={admitted_binary_prospective:true,reasons:[]};
  return {format:'astroproof-evidence-admission-pack-v1',generated_at:'2026-12-03T00:00:00.000Z',
    records:[p]};
}
test('admits one correctly documented prospective claim as descriptive outcome only',()=>{
  const r=evaluateAdmissionPack(fixture());
  assert.equal(r.summary.admitted_binary_prospective,1);
  assert.equal(r.summary.matches,1);
  assert.equal(r.summary.admission_label_discrepancies,0);
});
test('tampered frozen prediction becomes ineligible, with discrepancy flag',()=>{
  const p=fixture();p.records[0].claim='Modified after freeze';
  const r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_binary_prospective,0);
  assert.equal(r.summary.admission_label_discrepancies,1);
  assert.equal(r.summary.excluded_by_reason.frozen_snapshot_mismatch,1);
});
test('rectification event may not score as an independent holdout',()=>{
  const p=fixture();p.records[0].case.observed_event.purpose='rectification';
  p.records[0].case.observed_event.used_for_rectification=true;
  const r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_binary_prospective,0);
  assert.ok(r.case_admission[0].exclusion_reasons.includes('rectification_or_calibration_leakage'));
});
test('date overlap without original criterion YES is not a match',()=>{
  const p=fixture();p.records[0].case.review.criterion_assessment='unknown';
  const r=evaluateAdmissionPack(p);
  assert.equal(r.summary.matches,0);
  assert.ok(r.summary.excluded_by_reason.no_complete_criterion_specific_review);
});
test('backdated claim cannot be reclassified as prospective by an imported label',()=>{
  const p=fixture();const x=p.records[0];
  x.window_start='2025-01-01';x.window_end='2025-01-31';
  x.freeze_snapshot.window_start=x.window_start;x.freeze_snapshot.window_end=x.window_end;
  const r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_binary_prospective,0);
  assert.ok(r.summary.excluded_by_reason.retrospective_not_prospective);
});
test('a negative outcome requires completed window, review and coverage',()=>{
  const p=fixture(),x=p.records[0];
  x.case.outcome_kind='no_event';x.case.observed_event=null;x.case.follow_up_coverage='Independent synthetic dated checks through November 30';
  x.case.review.decision='miss';x.case.review.criterion_assessment='no';
  x.case.review.criterion_observation='No signed letter during the window';
  x.admission.admitted_binary_prospective=true;
  let r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_misses,undefined);
  assert.equal(r.summary.misses,1);
  x.case.follow_up_coverage='';
  r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_binary_prospective,0);
  assert.ok(r.summary.excluded_by_reason.negative_coverage_missing);
});
test('duplicate prediction IDs fail closed',()=>{
  const p=fixture();p.records.push(deep(p.records[0]));
  assert.throws(()=>evaluateAdmissionPack(p),/duplicate prediction_id/i);
});
test('unreviewed source fails even if event is in the correct window',()=>{
  const p=fixture();p.records[0].case.observed_event.source_review=null;
  const r=evaluateAdmissionPack(p);
  assert.equal(r.summary.matches,0);
  assert.ok(r.summary.excluded_by_reason.event_source_not_reviewed);
});


test('related in-window event is not a miss until full-window negative surveillance is recorded after deadline',()=>{
  const p=fixture(),x=p.records[0];
  x.case.review.decision='miss';
  x.case.review.criterion_assessment='no';
  x.case.review.criterion_observation='Only an interview occurred; the frozen signed-offer criterion failed';
  x.case.follow_up_coverage='';
  let r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_binary_prospective,0);
  assert.ok(r.summary.excluded_by_reason.full_window_negative_followup_missing_or_premature);
  x.case.follow_up_coverage='Reviewed fictional dated records through the full November window';
  x.case.evidence_addenda=[{
    recorded_at:'2026-12-01T11:00:00.000Z',source_ref:'fictional-no-offer-register',
    follow_up_coverage:'Complete dated review after November 30'
  }];
  r=evaluateAdmissionPack(p);
  assert.equal(r.summary.misses,1);
  assert.equal(r.summary.admitted_binary_prospective,1);
});

test('legacy calculation version is excluded even when criterion otherwise matches',()=>{
  const p=fixture(),row=p.records[0];
  row.calculation_version='astroproof-hosted-provisional-1.0';
  row.freeze_snapshot.calculation_version=row.calculation_version;
  row.admission={admitted_binary_prospective:false,reasons:['legacy_calculation_version_quarantined']};
  const r=evaluateAdmissionPack(p);
  assert.equal(r.summary.admitted_binary_prospective,0);
  assert.equal(r.summary.matches,0);
  assert.equal(r.summary.admission_label_discrepancies,0);
  assert.equal(r.summary.excluded_by_reason.legacy_calculation_version_quarantined,1);
});


// Prospective probability scoring, explicitly paired with a frozen baseline.
import {scoreProspectiveCohort} from '../score-prospective-cohort.mjs';
function cohortFixture(){
  const endpoint='A fictional employer-signed offer during the fixed period';
  const row=(id,subject,y,p,q)=>({
    id,subject_id:subject,frozen_at:'2026-11-22T12:00:00Z',
    window_start:'2026-12-01',window_end:'2026-12-31',
    forecast_version:'synthetic-engine-v1',freeze_receipt_ref:'fictional-receipt-'+id,
    model_probability:p,baseline_probability:q,baseline_provenance_ref:'fictional-frozen-baseline',
    endpoint_definition:endpoint,outcome:y,event_date:y?'2026-12-20':null,
    reviewed_at:'2027-01-02T10:00:00Z',outcome_evidence_ref:'fictional-observation',
    independent_review_ref:'fictional-review',full_window_observed:true,used_for_calibration:false
  });
  return {
    format:'astroproof-prospective-cohort-v1',cohort_id:'synthetic-cohort',
    protocol_frozen_at:'2026-11-20T12:00:00Z',
    cohort_registry_frozen_at:'2026-11-21T12:00:00Z',
    evaluated_at:'2027-01-03T12:00:00Z',
    cohort_registry_ref:'fictional-registered-cohort',
    registered_subject_ids:['fictional-A','fictional-B'],endpoint_definition:endpoint,
    baseline_method:'Synthetic fixed 0.5 reference',model_method:'Synthetic probabilities only',
    records:[row('r1','fictional-A',1,0.8,0.5),row('r2','fictional-B',0,0.2,0.5)]
  };
}
test('paired prospective scoring computes Brier skill and log loss without claims of certification',()=>{
  const r=scoreProspectiveCohort(cohortFixture());
  assert.equal(r.complete,true);assert.equal(r.registered_records,2);
  assert.ok(Math.abs(r.model_brier-0.04)<1e-12);
  assert.ok(Math.abs(r.baseline_brier-0.25)<1e-12);
  assert.ok(Math.abs(r.brier_skill-0.84)<1e-12);
  assert.ok(Math.abs(r.model_log_loss+Math.log(0.8))<1e-12);
  assert.equal(r.status,'descriptive_complete_cohort_not_certified');
});
test('missing registered participant is never dropped from denominator',()=>{
  const p=cohortFixture();p.records.pop();const r=scoreProspectiveCohort(p);
  assert.equal(r.complete,false);assert.equal(r.registered_records,2);
  assert.equal(r.eligible_records,1);assert.equal(r.excluded_records,1);
  assert.ok(r.exclusions.some(x=>x.reasons.includes('registered_record_missing')));
});
test('missing baseline, premature outcome, and calibration leakage fail closed',()=>{
  const p=cohortFixture();p.records[0].baseline_probability=null;
  p.records[1].reviewed_at='2026-12-20T12:00:00Z';p.records[1].used_for_calibration=true;
  const r=scoreProspectiveCohort(p);
  assert.equal(r.eligible_records,0);assert.equal(r.brier_skill,null);
  assert.ok(r.exclusions.some(x=>x.reasons.includes('calibration_leakage_or_unknown')));
});
test('duplicate participants or participants outside the frozen inventory are rejected',()=>{
  const p=cohortFixture();p.records[1].subject_id=p.records[0].subject_id;
  assert.throws(()=>scoreProspectiveCohort(p),/duplicate subject/);
  const q=cohortFixture();q.records[1].subject_id='not-registered';
  assert.throws(()=>scoreProspectiveCohort(q),/not in frozen registry/);
});
test('legacy engine and future observation cannot qualify',()=>{
  const p=cohortFixture();p.records[0].forecast_version='astroproof-hosted-provisional-1.0';
  p.records[1].reviewed_at='2027-01-04T12:00:00Z';
  assert.equal(scoreProspectiveCohort(p).eligible_records,0);
});
