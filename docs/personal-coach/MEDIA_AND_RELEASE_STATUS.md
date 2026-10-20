# Personal Coach — evidence-based release and media audit
**Audit date:** 2026-10-20
**Branch:** `hosted-static-apps`
**Canonical requirements:** `docs/personal-coach/ACE_PRODUCT_REQUIREMENTS.md`
**Latest candidate:** `site/personal-coach-v4-preview/index.html`
**Preserve production:** `site/personal-coach/index.html` — do not replace until approval.

## Verified content inventory
- 27 candidate exercise records in Canonical V4 package.
- 25 entries use external publisher-guide/photo references.
- 2 entries have media format `video` with publisher/YouTube references.
- All 27 entries remain marked `PILOT_REFERENCE_ONLY`.
- No independent qualified trainer/physiotherapist technique approval recorded.
- Publisher links are evidence of reference matching, not approval to copy/rehost images or approval of clinical suitability.
- No direct claim that 27 beginner-safe instructional videos exist.

## Coverage by category
- Strength: 9
- Core: 3
- Mobility: 3
- Yoga: 3
- Gym: 3
- Balance: 2
- Calisthenics: 2
- Warm-up: 1
- Cardio: 1

## Software evidence
- V4 integration release documented 18 browser/interaction checks plus 17 extended checks (35 combined).
- Additional simulation suite documented 60 age/style/time scenarios.
- Passing tests verify the tested software behavior, **not** clinical technique correctness or real-user understanding.
- Cloud Auth and cross-device sync are not present; history is browser-local.

## Phase-1 media release gate
Pick the 12–20 movements actually needed for the first beginner journeys. For each:
1. Canonical name matches the exact variation shown.
2. Publisher video/images and links are checked for correctness and availability.
3. Written steps, breathing, one key cue, common errors, easier variation and safety notes are movement-specific.
4. Reuse rights verified; where embedding/rehosting is not permissible, link to the official demonstration instead.
5. A qualified instructor reviews technique; unreviewed items must not be described as professionally validated.
6. Beginners can identify and attempt the action without searching for another explanation.
7. Broken or unavailable media has an honest fallback, never a generic wrong picture.

## Decisions
- Keep production `/personal-coach/` stable and the V4 preview separate.
- Do not increase catalog size for vanity metrics.
- Do not add paid AI/media subscriptions during zero-budget pilot.
- Treat age as context, not an arbitrary difficulty ceiling; do not derive routines from gender stereotypes or claim to treat named diseases.
- Preserve Home, Calisthenics, Gym, Yoga, Quick Moves, Mind Reset, timer/voice/sets and progress requirements in SSOT.
- No `FINAL` status until novice testing and relevant qualified reviews pass.

## Next implementation checkpoint
**R1: Beginner understands exercise teaching**
- Reconcile the first 12–20 core exercises against media gate.
- Build and test demo-first guide/player with exact links, captions and a working fallback.
- Exercise guide must show name, setup, movement, breathing, cue, common error and easier version.
- Real Android + iOS + desktop checks and five beginner comprehension sessions remain external blockers until actually observed.
- Document changed/removed behavior and rerun all previous accepted tests before advancing.
