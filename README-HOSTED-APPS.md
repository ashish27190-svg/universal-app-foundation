# Hosted Static Apps

This branch is deliberately isolated from the Universal App Foundation `main` branch.

Its job is to host small, public-safe static applications that need:
- one stable URL across desktop and mobile
- source control instead of repeated HTML downloads
- automatic redeployment after source changes

## Daily Intelligence

Canonical baseline: **v0.4**, recovered from the user's latest saved HTML artifact dated 2026-09-23.

Source:
- `site/daily-intelligence/index.html`
- `site/daily-intelligence/manifest.webmanifest`
- `site/daily-intelligence/sw.js`

The original v0.4 HTML is preserved as the application baseline. The manifest and service worker complete the PWA references already present in that HTML.

The optional `api/headlines` endpoint is not implemented by this static deployment. The app already handles that absence without fabricating live headlines.

## Release model

Pushes to this branch that touch `site/**` automatically trigger the GitHub Pages deployment workflow.

Do not place secrets, private business data, employer-confidential material, or personal credentials in this branch.
