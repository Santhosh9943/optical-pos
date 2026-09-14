import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import parser from 'eslint-config-next/parser';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'test-results/**',
    'playwright-report/**',
    'scratch/**',
    '*.config.js',
    '*.config.mjs',
    '*.config.ts',
  ]),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: 'module',
        allowImportExportEverywhere: true,
        babelOptions: {
          presets: ['next/babel'],
          caller: {
            supportsTopLevelAwait: true,
          },
        },
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
