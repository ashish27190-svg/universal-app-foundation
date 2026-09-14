# UAF v0.3.0 RC1

This repository snapshot is the first runtime-validation release candidate for the Universal App Foundation Phase 1 reference implementation.

## Source baseline

- Architecture: UAF v0.1 frozen
- Technical stack / implementation plan: UAF v0.2 complete
- Authored implementation baseline: BUILD 0.21
- Release-candidate handoff: BUILD 0.22
- Version: `0.3.0-rc.1`
- Git tag: `uaf-v0.3.0-rc.1`

## Exact validation toolchain

- Node.js: `24.21.0` (LTS)
- pnpm: `10.15.1`
- Package manager is pinned in `package.json`.
- Node is pinned in `.nvmrc`, `.node-version`, and `.tool-versions`.

## RC1 purpose

RC1 freezes feature work while the existing implementation is tested with real dependencies and connected services. It must not be promoted to a production-ready Foundation solely from static validation.

## Required promotion gates

1. Connected build gate: dependency install, lockfile, lint, dependency-backed typecheck, Vitest, Vite build.
2. Connected platform gate: Supabase RLS/auth, PowerSync replication/upload, two-device convergence/conflict/security, Android PWA.
3. Staging gate: migrations/functions/app deployment, connected E2E, monitoring verification.
4. Production pilot: repeated real usage with no open S0/S1 data/security/reliability issue.

See `BUILD-STATUS.md` and `docs/operations/CONNECTED-BUILD-GATE.md` for evidence and commands.
