# AstroProof v3 — Knowledge, Prediction & Validation Engine

Date: 2026-09-26
Status: Governing architecture for research-grade prediction work

## North star

AstroProof should not aim to sound like the most confident astrologer.

It should aim to be the most traceable, testable and internally consistent astrology intelligence system we can build.

The system may aggregate tens of thousands of book/catalog references over time, but it must never pretend that book volume itself proves predictive validity.

The pipeline is:

Corpus Registry
-> Rights Filter
-> Source Parsing
-> Atomic Rule Extraction
-> Tradition/School Separation
-> Rule Graph
-> Deterministic Calculations
-> Candidate Interpretations
-> Historical Backtests
-> Locked Holdouts / Negative Controls
-> Rule Weighting
-> Personal Reading
-> Prospective Reality Check

## 1. The 50,000+ book idea — corrected

### What we can scale to 50,000+
- bibliographic metadata
- title / author / edition / date
- tradition / school
- topic tags
- catalog links
- rights status
- citation graph
- reputation / historical influence
- duplicate/translation relationships

### What we must NOT do automatically
- copy the full text of tens of thousands of copyrighted books
- treat unauthorized scans as a lawful training corpus
- merge translations as if they were the original text
- mix schools without recording conflicts
- convert repeated claims into “truth” merely because many books repeat them

### Full text tiers

TIER A — Public domain / openly licensed
May be processed according to the actual license.

TIER B — Licensed by AstroProof
May be processed within the license scope.

TIER C — User-provided / privately licensed
May be used only for the permitted account/workflow.

TIER D — Copyrighted / rights unclear
Metadata and bibliographic reference only until rights are cleared.

## 2. Source hierarchy

Every rule receives provenance and source quality metadata.

### Vedic/Jyotish
Priority groups:
1. classical/root texts and lawfully usable translations
2. recognized commentaries
3. major modern schools/authors
4. software/reference implementations
5. practitioner rules / contemporary material

Schools remain distinct:
- Parashara
- Jaimini
- Tajika/Varshaphala
- KP
- Nadi where a rule can actually be formalized
- other documented schools

### Western
Separate:
- Hellenistic
- Medieval
- Renaissance / traditional
- modern psychological
- modern predictive
- Uranian/Hamburg etc. if added later

### Chinese
Separate:
- BaZi / Four Pillars
- Zi Ping lineages/conventions
- Zi Wei Dou Shu only if intentionally added
- date/time / true-solar-time conventions

### Numerology
Separate:
- Pythagorean-style
- Chaldean
- other named systems

No hidden blending.

## 3. Atomic Rule Model

Books are not stored as giant prose blobs for prediction.

Each extracted rule becomes an atomic object:

- rule_id
- tradition
- school
- source_id
- edition / translation
- source_locator
- source_text_hash
- topic
- prerequisites
- calculation facts required
- condition expression
- claimed interpretation
- timing scope
- polarity
- specificity class
- contraindications / exceptions
- conflicting_rule_ids
- extraction method
- human-review status
- rights status
- test status
- sample size
- historical score
- holdout score
- prospective score
- version

Example concept:

IF
- Vedic 10th lord is in 11th
AND
- 10th lord is not severely weakened under the selected rule set
THEN
- candidate career/gain interpretation

The AI may explain the rule.
It may not invent the condition.

## 4. Rule conflict engine

Conflicts are first-class data.

When sources disagree, AstroProof stores:
- school A says X
- school B says Y
- convention A changes the result
- convention B changes the result
- historical test result for each rule if available

The Council must show disagreement instead of averaging it away.

## 5. Prediction object

Every meaningful forecast becomes a structured object before prose generation:

- prediction_id
- profile_snapshot_id
- life_area
- claim
- specificity_class
- window_start
- window_end
- peak_dates
- supporting_rule_ids
- supporting_techniques
- contradicting_rule_ids
- contradicting_techniques
- birth_time_sensitivity
- convention_sensitivity
- source_quality
- calculation_version
- rank_score
- frozen_at
- reality_check_eligible

Rank score is NOT “probability that the event will happen.”

## 6. Historical validation architecture

### Golden rule
Do not show the engine the answer before testing it.

### Dataset split

A. Rule-development corpus
Used to digitize and formalize historical astrology rules.

B. Calibration corpus
Used to tune non-outcome parameters such as orbs, event taxonomy and data-quality thresholds.

C. Locked historical holdout
Events remain hidden until predictions have been frozen.

D. Prospective Reality Check
Predictions are timestamped before the future window occurs.

