# BUILD 0.12 — Reactive Local Queries & Multi-Device Convergence

The local SQL boundary now supports watched queries. Household Vault subscribes to SQLite changes so records replicated from another device become visible without a manual refresh. This preserves the rule that PowerSync SQLite is the normal UI data source while avoiding PowerSync types in domain/UI code.

## Acceptance status

- Vendor-neutral watched-query contract: PASS static/type validation
- Two-browser-context convergence test: AUTHORED, NOT RUN connected
