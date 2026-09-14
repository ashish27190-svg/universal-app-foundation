import * as z from 'zod';

/** Optional Foundation capabilities an application can opt into. */
export const appCapabilitiesSchema = z
  .object({
    authentication: z.boolean().default(false),
    workspace: z.boolean().default(false),
    offline: z.boolean().default(false),
    sync: z.boolean().default(false),
    backup: z.boolean().default(false),
    import: z.boolean().default(false),
    export: z.boolean().default(false),
    attachments: z.boolean().default(false),
    notifications: z.boolean().default(false),
    search: z.boolean().default(false),
    analytics: z.boolean().default(false),
    ai: z.boolean().default(false),
    collaboration: z.boolean().default(false),
    integrations: z.boolean().default(false),
  })
  .strict();

export type AppCapabilities = z.infer<typeof appCapabilitiesSchema>;

export function validateCapabilityCompatibility(
  capabilities: AppCapabilities,
  addIssue: (message: string, path: readonly (string | number)[]) => void,
): void {
  if (capabilities.workspace && !capabilities.authentication) {
    addIssue('workspace requires authentication', ['capabilities', 'workspace']);
  }

  if (capabilities.sync) {
    if (!capabilities.authentication) {
      addIssue('sync requires authentication', ['capabilities', 'sync']);
    }
    if (!capabilities.workspace) {
      addIssue('sync requires workspace', ['capabilities', 'sync']);
    }
    if (!capabilities.offline) {
      addIssue('sync requires offline local persistence in the Phase 1 UAF stack', ['capabilities', 'sync']);
    }
  }

  if (capabilities.collaboration) {
    if (!capabilities.authentication) {
      addIssue('collaboration requires authentication', ['capabilities', 'collaboration']);
    }
    if (!capabilities.workspace) {
      addIssue('collaboration requires workspace', ['capabilities', 'collaboration']);
    }
    if (!capabilities.sync) {
      addIssue('collaboration requires sync', ['capabilities', 'collaboration']);
    }
  }
}