### Birth-data quality
Use explicit reliability ratings.
Do not treat an approximate or rectified time as equivalent to an official record.

### Event quality
Each event needs:
- event_type
- date precision
- independent source
- source quality
- whether event was public before prediction freeze
- ambiguity flag

## 7. Past-match protocol for an individual

There are TWO modes.

### Mode 1 — Audit / validation
1. Input birth details.
2. Hide known life events from prediction engine.
3. Engine produces dated windows and life-area claims.
4. Freeze output.
5. Reveal historical events.
6. Score matches/misses/ambiguity.

This can tell us how well the rules fit that person's recorded past without retrofitting.

### Mode 2 — Birth-time rectification / personalization
Past events ARE allowed as input.
The output must be labeled “fit/calibrated using these events.”
These same events can never then be counted as validation evidence.

Never mix Mode 1 and Mode 2.

## 8. Negative controls

AstroProof validation must include controls that astrology products usually omit:

- shuffled birth times
- shuffled birth dates where appropriate
- wrong-location controls
- random-person chart matching
- broad Barnum-style text baseline
- non-astrological demographic/time-series baseline where relevant
- random timing windows with equal coverage
- alternate astrology conventions

If the astrology system does not outperform controls under a defined task, AstroProof records the negative result.

## 9. Avoiding the “prediction coverage” trick

A system can look accurate by predicting almost everything.

Every prediction therefore records:
- time-window width
- number of life areas covered
- specificity
- number of claims generated

Metrics must penalize:
- huge windows
- vague claims
- high claim volume
- post-hoc reinterpretation

## 10. Evaluation metrics

For event-window forecasts:
- precision
- recall
- F1
- temporal intersection-over-union
- false-positive rate
- coverage-adjusted score

For ranked windows:
- hit rate@K
- mean reciprocal rank where appropriate
- lift over matched random windows

For profile matching:
- blinded forced-choice accuracy
- lift over chance

For user-rated interpretations:
- compare against Barnum/control text
- blinded preference where possible

If probabilities are ever introduced:
- Brier score
- calibration curve
- log loss

Do not output probabilities until a defensible probability model exists.

## 11. Rule promotion ladder

A rule progresses through:

R0 — extracted
R1 — source verified
R2 — calculation unit-tested
R3 — historical exploratory support
R4 — independent holdout support
R5 — prospective support
R6 — replicated across datasets / populations

The user-facing system may use lower-level traditional rules, but it must label them differently from empirically supported rules.

## 12. Prediction synthesis

Do NOT use book majority vote.

Candidate insight weight should consider:
- rule source quality
- calculation certainty
- birth-time quality
- convention sensitivity
- natal relevance
- timing exactness
- independent technique convergence
- out-of-sample rule performance
- contradiction penalty

The AI Council translates and challenges the evidence.
It does not determine planetary facts.

## 13. Personal calibration

AstroProof can learn that a given user's Reality Check history shows some rule families appear more or less useful for them.

But:
- do not rewrite old forecasts
- do not call personal calibration scientific proof
- do not overfit a few outcomes
- preserve the unpersonalized baseline
- show sample size

## 14. Knowledge ingestion pipeline

1. Discover source metadata.
2. Rights classification.
3. Deduplicate editions/translations.
4. Parse chapters/sections.
5. Extract candidate rules.
6. Attach exact provenance.
7. Run deterministic-rule feasibility test.
8. Human/automated review.
9. Store conflict relationships.
10. Add calculation tests.
11. Evaluate on historical data.
12. Promote/demote rule status.

## 15. Initial source families

The registry should start with influential sources, then expand systematically.

Vedic examples:
- Brihat Parashara Hora Shastra
- Brihat Jataka
- Saravali
- Phaladeepika
- Jataka Parijata
- Uttara Kalamrita
- recognized later commentaries and B.V. Raman-era literature as rights allow

Western examples:
- Ptolemy, Tetrabiblos
- Dorotheus / Valens traditions where lawful editions are available
- William Lilly, Christian Astrology
- public-domain Alan Leo / Sepharial-era texts
- later major predictive works as metadata/licensed sources

Chinese examples:
- San Ming Tong Hui
- Di Tian Sui
- Zi Ping Zhen Quan
- Qiong Tong Bao Jian
- documented modern commentaries under appropriate rights

Numerology:
- public-domain historical sources
- named modern systems stored separately and only full-text processed when rights allow

## 16. Data sources for testing

