# BUILD 0.3 — `@uaf/config` and App Manifest

## Purpose

Make application configuration executable and fail-fast instead of relying on conventions in documentation.

## Implemented

- strict application identity schema
- semantic-version-shaped app/domain versions
- Foundation capability schema with safe defaults
- capability compatibility validation
- domain registration with duplicate detection
- theme registration
- environment classification (`development`, `staging`, `production`)
- capability-aware runtime environment validation
- `defineAppManifest()` as the canonical manifest constructor
- validated Household Vault manifest wired into the reference app
- config dependency-boundary validator

## Locked Phase 1 capability rules

- `workspace` requires `authentication`
- `sync` requires `authentication`, `workspace`, and `offline`
- `collaboration` requires `authentication`, `workspace`, and `sync`

These rules intentionally encode the selected Phase 1 architecture rather than allowing impossible or misleading combinations.

## Runtime environment rule

The config package accepts Vite's normal extra environment keys but returns only the declared UAF environment fields. When enabled capabilities require backend services, missing URLs/keys fail validation before the app proceeds.

## Boundary

`@uaf/config` may depend on Zod and its own modules. It does not depend on React, Supabase, PowerSync, Cloudflare, applications, or business domains.

## Deferred

- dynamic/remote manifests
- low-code configuration
- runtime module installation
- feature-flag service integration
- secret management implementation
- environment provider adapters

Those do not belong in BUILD 0.3.
