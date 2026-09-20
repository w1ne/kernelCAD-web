#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Wrapper typechecker for `.kcad.ts` scripts (gap #8).
//
// `.kcad.ts` files are FUNCTION BODIES, not modules: the runtime injects the
// kernelCAD DSL as globals (`param`, `path`, `box`, `assembly`, ...) and reads
// the model from a top-level `return` (see `runScriptCore.ts` and
// `kernel/backends/occt/worker.ts`). No tsconfig can include them directly, so
// this script generates a temporary wrapper per target that
//   - imports the real `KernelCadApi` member types,
//   - declares every injected global with the matching member type,
//   - embeds the script source in an async IIFE (top-level `return`/`await` are
//     valid inside it),
// and then runs ONE `tsc --noEmit` over the generated batch. The wrapper
// preamble is generated from the sources of truth instead of copied by hand:
// the API global names are parsed out of the `KernelCadApi` interface, and the
// browser worker's extra shim globals are parsed out of the `new Function`
// argument list + `createUserGlobals`. A unit test
// (`tests/unit/scripts/typecheckExamplesGlobals.test.ts`) fails if the worker
// shim grows a global this wrapper does not declare.
//
// Usage:
//   npx tsx scripts/typecheckExamples.ts                      # examples/** + e2e fixtures
//   npx tsx scripts/typecheckExamples.ts <file.kcad.ts> ...   # explicit files only
//   npx tsx scripts/typecheckExamples.ts --all                # explicit full tree
//   npx tsx scripts/typecheckExamples.ts --help
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { findTopLevelImport, normalizeUserScript } from '../src/shared/runtime/normalizeUserScript';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const API_SOURCE_PATH = join(REPO_ROOT, 'src/modeling/api.ts');
export const WORKER_SOURCE_PATH = join(REPO_ROOT, 'src/kernel/backends/occt/worker.ts');
export const USER_GLOBALS_SOURCE_PATH = join(REPO_ROOT, 'src/shared/worker/userGlobals.ts');

/**
 * Type aliases `.kcad.ts` scripts are allowed to reference in annotations.
 * The runtime erases them, so they are not values injected as globals — but a
 * script can only be typechecked if these names resolve. `KernelCadApi` is
 * imported separately (the globals are declared from its members).
 */
const TYPE_IMPORTS: ReadonlyArray<{ module: string; names: readonly string[] }> = [
  { module: 'src/shared/runtime/paramRef', names: ['Editable', 'ParamRef', 'TypedParamRef'] },
  { module: 'src/modeling/capture/proxy', names: ['Shape'] },
  { module: 'src/modeling/capture/sketch', names: ['PathBuilder', 'Sketch'] },
  { module: 'src/modeling/capture/assembly', names: ['Assembly'] },
  { module: 'src/modeling/capture/surfaceProxy', names: ['SurfaceProxy'] },
  { module: 'src/modeling/capture/curveProxy', names: ['Curve3D'] },
  { module: 'src/shared/intent/types', names: ['PlaneSpec', 'Vec3'] },
  { module: 'src/kernel/backends/occt/edgeQueries', names: ['EdgeQuery', 'EdgeSegment'] },
  { module: 'src/modeling/selection/shapeList', names: ['ShapeList'] },
  { module: 'src/modeling/helix', names: ['RailPoint'] },
  { module: 'src/kernel/geometry/hermiteG2', names: ['HermiteEndpoint'] },
  { module: 'src/modeling/sdf/index', names: ['SdfField'] },
  { module: 'src/shared/fonts/fontPath', names: ['FontPath'] },
  { module: 'src/kinematic/types', names: ['KinematicFacade'] },
  { module: 'src/shared/intent/dfmSpecRecord', names: ['DfmSpec', 'DfmSpecHandle'] },
  { module: 'src/shared/intent/animationViewRecord', names: ['AnimationViewHandle', 'AnimationViewSpec'] },
  { module: 'src/shared/intent/referenceImageRecord', names: ['ReferenceImageHandle'] },
  { module: 'src/shared/intent/renderEnvironmentRecord', names: ['RenderEnvironmentHandle', 'RenderEnvironmentSpec'] },
];

