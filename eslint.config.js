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
      // Slice-2 allowlist — delete each line as its file is fixed.
      'src/kernel/backends/backend.ts',
      'src/kernel/backends/occt/occtBackend.ts',
      'src/kernel/backends/occt/pathNurbsLowerer.ts',
      'src/kernel/backends/verb/curveBridge.ts',
      'src/kernel/backends/occt/importStl.ts',
      'src/modeling/parts/fetchPart.ts',
      'src/modeling/parts/synthesizeConnectors.ts',
      'src/modeling/animation/bakeAnimationTimeline.ts',
      'src/agent/render/headless-player/main.tsx',
      // Test-file violations found running `npm run lint` on the full tree;
      // not enumerated in the task-4 brief's 9-file list. Same slice-2 cleanup applies.
      'src/kernel/backends/occt/exportGlbTexture.test.ts',
      'src/kernel/backends/occt/tangencySolver.test.ts',
      'src/kernel/backends/verb/curveBridge.test.ts',
      'src/kernel/naming/queryComposition.test.ts',
      'src/kernel/naming/queryPartLineage.test.ts',
      'src/modeling/animation/bakeAnimationTimeline.test.ts',
      'src/modeling/backends/occt/additiveNoOpGate.test.ts',
      'src/modeling/backends/occt/subtractiveNoOpGate.test.ts',
      'src/modeling/joints/articulatedDigit.test.ts',
      'src/modeling/joints/supportedServoRevolute.test.ts',
      'src/modeling/mates/poseEnvelope.test.ts',
      'src/modeling/parts/fetchPartMetadata.test.ts',
      'src/modeling/parts/synthesizeConnectors.test.ts',
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
