import { describe, expect, it } from 'vitest';
import { householdVaultManifest } from './app-manifest';

describe('Household Vault reference app', () => {
  it('loads a validated UAF manifest', () => {
    expect(householdVaultManifest.app.id).toBe('household-vault');
    expect(householdVaultManifest.capabilities.sync).toBe(true);
    expect(householdVaultManifest.domains.map((domain) => domain.id)).toEqual(['household-assets']);
  });
});
