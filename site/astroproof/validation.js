'use strict';
(function(){
  const STORAGE='astroproof.validation.v1';
  const VERSION='1.0.0';
  const AREAS=['overview','career','money','relationships','family','wellbeing','learning','travel','other'];
  const TYPES={
    career_change:'Career / role change',promotion:'Promotion / greater responsibility',job_loss:'Job loss',
    business_start:'Business started',income_change:'Major income change',education:'Education milestone',
    relationship_start:'Relationship began',marriage:'Marriage / formal partnership',separation:'Separation',
    child_birth:'Child birth / adoption',relocation:'Relocation',property:'Property',family_event:'Family milestone',
    health_event:'Major health event',travel:'Travel / overseas move',other:'Other'
  };
  const EVENT_AREAS={
    career_change:'career',promotion:'career',job_loss:'career',business_start:'career',
    income_change:'money',property:'money',education:'learning',relationship_start:'relationships',
    marriage:'relationships',separation:'relationships',child_birth:'family',family_event:'family',
    health_event:'wellbeing',relocation:'travel',travel:'travel',other:'other'
  };
  const TABS=[
    ['summary','Overview'],['events','Life Events'],['hypotheses','Rectification'],
    ['predictions','Predictions'],['cases','Validation Cases'],['review','Pending Review'],
    ['gaps','Evidence Gaps'],['advice','Advice'],['decisions','Decision History']
  ];
  const root=document.getElementById('apv-root');
  if(!root)return;
  const now=()=>new Date().toISOString();
  const day=()=>now().slice(0,10);
  const uid=p=>p+'-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
  const escapeHTML=v=>String(v==null?'':v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const escapeAttr=escapeHTML;
  const bridge=()=>window.AstroProofBridge||null;
  const clean=v=>String(v||'').trim();
  const asList=v=>clean(v).split(',').map(x=>x.trim()).filter(Boolean);
  const isoDate=s=>typeof s==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const validRange=(a,b)=>isoDate(a)&&isoDate(b)&&a<=b;
  const datesOverlap=(a,b,c,d)=>a<=d&&c<=b;
  const label=(obj,key)=>escapeHTML(obj&&obj[key]||'—');
  const short=v=>escapeHTML(String(v||'—')).slice(0,220);
  const option=(key,value,text)=>'<option value="'+escapeAttr(value)+'"'+(key===value?' selected':'')+'>'+escapeHTML(text)+'</option>';
  const selectOptions=(list,selected)=>list.map(x=>option(selected,x,x.charAt(0).toUpperCase()+x.slice(1))).join('');
  const status=t=>'<span class="apv-status">'+escapeHTML(t||'unknown')+'</span>';
  const hint=s=>'<p class="apv-muted">'+escapeHTML(s)+'</p>';
  const empty=s=>'<div class="apv-warning">'+escapeHTML(s)+'</div>';
  const pair=(k,v)=>'<div><b>'+escapeHTML(k)+':</b> '+escapeHTML(v==null?'Unknown':v)+'</div>';
  let tab='summary',filtered='all',candidates=[],candidateIndex=null,notice='';
  const blank=()=>({version:VERSION,person_id:'self',events:[],hypotheses:[],predictions:[],cases:[],advice:[],sensitivity_snapshots:[],decisions:[],created_at:now()});
  function load(){
    try{
      const p=JSON.parse(localStorage.getItem(STORAGE)||'null');
      if(!p||typeof p!=='object')return blank();
      const s=blank();
      for(const k of ['events','hypotheses','predictions','cases','advice','sensitivity_snapshots','decisions'])s[k]=Array.isArray(p[k])?p[k]:[];
      s.created_at=p.created_at||s.created_at;
      return s;
    }catch{return blank()}
  }
  let db=load();
  function save(){localStorage.setItem(STORAGE,JSON.stringify(db))}
  function log(action,objectType,objectId,detail){
    db.decisions.push({decision_id:uid('decision'),action,object_type:objectType,object_id:objectId,
      detail:clean(detail).slice(0,1200),recorded_at:now(),actor:'local operator (not independently authenticated)'});
  }
  function persist(action,type,id,detail){
    log(action,type,id,detail);save();notice=action.replaceAll('_',' ')+' recorded locally.';
    render();
  }
  function pick(id,items,key){return items.find(x=>x[key]===id)}
  const getEvt=id=>pick(id,db.events,'event_id');
  const getPred=id=>pick(id,db.predictions,'prediction_id');
  const getCase=id=>pick(id,db.cases,'case_id');
  function refText(e){return e&&clean(e.source_ref)||''}
  function evidenceReviewed(e){
    return !!(e&&e.evidence_review&&e.evidence_review.decision==='source_accepted'&&
      clean(e.evidence_review.reviewer)&&clean(e.evidence_review.note)&&clean(e.evidence_review.source_ref));
  }
  function predictionReady(p){
    return !!(p&&p.frozen_at&&clean(p.claim)&&clean(p.pass_fail_criteria)&&validRange(p.window_start,p.window_end)&&clean(p.calculation_version));
  }
  function isFutureAtFreeze(p){
    return !!(p&&p.frozen_at&&p.window_start>p.frozen_at.slice(0,10));
  }
  function caseSafety(pred,event){
    if(!pred||!predictionReady(pred))return {allowed:false,reason:'Prediction is not frozen with explicit criteria.'};
    if(!event)return {allowed:true,reason:'No-event case needs follow-up coverage evidence.'};
    if(event.purpose!=='validation_holdout'||event.used_for_rectification)return {allowed:false,reason:'Rectification/calibration events are not independent validation outcomes.'};
    if((pred.calibration_event_ids||[]).includes(event.event_id))return {allowed:false,reason:'Leakage: this event appears in prediction calibration inputs.'};
    if(pred.life_area!=='any'&&pred.life_area!=='overview'&&pred.life_area!==event.life_area)return {allowed:false,reason:'Life-area mismatch; do not reclassify after seeing the outcome.'};
    const overlap=datesOverlap(pred.window_start,pred.window_end,event.event_start,event.event_end);
    const prospective=isFutureAtFreeze(pred)&&event.recorded_at>pred.frozen_at&&event.event_start>=pred.frozen_at.slice(0,10);
    return {allowed:true,overlap,prospective,reason:prospective?'Prospective timing eligibility only; not a cryptographically blinded trial.':'Retrospective/exploratory: not eligible for prospective accuracy claims.'};
  }
  function checkCaseReview(c,p,e){
    if(!c||!p)return 'Missing prediction or case.';
    if(!predictionReady(p))return 'Prediction was not frozen.';
    if(c.event_id&&(!e||!caseSafety(p,e).allowed))return 'Event is missing or barred by leakage rules.';
    if(c.event_id&&!refText(e))return 'Event source evidence reference is missing.';
    if(c.event_id&&!evidenceReviewed(e))return 'Event source has not been explicitly reviewed.';
    if(!clean(c.outcome_evidence_ref))return 'Case outcome evidence reference is missing.';
    if(c.outcome_kind==='no_event'&&p.window_end>=day())return 'Cannot review an absence of event before the entire prediction window closes.';
    if(c.outcome_kind==='no_event'&&!clean(c.follow_up_coverage))return 'Explain how absence of the event was checked throughout the window.';
    return '';
  }
  function reviewedCase(c){
    const r=c&&c.review;
    if(!r||!['match','miss','indeterminate'].includes(r.decision))return false;
    if(!clean(r.reviewer)||!clean(r.note)||!clean(r.evidence_ref)||!clean(r.criterion_observation))return false;
    if(r.decision==='match')return r.criterion_assessment==='yes';
    if(r.decision==='miss')return r.criterion_assessment==='no';
    return r.criterion_assessment==='unknown';
  }
  function auditedCase(c){
    const p=getPred(c.prediction_id),e=c.event_id?getEvt(c.event_id):null;
    return reviewedCase(c)&&!checkCaseReview(c,p,e);
  }
  function sourceEvidenceCount(){return db.events.filter(e=>evidenceReviewed(e)).length}
  function auditedCases(){return db.cases.filter(auditedCase)}
  function evaluation(){
    const reviewed=auditedCases(),eligible=reviewed.filter(c=>c.evaluation_mode==='prospective'),exploratory=reviewed.filter(c=>c.evaluation_mode!=='prospective');
    const decided=eligible.filter(c=>['match','miss'].includes(c.review.decision));
    const matched=decided.filter(c=>c.review.decision==='match').length,missed=decided.filter(c=>c.review.decision==='miss').length;
    const byRule={};
    for(const c of reviewed){
      const p=getPred(c.prediction_id);if(!p)continue;
      for(const r of p.rule_ids||[]){
        if(!byRule[r])byRule[r]={rule:r,reviewed:0,prospective:0,match:0,miss:0,indeterminate:0};
        const row=byRule[r];row.reviewed++;
        if(c.evaluation_mode==='prospective'){row.prospective++;if(c.review.decision==='match')row.prospective_matches=(row.prospective_matches||0)+1;if(c.review.decision==='miss')row.prospective_misses=(row.prospective_misses||0)+1;}
        row[c.review.decision]=(row[c.review.decision]||0)+1;
      }
    }
    const frozen=db.predictions.filter(predictionReady);
    const pending=frozen.filter(p=>!reviewed.some(c=>c.prediction_id===p.prediction_id));
    return {reviewed,eligible,exploratory,decided,matched,missed,byRule:Object.values(byRule),frozen,pending,
      review_rate:frozen.length?Math.round(100*(frozen.length-pending.length)/frozen.length):0};
  }
  function gates(){
    const e=evaluation();
    const hasSource=sourceEvidenceCount()>0;
    const snapshot=db.sensitivity_snapshots.some(s=>s.matrix&&s.matrix.available&&Array.isArray(s.matrix.rows)&&s.matrix.rows.length>2&&s.chart_engine&&s.recorded_at);
    const frozen=e.frozen.some(p=>p.rule_ids.length&&clean(p.source_ref)&&clean(p.pass_fail_criteria));
    const caseWithEvidence=db.cases.some(c=>getPred(c.prediction_id)&&clean(c.outcome_evidence_ref)&&(!c.event_id||getEvt(c.event_id)?.purpose==='validation_holdout'));
    const reviewed=e.reviewed.some(c=>clean(c.review.evidence_ref));
    const prospective=e.eligible.some(c=>['match','miss'].includes(c.review.decision));
    const comparison=e.decided.length>=3&&e.matched>0&&e.missed>0;
    return [
      {name:'Dated life event with reviewed source',done:hasSource},
      {name:'Birth-time sensitivity matrix saved with engine provenance',done:snapshot},
      {name:'Prediction frozen with explicit rule/source and test criteria',done:frozen},
      {name:'Validation case has actual outcome evidence',done:caseWithEvidence},
      {name:'Case reviewed with evidence and decision record',done:reviewed},
      {name:'Prospective outcome reviewed after freeze',done:prospective},
      {name:'At least 3 reviewed prospective outcomes including matches and misses',done:comparison}
    ];
  }
  function evidenceLadder(p){
    const cases=db.cases.filter(c=>c.prediction_id===p.prediction_id),reviewed=cases.filter(auditedCase);
    return [
      ['Calculated timing recorded',!!(clean(p.calculation_version)&&p.peak_at)],
      ['Traditional rule and source recorded',!!((p.rule_ids||[]).length&&clean(p.source_ref))],
      ['Independent technique agreement recorded',!!clean(p.independent_support)],
      ['Locked retrospective holdout reviewed',reviewed.some(c=>c.evaluation_mode!=='prospective')],
      ['Prospective outcome reviewed',reviewed.some(c=>c.evaluation_mode==='prospective')],
      ['Independent replication',false]
    ];
  }
  function gaps(){
    const out=[];
    for(const e of db.events){
      if(!refText(e))out.push({type:'Life Event',id:e.event_id,text:'No source reference'});
      else if(!evidenceReviewed(e))out.push({type:'Life Event',id:e.event_id,text:'Source submitted but not reviewed'});
      if(!validRange(e.event_start,e.event_end))out.push({type:'Life Event',id:e.event_id,text:'Invalid or uncertain date range'});
    }
    for(const h of db.hypotheses){
      if(!h.sensitivity_snapshot?.available)out.push({type:'Rectification',id:h.hypothesis_id,text:'No computed sensitivity matrix'});
      if(!(h.rectification_event_ids||[]).length)out.push({type:'Rectification',id:h.hypothesis_id,text:'No separate calibration events'});
      if(!clean(h.assumptions))out.push({type:'Rectification',id:h.hypothesis_id,text:'Assumptions missing'});
    }
    for(const p of db.predictions){
      if(!p.frozen_at)out.push({type:'Prediction',id:p.prediction_id,text:'Draft is not frozen'});
      if(!clean(p.source_ref))out.push({type:'Prediction',id:p.prediction_id,text:'No calculation/source reference'});
      if(!(p.rule_ids||[]).length)out.push({type:'Prediction',id:p.prediction_id,text:'No rule identifier'});
      if(!clean(p.competing_interpretations))out.push({type:'Prediction',id:p.prediction_id,text:'No competing interpretation recorded'});
      if(!db.cases.some(c=>c.prediction_id===p.prediction_id))out.push({type:'Prediction',id:p.prediction_id,text:'No outcome case'});
    }
    for(const c of db.cases){
      const p=getPred(c.prediction_id),e=c.event_id?getEvt(c.event_id):null;
      const problem=checkCaseReview(c,p,e);
      if(problem)out.push({type:'Validation Case',id:c.case_id,text:problem});
      if(!reviewedCase(c))out.push({type:'Validation Case',id:c.case_id,text:'Reviewer decision pending'});
    }
    return out;
  }
  function optionsFrom(items,idKey,formatter,selected,withBlank=true){
    return (withBlank?'<option value="">Select…</option>':'')+items.map(x=>option(selected,x[idKey],formatter(x))).join('');
  }
  function formField(name,labelText,type,required,extra){
    const attrs=(required?' required':'')+(extra||'');
    return '<label>'+escapeHTML(labelText)+'<input name="'+escapeAttr(name)+'" type="'+escapeAttr(type||'text')+'"'+attrs+'></label>';
  }
  function textarea(name,title,required,placeholder){
    return '<label>'+escapeHTML(title)+'<textarea name="'+escapeAttr(name)+'" rows="2" maxlength="1800"'+(required?' required':'')+' placeholder="'+escapeAttr(placeholder||'')+'"></textarea></label>';
  }
  function submit(labelText){return '<button class="primary" type="submit">'+escapeHTML(labelText)+'</button>'}
  function action(kind,id,text,disabled){
    return '<button type="button" class="ghost" data-apv-action="'+escapeAttr(kind)+'" data-id="'+escapeAttr(id||'')+'"'+(disabled?' disabled':'')+'>'+escapeHTML(text)+'</button>';
  }
  function stats(){
    const ev=evaluation(),gs=gates(),completed=gs.filter(g=>g.done).length,percent=Math.round(100*completed/gs.length);
    const pendingReview=db.cases.filter(c=>!reviewedCase(c)).length+db.events.filter(e=>refText(e)&&!evidenceReviewed(e)).length+
       db.hypotheses.filter(h=>!h.review||h.review.decision==='unresolved').length;
    return {ev,gs,completed,percent,pendingReview};
  }
  function overview(){
    const s=stats(),ev=s.ev;
    return '<div class="apv-warning"><b>Evidence status:</b> '+s.completed+' of '+s.gs.length+
      ' workflow gates documented. This bar measures recorded review work—not astrology accuracy, objective proof, or a prediction success rate. Browser storage is editable; no external audit or truly blind experiment is claimed.</div>'+
      '<h3 class="apv-section-title">Evidence-recorded workflow progress: '+s.percent+'%</h3>'+
      '<div class="apv-progress" role="progressbar" aria-valuenow="'+s.percent+'" aria-valuemin="0" aria-valuemax="100" aria-label="Evidence-backed workflow progress"><div style="width:'+s.percent+'%"></div></div>'+
      '<div class="apv-checks">'+s.gs.map(g=>'<div>'+status(g.done?'Evidence recorded':'Pending')+' '+escapeHTML(g.name)+'</div>').join('')+'</div>'+
      '<div class="apv-quick">'+[
        ['Life events',db.events.length],['Frozen predictions',ev.frozen.length],['Reviewed cases',ev.reviewed.length],['Pending review',s.pendingReview]
      ].map(x=>'<div class="apv-kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>'+
      '<div class="apv-workflow">'+
      '<div><b>1. Document life events</b><p class="apv-muted">Record event ranges, uncertainty and where the evidence lives. Keep test events separate from birth-time calibration.</p>'+action('tab','events','Open archive')+'</div>'+
      '<div><b>2. Freeze a testable forecast</b><p class="apv-muted">Write the observable claim and pass/fail criteria, then lock the prediction before considering outcomes.</p>'+action('tab','predictions','Create forecast')+'</div>'+
      '<div><b>3. Compare and review</b><p class="apv-muted">Record a match, miss or unclear outcome, add evidence, and require explicit reviewer decisions.</p>'+action('tab','cases','Compare outcomes')+'</div></div>'+
      '<div class="apv-card"><h3>Evaluator results</h3>'+
      '<p><b>'+ev.matched+' documented prospective matches</b> · <b>'+ev.missed+' documented prospective misses</b> · '+ev.exploratory.length+' retrospective/exploratory reviews</p>'+
      (ev.decided.length?'<p>Reviewed prospective-case hit fraction: <b>'+ev.matched+'/'+ev.decided.length+'</b>. Only explicitly reviewed cases are in the denominator. This is not predictive accuracy, recall, or a p-value.</p>':
       '<p class="apv-muted">No eligible, evidence-reviewed prospective outcomes yet. Accuracy and rule effectiveness remain unknown.</p>')+
      '<p class="apv-muted">Evaluator v1.0: leakage checks, locked date ranges, reviewed matched/missed outcomes, and per-rule sample counts. No shuffled-date control or cohort-level recall is claimed in the browser.</p></div>'+
      '<div class="apv-actions">'+action('download-report','','Download validation report (.txt)')+
      action('download-json','','Download structured results (.json)')+action('download-csv','','Download case table (.csv)')+
      action('download-backup','','Backup all validation records')+
      '<label class="ghost" style="cursor:pointer">Restore validation backup<input type="file" id="apv-import-backup" accept=".json,application/json" hidden></label></div>';
  }
  function eventsView(){
    const items=db.events.slice().sort((a,b)=>String(b.event_start).localeCompare(String(a.event_start)));
    return '<h3 class="apv-section-title">Life Event Archive</h3>'+
      hint('A source reference is a pointer, not automatic proof. A holdout record can be compared with a frozen prediction; a rectification record cannot be used as independent validation.')+
      '<form class="apv-form apv-card" id="apv-new-event">'+
      '<h3>Record a real event</h3>'+
      '<div class="apv-2"><label>Event type<select name="event_type" required>'+Object.entries(TYPES).map(x=>'<option value="'+x[0]+'">'+escapeHTML(x[1])+'</option>').join('')+'</select></label>'+
      '<label>Primary life area<select name="life_area" required>'+selectOptions(AREAS,'career')+'</select></label></div>'+
      '<div class="apv-3">'+formField('event_start','From date','date',true)+formField('event_end','To date (leave blank if one day)','date',false)+
      '<label>Date precision<select name="date_precision"><option value="exact">Exact</option><option value="month">Approximate month</option><option value="year">Approximate year</option></select></label></div>'+
      '<div class="apv-2"><label>Use for<select name="purpose"><option value="validation_holdout">Holdout / validation only</option><option value="rectification">Birth-time calibration only</option></select></label>'+
      '<label>Evidence type<select name="source_kind"><option value="unknown">Unknown / not supplied</option><option value="document">Dated document</option><option value="dated_message">Dated correspondence</option><option value="record">Official or transaction record</option><option value="personal_recollection">Personal recollection</option></select></label></div>'+
      '<label>Event confidence (your estimate; not a probability)<select name="confidence"><option value="unknown">Unknown</option><option value="tentative">Tentative</option><option value="medium">Medium</option><option value="high">High</option></select></label>'+ 
      formField('source_ref','Evidence reference / where it can be checked (optional)','text',false,' maxlength="400" placeholder="e.g. offer-letter-2019, not a sensitive account number"')+
      textarea('note','Factual description','', 'Describe what happened without astrological interpretation.')+
      textarea('assumptions','Uncertainty / assumptions',false,'What is unknown about the exact date or event?')+
      textarea('competing_interpretations','Alternative explanations',false,'Possible non-astrological causes or uncertainty')+
      submit('Save event as unverified')+'</form>'+
      '<h3 class="apv-section-title">Recorded events ('+items.length+')</h3>'+
      (items.length?items.map(e=>'<div class="apv-card"><h3>'+escapeHTML(TYPES[e.event_type]||e.event_type)+' '+status(e.purpose==='rectification'?'Calibration only':'Holdout')+'</h3>'+
      pair('When',e.event_start+(e.event_end!==e.event_start?' to '+e.event_end:''))+
      pair('Date precision',e.date_precision)+pair('Life area',e.life_area)+pair('Event confidence',e.confidence||'unknown')+pair('Evidence type',e.source_kind||'unknown')+pair('Source reference',e.source_ref||'Missing')+
      pair('Evidence review',evidenceReviewed(e)?'Source accepted in local review log':'Not accepted / pending')+
      '<p class="apv-muted">'+escapeHTML(e.note||'No description')+'</p>'+
      '<details class="apv-details"><summary>Assumptions and competing explanations</summary><p>'+escapeHTML(e.assumptions||'Unknown')+'</p><p>'+escapeHTML(e.competing_interpretations||'Not assessed')+'</p></details></div>').join(''):empty('No events recorded. Keep the first entry factual; do not guess the date.'))+
      '<div class="apv-actions">'+action('legacy-import','','Review and import older AstroProof archive')+
      action('tab','review','Review source evidence')+'</div>';
  }
  function hypothesisView(){
    const b=bridge(),s=b?.getBirthSensitivity?.(),profile=b?.getProfile?.(),h=db.hypotheses;
    const matrix=s&&s.available?
      '<div class="apv-tablewrap"><table class="apv-table"><thead><tr><th>Offset</th><th>Vedic ascendant</th><th>D9</th><th>D10</th><th>Sun/Moon/Saturn houses</th></tr></thead><tbody>'+
      s.rows.map(r=>'<tr><td>'+r.delta+' min</td><td>'+escapeHTML(r.asc)+'</td><td>'+escapeHTML(r.d9)+'</td><td>'+escapeHTML(r.d10)+'</td><td>'+[r.sunHouse,r.moonHouse,r.saturnHouse].map(x=>x==null?'—':x).join(' / ')+'</td></tr>').join('')+'</tbody></table></div>':
      empty(s?.reason||'Enter birth details first. Time-sensitive outputs cannot be compared without a usable time.');
    const rEvents=db.events.filter(e=>e.purpose==='rectification');
    return '<h3 class="apv-section-title">Birth-time uncertainty & sensitivity</h3>'+
      '<p class="apv-muted">Declared precision: '+escapeHTML(profile?.time_precision||'Unknown')+'. These rows are calculations under the approximate hosted engine. They do not prove a corrected birth time.</p>'+
      matrix+'<div class="apv-actions">'+action('snapshot','','Save this matrix with engine provenance',!(s&&s.available))+'</div>'+
      '<h3 class="apv-section-title">Rectification hypotheses</h3>'+
      '<form class="apv-form apv-card" id="apv-new-hypothesis"><h3>Test a birth-time offset</h3>'+
      '<div class="apv-2">'+formField('offset_min','Candidate offset in minutes (-30 to +30)','number',true,' min="-30" max="30" step="1"')+
      '<label>Calibration event<select name="rectification_event_id"><option value="">None yet</option>'+optionsFrom(rEvents,'event_id',e=>(TYPES[e.event_type]||e.event_type)+' — '+e.event_start,'',false)+'</select></label></div>'+
      textarea('rationale','Why test this candidate?',true,'Specific hypothesis; not a claim that the birth time is corrected')+
      textarea('assumptions','Assumptions and uncertainty',true,'What could change the conclusion?')+
      textarea('competing_interpretations','Competing explanation',false,'Alternative time or independent explanation')+
      submit('Save tentative hypothesis')+'</form>'+
      (h.length?h.map(x=>'<div class="apv-card"><h3>Offset '+(x.offset_min>0?'+':'')+x.offset_min+' min '+status(x.review?.decision||'Tentative')+'</h3>'+
      pair('Reason',x.rationale)+pair('Calibration event IDs',(x.rectification_event_ids||[]).join(', ')||'None')+
      pair('Recorded',x.recorded_at)+pair('Assumptions',x.assumptions)+ (x.candidate_comparison?.available?'<div class="apv-card"><b>Side-by-side calculation, not a rectification verdict</b>'+pair('Baseline Asc / D9 / D10',[x.candidate_comparison.baseline.ascendant,x.candidate_comparison.baseline.d9_ascendant,x.candidate_comparison.baseline.d10_ascendant].join(' / '))+pair('Candidate Asc / D9 / D10',[x.candidate_comparison.candidate.ascendant,x.candidate_comparison.candidate.d9_ascendant,x.candidate_comparison.candidate.d10_ascendant].join(' / '))+pair('Baseline event timing',(x.candidate_comparison.baseline.at_event||[]).map(a=>a.date+': '+a.mahadasha+'–'+a.antardasha+'–'+a.pratyantar).join('; ')||'No calibration event')+pair('Candidate event timing',(x.candidate_comparison.candidate.at_event||[]).map(a=>a.date+': '+a.mahadasha+'–'+a.antardasha+'–'+a.pratyantar).join('; ')||'No calibration event')+'</div>':hint(x.candidate_comparison?.reason||'No side-by-side computation available'))+
      '<p class="apv-muted">This is a candidate, not a rectified birth time. Do not score linked calibration events as holdout outcomes.</p>'+
      '</div>').join(''):empty('No birth-time hypotheses. An unknown or uncertain birth time stays unresolved until evidence supports a change.'));
  }
  function predictionsView(){
    const ps=db.predictions.slice().reverse();
    const sources=bridge()?.getChartSummary?.();
    return '<h3 class="apv-section-title">Predictions — draft, then freeze</h3>'+
      hint('Freeze an observable claim with a deadline and pass/fail definition before looking at outcomes. Frozen fields become read-only in the app; browser storage is not tamper-proof.')+
      '<form class="apv-form apv-card" id="apv-new-prediction"><h3>Draft a testable prediction</h3>'+
      '<div class="apv-2"><label>Life area<select name="life_area" required>'+selectOptions(AREAS,'career')+'</select></label>'+
      '<label>Specificity<select name="specificity_class"><option value="broad">Broad (weak test)</option><option value="moderate">Moderate</option><option value="specific">Specific (testable)</option></select></label></div>'+
      textarea('claim','Precisely what is predicted?',true,'e.g. A signed job offer will be received; do not enter a vague theme')+
      textarea('pass_fail_criteria','What counts as a match, and what counts as a miss?',true,'E.g. signed offer received by deadline; otherwise miss')+
      '<div class="apv-3">'+formField('window_start','Window starts','date',true)+formField('window_end','Window ends','date',true)+formField('peak_at','Refined timing peak (optional)','datetime-local',false)+'</div>'+
      '<div class="apv-2">'+formField('calculation_version','Calculation version / method','text',true,' value="'+escapeAttr(sources?.engine?'astroproof-hosted-provisional-1.0':'unverified-method')+'"')+
      formField('source_ref','Rule / calculation source reference','text',false,' maxlength="400" placeholder="Name an actual reference or leave unknown"')+'</div>'+
      formField('rule_ids','Rule IDs separated by commas','text',false,' placeholder="Do not invent IDs; leave blank if unknown"')+
      formField('calibration_event_ids','Calibration event IDs used, comma-separated','text',false,' placeholder="Must never overlap scored holdouts"')+
      '<label>Claim confidence (not a probability)<select name="confidence"><option value="unknown">Unknown</option><option value="tentative">Tentative</option><option value="medium">Medium — judgement only</option><option value="high">High — judgement only</option></select></label>'+
      textarea('assumptions','Assumptions / birth-time quality',true,'All calculations that could change this reading')+
      textarea('competing_interpretations','Competing interpretations',false,'Alternative rule signals or non-astrological explanations')+
      textarea('independent_support','Other independently sourced techniques (optional)',false,'Do not claim convergence if not actually calculated')+
      '<p class="apv-muted">Refined peaks are numerical calculations, not proof the predicted event will occur.</p>'+
      submit('Save draft; do not freeze yet')+'</form>'+
      '<div class="apv-actions">'+action('load-candidates','','Load calculated timing candidates (provisional)')+'</div>'+
      (candidates.length?'<div class="apv-card"><h3>Timing candidates — not predictions</h3>'+candidates.slice(0,10).map((x,i)=>'<div class="record">'+escapeHTML(x.signal||'Signal')+' · '+escapeHTML(x.window_start||'—')+' – '+escapeHTML(x.window_end||'—')+
      '<p class="apv-small">Refined peak: '+escapeHTML(x.peak_at||'unavailable')+'; '+escapeHTML(x.timing_precision||'precision not stated')+'</p>'+
      action('use-candidate',String(i),'Prefill dates and timing evidence')+'</div>').join('')+'</div>':'')+
      '<h3 class="apv-section-title">Stored predictions ('+ps.length+')</h3>'+
      (ps.length?ps.map(p=>'<div class="apv-card"><h3>'+escapeHTML(p.claim)+' '+status(p.frozen_at?'Frozen · not validated':'Draft')+'</h3>'+
      pair('Period',p.window_start+' to '+p.window_end)+pair('Test criteria',p.pass_fail_criteria)+
      pair('Peak',p.peak_at||'Not calculated')+pair('Source / method',p.source_ref||'Missing')+
      pair('Confidence',p.confidence)+'<details class="apv-details"><summary>Evidence ladder & caveats</summary>'+
      evidenceLadder(p).map(x=>'<p>'+status(x[1]?'Recorded':'Pending')+' '+escapeHTML(x[0])+'</p>').join('')+
      pair('Assumptions',p.assumptions||'Unstated')+pair('Competing interpretations',p.competing_interpretations||'Not assessed')+'</details>'+
      '<div class="apv-actions">'+(!p.frozen_at?action('freeze',p.prediction_id,'Freeze claim and dates'):action('tab','cases','Test this prediction'))+'</div></div>').join(''):
      empty('No predictions drafted. Use a real observable claim; do not treat a transit theme as a guaranteed event.'));
  }
  function casesView(){
    const frozen=db.predictions.filter(predictionReady),holdouts=db.events.filter(e=>e.purpose==='validation_holdout'&&!e.used_for_rectification);
    return '<h3 class="apv-section-title">Compare predictions with outcomes</h3>'+
      '<div class="apv-warning">A case is a review request, not a verified match. Rectification events are blocked. Historical outcomes remain retrospective; freezing them today cannot make them prospective.</div>'+
      '<form class="apv-form apv-card" id="apv-new-case"><h3>Create validation case</h3>'+
      '<label>Frozen prediction<select name="prediction_id" required>'+optionsFrom(frozen,'prediction_id',p=>p.window_start+' — '+p.claim.slice(0,85),'')+'</select></label>'+
      '<label>Observed event or absence<select name="event_id">'+
      '<option value="">No event recorded in window (requires full-window review later)</option>'+
      optionsFrom(holdouts,'event_id',e=>e.event_start+' — '+(TYPES[e.event_type]||e.event_type),'',false)+'</select></label>'+
      formField('outcome_evidence_ref','Outcome evidence reference (can be completed before formal review)','text',false,' maxlength="400" placeholder="Contemporaneous record, dated correspondence or source ID"')+
      textarea('observation','What was actually observed?',true,'Describe the outcome without retrofitting the frozen claim')+
      '<label>Outcome confidence (not a probability)<select name="confidence"><option value="unknown">Unknown</option><option value="tentative">Tentative</option><option value="medium">Medium</option><option value="high">High</option></select></label>'+ 
      textarea('assumptions','Outcome interpretation assumptions',false,'What remains uncertain about this comparison?')+
      textarea('competing_interpretations','Competing non-astrological explanations',false,'Other reasons this might have happened')+
      textarea('follow_up_coverage','If no event: how was the full window checked?',false,'Required to confirm a miss when no event is recorded')+
      submit('Create case as pending review')+'</form>'+
      '<h3 class="apv-section-title">Validation cases ('+db.cases.length+')</h3>'+
      (db.cases.length?db.cases.slice().reverse().map(c=>{
         const p=getPred(c.prediction_id),e=c.event_id?getEvt(c.event_id):null,elig=c.evaluation_mode;
         return '<div class="apv-card"><h3>'+escapeHTML(p?.claim||'Missing prediction')+' '+status(c.review?.decision||'Pending review')+'</h3>'+
           pair('Case type',elig==='prospective'?'Prospective timing eligible — not blinded': 'Retrospective / exploratory')+
           pair('Outcome',e?(TYPES[e.event_type]||e.event_type)+' · '+e.event_start:'No event reported')+
           pair('Comparison',c.date_overlap===null?'Unknown':c.date_overlap?'Date ranges overlap':'Date ranges do not overlap')+
           pair('Evidence reference',c.outcome_evidence_ref||'Missing')+pair('Confidence',c.confidence||'unknown')+
           pair('Assumptions',c.assumptions||'Unstated')+pair('Competing explanations',c.competing_interpretations||'Not assessed')+
           pair('Exact criterion satisfied',c.review?.criterion_assessment||'Unreviewed')+pair('Criterion-specific evidence',c.review?.criterion_observation||'Missing')+
           pair('Reviewer',c.review?.reviewer||'Pending')+
           '<p class="apv-muted">'+escapeHTML(c.observation||'No observation')+'</p><details class="apv-details"><summary>Original frozen claim and test criteria</summary><p><b>Claim:</b> '+escapeHTML(p?.claim||'Missing')+'</p><p><b>Criterion:</b> '+escapeHTML(p?.pass_fail_criteria||'Missing')+'</p></details></div>';
       }).join(''):empty('No cases. Freeze a prediction first, then record and review its outcome.'))+
      '<div class="apv-actions">'+action('tab','review','Review pending cases')+'</div>';
  }
  function reviewView(){
    const sources=db.events.filter(e=>refText(e)&&!evidenceReviewed(e));
    const cases=db.cases.filter(c=>!reviewedCase(c)),hs=db.hypotheses.filter(h=>!h.review);
    return '<h3 class="apv-section-title">Pending review — evidence is required</h3>'+
      '<div class="apv-quick">'+[['Event sources',sources.length],['Outcome cases',cases.length],['Rectification hypotheses',hs.length],['Unknowns preserved',gaps().length]].map(x=>'<div class="apv-kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>'+
      '<form id="apv-review-source" class="apv-form apv-card"><h3>Review a life-event source</h3>'+
      '<label>Event with source reference<select name="event_id" required>'+optionsFrom(sources,'event_id',e=>e.event_start+' — '+(TYPES[e.event_type]||e.event_type),'')+'</select></label>'+
      '<label>Decision<select name="decision"><option value="source_accepted">Source checked / accepted as documented</option><option value="source_rejected">Source insufficient / rejected</option></select></label>'+
      formField('reviewer','Reviewer name or initials','text',true,' maxlength="120"')+
      formField('evidence_ref','Actual source that was examined','text',true,' maxlength="400"')+
      textarea('review_note','Reviewer notes and limitations',true,'What was checked? What remains uncertain?')+
      submit('Record source review')+'</form>'+
      '<form id="apv-review-case" class="apv-form apv-card"><h3>Decide an outcome case</h3>'+
      '<label>Pending case<select name="case_id" required>'+optionsFrom(cases,'case_id',c=>c.case_id+' — '+(getPred(c.prediction_id)?.claim||'missing').slice(0,70),'')+'</select></label>'+
      '<label>Decision<select name="decision"><option value="indeterminate">Indeterminate / cannot verify</option><option value="match">Documented match</option><option value="miss">Documented miss</option></select></label>'+
      '<label>Was the EXACT frozen pass/fail criterion met?<select name="criterion_assessment" required><option value="unknown">Cannot establish / unknown</option><option value="yes">Yes — criterion met</option><option value="no">No — criterion not met</option></select></label>'+
      formField('reviewer','Reviewer name or initials','text',true,' maxlength="120"')+
      formField('evidence_ref','Evidence actually checked for the case','text',true,' maxlength="400"')+
      textarea('criterion_observation','Exact criterion comparison — what fact proves or fails the frozen claim?',true,'Quote or summarize the specific observable criterion and the evidence supporting your conclusion.')+
      textarea('review_note','Decision reasoning and caveats',true,'Why does the original frozen criterion pass or fail? Note uncertainties or alternative explanations.')+
      submit('Record case decision; apply safeguards')+'</form>'+
      '<form id="apv-review-hypothesis" class="apv-form apv-card"><h3>Review a tentative birth-time hypothesis</h3>'+
      '<label>Hypothesis<select name="hypothesis_id" required>'+optionsFrom(hs,'hypothesis_id',h=>h.hypothesis_id+' ('+h.offset_min+' min)','')+'</select></label>'+
      '<label>Decision<select name="decision"><option value="inconclusive">Inconclusive / no change</option><option value="retain_for_testing">Retain as candidate only</option><option value="reject">Reject candidate</option></select></label>'+
      formField('reviewer','Reviewer name / initials','text',true,' maxlength="120"')+
      formField('evidence_ref','Evidence or event references reviewed','text',true,' maxlength="400"')+
      textarea('review_note','Reasoning and counterevidence',true,'Do not claim the birth time has been proven or corrected')+
      submit('Record hypothesis review')+'</form>';
  }
  function gapView(){
    const all=gaps(),ev=evaluation();
    return '<h3 class="apv-section-title">Missing evidence and unsupported claims</h3>'+
    (all.length?'<div class="apv-tablewrap"><table class="apv-table"><thead><tr><th>Record</th><th>ID</th><th>Gap</th></tr></thead><tbody>'+
      all.map(x=>'<tr><td>'+escapeHTML(x.type)+'</td><td>'+escapeHTML(x.id)+'</td><td>'+escapeHTML(x.text)+'</td></tr>').join('')+'</tbody></table></div>':empty('No field-level gaps detected for current records. This does not prove any forecasts accurate or externally verified.'))+
    '<div class="apv-card"><h3>Rule performance — observed local cases only</h3>'+
    (ev.byRule.length?'<div class="apv-tablewrap"><table class="apv-table"><thead><tr><th>Rule</th><th>Reviewed total</th><th>Prospective reviewed</th><th>Prospective matches</th><th>Prospective misses</th><th>All indeterminate</th></tr></thead><tbody>'+
      ev.byRule.map(r=>'<tr><td>'+escapeHTML(r.rule)+'</td><td>'+r.reviewed+'</td><td>'+r.prospective+'</td><td>'+r.match+'</td><td>'+r.miss+'</td><td>'+r.indeterminate+'</td></tr>').join('')+
      '</tbody></table></div>':'<p class="apv-muted">No rule has enough reviewed cases to evaluate. Rule reliability is unknown.</p>')+
      '<p class="apv-muted">Do not compare raw counts across rules as accuracy rates. No random baseline, independence audit, complete outcome surveillance or external replication has been conducted.</p></div>';
  }
  function adviceView(){
    return '<h3 class="apv-section-title">Practical and traditional advice — separate from predictions</h3>'+
      '<form class="apv-form apv-card" id="apv-new-advice"><h3>Document an optional suggestion</h3>'+
      '<label>Category<select name="kind"><option value="practical">Practical action</option><option value="reflection">Reflection</option><option value="traditional">Traditional / devotional practice</option><option value="remedial">Remedial claim requiring extra caution</option></select></label>'+
      '<label>Related prediction (optional)<select name="prediction_id"><option value="">None</option>'+optionsFrom(db.predictions,'prediction_id',p=>p.claim.slice(0,100),'',false)+'</select></label>'+
      textarea('advice','What is suggested?',true,'Specific, voluntary, practical or traditional action')+
      formField('source_ref','Source reference for tradition/remedy','text',false,' maxlength="400" placeholder="Required for traditional/remedial claims"')+
      textarea('limitation','Limitations / risks',true,'Never guarantee a remedy changes real-world events')+
      submit('Save advice, not a verified remedy')+'</form>'+
      (db.advice.length?db.advice.slice().reverse().map(a=>'<div class="apv-card"><h3>'+escapeHTML(a.kind)+' '+status('Not proven to change outcomes')+'</h3><p>'+escapeHTML(a.advice)+'</p>'+
      pair('Source',a.source_ref||'Not provided')+pair('Limitations',a.limitation)+
      pair('Related prediction',a.prediction_id||'None')+'</div>').join(''):empty('No advice recorded. Practical suggestions never count as validation evidence.'));
  }
  function decisionsView(){
    return '<h3 class="apv-section-title">Decision history — local, append-only in the app</h3>'+
      '<p class="apv-muted">Entries are kept rather than silently overwritten; localStorage can still be edited or deleted outside the app. Export backups and use a trusted external repository if tamper evidence is essential.</p>'+
      (db.decisions.length?db.decisions.slice().reverse().map(d=>'<div class="apv-card">'+status(d.action)+
      '<b>'+escapeHTML(d.object_type)+' · '+escapeHTML(d.object_id)+'</b>'+pair('Recorded',d.recorded_at)+
      '<p class="apv-muted">'+escapeHTML(d.detail)+'</p></div>').join(''):empty('No decision has been recorded yet.'));
  }
  function render(){
    const t=tab;
    const map={summary:overview,events:eventsView,hypotheses:hypothesisView,predictions:predictionsView,cases:casesView,review:reviewView,gaps:gapView,advice:adviceView,decisions:decisionsView};
    root.className='apv-root';
    root.innerHTML='<div class="apv-tabs" role="tablist" aria-label="AstroProof evidence workspace">'+
      TABS.map(x=>'<button type="button" role="tab" aria-selected="'+(t===x[0])+'" data-apv-tab="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
      (notice?'<div class="notice" role="status">'+escapeHTML(notice)+'</div>':'')+
      '<div id="apv-panel" role="tabpanel">'+(map[t]||overview)()+'</div>'+
      '<p class="apv-small">AstroProof Evidence Workspace v'+VERSION+' · Private local browser data · No cloud sync or external verification · Traditional predictive validity is unestablished.</p>';
  }
  function formData(form){return Object.fromEntries(new FormData(form).entries())}
  function createEvent(f){
    const reportedDate=f.event_start,precision=f.date_precision||'exact';
    let start=f.event_start,end=f.event_end||start;
    if(isoDate(start)&&precision==='month'){
      start=start.slice(0,7)+'-01';
      const finishDate=isoDate(end)?end:start;
      end=new Date(Date.UTC(Number(finishDate.slice(0,4)),Number(finishDate.slice(5,7)),0)).toISOString().slice(0,10);
    }
    if(isoDate(start)&&precision==='year'){
      start=start.slice(0,4)+'-01-01';
      const finishDate=isoDate(end)?end:start;
      end=finishDate.slice(0,4)+'-12-31';
    }
    if(!validRange(start,end))return fail('Enter a real date range: start on or before end.');
    if(start>day()||end>day())return fail('Life Event Archive is for events that already happened. A future event belongs in a prediction draft.');
    if(!TYPES[f.event_type]||!AREAS.includes(f.life_area))return fail('Choose a valid type and life area.');
    const e={event_id:uid('evt'),person_id:'self',event_type:f.event_type,life_area:f.life_area,event_start:start,event_end:end,
      event_date:start,reported_date:reportedDate,date_precision:precision,purpose:f.purpose,used_for_rectification:f.purpose==='rectification',
      note:clean(f.note),source_ref:clean(f.source_ref),source_kind:f.source_kind||'unknown',
      assumptions:clean(f.assumptions),competing_interpretations:clean(f.competing_interpretations),
      source_status:'unreviewed',evidence_review:null,recorded_at:now(),revealed_at:null,confidence:f.confidence||'unknown'};
    if(!['validation_holdout','rectification'].includes(e.purpose))return fail('Invalid purpose.');
    db.events.push(e);
    persist('event_recorded_unverified','life_event',e.event_id,'purpose='+e.purpose+'; dates='+start+'..'+end);
  }
  function createHypothesis(f){
    const offset=Number(f.offset_min),s=bridge()?.getBirthSensitivity?.();
    if(!Number.isInteger(offset)||Math.abs(offset)>30)return fail('Candidate offset must be an integer from -30 to +30 minutes.');
    if(!clean(f.rationale)||!clean(f.assumptions))return fail('Reason and assumptions are required.');
    const e=f.rectification_event_id?getEvt(f.rectification_event_id):null;
    if(e&&e.purpose!=='rectification')return fail('Only calibration events may support rectification.');
    const candidateComparison=bridge()?.getCandidateComparison?.(offset,e?.event_start||null,e?.event_end||null)||{available:false,reason:'Calculator comparison unavailable'};
    const h={hypothesis_id:uid('hyp'),person_id:'self',offset_min:offset,rationale:clean(f.rationale),
      assumptions:clean(f.assumptions),competing_interpretations:clean(f.competing_interpretations),
      rectification_event_ids:e?[e.event_id]:[],candidate_comparison:candidateComparison,sensitivity_snapshot:s||{available:false,reason:'not calculated'},
      calculation_version:'astroproof-hosted-provisional-1.0',recorded_at:now(),review:null,status:'tentative'};
    db.hypotheses.push(h);
    persist('rectification_candidate_recorded','hypothesis',h.hypothesis_id,'Not a resolved birth time; offset '+offset+' minutes');
  }
  function createPrediction(f){
    const start=f.window_start,end=f.window_end||start;
    if(!validRange(start,end))return fail('A valid start and end date are required.');
    if(!clean(f.claim)||!clean(f.pass_fail_criteria)||!clean(f.assumptions)||!clean(f.calculation_version))return fail('Claim, criteria, assumptions and method are required.');
    if(!AREAS.includes(f.life_area))return fail('Choose a valid life area.');
    const calibration=asList(f.calibration_event_ids);
    if(calibration.some(id=>{const e=getEvt(id);return !e||e.purpose!=='rectification';}))return fail('All declared calibration event IDs must exist and have rectification purpose.');
    const peak=f.peak_at?new Date(f.peak_at).toISOString():null;
    if(peak&&(peak.slice(0,10)<start||peak.slice(0,10)>end))return fail('Refined peak must be inside the declared window.');
    const p={prediction_id:uid('pred'),person_id:'self',life_area:f.life_area,
      claim:clean(f.claim),pass_fail_criteria:clean(f.pass_fail_criteria),specificity_class:f.specificity_class,
      window_start:start,window_end:end,peak_at:peak,peak_dates:peak?[peak]:[],timing_precision:peak?'numerical/local approximation; verify source':'unknown',
      calculation_version:clean(f.calculation_version),source_ref:clean(f.source_ref),
      rule_ids:asList(f.rule_ids),supporting_rule_ids:asList(f.rule_ids),
      calibration_event_ids:calibration,assumptions:clean(f.assumptions),competing_interpretations:clean(f.competing_interpretations),
      independent_support:clean(f.independent_support),confidence:f.confidence||'unknown',
      rank_score:null,status:'draft',created_at:now(),frozen_at:null,freeze_snapshot:null};
    db.predictions.push(p);
    persist('prediction_drafted','prediction',p.prediction_id,'Draft only; no forecast outcome asserted.');
  }
  function freezePrediction(id){
    const p=getPred(id);if(!p||p.frozen_at)return fail('Prediction not found or already frozen.');
    if(!validRange(p.window_start,p.window_end)||!clean(p.pass_fail_criteria))return fail('Prediction is missing test criteria or dates.');
    if(!confirm('Freeze this exact prediction and its evaluation criteria? You cannot modify those fields in the app after freezing. This is not a validation result.'))return;
    p.frozen_at=now();p.status='frozen';p.freeze_snapshot=JSON.parse(JSON.stringify({
      claim:p.claim,pass_fail_criteria:p.pass_fail_criteria,life_area:p.life_area,window_start:p.window_start,
      window_end:p.window_end,peak_at:p.peak_at,rule_ids:p.rule_ids,source_ref:p.source_ref,calibration_event_ids:p.calibration_event_ids,
      assumptions:p.assumptions,competing_interpretations:p.competing_interpretations,calculation_version:p.calculation_version
    }));
    persist('prediction_frozen_not_validated','prediction',p.prediction_id,'Frozen as '+p.frozen_at+'; no evidence of real-world accuracy implied.');
  }
  function createCase(f){
    const p=getPred(f.prediction_id);if(!predictionReady(p))return fail('Select a valid frozen prediction.');
    if(db.cases.some(c=>c.prediction_id===p.prediction_id))return fail('A case already exists for this prediction. Review it instead of duplicating the outcome.');
    const e=f.event_id?getEvt(f.event_id):null;
    if(f.event_id&&!e)return fail('Selected event does not exist.');
    const safety=caseSafety(p,e);
    if(!safety.allowed)return fail(safety.reason);
    const obs=clean(f.observation);
    if(!obs)return fail('Record what was observed, even if the result is unknown.');
    const evaluation_mode=e?(safety.prospective?'prospective':'retrospective_exploratory'):(isFutureAtFreeze(p)?'prospective':'retrospective_exploratory');
    const c={case_id:uid('case'),prediction_id:p.prediction_id,person_id:'self',
      event_id:e?.event_id||null,outcome_kind:e?'event':'no_event',observation:obs,confidence:f.confidence||'unknown',assumptions:clean(f.assumptions),competing_interpretations:clean(f.competing_interpretations),
      follow_up_coverage:clean(f.follow_up_coverage),outcome_evidence_ref:clean(f.outcome_evidence_ref),
      date_overlap:e?safety.overlap:null,evaluation_mode,reported_at:now(),
      reviewer_notes:'',review:null,review_status:'pending_review',
      safety_explanation:safety.reason};
    db.cases.push(c);
    persist('outcome_case_submitted_pending_review','validation_case',c.case_id,safety.reason);
  }
  function reviewSource(f){
    const e=getEvt(f.event_id);if(!e)return fail('Select a valid event.');
    if(!refText(e))return fail('Event source reference is missing.');
    if(!clean(f.reviewer)||!clean(f.evidence_ref)||!clean(f.review_note))return fail('Reviewer, examined evidence and notes are required.');
    e.evidence_review={decision:f.decision,reviewer:clean(f.reviewer),source_ref:clean(f.evidence_ref),
      note:clean(f.review_note),reviewed_at:now(),authentication:'operator-entered; not externally authenticated'};
    persist('event_source_review_recorded','life_event',e.event_id,'Source '+f.decision+'; reviewer '+f.reviewer+'; evidence '+f.evidence_ref);
  }
  function reviewCase(f){
    const c=getCase(f.case_id);if(!c)return fail('Select a valid pending case.');
    const p=getPred(c.prediction_id),e=c.event_id?getEvt(c.event_id):null;
    const problem=checkCaseReview(c,p,e);
    if(problem)return fail(problem);
    if(reviewedCase(c)||c.review_status==='reviewed_documented')return fail('This case already has a recorded decision. Export and create a documented correction record rather than overwriting the review.');
    if(!clean(f.reviewer)||!clean(f.evidence_ref)||!clean(f.review_note)||!clean(f.criterion_observation))
      return fail('Reviewer, evidence, criterion-specific observation and reasoning are required.');
    const assessment=clean(f.criterion_assessment)||'unknown';
    if(!['yes','no','unknown'].includes(assessment))return fail('Invalid criterion assessment.');
    if(f.decision==='match'){
      if(assessment!=='yes')return fail('A match requires an explicit YES that the ORIGINAL frozen criterion was satisfied.');
      if(!e)return fail('A match requires a documented matching event, not merely absence of information.');
      if(!c.date_overlap)return fail('An event outside the frozen date window cannot be marked a match.');
    }else if(f.decision==='miss'){
      if(assessment!=='no')return fail('A miss requires an explicit NO that the ORIGINAL frozen criterion was satisfied.');
      if(p.window_end>=day())return fail('A miss cannot be confirmed before the full prediction window ends.');
    }else if(f.decision==='indeterminate'){
      if(assessment!=='unknown')return fail('An indeterminate decision must keep the frozen criterion unresolved.');
    }else return fail('Invalid review decision.');
    c.review={decision:f.decision,criterion_assessment:assessment,criterion_observation:clean(f.criterion_observation),
      reviewer:clean(f.reviewer),evidence_ref:clean(f.evidence_ref),
      note:clean(f.review_note),reviewed_at:now(),authentication:'operator-entered; not independently authenticated'};
    c.review_status='reviewed_documented';
    persist('validation_case_review_recorded','validation_case',c.case_id,
      'Decision='+f.decision+'; mode='+c.evaluation_mode+'; reviewer='+f.reviewer+'; reference='+f.evidence_ref);
  }
  function reviewHypothesis(f){
    const h=pick(f.hypothesis_id,db.hypotheses,'hypothesis_id');
    if(!h)return fail('Hypothesis not found.');
    if(!clean(f.reviewer)||!clean(f.evidence_ref)||!clean(f.review_note))return fail('Reviewer, evidence reference and reason are required.');
    h.review={decision:f.decision,reviewer:clean(f.reviewer),evidence_ref:clean(f.evidence_ref),note:clean(f.review_note),reviewed_at:now()};
    persist('rectification_hypothesis_reviewed_no_birth_time_certification','hypothesis',h.hypothesis_id,f.decision+'; still not certified rectification');
  }
  function createAdvice(f){
    if(!clean(f.advice)||!clean(f.limitation))return fail('Suggestion and limitations are required.');
    if(['traditional','remedial'].includes(f.kind)&&!clean(f.source_ref))return fail('Traditional and remedial claims require an explicit source.');
    const a={advice_id:uid('advice'),kind:f.kind,prediction_id:f.prediction_id||null,advice:clean(f.advice),
      source_ref:clean(f.source_ref),limitation:clean(f.limitation),created_at:now(),effectiveness:'unverified'};
    db.advice.push(a);persist('optional_advice_recorded_not_validation','advice',a.advice_id,'Traditional effectiveness not established');
  }
  function fail(s){notice='Cannot record this as reviewed: '+s;render();return false}
  function snapshot(){
    const b=bridge(),matrix=b?.getBirthSensitivity?.(),meta=b?.getChartSummary?.();
    if(!matrix||!matrix.available||!meta||!Array.isArray(matrix.rows)||matrix.rows.length<3)return fail('Create a usable birth profile and calculated sensitivity matrix first.');
    const entry={snapshot_id:uid('sens'),matrix:JSON.parse(JSON.stringify(matrix)),chart_engine:meta.engine||'Unknown',
      source_birth_utc:meta.calculated_birth_utc,declared_precision:b.getProfile()?.time_precision||'unknown',
      recorded_at:now(),accuracy_state:'research approximation; no independent ephemeris parity check'};
    db.sensitivity_snapshots.push(entry);
    persist('birth_time_sensitivity_snapshot_saved','sensitivity',entry.snapshot_id,'Numerical matrix; not a validated rectified time');
  }
  function importLegacy(){
    const legacy=bridge()?.getLegacyEvents?.()||[];
    const newOnes=legacy.filter(x=>!db.events.some(e=>e.legacy_id===x.id));
    if(!newOnes.length)return fail('No unimported legacy events are available.');
    if(!confirm('Import '+newOnes.length+' historical records as UNVERIFIED? No source evidence or validation decision will be inferred. Existing records remain unchanged.'))return;
    let count=0;
    for(const x of newOnes){
      if(!isoDate(x.event_date)||!TYPES[x.event_type])continue;
      const p=x.date_precision||'exact',end=p==='month'?new Date(Date.UTC(Number(x.event_date.slice(0,4)),Number(x.event_date.slice(5,7)),0)).toISOString().slice(0,10):
        p==='year'?x.event_date.slice(0,4)+'-12-31':x.event_date;
      const start=p==='year'?x.event_date.slice(0,4)+'-01-01':p==='month'?x.event_date.slice(0,7)+'-01':x.event_date;
      const e={event_id:uid('evt'),legacy_id:x.id,person_id:'self',event_type:x.event_type,life_area:EVENT_AREAS[x.event_type]||'other',
        event_start:start,event_end:end,event_date:start,date_precision:p,purpose:x.purpose==='rectification'?'rectification':'validation_holdout',
        used_for_rectification:x.purpose==='rectification',note:clean(x.note),source_ref:'',source_kind:'unknown',
        assumptions:'Imported from old local archive; date precision and provenance need review.',competing_interpretations:'',
        source_status:'unreviewed',evidence_review:null,recorded_at:now(),revealed_at:null,confidence:'unknown'};
      db.events.push(e);count++;
    }
    persist('legacy_events_imported_unverified','life_event','batch','Imported '+count+' old events; no evidence approvals assumed');
  }
  function makeReport(){
    const s=stats(),ev=s.ev;
    const lines=[
      '# AstroProof Validation & Evidence Report',
      'Generated: '+now(),
      'Protocol: browser evidence workspace '+VERSION,
      'All records are operator-entered and locally stored; this report is not independent proof or astrology accuracy.',
      '',
      'EVIDENCE-BACKED WORKFLOW PROGRESS: '+s.percent+'% ('+s.completed+'/'+s.gs.length+' gates)',
      ...s.gs.map(g=>(g.done?'[recorded] ':'[pending] ')+g.name),
      '',
      'Life events: '+db.events.length+'; reviewed source evidence: '+sourceEvidenceCount(),
      'Rectification hypotheses: '+db.hypotheses.length+' (none automatically declared successful)',
      'Predictions: '+db.predictions.length+'; frozen: '+ev.frozen.length,
      'Validation cases: '+db.cases.length+'; reviewed: '+ev.reviewed.length,
      'Prospective matched: '+ev.matched+'; prospective missed: '+ev.missed,
      'Retrospective/exploratory reviewed: '+ev.exploratory.length,
      'Evidence gaps: '+gaps().length,
      '',
      'PREDICTIONS'
    ];
    for(const p of db.predictions){lines.push(p.prediction_id+' | '+p.life_area+' | '+p.window_start+'..'+p.window_end+' | '+p.status+
      ' | '+p.claim+' | criteria='+p.pass_fail_criteria+' | frozen='+String(p.frozen_at||'NO')+' | evidence='+String(p.source_ref||'MISSING'))}
    lines.push('','CASES');
    for(const c of db.cases)lines.push(c.case_id+' | prediction='+c.prediction_id+' | event='+String(c.event_id||'none')+
      ' | mode='+c.evaluation_mode+' | review='+String(c.review?.decision||'pending')+' | evidence='+String(c.outcome_evidence_ref||'missing'));
    lines.push('','GAPS');
    for(const g of gaps())lines.push(g.type+' | '+g.id+' | '+g.text);
    lines.push('','RULE PERFORMANCE');
    for(const r of ev.byRule)lines.push(r.rule+' | reviewed '+r.reviewed+' | prospective '+r.prospective+' | prospective match '+(r.prospective_matches||0)+' | prospective miss '+(r.prospective_misses||0)+' | unclear '+r.indeterminate);
    lines.push('','DECISION HISTORY');
    for(const d of db.decisions)lines.push(d.recorded_at+' | '+d.action+' | '+d.object_id+' | '+d.detail);
    lines.push('','Conclusions: no unreviewed/rectification cases are claimed as successful validations. Predictive scientific validity is unestablished.');
    return lines.join('\n');
  }
  function download(filename,body,mime){
    const blob=new Blob([body],{type:mime||'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function exportCSV(){
    const rows=[['case_id','prediction_id','frozen_at','window_start','window_end','life_area','case_mode','event_id','observed_overlap','review_decision','reviewer','evidence_ref','reviewed_at']];
    for(const c of db.cases){
      const p=getPred(c.prediction_id)||{};
      rows.push([c.case_id,c.prediction_id,p.frozen_at||'',p.window_start||'',p.window_end||'',p.life_area||'',c.evaluation_mode,c.event_id||'',String(c.date_overlap),c.review?.decision||'pending',c.review?.reviewer||'',c.review?.evidence_ref||'',c.review?.reviewed_at||'']);
    }
    return rows.map(row=>row.map(v=>'"'+String(v||'').replaceAll('"','""')+'"').join(',')).join('\n');
  }
  root.addEventListener('click',e=>{
    const t=e.target.closest('[data-apv-tab]');if(t){tab=t.dataset.apvTab;notice='';render();return}
    const button=e.target.closest('[data-apv-action]');if(!button)return;
    const kind=button.dataset.apvAction,id=button.dataset.id;
    if(kind==='tab'){tab=id;notice='';render()}
    if(kind==='freeze')freezePrediction(id);
    if(kind==='snapshot')snapshot();
    if(kind==='legacy-import')importLegacy();
    if(kind==='load-candidates'){
      try{candidates=bridge()?.getForecastCandidates?.()||[];notice=candidates.length?'Loaded calculated timing candidates. They are not event predictions.':'No timing candidates resolved or no profile entered.';render()}
      catch(err){fail('Candidate calculation failed: '+err.message)}
    }
    if(kind==='use-candidate'){
      const h=candidates[Number(id)],form=root.querySelector('#apv-new-prediction');if(!h||!form)return;
      for(const key of ['window_start','window_end','peak_at','life_area','calculation_version']){
        const el=form.elements.namedItem(key);if(!el)continue;
        el.value=key==='peak_at'?(h.peak_at?h.peak_at.slice(0,16):''):h[key]||'';
      }
      form.elements.namedItem('source_ref').value='Hosted transit candidate: '+h.signal+'; peak '+(h.peak_at||'unknown');
      form.elements.namedItem('assumptions').value='Provisional browser engine; event not predicted by transit alone; birth time sensitivity and independent ephemeris parity not certified.';
      form.elements.namedItem('claim').focus();notice='Timing prefills copied to draft. You must author an observable event claim and pass/fail criteria.';
    }
    if(kind==='download-report')download('astroproof-validation-report-'+day()+'.txt',makeReport(),'text/plain');
    if(kind==='download-json')download('astroproof-validation-results-'+day()+'.json',JSON.stringify({generated_at:now(),protocol:VERSION,progress:stats(),evaluator:evaluation(),gaps:gaps()},null,2),'application/json');
    if(kind==='download-csv')download('astroproof-validation-cases-'+day()+'.csv',exportCSV(),'text/csv');
    if(kind==='download-backup'){
      if(confirm('Export ALL local validation data, including sensitive life event notes and evidence references? Keep this file private.'))
        download('astroproof-validation-backup-'+day()+'.json',JSON.stringify(db,null,2),'application/json');
    }
  });
  root.addEventListener('change',async e=>{
    if(e.target.id!=='apv-import-backup')return;
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    const original=db;
    try{
      if(file.size>5000000)throw new Error('Backup exceeds 5MB import limit. No data were changed.');
      const payload=JSON.parse(await file.text());
      const fields=['events','hypotheses','predictions','cases','advice','sensitivity_snapshots','decisions'];
      if(!payload||typeof payload!=='object'||payload.person_id!=='self'||fields.some(k=>!Array.isArray(payload[k])))
        throw new Error('Not a complete AstroProof validation backup.');
      const all=fields.reduce((sum,k)=>sum+payload[k].length,0);
      if(all>50000)throw new Error('Too many records to safely import.');
      const unique=(arr,k)=>new Set(arr.map(x=>x?.[k])).size===arr.length&&arr.every(x=>typeof x?.[k]==='string'&&x[k]);
      if(!unique(payload.events,'event_id')||!unique(payload.predictions,'prediction_id')||
         !unique(payload.cases,'case_id')||!unique(payload.hypotheses,'hypothesis_id')||
         !unique(payload.decisions,'decision_id'))throw new Error('Missing or duplicate identifiers.');
      if(payload.events.some(x=>!validRange(x.event_start,x.event_end)||
         !['validation_holdout','rectification'].includes(x.purpose)||
         x.used_for_rectification!==(x.purpose==='rectification')))
         throw new Error('Life-event dates or purpose flags are inconsistent.');
      if(payload.predictions.some(p=>!validRange(p.window_start,p.window_end)||
        !['draft','frozen'].includes(p.status)||
        (p.status==='frozen'&&!predictionReady(p))))
         throw new Error('Invalid prediction dates or frozen record.');
      db=payload;
      for(const cc of db.cases){
        const p=getPred(cc.prediction_id),ev=cc.event_id?getEvt(cc.event_id):null;
        if(!p||!predictionReady(p)||cc.event_id&&!ev||!caseSafety(p,ev).allowed)
          throw new Error('One imported validation case violates the freeze or leakage firewall.');
        if(cc.review_status==='reviewed_documented'&&(!reviewedCase(cc)||checkCaseReview(cc,p,ev)))
          throw new Error('One imported reviewed case is missing its evidence chain.');
      }
      if(!confirm('Restore '+payload.events.length+' events, '+payload.predictions.length+
        ' predictions and '+payload.cases.length+' cases? This replaces this browser’s current Validation Workspace. Export a backup of existing data first.')){db=original;render();return}
      log('backup_restored_operator_supplied','workspace','all','Imported local JSON backup; reviewer identities and source references are not independently authenticated.');
      save();notice='Validation backup restored. Source evidence remains operator-entered and must not be treated as externally authenticated.';render();
    }catch(err){db=original;notice='Backup not imported: '+err.message;render();}
  });
  root.addEventListener('submit',e=>{
    const f=e.target;if(!f.matches('form[id^="apv-"]'))return;
    e.preventDefault();const fields=formData(f);
    try{
      const actions={
        'apv-new-event':createEvent,'apv-new-hypothesis':createHypothesis,
        'apv-new-prediction':createPrediction,'apv-new-case':createCase,
        'apv-review-source':reviewSource,'apv-review-case':reviewCase,
        'apv-review-hypothesis':reviewHypothesis,'apv-new-advice':createAdvice
      };
      actions[f.id]?.(fields);
    }catch(err){fail('Could not save record: '+err.message)}
  });
  window.AstroProofValidation={
    render:()=>{render()},
    getSummary:()=>{const s=stats();return {progress_percent:s.percent,evidence_gates:s.completed,total_gates:s.gs.length,
       events:db.events.length,predictions:db.predictions.length,cases:db.cases.length,reviewed_cases:evaluation().reviewed.length,
       prospective_matches:evaluation().matched,prospective_misses:evaluation().missed}},
    testGuards:()=>({
      rectificationBlocked:caseSafety({frozen_at:now(),claim:'x',pass_fail_criteria:'x',window_start:'2026-01-01',window_end:'2026-12-31',calculation_version:'x',calibration_event_ids:[]},
        {event_id:'fixture',purpose:'rectification',event_start:'2026-02-01',event_end:'2026-02-01',recorded_at:now()}).allowed===false,
      futureNotCurrent:!isFutureAtFreeze({frozen_at:'2026-12-01T00:00:00.000Z',window_start:'2026-11-01'}),
      missingEvidenceNotReviewed:!reviewedCase({review:null})
    })
  };
  render();
})();