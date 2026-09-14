# BUILD 0.8 — UAF UI Foundation

Phase-1 design-system implementation.

## Decisions encoded

- Semantic CSS custom properties are the public theme contract; app-specific brand values may override them.
- Basic controls use native semantic HTML.
- Modal and bottom-sheet behaviour uses Radix Dialog so focus trapping, Escape handling and screen-reader title/description semantics are not reimplemented by UAF.
- `@uaf/ui` does not import PowerSync, Supabase, auth, data, or any domain. SyncStatus receives a small display-state contract instead of coupling the optional sync capability into the design system.
- Only the actual `syncing` state animates.
- Components needed by Household Vault are implemented first; the package is intentionally not a comprehensive component library.

## Deferred

- Tailwind integration in the reference app remains a stack choice, but is not required for the reusable package to expose semantic tokens. Dependency-backed integration will be validated once the registry is available.
- Visual regression and DOM accessibility tests require installed dependencies and remain pending.
