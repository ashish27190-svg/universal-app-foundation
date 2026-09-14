# BUILD 0.21 — Connected Build Gate Automation

`scripts/connected-build-gate.mjs` is the handoff from the offline authoring environment to the first internet-connected Node 24 machine. It activates the pinned pnpm version, creates the initial lockfile only when one does not yet exist, runs every architecture/security validator, then runs ESLint, TypeScript, Vitest and the full build. `--with-e2e` adds the connected browser suite when staging credentials are supplied.

See `docs/operations/CONNECTED-BUILD-GATE.md`.

## Acceptance status

- Script syntax: PASS
- Connected execution: BLOCKED by current environment (Node 22, no pnpm, npm registry unavailable)
