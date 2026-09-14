import * as z from 'zod';
import { appCapabilitiesSchema, validateCapabilityCompatibility } from './capabilities';

const appIdSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'app id must use lower-case kebab-case');

const semanticVersionSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
    'version must be semantic-version shaped, for example 0.1.0',
  );

export const appIdentitySchema = z
  .object({
    id: appIdSchema,
    name: z.string().trim().min(1).max(100),
    version: semanticVersionSchema,
    description: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const domainRegistrationSchema = z
  .object({
    id: appIdSchema,
    version: semanticVersionSchema,
    enabled: z.boolean().default(true),
  })
  .strict();

export const themeConfigSchema = z
  .object({
    id: appIdSchema,
    defaultMode: z.enum(['light', 'dark', 'system']).default('system'),
  })
  .strict();

export const appManifestSchema = z
  .object({
    app: appIdentitySchema,
    capabilities: appCapabilitiesSchema,
    domains: z.array(domainRegistrationSchema).default([]),
    theme: themeConfigSchema,
  })
  .strict()
  .superRefine((manifest, context) => {
    validateCapabilityCompatibility(manifest.capabilities, (message, path) => {
      context.addIssue({
        code: 'custom',
        message,
        path: [...path],
      });
    });

    const domainIds = new Set<string>();
    manifest.domains.forEach((domain, index) => {
      if (domainIds.has(domain.id)) {
        context.addIssue({
          code: 'custom',
          message: `duplicate domain registration: ${domain.id}`,
          path: ['domains', index, 'id'],
        });
      }
      domainIds.add(domain.id);
    });
  });

export type AppIdentity = z.infer<typeof appIdentitySchema>;
export type DomainRegistration = z.infer<typeof domainRegistrationSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type AppManifest = z.infer<typeof appManifestSchema>;

export function defineAppManifest(input: unknown): AppManifest {
  return appManifestSchema.parse(input);
}
