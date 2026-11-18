# AstroProof Validation & Evidence Workspace — Implementation Record

**Checkpoint:** 18 November 2026  
**Status:** Deployed, browser-local research workflow. **Not** a certified predictive engine, external-evidence repository or genuinely blinded validation system.

## Purpose

Make life-event archives and prediction reviews traceable without claiming that a good-sounding reading constitutes evidence of forecasting success.

## Live UI

Open the hosted AstroProof page, choose **Validation & Evidence**.

Nine views are implemented:

1. **Overview** — evidence-recorded workflow progress bar, gates, counts, evaluator sample and exports.
2. **Life Events** — dates/ranges (month and year precision widened conservatively), life area, event type, confidence, source evidence and immutable purpose selection.
3. **Rectification** — birth-time sensitivity matrix, provisional candidate offsets, side-by-side Ascendant/D9/D10 and event-date dasha comparison, source-linked tentative hypotheses.
4. **Predictions** — editable draft → frozen claim with dates, pass/fail criteria, assumption, alternatives, method/rules, source and peak.
5. **Validation Cases** — event/absence of event; retrospective versus prospective eligibility; reported outcome with source and uncertainty.
6. **Pending Review** — separate event-source review, outcome decision and tentative birth-time candidate review.
7. **Evidence Gaps** — missing sources, unfrozen predictions, unresolved cases and per-rule sample counts.
8. **Advice** — practical/reflection/traditional/remedial suggestions separate from predictive outcomes.
9. **Decision History** — operator-entered append-only UI history, not tamper-proof.

## Safeguards implemented

- Rectification events cannot be selected as valid holdouts.
- A prediction cannot use a calibration event as a validation outcome.
- Date and life-area compatibility is checked for comparisons.
- Historical/backdated forecasts are classed as retrospective, **not prospective**, regardless of their apparent fit.
- Frozen claims retain an exact snapshot; normal UI does not offer editing frozen terms.
- An event cannot be recorded as already happened if dated in the future.
- Month/year precision generates honest date ranges.
- A full-window miss cannot be recorded before the prediction window closes.
- Outcomes stay pending until the relevant source references, reviewer, reviewer notes and decision are present.
- Event source acceptance is required before a case with an event can be reviewed.
- Duplicate case-per-prediction guards prevent easy denominator inflation.
- No diagnosis, promise, "corrected birth time" or externally verified outcome is automatically produced.

## Progress policy

The progress bar is **evidence-recorded workflow coverage**, not a percentage of prediction accuracy.

Seven deterministic gates check: source-reviewed dated event; saved sensitivity snapshot with engine provenance; frozen prediction with test criteria/source/rule; case outcome evidence; reviewer decision; eligible prospective outcome; and enough reviewed prospective cases to show both matches and misses.

A new, empty installation shows **0%**. Unreviewed items and unknown claims must not pass gates.

Operator-entered source reviews are *not* externally authenticated. The word "recorded" is intentional; verification of authentic primary evidence remains an independent task.

## Evaluator policy

The browser evaluator shows reviewed cases and, separately, prospective matches/misses and retrospective reviews. Per-rule sample counts are descriptive.

It does **not** claim recall, chance-adjusted skill, statistical significance or scientific validity. Historic fits are never promoted to prospective success. The research evaluator branch contains additional offline historical/permutation code, whose reproducibility and data admission remain separate gates.

## Data and backups

- The Validation Workspace uses `localStorage` key `astroproof.validation.v1`.
- The rest of AstroProof uses another legacy browser-local key.
- Archive import from the legacy application is explicit and **unverified by default**.
- Structured JSON, case CSV, text validation reports and a full sensitive backup can be downloaded.
- Backup restore requires compatible records, no forbidden calibration/holdout overlaps, and explicit operator confirmation.
- Clearing AstroProof data via the main Privacy & Backup area clears both keys.
- No login, cross-device sync, external source file hosting, reviewer authentication or cryptographic tamper-evidence is present.

## Calculation caveats

- The hosted browser ephemeris and sidereal conversion are provisional research computations; independent production ephemeris parity is pending.
- Numerically refined transit peaks are timing calculations, **not** validated predictions.
- Birth-time candidate comparison reports computational differences; it never automatically selects a "true" birth time.
- Birth-time and calculation conventions may materially change D9/D10 outputs.
- Traditional astrology remains an interpretive system without established empirical reliability for forecasting individual outcomes.

## Software verification

The hosted Pages workflow now runs:
```bash
node --check site/astroproof/app.js
node --check site/astroproof/validation.js
node site/astroproof/tests/validation-workspace.test.mjs
```

The synthetic test suite checks empty progress, calibration leakage, date precision, no future history, draft/freeze boundaries, unreviewed outcomes, early misses, closed-window misses, duplicate cases, source-review checks and retrospective/prospective separation.

No real personal birth dates or life events appear in those fixtures.

## Still pending

- Full live-browser visual/accessibility testing across screen sizes.
- Automated schema validation and migration for every supported legacy record version.
- External evidence-upload storage with provenance/retention controls.
- Authenticated reviewers and server-side immutable decision audit.
- A genuinely blind third-party test procedure with sealed holdouts.
- Complete cohort surveillance and denominator design.
- Randomized/shuffled baselines and replicable statistical testing on admitted real datasets.
- Source-by-source independent astronomical calculation certification.
- Evidence-specific rule promotion/demotion after enough genuine prospective observations.
- Cloud sync and account identity, if ever authorized.

**No retrospective self-report (including a reported 3/3 historical fit) should be imported as a validated prediction result without independent source and protocol review.**
