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
    { dir: 'agent', forbid: ['studio'] },
  ].map(({ dir, forbid }) => ({
    files: [`src/${dir}/**/*.{ts,tsx}`],
    ignores: [
      // Tests may import across layers.
      '**/*.test.{ts,tsx}',
      // modeling/api.ts is the script-API composition root: it is what
      // exposes `kinematic.*` to user scripts, which structurally requires
      // importing src/kinematic from modeling. Slice 8 moved the evaluator
      // wiring to src/composition/ (sweepTolerance's agent edge is gone);
      // flipping this last edge (createModelingApi rename + composition
      // attaching kinematic) is the remaining slice-8 step, coordinated with
      // kernelCAD-server (which also constructs this API outside this repo).
      'src/modeling/api.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: forbid.map((layer) => ({
          regex: layerImportRegex(layer),
          message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> composition -> agent -> studio).`,
        })),
      }],
      'no-restricted-syntax': ['error', ...forbid.map((layer) => ({
        selector: `ImportExpression[source.value=/${layerImportRegex(layer).replace(/\//g, '\\/')}/]`,
        message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> composition -> agent -> studio).`,
      }))],
    },
  })),
  // The remaining composition-root exception is exempt only from the ONE edge
  // its comment above documents; every other upward import is still an error.
  ...[
    { file: 'src/modeling/api.ts', dir: 'modeling', forbid: ['agent', 'studio', 'server'] },
  ].map(({ file, dir, forbid }) => ({
    files: [file],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: forbid.map((layer) => ({
          regex: layerImportRegex(layer),
          message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> composition -> agent -> studio).`,
        })),
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
