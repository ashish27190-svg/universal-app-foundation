# AstroProof Research Harness

This branch is intentionally separate from the frozen UAF runtime.

The harness evaluates **frozen predictions** against outcomes that were not shown to the prediction engine, and compares them with randomized controls. It is meant to reduce retrospective fitting and vague “everything matched” claims.

Run:

```bash
node research/astroproof/evaluate-predictions.mjs \
  research/astroproof/fixtures/sample-predictions.json \
  research/astroproof/fixtures/sample-outcomes.json
```

It reports precision, recall, F1, false-positive rate, average prediction-window width, hit@K, and a shuffled/random-window baseline.

Events used for birth-time rectification or personalization are **training/calibration events** and cannot also count as validation hits.

A positive historical score is not enough. Before promoting a rule, verify birth/event data quality, confirm outcome blinding, compare with negative controls, repeat on an untouched holdout set, and then test prospectively.


## Evidence admission pack (read-only audit)

The AstroProof hosted prototype's **Validation & Evidence → Overview → Download evaluator admission pack** creates a private JSON snapshot with every prediction (draft, frozen, pending and admitted). It includes sensitive dated-event and reviewer-source metadata; **do not publish the exported pack**.

Use the separate read-only evaluator on this research branch:

```bash
node research/astroproof/evaluate-admission-pack.mjs /private/path/astroproof-admission-pack-YYYY-MM-DD.json --strict
```

The output is JSON reporting:
- all inventoried predictions (the denominator cannot silently drop pending claims);
- prospective admissibility reconstructed from frozen claims, recorded evidence, date windows, reviewer decisions, criterion-specific assessments and calibration/holdout separation;
- reviewed matches and misses;
- reasons every other prediction was excluded;
- discrepancies between the website's declared admission flags and the independent reconstruction;
- descriptive per-rule sample counts.

Run its fiction-only unit tests:

```bash
node --test research/astroproof/tests/admission-pack.test.mjs
```

The research-branch CI runs these tests for each update.

**Interpretation limits:** source metadata is not independent authentication, browser timestamps are editable, the local site is not truly blinded, selected reviewed cases are not a complete population outcome census, and no chance-adjusted skill can be asserted from this pack. This is an **admission-consistency audit**, not proof of predictive validity.

## Post-deadline negative evidence rule (19 November 2026)

The read-only admission evaluator now rejects a case recorded as **miss** unless the exported packet includes the frozen window, post-deadline observation and documented full-window negative surveillance. An unrelated in-window event is not proof that the specific forecast succeeded, but it also cannot substitute for a complete negative follow-up.

The website now supports dated evidence addenda and late links from pending monitoring cases to eligible observed holdout events. The original note is retained.

These are consistency and provenance controls for operator-entered records. They do not independently authenticate observation notes, event timestamps, reviewer identities or astrological predictive validity.

The research suite contains **9 synthetic tests** and passed at this checkpoint.