/** Member names of the `KernelCadApi` interface — the DSL globals the runtime
 *  spreads onto the script scope (`runScriptCore.ts`). Parsed from source so
 *  adding an API method flags every generated wrapper automatically. */
export function parseKernelCadApiGlobals(apiSource: string): string[] {
  const sourceFile = ts.createSourceFile('api.ts', apiSource, ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'KernelCadApi') {
      for (const member of node.members) {
        if (member.name && ts.isIdentifier(member.name)) names.push(member.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...new Set(names)];
}

/** Every global the browser worker injects: the `new Function(...)` argument
 *  list in `worker.ts` (a superset of the v0.1 shim) plus the
 *  `createUserGlobals` return keys. Some of these are also `KernelCadApi`
 *  members; `missingWorkerGlobals` computes the ones the preamble misses. */
export function parseWorkerShimGlobals(workerSource: string, userGlobalsSource: string): string[] {
  const names = new Set<string>();
  const collectNewFunctionArgs = (source: string, fileName: string): void => {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Function' &&
        node.arguments
      ) {
        const args = Array.from(node.arguments);
        // The last argument is the script body; every preceding string literal
        // is a parameter name injected as a global.
        for (let i = 0; i < args.length - 1; i++) {
          const arg = args[i];
          if (ts.isStringLiteral(arg)) names.add(arg.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  };
  collectNewFunctionArgs(workerSource, 'worker.ts');

  const userGlobalsFile = ts.createSourceFile('userGlobals.ts', userGlobalsSource, ts.ScriptTarget.Latest, true);
  const visitReturns = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
      for (const prop of node.expression.properties) {
        if (ts.isShorthandPropertyAssignment(prop)) names.add(prop.name.text);
        else if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) names.add(prop.name.text);
      }
    }
    ts.forEachChild(node, visitReturns);
  };
  visitReturns(userGlobalsFile);
  return [...names];
}

/**
 * Worker-shim globals with no `KernelCadApi` equivalent yet. These are
 * injected by the browser worker's `new Function(...)` shim (and
 * `createUserGlobals`) but are not part of the Node `.kcad.ts` API surface, so
 * the wrapper declares them as documented `any`. The sync test parses the
 * worker source and fails loudly when a new injected global is missing here.
 */
export const SHIM_ONLY_GLOBALS: readonly string[] = [
  'replicad',
  'startSketch',
  'makeCompound',
  'fillet',
  'chamfer',
  'sketchOnFace',
  'extrude',
  'Sketcher',
  'sketcher',
].sort();

/** Names the wrapper preamble declares: every API member, the `kc` alias, and
 *  every shim-only global. */
export function declaredGlobalNames(apiGlobalNames: readonly string[]): string[] {
  return [...new Set([...apiGlobalNames, 'kc', ...SHIM_ONLY_GLOBALS])].sort();
}

/** Worker-shim globals the wrapper preamble does NOT declare. Non-empty means
 *  `src/kernel/backends/occt/worker.ts` grew an injected global without
 *  `SHIM_ONLY_GLOBALS` (or a kernel API member) being updated. */
export function missingWorkerGlobals(
  workerShimNames: readonly string[],
  apiGlobalNames: readonly string[],
): string[] {
  const declared = new Set(declaredGlobalNames(apiGlobalNames));
  return workerShimNames.filter((name) => !declared.has(name)).sort();
}

/** Relative import specifier from a generated wrapper's directory to a repo
 *  source module. POSIX-normalised so the generated wrapper is stable. */
function importSpecifier(wrapperDir: string, modulePath: string): string {
  const rel = relative(wrapperDir, resolve(REPO_ROOT, modulePath));
  return rel.split('\\').join('/');
}

/**
 * Build the wrapper preamble. API members get their real `KernelCadApi` member
 * type; the browser worker's v0.1-shim-only globals have no API equivalent yet
 * and are intentionally `any` with a TODO naming each one.
 */
export function buildWrapperPreamble(apiGlobalNames: readonly string[], wrapperDir: string): string {
  const apiSet = new Set(apiGlobalNames);
  const anyGlobals = SHIM_ONLY_GLOBALS.filter((name) => !apiSet.has(name) && name !== 'kc');
  const apiNames = [...new Set(apiGlobalNames)].sort();
  const lines: string[] = [];

  for (const entry of TYPE_IMPORTS) {
    lines.push(`import type { ${entry.names.join(', ')} } from '${importSpecifier(wrapperDir, entry.module)}';`);
  }
  lines.push(`import type { KernelCadApi } from '${importSpecifier(wrapperDir, 'src/modeling/api')}';`);
  lines.push('');
  lines.push('// DSL globals injected by the runtime (`runScriptCore.ts` spreads every');
  lines.push('// KernelCadApi member onto the script scope and aliases the API as `kc`).');
  lines.push('declare const kc: KernelCadApi;');
  for (const name of apiNames) {
    lines.push(`declare const ${name}: KernelCadApi['${name}'];`);
  }
  if (anyGlobals.length > 0) {
    lines.push('');
    lines.push('// TODO(typecheck-examples): these globals are injected by the browser');
    lines.push('// worker v0.1 shim (`kernel/backends/occt/worker.ts`) but have no');
    lines.push('// KernelCadApi equivalent yet — intentionally `any`:');
    for (const name of anyGlobals) lines.push(`//   ${name}`);
    for (const name of anyGlobals) lines.push(`declare const ${name}: any;`);
  }
  return lines.join('\n');
}

/** The script source is a function body; wrap it in an async IIFE so its
 *  top-level `return` and `await` are valid. Returns the wrapper text and the
 *  line offset for mapping tsc positions back to the original file. */
export function buildWrapperCode(source: string, preamble: string): { code: string; sourceLineOffset: number } {
  const normalized = normalizeUserScript(source);
  const preambleLineCount = preamble.split('\n').length;
  const code = `${preamble}\nvoid (async function () {\n${normalized}\n})();\n`;
  return { code, sourceLineOffset: preambleLineCount + 1 };
}

export interface Diagnostic {
  filePath: string;
  line: number;
  column: number;
  code: number;
  message: string;
  /** True when the position sits in the generated wrapper preamble rather
   *  than in the embedded script source (line numbers are original then). */
  inWrapperPreamble?: boolean;
}

/** Parse `tsc --pretty false` output lines. */
export function parseTscDiagnostics(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lineRe = /^(.+?)\((\d+),(\d+)\): error TS(\d+): (.*)$/;
  for (const line of output.split('\n')) {
    const match = lineRe.exec(line.trimEnd());
    if (!match) continue;
    diagnostics.push({
      filePath: match[1],
      line: Number(match[2]),
      column: Number(match[3]),
      code: Number(match[4]),
      message: match[5],
    });
  }
  return diagnostics;
}

function listFilesRecursive(dirAbs: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && predicate(entry.name)) out.push(abs);
    }
  };
  walk(dirAbs);
  return out;
}

