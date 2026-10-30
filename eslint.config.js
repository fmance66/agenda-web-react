import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['build', 'public', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^(React|[A-Z_])' }],
    },
  },
  {
    files: ['server/**/*.js', 'e2e/**/*.{js,mjs}', 'vite.config.js', 'vitest.config.js', 'playwright.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // plantilla del service worker: __ARCHIVOS__ lo reemplaza vite.config.js al compilar
    files: ['sw/**/*.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, __ARCHIVOS__: 'readonly' },
    },
  },
])
