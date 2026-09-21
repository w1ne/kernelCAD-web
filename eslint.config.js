import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// A layer is reached either by climbing out of the current directory
// (`../kinematic`, `../../kinematic/x`) or through an absolute `src/<layer>` path.
// A same-directory sibling that merely shares a layer's name (`./kinematic`, as in
// shared/diagnostics/registry/) is not a layer import.
const layerImportRegex = (layer) => `^(\\.\\./)+${layer}(/|$)|(^|/)src/${layer}(/|$)`;

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
  // Layering: shared -> kernel -> modeling -> kinematic -> composition -> agent -> studio.
  // Imports may only point down. Mapped dirs: shared, kernel, modeling, kinematic,
  // composition, agent. Unmapped for now (no layering rule applied): authoring, docs,
  // funnel, lib, server.
  ...[
    { dir: 'shared', forbid: ['kernel', 'modeling', 'kinematic', 'composition', 'agent', 'studio', 'server'] },
    { dir: 'kernel', forbid: ['modeling', 'kinematic', 'composition', 'agent', 'studio', 'server'] },
    { dir: 'modeling', forbid: ['kinematic', 'composition', 'agent', 'studio', 'server'] },
    { dir: 'kinematic', forbid: ['composition', 'agent', 'studio'] },
    { dir: 'composition', forbid: ['agent', 'studio', 'server'] },
    {
      dir: 'agent',
      forbid: ['studio'],
      // Composition owns the only factories that evaluate a script against the
      // full `kc.*` surface; agent code must not re-open the modeling-only
      // factory or the raw script core it cannot supply an apiFactory for.
      restrict: ['modeling/api', 'modeling/runtime/runScriptCore'],
    },
  ].map(({ dir, forbid, restrict = [] }) => ({
    files: [`src/${dir}/**/*.{ts,tsx}`],
    ignores: [
      // Tests may import across layers.
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...forbid.map((layer) => ({
            regex: layerImportRegex(layer),
            message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> composition -> agent -> studio).`,
          })),
          ...restrict.map((module) => ({
            regex: `^((\\.\\./)+|(^|/)src/)${module.replace(/\//g, '\\/')}$`,
            message: `src/${dir} must not import src/${module} directly: start scripts through src/composition.`,
          })),
        ],
      }],
      'no-restricted-syntax': ['error', ...forbid.map((layer) => ({
        selector: `ImportExpression[source.value=/${layerImportRegex(layer).replace(/\//g, '\\/')}/]`,
        message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> composition -> agent -> studio).`,
      }))],
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
