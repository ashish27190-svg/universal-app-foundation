# @uaf/config

Validated application and runtime configuration for Universal App Foundation.

BUILD 0.3 implements:

- application identity
- Foundation capability switches
- capability compatibility rules
- domain registration
- theme registration
- runtime environment validation
- `defineAppManifest()` as the canonical manifest entry point

The package is intentionally configuration-only. It does not import React, Supabase, PowerSync, Cloudflare, or any application/domain package.
