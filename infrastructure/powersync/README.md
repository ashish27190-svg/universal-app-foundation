# PowerSync Infrastructure

`sync-config.yaml` uses Sync Streams edition 3 and mirrors the UAF workspace membership boundary. It auto-subscribes the authenticated user to their accessible workspaces, their own active membership rows, Household Vault domain rows, and unresolved write conflicts.

Sync Streams govern **downloads**. They do not authorize uploaded writes; the UAF write gateway separately authenticates and authorizes every mutation.

Before deployment, validate this file against the actual staging schema with the PowerSync dashboard/CLI.