Candidate research datasets include:
- Astro-Databank records with explicit source/reliability metadata, subject to terms/rights
- Open Gauquelin Database open research data
- curated public biographies/event timelines with independent citations
- opt-in user Reality Check data
- specially recruited prospective cohort

No dataset is assumed clean merely because it is famous.

## 17. Research ledger

Every test run stores:
- hypothesis
- code/rule version
- dataset version
- split
- preprocessing
- metrics
- negative controls
- result
- failure notes
- whether analysis was exploratory or confirmatory

No deleting failed tests from the record.

## 18. Consumer result architecture

The user still sees a simple product:

### What matters now
Top 3 ranked themes.

### What comes next
Near-term and longer-term windows.

### Life Atlas
Stable patterns.

### Why
Supporting traditions and exact calculation facts.

### Evidence
Rules and sources.

### Reality Check
Freeze and later score.

The complexity belongs underneath.

## 19. Scientific honesty layer

Astrology has not been established as a scientifically reliable predictor of individual outcomes. Historic controlled tests, including a well-known double-blind Nature study, have reported results consistent with chance for tested natal-chart claims.

AstroProof therefore separates:
1. astronomical/calculation correctness
2. traditional/source fidelity
3. historical backtest performance
4. locked holdout performance
5. prospective performance

Only #3–#5 speak to predictive performance, and even positive results require replication.

## 20. Definition of the “best version”

Not:
“50,000 books agree.”

Instead:
“We found 37 documented rules relevant to this question across 6 schools. 14 are calculable under your selected conventions. 5 are active in your chart. 3 point in one direction, 1 is neutral, 1 contradicts. Two of the active rule families have out-of-sample support in our current research set; three are traditional-only. Your birth-time uncertainty materially affects one result.”

That is the AstroProof standard.


## 21. Guidance, remedies, prayers and practical action

AstroProof should answer not only “what does this period traditionally indicate?” but also “what can I do with this information?”

This layer must remain separate from prediction and must never claim that a remedy guarantees an outcome.

### Guidance hierarchy

Every important reading may offer up to five clearly separated response types:

1. **Practical action**
   - planning
   - communication
   - documentation
   - skill building
   - budgeting
   - rest/routine
   - relationship conversation
   - preparation for a known high-pressure period

2. **Reflection**
   - journaling prompts
   - questions to consider
   - behavioural patterns to observe
   - Reality Check prompts

3. **Traditional practice**
   - tradition-specific observances
   - charity/service suggestions
   - fasting/ritual references where appropriate
   - clearly labelled as traditional belief/practice, not proven intervention

4. **Prayer / mantra**
   - exact prayer/mantra title
   - tradition / deity / purpose
   - source/provenance
   - original-script text only when rights/source are clear
   - transliteration
   - plain-language meaning
   - suggested traditional timing/recitation practice only when sourced
   - no claim that recitation guarantees a material event

5. **Avoid / caution**
   - what the user may wish to avoid during a traditionally difficult period
   - always framed as optional caution, not fear-based prohibition
   - never override medical, legal, employment, financial or safety advice

### Recommendation object

Each recommendation should store:
- recommendation_id
- linked_insight_id / prediction_id
- category: practical | reflection | traditional_remedy | prayer_mantra | caution
- title
- instruction
- rationale
- tradition
- source_ids
- evidence_level
- contraindications
- safety_notes
- start/end window if relevant
- optional recurrence
- user_feedback
- created_at
- version

### Evidence labels

Recommendations must display one of:
- **Practical / non-astrological**
- **Traditional practice**
- **Source-backed mantra/prayer**
- **Experimental / personal reflection**

Do not collapse these into one “remedy score”.

### Remedy safety rules

- No guaranteed cure, wealth, marriage, job, conception, legal outcome or protection claim.
- No replacement for medical care, therapy, legal advice, financial advice or emergency action.
- Avoid expensive gemstones, paid rituals, donations or products as default recommendations.
- If gemstones are ever added, they require a dedicated source/safety/convention review because schools disagree and users can spend significant money.
- Do not use fear (“bad period”, “danger will happen”) to push remedies.
- Prefer low-cost, reversible, optional practices.
- Preserve school disagreements.

### User experience

Each major insight should end with:

**What you can do now**
- 1–3 practical suggestions

**If you want a traditional practice**
- optional prayer/mantra/remedy, source-labelled

**What to watch**
- observable behaviour/event for Reality Check

### Personalization

A user may choose:
- practical-only
- practical + reflective
- include traditional remedies
- include prayers/mantras
- preferred language/script
- preferred tradition

Default should be practical + reflective.
Traditional remedies/prayers are opt-in.
