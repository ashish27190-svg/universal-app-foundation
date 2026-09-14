# Connected Build Gate

The local artifact environment used to author UAF cannot reach the npm registry and currently runs Node 22, so dependency-backed verification must run once in an internet-connected Node 24 environment.

## One-command gate

From the repository root on Node 24:

```bash
node scripts/connected-build-gate.mjs
```

The script:

1. enables Corepack and activates the pinned pnpm 10.15.1;
2. creates the initial `pnpm-lock.yaml` if none exists, otherwise uses `--frozen-lockfile`;
3. runs every UAF static architecture/security validator;
4. runs ESLint, TypeScript, Vitest and the full Turborepo build.

Commit the generated `pnpm-lock.yaml` only after this gate passes. CI intentionally refuses to become green without it.

## Connected browser reliability gate

After staging Supabase and PowerSync are configured, set the staging Vite/E2E environment variables and run:

```bash
node scripts/connected-build-gate.mjs --with-e2e
```

The browser suite proves lifecycle, two-browser-context convergence and deliberate revision conflict behavior. It must not be treated as passing until it has run against a real staging backend.

## Required external services for the connected gate

- Supabase staging project with all committed migrations applied.
- Both Edge Functions deployed with user JWT verification enabled.
- PowerSync instance connected to the same Postgres project and loaded with `infrastructure/powersync/sync-config.yaml`.
- A dedicated staging test account. Never use personal production credentials in CI.

## Hard release blockers

Do not promote if there is any data-loss path, duplicate logical write, silent revision overwrite, cross-workspace leak, exposed server secret, or unsynced local record loss.
