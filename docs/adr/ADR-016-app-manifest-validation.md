# ADR-016 — App Manifest as Validated Code Configuration

**Status:** Accepted  
**Build:** 0.3

## Decision

Applications define a version-controlled manifest and construct it through `defineAppManifest()`. Zod validates identity, capabilities, domains, theme, and compatibility constraints at runtime while TypeScript supplies static inference.

## Why

A plain object/interface can describe configuration but cannot reject invalid runtime input. A dynamic database-driven manifest would add unnecessary complexity before UAF has proven its internal module model.

## Consequences

- invalid capability combinations fail early
- manifests are code-reviewed and versioned with the application
- apps remain easy for humans and coding agents to inspect
- a future generator can emit the same manifest contract
- remote/low-code configuration is explicitly deferred
