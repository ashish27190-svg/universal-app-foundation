// AstroProof Validation Workspace — synthetic-only deployment smoke tests.
// Run with: node site/astroproof/tests/validation-workspace.test.mjs
// Never use real birth details or private life events in these fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../validation.js', import.meta.url), 'utf8');
new vm.Script(code, { filename: 'validation.js' });
const local = new Map();
let sequence = 0;
const report = [];
const check = (name, fn) => {
  fn();
  report.push(name);
};
function boot(at) {
  const root = { innerHTML: '', className: '', listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } };
  const document = { getElementById(id) { return id === 'apv-root' ? root : null; } };
  const localStorage = { getItem(key) { return local.get(key) || null; }, setItem(key, value) { local.set(key, value); } };
  const window = { AstroProofBridge: {
    getProfile() { return null; },
    getBirthSensitivity() { return { available: false, reason: 'Synthetic fixture: birth time unknown' }; },
    getChartSummary() { return null; },
    getForecastCandidates() { return []; },
    getLegacyEvents() { return []; }
  } };
  const FixedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [at])); }
    static now() { return new Date(at).getTime(); }
  };
  class FormData { constructor(form) { this.form = form; } entries() { return Object.entries(this.form.fields); } }
  const sandbox = {
    window, document, localStorage, crypto: { randomUUID() { return 'synthetic-' + String(++sequence).padStart(6, '0'); } },
    confirm() { return true; }, setTimeout() {}, FormData, Date: FixedDate,
    Blob: class {}, URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }
  };
  vm.runInNewContext(code, sandbox, { filename: 'validation.js' });
  const submit = (id, fields) => {
    const form = { id, fields, matches() { return true; } };
    root.listeners.submit({ target: form, preventDefault() {} });
  };
  const action = (kind, id = '') => {
    const button = { dataset: { apvAction: kind, id } };
    root.listeners.click({ target: { closest(selector) { return selector === '[data-apv-action]' ? button : null; } } });
  };
  const data = () => JSON.parse(local.get('astroproof.validation.v1') || 'null');
  const summary = () => window.AstroProofValidation.getSummary();
  return { submit, action, data, summary, root, window };
}

const first = boot('2026-11-18T10:00:00Z');
check('Empty store remains 0% progress', () => assert.equal(first.summary().progress_percent, 0));
check('Rectification leakage guard works', () => assert.equal(first.window.AstroProofValidation.testGuards().rectificationBlocked, true));
const rect = {
  event_type: 'career_change', life_area: 'career',
  event_start: '2024-06-17', event_end: '', date_precision: 'month',
  purpose: 'rectification', source_kind: 'document', source_ref: 'synthetic-document-1',
  confidence: 'tentative', note: 'Fictional role', assumptions: 'Approximate month',
  competing_interpretations: 'Other explanation'
};
first.submit('apv-new-event', rect);
check('Approximate month is expanded, not treated as exact', () => {
  const e = first.data().events[0];
  assert.equal(e.event_start, '2024-06-01');
  assert.equal(e.event_end, '2024-06-30');
  assert.equal(e.used_for_rectification, true);
});
const count = first.data().events.length;
first.submit('apv-new-event', { ...rect, event_start: '2027-01-01' });
check('Future events cannot masquerade as history', () => assert.equal(first.data().events.length, count));
first.submit('apv-new-prediction', {
  life_area: 'career', specificity_class: 'specific', claim: 'Synthetic signed offer',
  pass_fail_criteria: 'Signed offer dated inside the defined window',
  window_start: '2026-11-25', window_end: '2026-11-30', peak_at: '2026-11-27T10:00',
  calculation_version: 'synthetic-fixture-v1', source_ref: 'synthetic-rule-source',
  rule_ids: 'FICTIONAL-RULE-01', calibration_event_ids: first.data().events[0].event_id,
  confidence: 'tentative', assumptions: 'Fictional fixture', competing_interpretations: 'Coincidence'
});
const predId = first.data().predictions[0].prediction_id;
check('Draft is not an evaluated forecast', () => {
  assert.equal(first.data().predictions[0].status, 'draft');
  assert.equal(first.summary().prospective_matches, 0);
});
first.action('freeze', predId);
check('Freezing records an immutable normal-UI snapshot', () => {
  assert.ok(first.data().predictions[0].frozen_at);
  assert.ok(first.data().predictions[0].freeze_snapshot);
});
first.submit('apv-new-case', {
  prediction_id: predId, event_id: first.data().events[0].event_id,
  observation: 'Attempt to leak calibration', outcome_evidence_ref: 'synthetic-document-1'
});
check('Calibration event cannot be scored as holdout', () => assert.equal(first.data().cases.length, 0));
first.submit('apv-new-case', {
  prediction_id: predId, event_id: '',
  observation: 'No event yet', outcome_evidence_ref: 'synthetic-followup',
  follow_up_coverage: 'Full-window check intended'
});
const caseId = first.data().cases[0].case_id;
first.submit('apv-review-case', {
  case_id: caseId, decision: 'miss', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-followup', criterion_assessment: 'no',
  criterion_observation: 'Synthetic surveillance found no signed offer', review_note: 'Too early'
});
check('Miss cannot be confirmed before forecast deadline', () => assert.equal(first.data().cases[0].review, null));
const later = boot('2026-12-02T10:00:00Z');
later.submit('apv-add-case-evidence', {
  case_id: caseId, evidence_ref: 'synthetic-post-window-surveillance',
  follow_up_coverage: 'Synthetic full-window documented review completed on 2 Dec',
  note: 'Explicit check recorded after the frozen deadline'
});
check('Post-deadline evidence can be appended without altering original case submission',()=>{
  const c=later.data().cases.find(x=>x.case_id===caseId);
  assert.equal(c.evidence_addenda.length,1);
  assert.equal(c.outcome_kind,'no_event');
});

