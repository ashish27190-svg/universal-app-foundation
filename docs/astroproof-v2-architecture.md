# AstroProof v2 — Architecture Rethink

Date: 2026-09-26
Status: governing product architecture for the next build

## Product thesis

AstroProof should not be a chart calculator with a chat box.

It should answer, in this order:

1. What matters in my life pattern?
2. What is active now?
3. What is likely to become astrologically active next?
4. Which life area does that affect?
5. Why is AstroProof saying this?
6. Which traditions agree or disagree?
7. What happened later?

The product is therefore:

**Personal Atlas -> Now -> Timeline -> Life Areas -> Ask -> Evidence -> Reality Check**

## What we learned from leading products

### CHANI
Strong:
- time-first home architecture: Today / This Week / This Year
- personalized transit interpretation
- practical daily habit and recurring content

Do not copy:
- do not make ritual/audio content the core of AstroProof

### The Pattern
Strong:
- plain-language personality and cycle interpretation
- no astrology knowledge required
- Time Travel for past/present/future dates
- AI conversation grounded in the person's pattern
- relationship/bond exploration

Do not copy:
- avoid vague language that hides the actual chart evidence
- evidence should always be available

### TimePassages
Strong:
- technical chart depth
- exact transit date ranges
- progressions
- solar/lunar returns
- graphical timing
- relationship/comparison charts

Do not copy:
- do not make technical astrology the first screen for beginners

### AstroSage
Strong:
- deep Vedic feature coverage
- Vimshottari, divisional charts, Shadbala/Bhavbala, Ashtakavarga
- multiple dashas
- Sade Sati, transit, yogas/doshas
- Varshphal and KP

Do not copy:
- avoid menu overload and hundreds of calculations without prioritization

### Clickastro
Strong:
- long-horizon life reports
- bhava analysis
- Dasa/Apahara/Paryanthar timing
- yogas/doshas
- Ashtakavarga and transit forecasting
- life-area-specific products

Do not copy:
- avoid 60–300 page report dumps as the primary experience

### AstroTalk / Sanctuary / Nebula
Strong:
- immediate answers and human-style conversation
- users can ask follow-ups
- strong relationship/compatibility demand

Do not copy:
- AstroProof does not need to become a psychic marketplace
- human consultation is optional future expansion, not core architecture

### Co-Star
Strong:
- recurring daily habit
- compatibility/social loop
- compact notifications

Do not copy:
- no cryptic or deliberately alarming messages
- no unsupported certainty

## Core design principle

Users repeatedly report two failure modes in astrology apps:
- generic/vague readings
- overwhelming technical complexity

AstroProof solves both with progressive disclosure.

Every insight has 4 levels:

### Level 1 — Headline
One plain-language sentence.

### Level 2 — Meaning
2–5 sentences explaining the traditional interpretation.

### Level 3 — Why
Exact chart/timing factors used.

### Level 4 — Evidence
Calculation values, conventions, source/rule IDs, competing interpretations.

The default screen shows Level 1–2.
Experts can open Level 3–4.

## New information architecture

### 1. Home / Now
The primary daily screen.

Sections:
- Your current phase
- Top 3 themes today/this week
- One strongest upcoming window
- Life-area heatmap: career, money, relationships, family, wellbeing, learning, travel
- Current MD/AD/PD
- Important current transits
- “Why?” on every item
- Reality Check items due soon

Tabs:
- Today
- This Week
- This Month
- This Year

### 2. Personal Atlas
Stable natal interpretation.

Sections:
- 60-second life brief
- identity & temperament
- career/vocation
- money/resources
- love/partnership
- home/family
- wellbeing/routines
- learning/communication
- travel/relocation
- creativity/children
- purpose/meaning

Each section:
- key pattern
- strengths
- tensions
- natal evidence
- Vedic view
- Western view
- Numerology view
- BaZi view
- agreement/disagreement

### 3. Timeline
Inspired by Time Travel + professional transit tools.

Modes:
- Past date
- Today
- Future date
- Next 90 days
- Next 12 months
- Multi-year

For any date:
- active Western transits
- Vedic MD/AD/PD
- Vedic gochar
- annual cycle
- numerology personal year/month
- BaZi annual/month pillar
- life areas activated
- ranked traditional forecast windows

### 4. Life Areas
Dedicated dashboards:
- Career
- Money
- Relationships
- Family/Home
- Wellbeing
- Learning
- Travel/Relocation
- Creativity/Children

Every life-area page:
- natal baseline
- current activation
- next 90 days
- next 12 months
- long-term cycle
- questions people usually ask
- evidence drawer

### 5. Ask AstroProof
Question optional, not mandatory.

Before free text:
- suggested questions generated from current context
- “What should I pay attention to?”
- “What is changing in career?”
- “Why does this period feel difficult?”
- “What is the strongest relationship window?”
- “What changes if my birth time is wrong?”

Response structure:
1. direct answer
2. traditional timing window
3. supporting methods
4. contradicting methods
5. uncertainty / birth-time sensitivity
6. suggested next questions
7. optionally add testable claim to Reality Check

### 6. Relationships
High-retention feature.

Functions:
- add another profile with consent
- synastry
- composite / comparison chart
- Vedic compatibility where appropriate
- relationship timing
- plain-language dynamics
- no single compatibility score presented as truth

### 7. Evidence / Charts
Advanced layer only.

Includes:
- Western wheel
- Vedic D1
- D9
- D10
- additional vargas when relevant
- planetary table
- dignities
- house lords
- aspects
- shadbala / bhavbala
- ashtakavarga
- dashas
- gochar
- progressions
- returns
- BaZi pillars