/** Default target set: `examples/**\/*.kcad.ts` + `tests/e2e/fixtures/*.kcad.ts`. */
export function listDefaultTargets(): string[] {
  const examplesDir = join(REPO_ROOT, 'examples');
  const fixturesDir = join(REPO_ROOT, 'tests/e2e/fixtures');
  const files = [
    ...listFilesRecursive(examplesDir, (name) => name.endsWith('.kcad.ts')),
    ...readdirSync(fixturesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.kcad.ts'))
      .map((entry) => join(fixturesDir, entry.name)),
  ];
  return files.sort();
}

function toRelPath(absPath: string): string {
  const rel = relative(REPO_ROOT, absPath);
  return rel.startsWith('..') ? absPath : rel.split('\\').join('/');
}

function sanitizeFileToken(relPath: string): string {
  return relPath.replace(/[^A-Za-z0-9._-]+/g, '_');
}

interface WrapperTarget {
  relPath: string;
  wrapperName: string;
  sourceLineOffset: number;
}

function parseArgs(argv: string[]): { targets: string[] } | { help: true } {
  const files: string[] = [];
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return { help: true };
    // `--all` is the explicit spelling of the default full-tree target set.
    if (arg === '--all') continue;
    files.push(arg);
  }
  if (files.length > 0) {
    return { targets: files.map((file) => resolve(process.cwd(), file)) };
  }
  return { targets: listDefaultTargets() };
}

