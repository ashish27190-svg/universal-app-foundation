# Personal Coach — ACE red-team findings (21 October 2026)

**Scope:** Reconciliation of user instructions, existing ACE SSOT and the actual R1 V4 preview code.
**Status:** Audit only; no changes to `site/personal-coach/index.html` or the V4 preview implementation.
**₹0 cost constraint preserved.**

## Critical admission
Earlier messaging called the ACE SSOT "45 traceable requirements", but the source had no individual requirement IDs or per-requirement acceptance-test mapping. Requirements written in prose were easily lost. The 21 October red-team audit enumerated **91 candidate requirements** and assigned **91 prospective test specification IDs**. Those tests are NOT claimed to have run.

Provisional breakdown from source review:
- DEFECT 13 (including legacy governance traceability)
- MISSING 24
- PARTIAL 43
- UNVALIDATED 2
- DEFERRED 4
- PRESENT 5

This is a backlog assessment, **not** a product-completeness score.

## Source-confirmed functional gaps
1. `stage()` advances based on completed-session count, not demonstrated movement mastery.
2. `effectiveEquip()` grants several gym-related tools in Gym mode even if not selected in the equipment profile.
3. `healthFlag()` triggers a generic confirmation; it does not create or verify condition-appropriate routines. Pregnancy/postpartum or named-condition prescribing remains OUT OF SCOPE.
4. `finishWorkout()` can record a session as `completed` after some (not all) movements.
5. `timerEnd` and `timerCallback` remain volatile; interrupted workout state is not safely restartable.
6. The weekly schedule rotates on `completeMain()%2` rather than the selected training days, workout history and recovery.
7. Longer workouts are padded with walking toward a percentage of their time budget, not purposefully programmed strength/cardio dosage.
8. `completeSet()` records taps for prescribed sets, not actual repetitions or form.
9. `finishFeedback()` increments movement-pattern mastery without checking `rec.kind==='main'`; completing Quick Moves can therefore distort strength progression.
10. The Mind Coach's three response modes are generic regardless of the supplied thought.

## Historical requirements often overlooked
- Body **and** optional practical Mind Coach; brain/cognitive exercises were originally requested and have not been implemented.
- Home, beginner gym, calisthenics ladders, complete yoga, cardio, balance and reliable progressive overload.
- Day-context Quick Moves for morning, office sitting, car/travel (never while driving), after meal, evening and bedtime, with appropriate duration and context.
- Age + actual functional ability, space/noise/no-floor, user-confirmed equipment by setting; no gender stereotypes or unreviewed medical-treatment plans.
- Exact exercise media with proper rights/status, plain names, movement-specific instructions, breathing, errors, modifications, verified playback/fallback, real novice comprehension.
- Correct reps/sets/intervals/rest/timer/voice/partial-state recording, accuracy under phone lock and refresh, feedback-based progression.
- Transparent browser-local data, backup/migration and eventually authorized cloud accounts; no false cross-device claims.
- Simple responsive UI, readable feedback, accessibility, keyboard/voice-off equivalents and ₹0 extra subscriptions.

## Execution gates

**G0 — Engineering truth:** Repair false completion, gym-equipment assumptions, condition-eligibility gate, Quick Move progression contamination, variation mastery, weekly plan, duration estimates and resume state. Add a failing regression test per defect before repair and rerun all accepted tests.

**G1 — Media and novice comprehension:** Approve first 12–20 exercise references, verify exact movement and legal link/embed usage, test playback on real Android/iOS/desktop, observe 5 novices completing a session without Google, and collect qualified instructor review before claiming exercise approval.

**G2 — Program depth:** Four-week home foundation + explicit movement ladders; constrained gym, calisthenics and yoga paths; day-context Quick Moves; genuine feedback-driven progression.

**G3 — Data, usability and public beta:** Real devices, accessible UI, local-data migration, optional installable offline PWA, then secure account sync/auth/RLS when separately approved.

## Source-of-truth rule

The current official scope remains `docs/personal-coach/ACE_PRODUCT_REQUIREMENTS.md`. This audit is a **delta and implementation correction** and should be merged through requirement IDs/acceptance tests; do not silently replace the existing SSOT. Preserve production and preview until a tested, approved release candidate exists.

**Prior release pass counts prove tested functionality only; they do not prove coached-exercise safety, media correctness or complete requirements coverage.**
