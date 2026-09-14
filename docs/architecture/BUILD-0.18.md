# BUILD 0.18 — Privacy-Safe Diagnostics

The reference app can expose app/Foundation versions, environment, sync state, connectivity, pending mutation count, unresolved conflict count, last sync time and only a short local client-id suffix. Diagnostics deliberately omit access tokens, passwords, email addresses and domain records.

## Acceptance status

- Source-level type validation: PASS with temporary dependency declarations
- Live values against connected runtime: NOT RUN
