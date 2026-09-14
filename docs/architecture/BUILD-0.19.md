# BUILD 0.19 — CI/CD & Deployment Gates

GitHub Actions now defines PR CI, connected E2E, staging and manual-only production flows. Cloudflare Static Assets uses SPA fallback. Staging/production apply committed Supabase migrations, deploy both Edge Functions and then deploy the PWA.

CI intentionally refuses to turn green until a real `pnpm-lock.yaml` has been generated and committed from a connected Node 24 environment.

## Acceptance status

- Workflow YAML parse: PASS
- PWA/release invariant validator: PASS
- GitHub-hosted execution/deployment: NOT RUN
