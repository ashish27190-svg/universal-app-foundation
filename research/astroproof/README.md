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