later.submit('apv-review-case', {
  case_id: caseId, decision: 'miss', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-followup', criterion_assessment: 'no',
  criterion_observation: 'No signed offer was documented through November 30', review_note: 'Complete dated surveillance recorded'
});
check('Documented closed-window miss is reviewable', () => {
  assert.equal(later.data().cases[0].review.decision, 'miss');
  assert.equal(later.summary().prospective_misses, 1);
});
later.submit('apv-new-case', {
  prediction_id: predId, event_id: '',
  observation: 'Duplicate case attempt', outcome_evidence_ref: 'synthetic-followup',
  follow_up_coverage: 'none'
});
check('Duplicate outcomes do not inflate scores', () => assert.equal(later.data().cases.length, 1));
later.submit('apv-new-event', {
  event_type: 'promotion', life_area: 'career', event_start: '2025-05-20',
  event_end: '', date_precision: 'exact', purpose: 'validation_holdout',
  source_kind: 'document', source_ref: 'synthetic-history',
  note: 'Fictional earlier promotion', confidence: 'tentative'
});
const historicalId = later.data().events.at(-1).event_id;
later.submit('apv-new-prediction', {
  life_area: 'career', claim: 'Synthetic past event hypothesis',
  pass_fail_criteria: 'Historical promotion', specificity_class: 'specific',
  window_start: '2025-05-01', window_end: '2025-06-01',
  calculation_version: 'synthetic-fixture-v1', source_ref: 'synthetic-rule-source',
  rule_ids: 'FICTIONAL-RULE-02', calibration_event_ids: '',
  assumptions: 'Retrospective only', competing_interpretations: 'Base rates'
});
const historicalPredictionId = later.data().predictions.at(-1).prediction_id;
later.action('freeze', historicalPredictionId);
later.submit('apv-new-case', {
  prediction_id: historicalPredictionId, event_id: historicalId,
  observation: 'Documented historical event', outcome_evidence_ref: 'synthetic-history'
});
const historicalCase = later.data().cases.at(-1);
later.submit('apv-review-case', {
  case_id: historicalCase.case_id, decision: 'match', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-history', criterion_assessment: 'yes',
  criterion_observation: 'A promotion was documented in May 2025', review_note: 'Attempting match without reviewed event source'
});
check('Unreviewed event source blocks even an apparently matching case', () => {
  assert.equal(later.data().cases.at(-1).review, null);
});
later.submit('apv-review-source', {
  event_id: historicalId, decision: 'source_accepted', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-history', review_note: 'Source record inspected'
});
later.submit('apv-review-case', {
  case_id: historicalCase.case_id, decision: 'match', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-history', criterion_assessment: 'unknown',
  criterion_observation: 'Only an in-window event is known, the frozen criterion is not established',
  review_note: 'Must not treat time overlap as proof of the original claim'
});
check('Date overlap without affirmative criterion evidence cannot pass as a match', () => {
  assert.equal(later.data().cases.at(-1).review, null);
});
later.submit('apv-review-case', {
  case_id: historicalCase.case_id, decision: 'match', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-history', criterion_assessment: 'yes',
  criterion_observation: 'A promotion was documented in May 2025', review_note: 'Retrospective overlap only'
});
check('Evidence-reviewed retrospective match never counts as prospective', () => {
  assert.equal(later.data().cases.at(-1).review.decision, 'match');
  assert.equal(later.summary().prospective_matches, 0);
});
later.submit('apv-review-case', {
  case_id: historicalCase.case_id, decision: 'miss', reviewer: 'Synthetic reviewer',
  evidence_ref: 'synthetic-history', criterion_assessment: 'no',
  criterion_observation: 'Attempt to overwrite an already locked case decision',
  review_note: 'This should be rejected'
});
check('Recorded reviewer decision cannot be silently overwritten', () => {
  assert.equal(later.data().cases.at(-1).review.decision, 'match');
});
check('Backdated frozen claims are not relabeled prospective', () => {
  assert.equal(historicalCase.evaluation_mode, 'retrospective_exploratory');
  assert.equal(later.summary().prospective_matches, 0);
});
check('Progress never implies all gates passed from one fixture', () => assert.ok(later.summary().progress_percent < 100));
check('Research admission reports full denominator, not only matching cases', () => {
  const a=later.window.AstroProofValidation.getAdmissionSummary();
  assert.equal(a.inventoried_predictions,2);
  assert.equal(a.admitted_binary_prospective,1);
  assert.equal(a.admitted_misses,1);
  assert.equal(a.admitted_matches,0);
  assert.equal(a.not_admitted,1);
});

