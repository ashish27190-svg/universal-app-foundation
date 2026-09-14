import * as z from 'zod';
import type { AppManifest } from './manifest';

export const appEnvironmentSchema = z.enum(['development', 'staging', 'production']);
export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

export const runtimeEnvironmentSchema = z
  .object({
    VITE_UAF_ENVIRONMENT: appEnvironmentSchema.default('development'),
    VITE_SUPABASE_URL: z.string().url().optional(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    VITE_POWERSYNC_URL: z.string().url().optional(),
    VITE_SENTRY_DSN: z.string().url().optional(),
  });

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;

export function parseRuntimeEnvironment(
  manifest: AppManifest,
  rawEnvironment: unknown,
): RuntimeEnvironment {
  const schema = runtimeEnvironmentSchema.superRefine((environment, context) => {
    const needsBackendIdentity = manifest.capabilities.authentication || manifest.capabilities.workspace;

    if (needsBackendIdentity && !environment.VITE_SUPABASE_URL) {
      context.addIssue({
        code: 'custom',
        message: 'VITE_SUPABASE_URL is required when authentication or workspace is enabled',
        path: ['VITE_SUPABASE_URL'],
      });
    }

    if (needsBackendIdentity && !environment.VITE_SUPABASE_PUBLISHABLE_KEY) {
      context.addIssue({
        code: 'custom',
        message: 'VITE_SUPABASE_PUBLISHABLE_KEY is required when authentication or workspace is enabled',
        path: ['VITE_SUPABASE_PUBLISHABLE_KEY'],
      });
    }

    if (manifest.capabilities.sync && !environment.VITE_POWERSYNC_URL) {
      context.addIssue({
        code: 'custom',
        message: 'VITE_POWERSYNC_URL is required when sync is enabled',
        path: ['VITE_POWERSYNC_URL'],
      });
    }
  });

  return schema.parse(rawEnvironment);
}