### 8. Reality Check
AstroProof differentiator.

For each eligible forecast:
- frozen statement
- window
- affected life area
- supporting methods
- contradicting methods
- objective criterion
- later outcome
- append-only correction
- result status

### 9. My Data
- birth profiles
- time accuracy
- conventions
- permissions
- export
- delete
- sync status
- subscription
- privacy

## Calculation architecture

### A. Birth data normalization
Input:
- date
- time
- time precision
- place
- coordinates
- historical timezone/DST
- source of birth time
- optional birth-time uncertainty

Output:
- normalized UTC instant
- location
- time-quality score
- sensitivity windows

### B. Western engine
Must eventually support:
- tropical positions
- selectable house system
- aspects
- dignities
- angles
- transits to natal
- ingress/station
- applying/separating
- exact date search
- secondary progressions
- solar arc
- solar/lunar/planetary returns

### C. Vedic engine
Must eventually support:
- Lahiri and explicit ayanamsa convention
- D1
- nakshatra/pada
- functional house lords
- graha dignity
- combustion/retrograde
- aspects
- conjunctions
- yogas/doshas
- D9 / D10
- additional vargas as required by life area
- Vimshottari MD/AD/PD, later Sookshma/Prana where justified
- gochar
- Sade Sati
- Shadbala
- Bhavbala
- Ashtakavarga
- optional Jaimini/KP/Varshphal modules, kept separate by school

### D. Numerology engine
Keep schools separate:
- Pythagorean
- Chaldean
- date numbers
- name numbers
- personal year/month/day
- pinnacles/challenges

Do not average conflicting schools.

### E. BaZi engine
Must eventually support:
- Four Pillars
- true solar time convention
- hidden stems
- Ten Gods
- Day Master strength
- season/solar-term logic
- useful/unfavorable elements
- Da Yun
- annual/monthly pillars
- interactions

## Interpretation architecture

Never let AI calculate astronomy.

Pipeline:

Birth data
-> deterministic facts
-> feature extraction
-> rule engine
-> timing activations
-> life-area activation graph
-> tradition-specific interpretation
-> independent specialist analyses
-> synthesis
-> falsification/vagueness check
-> user-facing result

### Interpretation record
Every meaningful insight stores:
- insight_id
- topic
- headline
- interpretation
- tradition
- supporting_fact_ids
- supporting_rule_ids
- source_ids
- start/end window
- contradicting_fact_ids
- convention/version
- birth-time sensitivity
- generated_at
- status

## Forecast ranking architecture

A forecast is ranked, never called “accurate probability”.

Ranking inputs:
- technique importance
- exactness / orb
- natal relevance
- life-area relevance
- MD/AD/PD activation
- divisional confirmation
- transit convergence
- independent tradition convergence
- contradiction penalty
- birth-data quality penalty

Output:
- priority rank
- not probability

## AI Council architecture

Do not run 7 agents on every request.

Routing:
- simple factual chart question -> deterministic engine only
- one-tradition interpretation -> one specialist
- important life/timing question -> specialists + synthesis
- forecast being frozen -> falsification/provenance reviewer

Specialists:
1. Vedic
2. Western
3. BaZi
4. Numerology

Review:
5. Synthesis
6. Falsification
7. Provenance

Independent first pass; no forced unanimity.

## Persistence architecture

Every expensive/non-deterministic generation must be saved.

Entities:
- users
- profiles
- calculation_snapshots
- chart_facts
- interpretation_rules
- generated_insights
- generations
- forecast_windows
- reality_check_records
- outcomes
- source_library
- convention_versions

Every generation:
- immutable ID
- model
- prompt version
- calculation snapshot
- token/cost
- created_at
- user feedback

## Production stack decision

The static GitHub Pages build remains the browser prototype.

Production architecture should be a dedicated AstroProof app:
- Next.js App Router frontend
- server-side API / calculation service
- dedicated AstroProof database
- auth
- calculation service separated from interpretation
- AI gateway/provider behind server
- persistent generation history
- rate limiting
- audit/versioning
- production observability

Do not store production birth data in an unrelated project.

## Home screen priority algorithm

The home screen must not display 40 transits.

It selects:
1. current period
2. strongest 3 active themes
3. strongest near-term window
4. strongest year-level change
5. one unresolved contradiction if material

Everything else is behind “See all timing”.

## What we explicitly will NOT build into the core

- tarot
- palm reading
- psychic marketplace
- fear-based notifications
- forced remedies
- fake accuracy scores
- guaranteed future events
- one universal “compatibility score”
- chart tables as the homepage
- multiple astrology schools mixed without labels

## Release sequence

### Phase 1 — Product intelligence
- richer natal synthesis
- deep Vedic layer
- exact transit windows
- current phase
- Now / Week / Month / Year
- Timeline
- improved Life Areas
- provenance cards

### Phase 2 — Advanced timing
- progressions
- returns
- Shadbala/Bhavbala/Ashtakavarga
- Sade Sati / node transits
- stronger D9/D10
- full BaZi

### Phase 3 — Ask / Council
- grounded AI
- generation persistence
- independent specialists
- falsification/provenance review

### Phase 4 — Productization
- dedicated app
- auth/sync
- relationships
- subscriptions
- push notifications
- secure export/delete
- production QA

## Definition of done

AstroProof is not complete when it has every chart.

It is complete when a new user can enter birth details once and, without knowing astrology or asking a question, understand:
- who they are according to the selected traditions
- what is active now
- what may become active next
- where the traditions agree/disagree
- why each important statement was produced
- how to test the statement later

And the product does this securely, repeatably and with verified calculations.
