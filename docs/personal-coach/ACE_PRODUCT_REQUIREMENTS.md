# PERSONAL COACH — CANONICAL PRODUCT REQUIREMENTS (ACE SSOT)
**Document status:** Product requirements baseline; NOT proof of software delivery or clinical approval  
**Date:** 20 October 2026  
**Product:** Personal Coach — Body + Mind  
**Budget:** ₹0 *additional* subscriptions/paid assets/AI credits/hosting for the trial  
**Audience:** Adults (18+). Any expansion to minors, pregnancy/postpartum training, or condition-targeted therapy requires a separately reviewed release.  
**Operating principle:** Never label a feature complete based solely on working HTML or passing unit tests.

## A — ANALYSE: WHAT THE USER ACTUALLY WANTS

### The core problem
Someone wants to become fitter, stronger, more mobile and mentally better organized, but may not know exercise names, correct execution, intensity, progression or which activity makes sense right now. Earlier iterations created attractive pages, too few exercises, then 67 loosely documented exercises, then small curated sets, and repeatedly lost requirements while calling releases final.

### North-star job to be done
> Open the coach, immediately see a suitable plan, **understand every movement without Googling**, train with accurate guidance, record what was actually done, and return to a better-calibrated plan next time. At other times of day, use a short, safe context routine with one tap. Mind support is available without blocking movement.

### Five promises, in order
1. **Understand:** each prescribed movement has an exact-match, understandable and legally usable demonstration, plain name and short correct instructions.
2. **Appropriate:** sessions come from reviewed structured programs, not random exercise selection or an LLM improvising therapeutic prescriptions.
3. **Guided:** real sets/reps, timing, rest, voice, sides, make-easier and skip work as shown.
4. **Personal:** capability, goal, training history, equipment, time, age-relevant functionality, limitations and preferences change recommendations transparently.
5. **Persistent:** user can see actual results and continue; no invented sync, false completion or lost history.

### Users, not stereotypes
- Start with adult beginners, sedentary adults and adults returning after inactivity. Support progression to intermediate functional strength and calisthenics, rather than trapping users in chair exercises.
- **Age is contextual**, not an automatic strength limit. Add supported balance/fall-prevention emphasis when relevant, especially for older adults, based on function and preferences.
- **Sex/gender:** optional and not used as a crude exercise difficulty determinant. Ask only about specific relevant physiological/life-stage factors (e.g. pregnancy/postpartum/menopause/pelvic-floor needs) with explicit purpose, and do not prescribe unreviewed condition programs.
- **Medical:** self-reported limitations/conditions influence conservative precautions and the option to stop/modify; no diagnosis, rehabilitation promises or prescription for named diseases until independently clinically reviewed.
- 18+ pilot only. No medical or specialist populations advertised as supported without release-specific evidence.

### Non-negotiables from entire conversation
- ₹0 incremental subscriptions/credits; no forced Runway or paid content.
- Reuse the permanent GitHub Pages URL eventually; protect current production and release through a distinct preview until approved.
- Responsive phone/tablet/desktop, premium **neutral modern** aesthetic, not green or an over-dark/slab-card layout; avoid medical/elderly stock imagery and endless cards.
- One shareable URL at beta release, no ZIP downloads for users; account-based cross-device sync only when a secure backend has been built and checked.
- Clear exercise names, visual/video instruction and accessible fallback, not generic or incorrect stick figures.
- Avoid repeated daily stiffness/mind-clearance/energy forms; persistent preferences and optional 'Change Today'.
- Preserve Body **and** Mind product intent but keep mental-tools optional, practical and separate from the main workout.

## C — CONSTRUCT: WHAT TO BUILD

