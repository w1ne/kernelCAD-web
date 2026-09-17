import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist/**', 'eval/runs/**', '.claude/worktrees/**', '.worktrees/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Layering: shared -> kernel -> modeling -> agent -> studio. Imports may only point down.
  ...[
    { dir: 'shared', forbid: ['kernel', 'modeling', 'agent', 'studio', 'server'] },
    { dir: 'kernel', forbid: ['modeling', 'agent', 'studio', 'server'] },
    { dir: 'modeling', forbid: ['agent', 'studio', 'server'] },
    { dir: 'agent', forbid: ['studio'] },
  ].map(({ dir, forbid }) => ({
    files: [`src/${dir}/**/*.{ts,tsx}`],
    ignores: [
      // Tests may import across layers.
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: forbid.map((layer) => ({
          regex: `(^|/)${layer}/`,
          message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> agent -> studio).`,
        })),
      }],
    },
  })),
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
      'reproduce_*.ts',
      'test_*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
