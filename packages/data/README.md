# @uaf/data

Vendor-independent persistence contracts for UAF domains.

BUILD 0.5 provides:

- workspace-scoped repository reads,
- explicit optimistic-concurrency revisions,
- create/update/soft-delete/restore contracts,
- structured repository errors,
- an in-memory reference implementation used to prove repository behaviour before PowerSync is introduced.

The contract deliberately prevents domain code from depending on PowerSync or Supabase APIs.