// Test legacy review back-compat: preserve old verdict and append a criterion audit.
const legacyData = JSON.parse(local.get('astroproof.validation.v1'));
const oldCase = legacyData.cases.find(c => c.case_id === historicalCase.case_id);
delete oldCase.review.criterion_assessment;
delete oldCase.review.criterion_observation;
local.set('astroproof.validation.v1', JSON.stringify(legacyData));
const oldMode = boot('2026-12-03T10:00:00Z');
check('Older reviews without criterion evidence are quarantined from scoring', () => {
  assert.equal(oldMode.summary().reviewed_cases, 1);
  assert.equal(oldMode.data().cases.find(c => c.case_id === historicalCase.case_id).review_status, 'reviewed_documented');
});
oldMode.submit('apv-review-case', {
  case_id: historicalCase.case_id, decision: 'match',
  criterion_assessment: 'yes', criterion_observation: 'Verified original frozen promotion criterion',
  reviewer: 'Supplemental reviewer', evidence_ref: 'synthetic-history',
  review_note: 'Supplemental audit; original decision retained unmodified'
});
check('Supplemental criterion audit restores review without altering legacy decision', () => {
  const audited = oldMode.data().cases.find(c => c.case_id === historicalCase.case_id);
  assert.equal(audited.review.criterion_assessment, undefined);
  assert.equal(audited.criterion_audit.criterion_assessment, 'yes');
  assert.equal(audited.criterion_audit.original_decision, 'match');
  assert.equal(oldMode.summary().reviewed_cases, 2);
});
const baseline = JSON.parse(local.get('astroproof.validation.v1'));
const tampered = structuredClone(baseline);
tampered.predictions.find(p => p.prediction_id === predId).claim = 'Changed outcome statement after freeze';
local.set('astroproof.validation.v1', JSON.stringify(tampered));
const blocked = boot('2026-12-04T10:00:00Z');
check('Modified frozen claim invalidates the prediction and its score', () => {
  assert.equal(blocked.summary().prospective_misses, 0);
  assert.equal(blocked.data().predictions.find(p => p.prediction_id === predId).status, 'frozen');
});
check('Research admission pack records frozen snapshot tampering as exclusion', () => {
  const a=blocked.window.AstroProofValidation.getAdmissionSummary();
  assert.equal(a.admitted_binary_prospective,0);
  assert.ok(a.admission_reasons.frozen_fields_not_admissible_or_snapshot_mismatch>0);
});
local.set('astroproof.validation.v1', JSON.stringify(baseline));
const recovered = boot('2026-12-04T10:00:00Z');
check('Restoring untampered snapshot restores the admitted review', () => {
  assert.equal(recovered.summary().prospective_misses, 1);
});