function runTsc(wrapperDir: string): { status: number | null; stdout: string; stderr: string } {
  const tscBin = join(REPO_ROOT, 'node_modules/typescript/bin/tsc');
  const result = spawnSync(
    process.execPath,
    [tscBin, '-p', join(wrapperDir, 'tsconfig.json'), '--noEmit', '--pretty', 'false'],
    { encoding: 'utf8' },
  );
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const HELP = `Usage: npx tsx scripts/typecheckExamples.ts [--all] [file.kcad.ts ...]

  (no args)   typecheck examples/**/*.kcad.ts + tests/e2e/fixtures/*.kcad.ts
  --all       same full-tree target set (explicit spelling)
  <files>     typecheck only the listed .kcad.ts files`;

export async function runTypecheck(targets: string[]): Promise<number> {
  if (targets.length === 0) {
    console.error('typecheckExamples: no targets found');
    return 1;
  }

  const apiSource = readFileSync(API_SOURCE_PATH, 'utf8');
  const workerSource = readFileSync(WORKER_SOURCE_PATH, 'utf8');
  const userGlobalsSource = readFileSync(USER_GLOBALS_SOURCE_PATH, 'utf8');
  const apiGlobalNames = parseKernelCadApiGlobals(apiSource);
  const workerShimNames = parseWorkerShimGlobals(workerSource, userGlobalsSource);

  // Drift sentinel: the worker executing browser `.kcad.ts` snippets injects
  // globals the wrapper must declare. If the shim grew one, fail loudly here
  // instead of letting scripts die with "Cannot find name" in the wrapper.
  const missingGlobals = missingWorkerGlobals(workerShimNames, apiGlobalNames);
  if (missingGlobals.length > 0) {
    console.error(
      `typecheckExamples: worker shim injects undeclared global(s): ${missingGlobals.join(', ')}\n` +
        'Add them to KernelCadApi or to SHIM_ONLY_GLOBALS in scripts/typecheckExamples.ts.',
    );
    return 1;
  }

  const baseTmpDir = join(REPO_ROOT, 'node_modules/.tmp');
  mkdirSync(baseTmpDir, { recursive: true });
  const wrapperDir = mkdtempSync(join(baseTmpDir, 'kcad-typecheck-examples-'));
  const wrapperTargets: WrapperTarget[] = [];
  const fileErrors = new Map<string, string[]>();

  try {
    const preamble = buildWrapperPreamble(apiGlobalNames, wrapperDir);
    const wrapperNames: string[] = [];

    targets.forEach((absPath, index) => {
      const relPath = toRelPath(absPath);
      const wrapperName = `wrapper-${String(index).padStart(3, '0')}-${sanitizeFileToken(relPath)}.ts`;
      const wrapperPath = join(wrapperDir, wrapperName);
      const target: WrapperTarget = { relPath, wrapperName, sourceLineOffset: 0 };

      let source: string;
      try {
        source = readFileSync(absPath, 'utf8');
      } catch (err) {
        fileErrors.set(relPath, [`cannot read file: ${err instanceof Error ? err.message : String(err)}`]);
        wrapperTargets.push(target);
        return;
      }

      // `.kcad.ts` execution refuses top-level imports (gap #7) and
      // `normalizeUserScript` would silently strip them, so typechecking the
      // stripped body would under-check. Report the runtime refusal instead.
      const importStatement = findTopLevelImport(source);
      if (importStatement !== undefined) {
        fileErrors.set(relPath, [
          `top-level import is not supported in .kcad.ts (gap #7): ${importStatement}`,
        ]);
        wrapperTargets.push(target);
        return;
      }

      const { code, sourceLineOffset } = buildWrapperCode(source, preamble);
      target.sourceLineOffset = sourceLineOffset;
      writeFileSync(wrapperPath, code);
      wrapperNames.push(wrapperName);
      wrapperTargets.push(target);
    });

    if (wrapperNames.length === 0) {
      for (const [relPath, errors] of fileErrors) {
        console.error(`${relPath}`);
        for (const error of errors) console.error(`  ${error}`);
      }
      return 1;
    }

    writeFileSync(
      join(wrapperDir, 'tsconfig.json'),
      `${JSON.stringify(
        {
          extends: relative(wrapperDir, join(REPO_ROOT, 'tsconfig.app.json')).split('\\').join('/'),
          compilerOptions: {
            noEmit: true,
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
          files: wrapperNames.map((name) => `./${name}`),
        },
        null,
        2,
      )}\n`,
    );

    const { status, stdout, stderr } = runTsc(wrapperDir);
    if (status === null) {
      console.error(`typecheckExamples: failed to spawn tsc\n${stderr}`);
      return 1;
    }

    const diagnostics = parseTscDiagnostics(stdout);
    const byWrapperName = new Map(wrapperTargets.map((target) => [target.wrapperName, target]));
    const byRelPath = new Map<string, Diagnostic[]>();
    const strayDiagnostics: Diagnostic[] = [];

    for (const diagnostic of diagnostics) {
      const wrapperName = diagnostic.filePath.split(/[\\/]/).pop() ?? '';
      const target = byWrapperName.get(wrapperName);
      if (!target) {
        strayDiagnostics.push(diagnostic);
        continue;
      }
      const inWrapperPreamble = diagnostic.line <= target.sourceLineOffset;
      const adjusted: Diagnostic = {
        ...diagnostic,
        // Diagnostics inside the embedded source report wrapper coordinates;
        // shift them back to the original script's lines.
        line: inWrapperPreamble ? diagnostic.line : diagnostic.line - target.sourceLineOffset,
        inWrapperPreamble,
      };
      const list = byRelPath.get(target.relPath) ?? [];
      list.push(adjusted);
      byRelPath.set(target.relPath, list);
    }

    let errorCount = diagnostics.length;
    if (fileErrors.size > 0 || byRelPath.size > 0 || strayDiagnostics.length > 0) {
      console.error('typecheckExamples: type errors found\n');
      for (const [relPath, errors] of fileErrors) {
        console.error(`${relPath}  (skipped: not typecheckable)`);
        for (const error of errors) console.error(`  ${error}`);
        errorCount += errors.length;
      }
      for (const [relPath, fileDiagnostics] of byRelPath) {
        console.error(relPath);
        for (const diagnostic of fileDiagnostics) {
          const where = diagnostic.inWrapperPreamble
            ? `wrapper:${diagnostic.line}`
            : `${diagnostic.line}:${diagnostic.column}`;
          console.error(`  ${where}  TS${diagnostic.code}  ${diagnostic.message}`);
        }
      }
      for (const diagnostic of strayDiagnostics) {
        console.error(`${diagnostic.filePath}(${diagnostic.line},${diagnostic.column}): TS${diagnostic.code} ${diagnostic.message}`);
      }
      console.error('');
    }

    const failedFiles = new Set([...fileErrors.keys(), ...byRelPath.keys()]).size;
    if (errorCount > 0) {
      console.error(
        `typecheckExamples: ${errorCount} error(s) in ${failedFiles} file(s); ${targets.length} file(s) checked`,
      );
      return 1;
    }

    console.log(`typecheckExamples: OK — ${targets.length} file(s) checked`);
    return 0;
  } finally {
    rmSync(wrapperDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  if ('help' in parsed) {
    console.log(HELP);
    return;
  }
  const code = await runTypecheck(parsed.targets);
  process.exitCode = code;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  void main();
}