### 1. User experience and navigation
Four destinations at most:
- **Today:** today's programmed session, duration, equipment, rationale, one Start; prominent **Change Today**; a compact Quick Moves section; optional Mind Reset shortcut.
- **Programs:** guided Home/Foundation, Strength & Calisthenics, Beginner Gym, Yoga & Mobility, Cardio & Balance, plus searchable exercise library and quick routine categories.
- **Progress:** sessions completed vs skipped, consistency, actual minutes, movement levels, effort and progression reason; no vanity numbers.
- **Profile:** age/age band, goals, experience, time, days, work style, equipment, floor access, preferences, relevant limitations, reminders (optional), privacy, export/import, eventually sign-in.

Onboarding collects a minimum functioning profile **once**: name optional, adult confirmation/age band, fitness goal, experience, usual place/equipment, preferred duration, availability, floor accessibility and safety notice. Ask additional context only when a feature actually needs it. Baseline ability should be calibrated progressively over the first sessions, not via intimidating medical screening.

### 2. Structured fitness programs
**Home/Foundation:** warm-up → squat/hinge → push/pull or suitable alternative → core/balance → cooldown. A/B templates, sustainable frequency, rest and four-week foundation path; first weeks assess tolerance.

**Calisthenics:** separate ladders for push, squat/lunge, hinge/glute, trunk (brace/dead bug/bird dog/plank), pulling when equipment is safely available, and balance. Clear current variation, prerequisites, regressions, mastery and review dates. Never jump variations after merely ticking a workout complete.

**Gym:** only exercises with actual equipment-specific demonstrations and machine safety instructions; substitution constrained by available equipment and movement pattern. Gym plan is not a randomized list of machines.

**Yoga & Mobility:** real reviewed asanas and flows, understandable names + Sanskrit aliases, breathing/modifications/cautions. Morning/relaxation/balance variants. Yoga is a program and a recovery option, not decorative exercise names.

**Cardio & Balance:** easy and progressive walking, low-impact conditioning and supported balance (where relevant); no presumption that everyone should run or jump.

Program scheduler chooses by cycle/week, recent completed work, exercise-level evidence, time, location, equipment and constraints. It must explain choices briefly and calculate an honest planned execution duration including work, rest, transitions and warm-up/cooldown.

### 3. Quick Moves: useful throughout an ordinary day
- **Morning Wake-Up** (3–8 minutes).
- **Office/Desk Sitting Break** (2–5 minutes, quiet, standing or chair options).
- **Long Sitting / Travel Reset** (3–6 minutes, limited space).
- **After-Meal Easy Walk** (5/10/15 minutes, gentle pace, not prescribed as medical treatment).
- **Evening Mobility / Wind-Down** (5–10 minutes).
- **Bedtime Calm / Breathing** (optional, short and accessible).
- **Low-Energy Minimum Day** (genuinely smaller and conservative).
- **Supported Balance** (where age/functional assessment warrants it).

Quick Moves **must not silently advance strength-program mastery**. They have their own outcome logs and minimal friction. Micro-break reminders are optional; no invasive notifications.

### 4. Exercise content and media system — FIRST-CLASS REQUIREMENT
Each `ExerciseVariation` must contain canonical ID, understandable name, technical alias, category and movement pattern, equipment, floor/no-floor, impact/noise/space, contraindication/stop guidance reviewed where relevant, exact setup, steps, end pose, breathing, top cues, common errors, dose, timers, unilateral logic, alternative/easier/harder with reviewed mappings, progression criteria, media/source/license/reviewer/status/recheck fields.

**Media gating**: Draft → Publisher-linked → Exact-variation verified → Rights/embedding checked → Qualified technique-reviewed → Beginner-understanding tested → Approved for prescribed sessions. These stages are distinct. Exact publisher link is NOT proof of professional or licensing approval. If video cannot be embedded legally, offer a prominent exact external video link plus readable steps; do not show a fake or wrong demo. No exercise should be silently substituted with mismatched stock footage or synthetic motion.

Teach within the player: exercise name, actual demo (or clear verified link), sets/reps/time/side, one key cue, replay, expanded 'how to', make easier, swap and stop. The user should not have to search Google.

