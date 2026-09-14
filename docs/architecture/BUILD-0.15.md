# BUILD 0.15 — PWA Install & Update Lifecycle

The reference app is an installable Vite PWA. The Service Worker caches the application shell and static assets only; structured domain/API data is deliberately excluded because PowerSync SQLite remains the data authority. Updates use a prompt rather than forced reload so in-progress edits are protected.

## Acceptance status

- PWA/release static validator: PASS
- Manifest/update source wiring: PASS source-level type validation
- Real Android installation/offline/reopen/update journey: NOT RUN
