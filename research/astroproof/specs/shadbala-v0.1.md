# AstroProof Shadbala Specification Gate v0.1

Status: **SPECIFICATION ONLY — NOT APPROVED FOR PREDICTION WEIGHTING**

Date: 2026-09-27

## Why this gate exists

Shadbala is a six-part quantitative strength system for the seven classical grahas (Sun through Saturn). A wrong implementation would contaminate dignity weighting, yoga qualification, dasha interpretation, gochar ranking, advice and validation. AstroProof therefore forbids using a partial Shadbala total as if it were complete.

## Declared source baseline

Primary working text to audit:
- Brihat Parashara Hora Shastra, Chapter 27, Evaluation of Strengths.
- Every formula must be tied to verse/edition metadata before production certification.

Independent parity references:
- At least two independently implemented calculators or published worked examples.
- Reference values must be stored with the fixture and source date.
- Agreement is checked component-by-component, not merely on the final total.

Astronomical dependencies:
- accurate tropical/sidereal longitudes;
- local apparent/mean time conventions where required;
- sunrise/sunset or day/night division conventions;
- planetary motion/speed;
- aspect strength convention;
- varga calculation conventions.

## Units

- 60 virupas = 1 rupa.
- Preserve virupas internally at high precision.
- Round only for display.
- Never compare rounded display values when validating parity.

## Included bodies

Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn.

Rahu and Ketu are excluded from classical Shadbala totals.

## Six top-level components

1. Sthana Bala — positional strength
2. Dig Bala — directional strength
3. Kala Bala — temporal strength, including Ayana Bala and other subcomponents
4. Cheshta Bala — motional strength
5. Naisargika Bala — natural strength
6. Drik Bala — aspectual strength

No total Shadbala may be emitted until every required component and subcomponent is either:
- implemented and parity-tested, or
- explicitly excluded under a named alternative convention that does not call itself full classical Shadbala.

## 1. Sthana Bala

Required subcomponents:
- Uccha Bala
- Saptavargaja Bala
- Ojayugma Rasiamsa Bala
- Kendradi Bala
- Drekkana Bala

### Uccha Bala
BPHS working rule: measure angular distance from the planet's deep debilitation point, fold distances above 180 degrees back toward 180, then convert to a 0–60 virupa scale.

Gate:
- exact deep exaltation/debilitation degree table must be source-versioned;
- boundary tests at debilitation, 90 degrees from debilitation, and exaltation;
- wraparound tests across 0 Aries.

### Saptavargaja Bala
Requires seven vargas:
- Rasi
- Hora
- Drekkana
- Saptamsa
- Navamsa
- Dvadasamsa
- Trimsamsa

Gate:
- AstroProof currently has only D1/D9/D10-style support in the hosted prototype; this term is BLOCKED until all required vargas are implemented and independently tested.
- Panchadha maitri / relationship scoring convention must be source-audited.

### Ojayugma Rasiamsa Bala
Gate:
- odd/even rasi and navamsa rule must be sourced and fixture-tested.

### Kendradi Bala
Gate:
- kendra/panaphara/apoklima classification and virupa values must be sourced and tested.

### Drekkana Bala
Gate:
- sex/graha classification and first/second/third decan rule must be sourced and tested.

## 2. Dig Bala

Directional-strength reference directions must be source-audited:
- Sun/Mars
- Moon/Venus
- Jupiter/Mercury
- Saturn

Gate:
- use degree-precise angular distance, not only whole houses, if the selected source requires it;
- test exact maximum, exact minimum and quadrant boundaries.

## 3. Kala Bala

This is a major risk area. Do not implement as one opaque formula.

Required audit list:
- Nathonnatha Bala
- Paksha Bala
- Tribhaga Bala
- Varsha Bala
- Masa Bala
- Dina/Vara Bala
- Hora Bala
- Ayana Bala
- Yuddha Bala where applicable

Gate:
- local time standard and sunrise/sunset convention declared;
- lunar phase arithmetic independently checked;
- planetary hour/day/month/year lord conventions declared;
- Ayana formula tied to a source and astronomical frame;
- planetary-war handling tested or explicitly unavailable.

## 4. Cheshta Bala

Gate:
- classical motional categories/formula must be tied to source;
- modern numerical speed approximation may be used only if demonstrated to reproduce the selected classical method within declared tolerance;
- Sun/Moon treatment must follow the selected source rather than being inferred from ordinary retrograde logic.

## 5. Naisargika Bala

Fixed natural-strength values.

Gate:
- values source-audited;
- exact constants stored in registry, not scattered through UI code;
- trivial unit tests for all seven planets.

## 6. Drik Bala

Highest interpretation-risk component because aspect conventions can vary.

Gate:
- aspect-strength curve/formula must be source-versioned;
- natural benefic/malefic classification convention declared;
- waxing/waning Moon and Mercury association rules, if used, must be explicit;
- node aspects excluded unless the selected Shadbala source explicitly requires them;
- negative values preserved if the formula permits them.

## Required strength thresholds

Do not hard-code a strong/weak verdict until the minimum-rupa table is verified against the selected BPHS edition and at least one independent implementation.

When implemented, show:
- total virupas
- total rupas
- required rupas
- ratio to requirement
- each component and subcomponent
- calculation version
- source convention
- parity status

Never translate Shadbala directly into 'good planet' or 'bad planet'. Strength is capacity, not beneficence.

## Fictional QA fixtures

All fixtures must use fictional birth data.

Minimum fixture classes:
1. planet exactly at deep debilitation
2. planet exactly at exaltation
3. midnight birth
4. noon birth
5. sunrise-near birth
6. full-Moon-near birth
7. new-Moon-near birth
8. direct-to-stationary planet
9. retrograde planet
10. sign/house boundary
11. varga boundary
12. aspect exactness boundary

No fixture may reuse the user's personal birth data.

## Acceptance gates

A component can move from SPEC -> EXPERIMENTAL only when:
- formula provenance exists;
- unit tests cover boundaries;
- at least 20 fictional fixtures pass;
- independent parity comparison is recorded;
- maximum deviation is published.

Full Shadbala can move from EXPERIMENTAL -> HOSTED only when:
- all six components are complete;
- all required subcomponents are complete;
- no hidden fallback/zero values exist;
- at least 100 fictional fixtures have parity results;
- discrepancies are categorized rather than averaged away.

It can influence forecast ranking only after:
- frozen historical holdout testing shows incremental value over the same engine without Shadbala;
- prospective Reality Check testing is underway;
- the change is versioned so old predictions remain reproducible.

## Immediate next work

1. Build the full required varga engine needed by Saptavargaja Bala.
2. Create source tables for exaltation/debilitation degrees, friendship and natural-strength constants.
3. Implement Uccha Bala first because its arithmetic is relatively isolated and testable.
4. Implement Naisargika Bala next as a fixed-constant sanity layer.
5. Implement Dig Bala with degree-precise tests.
6. Delay Kala, Cheshta and Drik until their conventions and reference fixtures are locked.
