import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // Ignore build outputs
  { ignores: ['dist/**', 'node_modules/**'] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript + React files
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.app.json',
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      // --- TypeScript rules (let TS compiler handle these, not ESLint) ---
      // Disable base rule; TS-aware rule handles it instead
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          // Ignore variables starting with _ (intentional unused)
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          // Ignore destructured array elements (e.g. const [, setter] = ...)
          ignoreRestSiblings: true,
          // Allow unused function arguments so long as a later arg IS used
          caughtErrors: 'none',
        },
      ],

      // Allow `any` in JSX / legacy code (TS strict already enforced by tsc)
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow non-null assertions (codebase uses them deliberately)
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow empty catch blocks (used deliberately in background fetches)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Disable non-standard / unknown plugin rules that aren't installed
      'preserve-caught-error': 'off',

      // React JSX transform — no need to import React in scope
      // (handled by tsconfig "jsx": "react-jsx")
      'no-undef': 'off',

      // React Hooks linting
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Refresh (Vite HMR)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Useful general rules
      'prefer-const': 'warn',
      'no-console': 'off',
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
    },
  },
];
