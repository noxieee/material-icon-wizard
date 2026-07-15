import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      // core is isomorphic — allow both Node and browser globals so the
      // shared code lints identically regardless of where it runs.
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  prettier,
];
