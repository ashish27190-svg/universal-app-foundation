# @uaf/ui

The UAF Phase-1 design-system package. It owns reusable behaviour and semantic styling, not app branding or domain meaning.

## BUILD 0.8 scope

- Semantic light/dark design tokens in `styles.css`.
- Form primitives, buttons, cards/list rows, status badges.
- Header and mobile bottom navigation.
- Radix-backed Dialog and BottomSheet for focus management and keyboard/screen-reader behaviour.
- Loading, empty/error states, toast presentation and truthful sync-status presentation.

Import the CSS once in an app entrypoint:

```ts
import '@uaf/ui/styles.css';
```

Apps should normally consume `@uaf/ui` rather than importing Radix directly. Domain-specific components stay in the app/domain until reuse is proven.

## Sync-status rule

Only `syncing` animates. `idle`, `offline`, `pending` and `attention_required` are stable states. This is a deliberate product reliability rule, not visual preference.
