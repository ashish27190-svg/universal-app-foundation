# Personal Coach — R1 Media-first implementation and quality evidence
**Date:** 2026-10-20
**Commit:** `068a099bc8be93f0d343ada6a9a03490a858c508`
**Target:** `site/personal-coach-v4-preview/index.html`
**Protected permanent app:** `site/personal-coach/index.html` (not modified)
**Requirement authority:** `docs/personal-coach/ACE_PRODUCT_REQUIREMENTS.md`

## Delivered
- All 27 canonical V4 exercise IDs, workout styles and local data format preserved.
- Nine NASM-published exercise pages cross-referenced with their exact listed YouTube video IDs. The app loads the YouTube privacy-enhanced embed only when a user taps Play.
- Fourteen NHS records cross-referenced to publisher photo/instruction pages. No publisher photo is copied, hotlinked, downloaded or re-hosted.
- Four remaining reference records are still pending exact publisher-media verification. They are not claimed to have an independently checked photo or video.
- Each record received individual setup, execution, breathing and easier-option text.
- Exercise guide displays setup, movement, breathing, easier, cue, mistake and clearly labelled reference/media status.
- Guided session player displays setup, action and breathing immediately; opening a guide while an exercise timer is active pauses the timer.
- Official exercise publisher link remains accessible if video embed fails or is blocked.

## Verified software tests
- JavaScript syntax: PASS.
- 30/30 simulated Chromium desktop and mobile interaction checks passed.
- Additional timed-exercise guide/pause/resume scenario passed.
- Tests covered onboarding, Today, NHS photo fallback, NASM video explicit loading, link correctness, guide close, training session, feedback, progress, mobile overflow, and preserved training families.
- HTML input/staging version checked against expected source markers before GitHub update.

## Not yet approved
- In-app video playback on real networks/devices has not been validated, and might be blocked by embed or local policy.
- Media is publisher-referenced, not independently reviewed by a qualified exercise professional.
- Real beginner comprehension and technique safety tests remain outstanding.
- Some yoga/non-NHS reference entries require further publisher checks.
- This is a fitness pilot; not an individualized condition-treatment program.
- Local browser data does not sync automatically across devices.

## Next milestone
R2: exercise-specific novice walkthrough checks, verify outstanding references (especially yoga), real mobile video playback, controlled progression and offline fallback.

## Reuse/licensing
Publisher text/video references are pointers; this does not grant rights to copy or rehost third-party media. Embedded video uses the provider's standard player, and the official publisher link is the fallback.
