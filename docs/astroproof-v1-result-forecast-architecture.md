# AstroProof v1 — Result & Forecast Architecture

Status: architecture baseline after live v0.5 audit
Date: 2026-09-23

## Core product decision

AstroProof is NOT primarily a chart viewer and NOT primarily an empty chatbot.

The default user story is:

1. Enter birth details once.
2. Validate time/place/timezone and calculation conventions.
3. Generate a Personal Life Brief automatically.
4. Show major life patterns across multiple traditions.
5. Show the current traditional timing phase.
6. Show near-term and longer-term forecast windows.
7. Let the user drill into Career, Money, Relationships, Family, Wellbeing, Learning, Travel and major life periods.
8. Show the calculation/rule/source behind every important interpretation.
9. Allow suggested follow-up questions.
10. Freeze testable forecast claims into the Reality Check ledger and review outcomes later.

Charts are supporting evidence, not the main experience.

## Audit of v0.5

### Working
- Browser-local birth profile.
- Tropical planetary positions using Astronomy Engine.
- Approximate sidereal conversion.
- Ascendant / whole-sign house framework.
- Nakshatra and Vimshottari period arithmetic.
- D9 and corrected D10 sign mapping.
- Numerology arithmetic.
- Partial Chinese sexagenary framework.
- Chart display.
- Data export and local Reality Check ledger.

### Critical product gaps
1. Report engine is shallow. It mainly prints positions and generic sign keywords.
2. No automatic life briefing after birth details.
3. No ranked major themes.
4. No natal synthesis across house ruler, planets, aspects, strengths and divisional confirmation.
5. No serious Vedic strength model: dignity, functional rulership, combustion, retrograde state, Shadbala, Ashtakavarga, yogas, doshas, Arudha, Upapada etc.
6. No transit-to-natal event engine with exact date windows.
7. No Western progression / Solar Return layer.
8. No Vedic Pratyantar Dasha and multi-layer Dasha + transit activation.
9. No forecast confidence architecture based on method convergence / data quality.
10. Chinese/BaZi hosted implementation is incomplete.
11. Q&A intentionally blocks many future-looking questions instead of reframing them as transparent traditional forecasts.
12. No interpretation provenance: calculation -> rule -> tradition/source -> interpretation -> forecast claim.
13. No persistent generation history / versioning.
14. No cloud account, secure sync or subscription layer.
15. No independent production-grade astrology calculation certification.

## Market lessons

### TimePassages
Useful benchmark features:
- full natal report
- current transits
- exact aspect date ranges
- 3/6/12-month transit surveys
- progressions
- Solar/Lunar returns
- graphical timing timeline
- daily horoscope connected to natal chart

### Indian/Vedic products
The stronger report products generally go much deeper than sign positions:
- Vimshottari timing
- divisional charts
- yogas / doshas
- planetary strength
- transits / gochar
- life-area reports
- long-range timing periods

### Product implication
AstroProof must beat “chart + canned paragraph” by combining:
- calculation depth
- plain-language synthesis
- multi-method timing
- evidence/provenance
- disagreement visibility
- prospective Reality Check

## Result architecture

### Layer 0 — Data Quality
- exact vs estimated birth time
- timezone confidence
- coordinate source
- conventions
- calculation engine/version
- sensitivity flag if +/- 5–15 minutes changes Ascendant/divisional results

### Layer 1 — 60-second Life Brief
Five to eight ranked statements:
- core orientation
- work/career pattern
- relationships pattern
- money/resources pattern
- emotional/home pattern
- major growth tension
- current life phase
- next important window

Each statement must contain:
- plain-language headline
- short interpretation
- supporting methods
- “why” expandable evidence
- data-quality / convention caveat if material

### Layer 2 — Life Atlas
Sections:
- Identity & temperament
- Career & vocation
- Money & resources
- Love & partnership
- Home & family
- Wellbeing & routines
- Learning & communication
- Travel / relocation / worldview
- Creativity / children / legacy
- Spiritual / introspective themes

Each section:
- Key pattern
- Strengths
- Frictions
- Recurring lesson
- Timing now
- Next window
- Supporting Vedic / Western / Numerology / BaZi views
- disagreements

### Layer 3 — Timing Engine
#### Vedic
- Mahadasha
- Antardasha
- Pratyantar
- Dasha lord natal condition
- house rulership + occupation
- divisional confirmation
- transit activation
- Sade Sati / Jupiter / Saturn / Rahu-Ketu where relevant
- Ashtakavarga support later

#### Western
- current transits to natal planets/angles
- applying/separating
- orb
- exact dates
- ingress / station / house changes
- secondary progressions
- Solar Arc
- Solar Return

#### Numerology
- Personal Year
- Personal Month
- Pinnacles / Challenges
- name/date systems kept separate by convention

#### BaZi
- full Four Pillars
- hidden stems
- Ten Gods
- Day Master strength
- useful/unfavorable element analysis
- Da Yun
- annual / monthly pillar interactions

### Layer 4 — Forecast Windows
Forecasts are generated as windows, not fake certainty.

Each forecast object:
- topic
- start/end
- peak date(s)
- traditional interpretation
- supporting techniques
- contradicting techniques
- data-quality
- specificity class
- testable claim when appropriate
- user-impact explanation
- Reality Check eligibility

No “95% accurate” or deterministic event claim.

### Layer 5 — Council
Independent first pass:
1. Vedic analyst
2. Western analyst
3. BaZi analyst
4. Numerology analyst

Then:
5. Synthesis agent
6. Falsification / vagueness reviewer
7. Provenance verifier

Do not force unanimity.

### Layer 6 — Reality Check
Prediction frozen before the outcome:
- statement
- evaluation window
- pass/fail rule
- method provenance
- version
- later outcome
- correction append-only
- misses remain visible

## Technical architecture

### Deterministic calculation service
Must own:
- ephemeris
- timezone/history
- houses/angles
- Vedic divisional charts
- dashas
- yogas/strengths
- Western timing
- BaZi calculations
- numerology

AI must never invent these.

### Interpretation service
Structured rule objects, not free-form text blobs:
- rule_id
- tradition
- required chart facts
- interpretation
- topic
- polarity/strength metadata
- source/provenance
- school/convention
- conflicts

### Forecast service
Combines timing activations into ranked windows.

### AI Council service
Receives structured chart + rule evidence.
Produces:
- synthesis
- disagreements
- suggested questions
- plain-language explanation
- no raw calculation invention

### Persistence
Every generated report / Council answer receives:
- immutable ID
- calculation snapshot ID
- prompt/rule version
- model/version
- timestamp
- token/cost metadata
- user feedback
- Reality Check links

## UI information hierarchy

Home after calculation:
1. Life Brief
2. Current Phase
3. Next 90 Days
4. Next 12 Months
5. Life Areas
6. Timeline
7. Ask AstroProof
8. Evidence / Charts
9. Reality Check

Charts are not first.

## Release gates
AstroProof is not complete until:
- Vedic calculations independently validated.
- D9/D10 and timing control cases pass.
- Full BaZi verified.
- Transit exact-date engine verified.
- Interpretation provenance exists.
- Automatic Life Brief is useful without questions.
- Forecast windows are inspectable and testable.
- Live Council works and persists generations.
- Secure cloud account/RLS works.
- Data deletion/export works.
- Payments tested.
- Mobile/desktop/browser E2E passes.
- licensing is commercially cleared.
