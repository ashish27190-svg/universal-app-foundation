import { createSupabaseUafServices } from '@uaf/auth';
import { parseRuntimeEnvironment } from '@uaf/config';
import { householdVaultManifest } from './app-manifest';

export const runtimeEnvironment = parseRuntimeEnvironment(householdVaultManifest, import.meta.env);

if (!runtimeEnvironment.VITE_SUPABASE_URL || !runtimeEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase configuration is required by the Household Vault manifest.');
}

export const uafServices = createSupabaseUafServices({
  url: runtimeEnvironment.VITE_SUPABASE_URL,
  publishableKey: runtimeEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
});
