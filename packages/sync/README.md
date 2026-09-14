# @uaf/sync

PowerSync-specific local persistence/sync adapter behind UAF contracts.

BUILD 0.6 provides:

- Foundation client-side PowerSync schema,
- persistent browser SQLite database factory,
- authenticated PowerSync credential connector,
- mutation-uploader extension point for the upcoming write gateway,
- truthful UAF sync-state mapping,
- pending local mutation count from PowerSync's upload queue,
- observable status store.

The package uses PowerSync internally; domains must not import PowerSync directly.