// A correctly dated event can still FAIL the original claim.
const startWindow = boot('2026-11-19T09:00:00Z');
startWindow.submit('apv-new-prediction', {
  life_area: 'career', claim: 'Fictional SIGNED offer from employer',
  pass_fail_criteria: 'Written offer signed by the employer (conversation alone is insufficient)',
  specificity_class: 'specific', window_start: '2026-11-25', window_end: '2026-11-30',
  peak_at: '2026-11-27T10:00', calculation_version: 'synthetic-fixture-v1',
  source_ref: 'synthetic-rule-source', rule_ids: 'FICTIONAL-RULE-03',
  calibration_event_ids: '', assumptions: 'Synthetic only',
  competing_interpretations: 'Nothing guaranteed'
});
const criterionPredictionId = startWindow.data().predictions.at(-1).prediction_id;
startWindow.action('freeze', criterionPredictionId);
const afterWindow = boot('2026-12-06T09:00:00Z');
afterWindow.submit('apv-new-event', {
  event_type: 'career_change', life_area: 'career',
  event_start: '2026-11-28', event_end: '', date_precision: 'exact',
  purpose: 'validation_holdout', source_kind: 'dated_message',
  source_ref: 'synthetic-interview-message',
  confidence: 'tentative', note: 'Interview only; no signed offer',
  assumptions: 'The subject is fictional'
});
const inWindowEventId = afterWindow.data().events.at(-1).event_id;
afterWindow.submit('apv-review-source', {
  event_id: inWindowEventId, decision: 'source_accepted',
  reviewer: 'Synthetic reviewer', evidence_ref: 'synthetic-interview-message',
  review_note: 'Record shows an interview but no signed offer'
});
afterWindow.submit('apv-new-case', {
  prediction_id: criterionPredictionId, event_id: inWindowEventId,
  observation: 'Interview took place, but no signed offer',
  outcome_evidence_ref: 'synthetic-interview-message'
});
const criterionCaseId = afterWindow.data().cases.at(-1).case_id;
afterWindow.submit('apv-review-case', {
  case_id: criterionCaseId, decision: 'miss', criterion_assessment: 'no',
  criterion_observation: 'No signed written offer even though related career event occurred in window',
  reviewer: 'Synthetic reviewer', evidence_ref: 'synthetic-interview-message',
  review_note: 'Date and life area overlap; frozen criterion failed'
});
check('A thematic in-window event cannot be scored a miss without post-deadline surveillance', () => {
  assert.equal(afterWindow.data().cases.find(x=>x.case_id===criterionCaseId).review,null);
});
afterWindow.submit('apv-add-case-evidence',{
  case_id:criterionCaseId, evidence_ref:'synthetic-no-signed-offer-record',
  follow_up_coverage:'Synthetic registry checked after window: no written offer recorded between Nov 25 and 30',
  note:'Follow-up confirms no signed written offer; interview does not count'
});
afterWindow.submit('apv-review-case', {
  case_id: criterionCaseId, decision: 'miss', criterion_assessment: 'no',
  criterion_observation: 'No signed written offer even though related career event occurred in window',
  reviewer: 'Synthetic reviewer', evidence_ref: 'synthetic-interview-message',
  review_note: 'Date and life area overlap; frozen criterion failed'
});
check('Overlapping real-world theme can still be documented as prediction MISS', () => {
  const cc = afterWindow.data().cases.find(c => c.case_id === criterionCaseId);
  assert.equal(cc.date_overlap, true);
  assert.equal(cc.review.decision, 'miss');
  assert.ok(afterWindow.summary().prospective_misses >= 2);
});
check('Research pack admits criterion-specific misses and excludes retrospective matches', () => {
  const a=afterWindow.window.AstroProofValidation.getAdmissionSummary();
  assert.equal(a.admitted_binary_prospective,2);
  assert.equal(a.admitted_misses,2);
  assert.equal(a.admitted_matches,0);
  assert.ok(a.not_admitted>=1);
});


