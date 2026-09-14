import { defineAppManifest } from '@uaf/config';

export const householdVaultManifest = defineAppManifest({
  app: {
    id: 'household-vault',
    name: 'Household Vault',
    version: '0.1.0',
    description: 'UAF reference application for household assets, warranties, and service history.',
  },
  capabilities: {
    authentication: true,
    workspace: true,
    offline: true,
    sync: true,
    backup: false,
    import: false,
    export: false,
    attachments: false,
    notifications: false,
    search: false,
    analytics: false,
    ai: false,
    collaboration: false,
    integrations: false,
  },
  domains: [{ id: 'household-assets', version: '0.1.0' }],
  theme: {
    id: 'household-vault',
    defaultMode: 'system',
  },
});