### 5. Session player
- Distinct types: reps/sets, timed work, isometric hold, unilateral reps/time, interval rounds, breathing cycles, mobility holds and recovery walk.
- Rep exercises require explicit **Done Set** and rest; don't run a fake rep countdown.
- Timers use absolute elapsed timestamps and withstand background, pause/resume and interrupted sessions. Display differences between work, rest, side transition and warmup. Offer Skip Rest and +15 sec.
- Voice levels Off/Minimal/Normal/Detailed must have genuinely different event-driven behavior. State important names, start/last seconds, side change/rest/next exercise without overlapping speech; never assume browser TTS behaves uniformly. Captions and visual cues work with audio off.
- **Make Easier** changes actual variation or dose. **Swap** retains movement purpose/safety/equipment; skip doesn't count as finished. Stop records partial, not completed. Exercise/set events carry stable IDs.
- Duration presets are budgets, not false promises; show calculated estimate with plausible tolerance, and actual elapsed after session.

### 6. Progress and adaptation
- Planned vs started vs completed vs partial vs skipped vs stopped are separate facts.
- Persist actual reps/sets, exercise IDs/variations, dose, time, easier/swap/skip, user-reported effort, difficulty, discomfort and tolerability when relevant.
- On repeated manageable, correctly executed sessions, allow single-variable progression; after hard or problematic sessions hold/regress. Do not claim AI observed form without a validated sensing system.
- Track separate movement-level ladders, not one global 'user fitness level'. Display rationale for every material progression.
- A four-week starter structure is needed, but progress is **evidence-based** instead of forced after week 4.

### 7. Body + Mind separation
Mind tools remain optional and deliberately short: brain dump, action/decision/park, 10-minute task start, end-of-day capture and short breathing/recovery. They must end with an action, decision, parking, or calm reset. Do not diagnose mental-health conditions or build open-ended pseudo-therapy. Avoid consuming exercise space on Today's main screen.

### 8. Safety and scope boundaries
Hard safety rules precede adaptation and AI. Offer an obvious Stop/Modify path; do not encourage exercising through pain, chest discomfort, dizziness, fainting or unusual severe breathlessness. Seek appropriate professional evaluation where warranted. Contraindication rules and disease-related instructions require qualified review before public launch. Health disclosures minimized, never placed in URLs, logs or public repositories. Children, clinical rehabilitation, pregnancy/postpartum and condition-therapy packs are **out of the initial public scope** pending specialist approval.

### 9. Data, hosting, privacy and sharing
Trial: standalone/hosted static app, browser-local data; each browser profile is independent. Installability and offline continuity are separate engineering gates; never imply that standalone `file://` preview is an installable, synchronized PWA. Provide reliable export/import and clear storage disclosure, versioned migration safeguards, no sensitive state inside URL. Do not claim cross-device sync.

When ready for public multi-device accounts: one HTTPS URL, identity/login, cloud-backed user-scoped records, row-level authorization verified against cross-user access, data deletion/export, consent/privacy notice, encryption and backup/recovery; no service role key in browser. Free tiers may have usage limits; no paid dependency without explicit permission. GitHub Pages is adequate for a static pilot, **not** by itself an identity/sync backend.

### 10. Delivery architecture
Use a modular monolith. Keep content, program rules, safety eligibility, session state and UI **separate modules** so an update to the layout doesn't delete coaching. Prefer deterministic rules for programming/safety/timers; AI can help research source material, draft text, explain decisions and identify gaps, but does not autonomously create unapproved medical or technique content. Skills/agents are development roles with explicit review outputs, **not** automatically seven paid LLM services running in the end-user app.

Suggested expert workstreams (can be AI-assisted drafts, but approvals must be real):
- Product/ACE + requirements custodian
- Strength/calistenics and programming SME
- Yoga/mobility SME
- Medical/safety reviewer for condition-related scope
- Media/provenance/license QA
- UX/accessibility and novice usability researcher
- Frontend/session-engine engineer
- Privacy/security & QA/release lead