// Follow-up status must depend on date, not claims of success.
const freshQ = boot('2026-11-21T08:00:00Z');
freshQ.submit('apv-new-prediction', {
  life_area: 'learning', specificity_class: 'specific', claim: 'Fictional certificate earned in December',
  pass_fail_criteria: 'Dated certificate signed between December 1 and December 10',
  window_start: '2026-12-01', window_end: '2026-12-10',
  calculation_version: 'synthetic-fixture-v1', source_ref: 'fictional-rule',
  rule_ids: 'FICTIONAL-FOLLOWUP', calibration_event_ids: '', assumptions: 'Fictional only',
  competing_interpretations: 'Not evidence of real-world prediction'
});
const queueId = freshQ.data().predictions.at(-1).prediction_id;
freshQ.action('freeze',queueId);
check('Future forecast appears in follow-up queue but not in outcomes', () => {
  const q = freshQ.window.AstroProofValidation.getFollowupSummary();
  assert.equal(q.items.find(p=>p.prediction_id===queueId).state,'future');
  assert.equal(freshQ.summary().prospective_matches,0);
});
const activeQ=boot('2026-12-04T08:00:00Z');
check('Active forecast window remains unscored', () => {
  assert.equal(activeQ.window.AstroProofValidation.getFollowupSummary().items
    .find(p=>p.prediction_id===queueId).state,'active_window');
});
const overdueQ=boot('2026-12-12T08:00:00Z');
check('Overdue forecast without a case remains UNREPORTED, not a miss', () => {
  assert.equal(overdueQ.window.AstroProofValidation.getFollowupSummary().items
    .find(p=>p.prediction_id===queueId).state,'overdue_unreported');
  assert.equal(overdueQ.window.AstroProofValidation.getAdmissionSummary().admitted_misses,2);
});

// A monitoring case created before a forecast resolves can receive a later real event,
// without silently replacing the initial observation or counting a success.
const monitor=boot('2026-11-20T09:00:00Z');
monitor.submit('apv-new-prediction',{
  life_area:'career',claim:'Synthetic signed offer by Nov 30',
  pass_fail_criteria:'Written and signed offer by Nov 30',specificity_class:'specific',
  window_start:'2026-11-25',window_end:'2026-11-30',
  calculation_version:'synthetic-fixture-v1',source_ref:'synthetic-source',
  rule_ids:'FIXTURE-MONITOR',calibration_event_ids:'',assumptions:'Synthetic only',
  competing_interpretations:'Independent decisions'
});
const monitoringPrediction=monitor.data().predictions.at(-1).prediction_id;
monitor.action('freeze',monitoringPrediction);
monitor.submit('apv-new-case',{
  prediction_id:monitoringPrediction,event_id:'',observation:'Window not yet completed',
  outcome_evidence_ref:'',follow_up_coverage:''
});
const monitoringCase=monitor.data().cases.at(-1).case_id;
check('Early monitoring entry is pending without being called a miss',()=>{
  const cc=monitor.data().cases.find(c=>c.case_id===monitoringCase);
  assert.equal(cc.outcome_kind,'no_event');
  assert.equal(cc.review,null);
});
const monitorLater=boot('2026-12-02T08:00:00Z');
monitorLater.submit('apv-add-case-evidence',{
  case_id:monitoringCase,observed_event_id:first.data().events[0].event_id,
  evidence_ref:'synthetic-leak-test',note:'Attempt to add calibration evidence'
});
check('An event used for rectification cannot be attached later through an addendum',()=>{
  const cc=monitorLater.data().cases.find(c=>c.case_id===monitoringCase);
  assert.equal(cc.event_id,null);
  assert.equal(cc.evidence_addenda.length,0);
});
monitorLater.submit('apv-new-event',{
  event_type:'career_change',life_area:'career',event_start:'2026-11-27',
  date_precision:'exact',purpose:'validation_holdout',source_kind:'dated_message',
  source_ref:'synthetic-signed-letter',note:'Synthetic letter only',
  confidence:'tentative'
});
const newlyRecordedEventId=monitorLater.data().events.at(-1).event_id;
monitorLater.submit('apv-add-case-evidence',{
  case_id:monitoringCase,observed_event_id:newlyRecordedEventId,
  evidence_ref:'synthetic-signed-letter',
  follow_up_coverage:'Outcome recorded after the full window',
  note:'Link actual observed event without deleting earlier pending note'
});
check('Pending case can link later observed event with dated append-only history',()=>{
  const cc=monitorLater.data().cases.find(c=>c.case_id===monitoringCase);
  assert.equal(cc.event_id,newlyRecordedEventId);
  assert.equal(cc.outcome_kind,'event');
  assert.equal(cc.evidence_addenda.length,1);
  assert.equal(cc.evidence_addenda[0].previous_outcome_kind,'no_event');
  assert.equal(cc.evaluation_mode,'prospective');
  assert.equal(cc.review,null);
  assert.equal(monitorLater.data().cases.filter(c=>c.prediction_id===monitoringPrediction).length,1);
});
check('Linking an event never automatically counts a validation match',()=>{
  const admitted=monitorLater.window.AstroProofValidation.getAdmissionSummary();
  assert.equal(admitted.admitted_matches,0);
});
console.log('PASS: ' + report.length + ' synthetic AstroProof validation workflow checks');
for (const name of report) console.log('  ✓ ' + name);
