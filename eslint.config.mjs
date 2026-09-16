import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // These live outside the normal workspace TS projects or use another
  // runtime/toolchain. Lint them, but do not force workspace type services.
  {
    files: [
      'apps/reference-app/playwright.config.ts',
      'apps/reference-app/tests/e2e/**/*.{ts,tsx}',
      'infrastructure/supabase/functions/**/*.{ts,tsx}',
      'packages/core/type-tests/**/*.{ts,tsx}',
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Tests intentionally contain mocks, invalid values and Promise-compatible
  // fakes. Production source remains strict.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
    },
  },

  // In-memory implementation fulfils an asynchronous repository contract.
  {
    files: ['packages/data/src/in-memory.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Narrow SDK / persistence adapter boundaries.
  {
    files: [
      'apps/reference-app/src/sync/persistence.ts',
      'packages/auth/src/supabase.ts',
      'packages/sync/src/conflicts.ts',
      'packages/sync/src/local-database.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },

  {
    files: ['packages/ui/src/overlays.tsx'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Supabase Edge Functions are external-runtime boundary adapters.
  {
    files: ['infrastructure/supabase/functions/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Core type-tests intentionally use underscore-prefixed compile-time args.
  {
    files: ['packages/core/type-tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },


  {
    files: ['apps/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  {
    files: ['apps/**/*.tsx'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  {
    files: ['apps/reference-app/src/monitoring.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
