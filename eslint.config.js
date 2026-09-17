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
  // Layering: shared -> kernel -> modeling -> kinematic -> agent -> studio. Imports may only
  // point down. Mapped dirs: shared, kernel, modeling, kinematic, agent. Unmapped for now
  // (no layering rule applied): authoring, docs, funnel, lib, server.
  ...[
    { dir: 'shared', forbid: ['kernel', 'modeling', 'kinematic', 'agent', 'studio', 'server'] },
    { dir: 'kernel', forbid: ['modeling', 'kinematic', 'agent', 'studio', 'server'] },
    { dir: 'modeling', forbid: ['kinematic', 'agent', 'studio', 'server'] },
    { dir: 'kinematic', forbid: ['agent', 'studio'] },
    { dir: 'agent', forbid: ['studio'] },
  ].map(({ dir, forbid }) => ({
    files: [`src/${dir}/**/*.{ts,tsx}`],
    ignores: [
      // Tests may import across layers.
      '**/*.test.{ts,tsx}',
      // Remaining layering exceptions (kinematic placement, fixed in a follow-up slice).
      'src/kinematic/sweepTolerance.ts',
      'src/kernel/fea/feaMaterials.ts',
      'src/modeling/api.ts',
      'src/modeling/capture/proxy.ts',
      'src/modeling/properties/materialLibrary.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: forbid.map((layer) => ({
          regex: `(^|/)${layer}(/|$)`,
          message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> agent -> studio).`,
        })),
      }],
      'no-restricted-syntax': ['error', ...forbid.map((layer) => ({
        selector: `ImportExpression[source.value=/(^|\\/)${layer}(\\/|$)/]`,
        message: `src/${dir} must not import from src/${layer} (layering: shared -> kernel -> modeling -> kinematic -> agent -> studio).`,
      }))],
    },
  })),
  // Deprecated shim enforcement: the five `@deprecated export *` re-export
  // shims left at their pre-move paths exist only so old imports don't hard
  // -break; new imports must go straight to the moved module.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/modeling/properties/massProperties.ts',
      'src/modeling/capture/hermiteG2.ts',
      'src/modeling/backends/occt/surfaceSewLowerer.ts',
      'src/agent/render/animationSampler.ts',
      'src/agent/render/verifyAnimation.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '/modeling/properties/massProperties$',
            message: 'moved to src/modeling/properties/massProperties.ts; import from there instead of the deprecated shim.',
          },
          {
            regex: '/modeling/capture/hermiteG2$',
            message: 'moved to src/modeling/capture/hermiteG2.ts; import from there instead of the deprecated shim.',
          },
          {
            regex: '/modeling/backends/occt/surfaceSewLowerer$',
            message: 'moved to src/modeling/backends/occt/surfaceSewLowerer.ts; import from there instead of the deprecated shim.',
          },
          {
            regex: '/agent/render/animationSampler$',
            message: 'moved to src/modeling/animation/animationSampler.ts; import from there instead of the deprecated shim.',
          },
          {
            regex: '/agent/render/verifyAnimation$',
            message: 'moved to src/modeling/animation/verifyAnimation.ts; import from there instead of the deprecated shim.',
          },
        ],
      }],
    },
  },
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
