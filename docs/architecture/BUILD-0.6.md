# BUILD 0.6 — PowerSync Local Database & Sync Status

## Decisions

- `@powersync/web` 2.3.x is isolated inside `@uaf/sync`.
- PowerSync's default persistent Web VFS is the Phase 1 default; OPFS alternatives are deferred until measured need.
- The local schema initially contains only Foundation data needed on-device: workspaces, memberships and write conflicts. Domain tables are added by domain builds.
- Membership rows now have their own UUID because every synchronized PowerSync row needs a stable `id`.
- Sync UI consumes UAF states (`idle`, `syncing`, `offline`, `pending`, `attention_required`), never raw SDK flags.
- `syncing` is not a permanent idle animation: it maps only to active connect/upload/download/initial-sync work.
- Upload behavior remains an injected `PowerSyncMutationUploader`; BUILD 0.7 will implement the UAF write gateway uploader.

## Acceptance gate E5

A real dependency-backed browser test is still required to prove persistent SQLite survives reload/offline. This environment cannot install the SDK, so no browser persistence claim is marked as executed.
