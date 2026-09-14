# BUILD 0.20 — Privacy-First Monitoring

The reference app can optionally initialize Sentry before React mounts. Monitoring is a no-op without `VITE_SENTRY_DSN`. Phase 1 explicitly disables default PII collection, performance tracing sampling and Session Replay. No domain payload is deliberately attached to error events.

## Acceptance status

- Monitoring privacy/integration validator: PASS
- Source-level type validation with temporary Sentry declarations: PASS
- Real Sentry ingestion/release correlation: NOT RUN
