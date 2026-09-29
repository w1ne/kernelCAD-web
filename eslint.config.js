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

// Tailwind colour utilities with a raw hex (`bg-[#222]`) or a raw gray scale
// (`text-gray-400`, `border-zinc-700`), after any variant prefix (`hover:`).
const RAW_COLOUR_CLASS = String.raw`/(^|[\s:])(bg|text|border(-[trblxy])?|divide|ring|ring-offset|outline|placeholder|from|via|to|fill|stroke|accent|caret|decoration|shadow)-(\[#[0-9a-fA-F]{3,8}\]|(gray|zinc|slate|neutral|stone)-[0-9]{2,3})/`;
const TINY_TEXT_CLASS = String.raw`/(^|[\s:])text-\[10px\]/`;

export default defineConfig([
  globalIgnores(['**/dist/**', 'eval/runs/**', 'eval/benchmarks/cadgenbench/runs/**', 'eval/benchmarks/cadgenbench/.cache/**', '.claude/worktrees/**', '.worktrees/**']),
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
  // Studio colours come from the semantic tokens in src/index.css
  // (bg-surface-1, text-fg-2, border-border, …), and 11 px (text-2xs) is the
  // smallest text. Block raw hex / gray utilities and 10 px text in class
  // strings, and hex colours in inline styles. Scene colours (three.js,
  // numbers or JSX props on scene nodes) are not class strings, so they pass.
  {
    files: ['src/studio/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      // Recorded demo frames keep a fixed look for video capture.
      'src/studio/components/demoPlayer/**',
      // Marking overlay: translucent inline styles over the 3D view.
      'src/studio/components/viewer/overlays/MarkingIntentPanel.tsx',
      // TODO(S17): the code editor files are being reworked separately; move
      // them to the tokens after that lands.
      'src/studio/tabs/CodeTab.tsx',
      'src/studio/components/Editor.tsx',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...[
        { raw: RAW_COLOUR_CLASS, message: 'Use the semantic colour tokens (bg-surface-1, text-fg-2, border-border, …) from src/index.css, not raw hex or gray utilities.' },
        { raw: TINY_TEXT_CLASS, message: 'text-[10px] is below the type scale. Use text-2xs (11 px).' },
      ].flatMap(({ raw, message }) => [
        { selector: `Literal[value=${raw}]`, message },
        { selector: `TemplateElement[value.raw=${raw}]`, message },
      ]), {
        selector: `JSXAttribute[name.name='style'] Literal[value=/^#[0-9a-fA-F]{3,8}$/]`,
        message: 'Use a semantic colour token (var(--color-*)) in inline styles, not a raw hex colour.',
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
