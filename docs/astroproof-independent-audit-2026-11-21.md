# AstroProof Independent Audit — 2026-11-21 (P0 checkpoint)

**Status:** PRIVATE-RESEARCH STANDARD, NOT A VALIDATED PREDICTION ENGINE.  
**Scope:** Existing deployed GitHub Pages browser branch (`hosted-static-apps`), its recorded QA, and the separate read-only research evaluator.  
**Safety:** Do not promote this review branch automatically; do not publish personally identifying birth profiles, forecast outcome records, or private evidence in Git.

## Verified artifacts
- Hosted UI: `site/astroproof/app.js`, `validation.js`, `tests/validation-workspace.test.mjs`.
- Recorded 2026-11-19 hosted QA: 33 fictional synthetic workflow checks and 27 executed browser assertions. This is software workflow evidence, **not predictive skill**.
- Research evaluator: `research/astroproof/evaluate-admission-pack.mjs` on `astroproof-research`. The evaluator has case admission safeguards but no independent source authentication or prospective statistical demonstration.
- Browser case archives are `localStorage`-backed; local SHA-256 receipts are not independent notarization.

## Defect register

| ID | Priority | Evidence | Required action | Status |
|---|---|---|---|---|
| ASTRO-P0-001 | P0 | Hosted `ascendant()` yields approximately the antipodal tropical Ascendant relative to Swiss Ephemeris. 5 independently calculated synthetic cases showed ~180-degree error. | Correct branch by 180 degrees; add independent synthetic regression controls; verify real-browser engine tests; version/invalidate previously generated house-dependent readings and forecasts. | **Patched on draft review branch; live deployment not changed; browser QA pending.** |
| ASTRO-P1-002 | P1 | `chinese()` derives year from `date.getUTCFullYear()` rather than the Li Chun solar-term boundary, producing wrong year pillars for early-year dates. | Calculate actual Li Chun/solar longitude at recorded instant, test boundary days, re-evaluate day/time-zone and month pillar conventions. | Open |
| ASTRO-P1-003 | P1 | Browser sidereal positions use `ayanamsaApprox()` and astronomy-engine calculations, not independent production Swiss Ephemeris parity. | Build reference corpus for planets, nodes, Ascendants, D9/D10 and dashas over extreme cases, different eras/time zones. | Open |
| ASTRO-P1-004 | P1 | `localToUtc()` iteratively maps wall-clock input without a separately documented DST gap/fold refusal and uncertainty policy. | Explicitly reject ambiguous/nonexistent historical wall-clock times or require user selection; test across IANA zones. | Open |
| ASTRO-P1-005 | P1 | Browser name expression uses the nine-value Pythagorean mapping; this does not implement separate Chaldean name mapping. | Implement separately only with documented convention and regression cases. | Open |
| ASTRO-P0-006 | P0 release gate | Forecast-ranking weights reflect traditional heuristics; there is no demonstrated prospective calibration or independent cohort skill. | Preserve frozen forecasts, use matched no-astrology baselines, blinded prospective outcomes, Brier/log-loss, time-window scoring, complete denominators and withheld testing; disable accuracy claims. | Open; public predictive-accuracy claims NO-GO |
| ASTRO-P1-007 | P1 | Reviewer identity, source authenticity, independent event timestamp and full-window surveillance are not externally verified. | Authentication, independent evidence archive, signed timestamps, audit trail and prospective evaluation governance. | Open |

## Synthetic independent Ascendant references
Cross-check produced with Swiss Ephemeris 2.10.03 tropical Ascendant. No private user's birth details used.

| UTC instant | Latitude | Longitude | Reference ecliptic longitude |
|---|---:|---:|---:|
| 2024-01-01 12:00 UTC | +28.6139 | +77.2090 | 100.356503658 degrees |
| 2022-10-29 22:06 UTC | -33.8688 | +151.2093 | 268.006553863 degrees |

A local independent formula comparison matched the corrected branch within 0.002 degrees for five synthetic world-location controls. The exact hosted-browser executable outcome is still subject to CI and review. These astronomical comparisons do not validate astrological interpretation.

## Changes in draft PR
1. `ascendant()`: corrected the antipodal formula result via `mod(lam+180,360)`.
2. `engineSelfTest()`: two independent synthetic Ascendant reference checks.
3. `validation-workspace.test.mjs`: Node-controlled regression executing the *actual* extracted hosted `ascendant()` implementation with fixed reference sidereal times and Swiss-derived targets.

## Required release gates (fail closed)
1. All new regression checks pass in CI and real rendered browser.
2. Expanded independent Swiss Ephemeris corpus across latitudes, time zones, sign boundaries, historical eras and birth-time uncertainty.
3. Historical persisted chart outputs and frozen rule references tagged with calculation version; house-dependent forecasts generated under the old engine quarantined pending explicit recalculation and re-freeze as new predictions.
4. Rectification/calibration and holdout histories remain isolated.
5. No claims of demonstrated predictive accuracy without independently verified outcomes and appropriate base-rate comparisons.
6. Preserve a private-data-free code review and obtain explicit deployment approval.

## Interpretation and measurement
- **Implemented workflow:** evidenced by tests and source inspection.
- **Calculation accuracy:** partial, with P0 correction proposed and other gaps open.
- **Interpretation fidelity:** not independently source-audited.
- **Predictive validity:** **NOT ESTABLISHED**; no reliable numeric prediction probability or headline success percentage can be reported.
- **Public launch / paid accuracy claims:** **NO-GO**.
