# BUILD 0.4 — Database, Authentication & Workspace Foundation

## Implemented

- shared Supabase schema migration,
- profile creation trigger,
- workspace and membership model,
- idempotent personal-workspace bootstrap RPC,
- RLS membership/write helpers,
- explicit grants and deny-by-default server infrastructure tables,
- provider-neutral auth/workspace contracts,
- Supabase adapter,
- static migration and package-boundary validators.

## Acceptance gate E3

BUILD 0.4 is structurally complete but E3 requires a real Supabase local/staging run with two authenticated users proving:

1. personal workspace bootstrap is idempotent,
2. owner membership exists,
3. User A cannot read/update User B's workspace,
4. anonymous access is blocked,
5. normal clients cannot write server-owned mutation/audit infrastructure.

See `infrastructure/supabase/tests/build-0.4-acceptance.sql`.
