import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { readFileSync } from 'node:fs'

// Kernel seam (see src/modeling/backends/kernelRegistry.ts): replicad is the
// OCCT kernel's binding and should only be imported inside the OCCT backend
// folders. Files that already did so are baselined; the list may only shrink.
const replicadImportBaseline = JSON.parse(
  readFileSync(new URL('./scripts/lint/replicad-import-baseline.json', import.meta.url), 'utf8'),
).files

// A layer is reached either by climbing out of the current directory
// (`../kinematic`, `../../kinematic/x`) or through an absolute `src/<layer>` path.
// A same-directory sibling that merely shares a layer's name (`./kinematic`, as in
// shared/diagnostics/registry/) is not a layer import.
const layerImportRegex = (layer) => `^(\\.\\./)+${layer}(/|$)|(^|/)src/${layer}(/|$)`;

export default defineConfig([
  globalIgnores(['.scratch/**', '**/dist/**', 'eval/runs/**', 'eval/benchmarks/cadgenbench/runs/**', 'eval/benchmarks/cadgenbench/.cache/**', '.claude/worktrees/**', '.worktrees/**']),
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
  {
    files: [
      'examples/rocket-engine-lines/engine-bare.kcad.ts',
      'site/blog/rocket-engine-routing/engine-bare.kcad.ts',
    ],
    // Preserve the original comparison source: these asm.part handles are
    // intentionally retained for the routed variant; creating each part is
    // the assembly side effect. Other unused variables still fail this rule.
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^(chamber|manifold|dome|gimbal|frame|turbopump|collar|gasGenerator|pumpMount|mainLoxValve|mainFuelValve|ggValve|actuators|cartridge|bottle)$',
      }],
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
  // Uses the typescript-eslint rule (not core no-restricted-imports) so it
  // stacks with the layering config above instead of replacing it.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/modeling/backends/occt/**',
      'src/kernel/backends/occt/**',
      '**/*.test.{ts,tsx}',
      ...replicadImportBaseline,
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['warn', {
        paths: ['replicad', 'replicad-opencascadejs'].map((name) => ({
          name,
          message: `Import ${name} only inside src/{modeling,kernel}/backends/occt/. Elsewhere go through ShapeBackend / the kernel registry (src/modeling/backends/kernelRegistry.ts) so a second kernel can slot in.`,
        })),
      }],
    },
  },
  // 11 px (text-2xs) is the smallest step of the type scale in src/index.css.
  // Raw colours in src/studio are held by the ratchet in
  // tests/unit/architecture/studioRawColours.test.ts.
  {
    files: ['src/studio/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...['Literal[value', 'TemplateElement[value.raw'].map((node) => ({
        selector: `${node}=/(^|[\\s:])text-\\[10px\\]/]`,
        message: 'text-[10px] is below the type scale. Use text-2xs (11 px).',
      }))],
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