Use K2E: verified research → source trace → small test → specialist approval where necessary → implement → measure. Do not create a multi-agent runtime until simpler alternatives fail a measured necessity test.

## E — EVALUATE: HARD ACCEPTANCE

### Five non-negotiable observed journeys
1. **First time:** beginner completes onboarding in ~2 minutes, sees appropriate first workout, understands and starts without external search.
2. **Exercise player:** user recognizes exact demo, completes rep/timed/unilateral/interval and rest flow, handles pause and return without timer drift.
3. **Adaptation:** manageable repetitions lead to justified progression, hard/skip/easier outcomes hold/regress, no phantom completions or wrong equipment selections.
4. **Quick Moves:** office, after-meal, evening and travel routines are obviously different from main strength sessions and log separately.
5. **Continuity:** completed/partial events persist across refresh; export/import works; public beta user accounts, when added, cannot read each other's records.

### Explicit release stages
- **R0 — current V4 engineering pilot:** 27 candidate entries, templates, Quick Moves, simulation QA. Not media-professionally verified; no public medical approval; no cloud sync.
- **R1 — genuine beginner usability pilot:** 12–20 professionally checked and rights-cleared demos, accurate timer and program workflow, representative Android/iOS/manual novice tests. Goal: 5 novice users can begin/finish without Google or meaningful confusion; unresolved high severity defects block promotion.
- **R2 — trustworthy personal coach:** expanded reviewed content for home/calisthenics/yoga/gym, 3–4 week real use and observed adaptation, meaningful adherence/safety measures.
- **R3 — public shared beta:** one URL + auth/cloud/RLS with adversarial multi-user tests, privacy/disclaimer/export/deletion. Release first to a small group, not all visitors by default.
- **R4 — medically condition-aware packs:** condition-by-condition qualified reviews and legal/privacy gates; no generic 'treat hypertension/back pain' AI prescriptions.

### Must-not-repeat failure modes
- Calling a static HTML load or 35 checks clinical/exercise-comprehension approval.
- Equating number of exercises with verified instruction quality.
- Quietly deleting prior requirements during visual redesigns.
- Showing a timed countdown when rep exercise is prescribed.
- '20 minute workout' comprised of only 4 minutes of activity.
- Fake precise adaptation or progression merely due to elapsed time.
- Generic SVG/video for an unrelated movement.
- A physical-ability assessment presented as medical diagnosis.
- Losing exercise progress when the phone screen locks, browser closes or connection drops; test restoration and use Wake Lock opportunistically rather than assuming universal support.
- Shipping an offline PWA label when a service worker/manifest/offline cache are absent.
- Failing to distinguish preview, live, browser-local and cloud-synced data.
- Adding paid third-party AI without permission.

### Change control (anti-regression)
**The SSOT, not the latest HTML, defines scope.** Every feature has a requirement ID and an acceptance test. No major change merges unless: all previously accepted tests remain green, changed exercise records pass content/media gate, differences are documented, known limitations surfaced, rollback preserved and preview has passed before production promotion. Each version records added, changed, removed, blocked items and test evidence. No 'final' claims without release-gate evidence.

## Current sources reviewed for this document
- Full current Personal Coach conversation and earlier project decisions.
- `/mnt/data/ACE_Framework.md` and related ACE files.
- `Personal-Coach-Canonical-V4-Package.zip`: `docs/MASTER_REQUIREMENTS.md` and `docs/RELEASE_CHECKS.md` (as-built / blocked scope).
- `Personal_Coach_ACE_Reset_v4/ACE_PRODUCT_RESET.md` and implementation brief.
- Current GitHub Pages preview source in `hosted-static-apps/site/personal-coach-v4-preview/index.html`.

**This document is a specification and priority baseline, not a claim that R1–R4 are implemented.**