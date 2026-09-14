# @uaf/auth

UAF identity and workspace boundary.

BUILD 0.4 provides:

- provider-neutral `AuthService` and `WorkspaceService` contracts,
- explicit authenticated/unauthenticated session models,
- workspace and membership types,
- a Supabase Auth adapter,
- an idempotent personal-workspace bootstrap through the database RPC.

Application/domain code should consume these UAF contracts rather than spreading Supabase SDK shapes throughout the codebase.
