import { describe, expect, it } from 'vitest';
import {
  UAF_CONFIG_VERSION,
  appManifestSchema,
  defineAppManifest,
  parseRuntimeEnvironment,
} from './index';

const validManifestInput = {
  app: {
    id: 'household-vault',
    name: 'Household Vault',
    version: '0.1.0',
  },
  capabilities: {
    authentication: true,
    workspace: true,
    offline: true,
    sync: true,
  },
  domains: [{ id: 'household-assets', version: '0.1.0' }],
  theme: { id: 'household-vault' },
};

describe('@uaf/config', () => {
  it('exposes the BUILD 0.3 marker', () => {
    expect(UAF_CONFIG_VERSION).toBe('0.3.0-build.0.20');
  });

  it('applies safe defaults to a valid manifest', () => {
    const manifest = defineAppManifest(validManifestInput);

    expect(manifest.capabilities.sync).toBe(true);
    expect(manifest.capabilities.ai).toBe(false);
    expect(manifest.domains[0]?.enabled).toBe(true);
    expect(manifest.theme.defaultMode).toBe('system');
  });

  it('rejects sync without its Phase 1 dependencies', () => {
    const result = appManifestSchema.safeParse({
      ...validManifestInput,
      capabilities: { sync: true },
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate domain registrations', () => {
    const result = appManifestSchema.safeParse({
      ...validManifestInput,
      domains: [
        { id: 'household-assets', version: '0.1.0' },
        { id: 'household-assets', version: '0.1.0' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('requires backend environment values for enabled capabilities', () => {
    const manifest = defineAppManifest(validManifestInput);

    expect(() => parseRuntimeEnvironment(manifest, { VITE_UAF_ENVIRONMENT: 'development' })).toThrow();

    expect(
      parseRuntimeEnvironment(manifest, {
        VITE_UAF_ENVIRONMENT: 'development',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        VITE_POWERSYNC_URL: 'https://example.powersync.journeyapps.com',
      }),
    ).toMatchObject({ VITE_UAF_ENVIRONMENT: 'development' });
  });
});
