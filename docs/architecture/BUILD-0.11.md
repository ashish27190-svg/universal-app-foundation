# BUILD 0.11 — Asset Lifecycle UX

Household Vault now supports edit, soft delete and restore through the domain repository contract. Local revisions increment on each lifecycle mutation, deleted assets are kept separately from active assets, and the product never uses physical DELETE for normal user actions.

## Acceptance status

- Source implementation: PASS
- Domain/UI boundary validators: PASS
- Online/offline lifecycle Playwright journey: AUTHORED, NOT RUN against connected backend
