# BUILD 0.10 — Household Vault Vertical-Slice Harness

## Purpose

Compose the UAF packages into the first real product path without adding unrelated product features.

## Implemented

- validated runtime environment exported through the app composition root
- PowerSync database, connector, HTTP uploader, truthful status store and Household Asset repository composed in one app-owned persistence module
- explicit `@journeyapps/wa-sqlite` application dependency for the PowerSync Web runtime
- authenticated bootstrap: session → idempotent personal workspace → PowerSync connection
- safe logout that refuses to clear local SQLite while unsynced mutations remain
- online/offline browser events refresh the truthful sync state
- minimal sign-in/sign-up experience
- mobile-first Household Vault shell
- local Household Asset list and add form
- new asset factory + domain validation before local persistence
- immediate local reload after creation
- dashboard count and versioned warranty-status calculation

## Deliberate deferrals

- TanStack Router and full route tree are deferred until dependency-backed build validation is available. The first vertical slice remains a single product shell rather than introducing an unverified router/plugin version pairing.
- Tailwind app composition is deferred; UAF semantic CSS is sufficient to validate the Phase-1 product path.
- remote reactive query watching, edit/delete/restore UI, service records, conflicts UI and PWA packaging belong to subsequent builds.

## Hard runtime gate

The code now represents the complete Milestone-A path, but Milestone A is **not passed** until a dependency-installed browser + Supabase + PowerSync environment proves:

1. sign in
2. personal workspace bootstrap
3. go offline
4. create asset
5. close/reopen offline and retain asset
6. reconnect
7. upload exactly once
8. authoritative Postgres row appears
9. local row reconciles
10. UI reaches stable `Synced`
