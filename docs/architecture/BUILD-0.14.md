# BUILD 0.14 — Activity & Audit Visibility

Workspace-scoped audit events are replicated read-only into local SQLite and surfaced as a recent activity timeline. The UI presents meaningful action labels instead of raw audit JSON.

## Acceptance status

- PowerSync schema/stream wiring: PASS static validation
- Local audit watched repository: PASS source-level type validation
- Live replication: NOT RUN connected
