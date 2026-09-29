// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Kernel API typings for the Studio code editor.
//
// A `.kcad.ts` script is a function body that sees the kernelCAD DSL as
// globals (see `typecheckExamples.ts`). The Studio editor runs the TypeScript
// language service in the browser, where it cannot read `src/`. This module
// builds ONE self-contained declaration file for it:
//   - the declarations of `src/modeling/api.ts` and the script-visible type
//     modules (`TYPE_IMPORTS`), emitted by tsc as ambient `declare module`
//     blocks and pruned to the modules those declarations reach;
//   - a global preamble that declares every injected DSL global with its real
//     `KernelCadApi` member type, the `kc` alias, the worker-shim globals and
//     the type names scripts may use in annotations.
// The global names and type names come from `typecheckExamples.ts`, so the
// editor and the CI script typecheck share one list.
//
// The Vite plugin `kernelCadEditorTypingsPlugin` serves the result as the
// `virtual:kcad-editor-typings` module; the Code tab loads it as an extra lib.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import type { Plugin } from 'vite';
import {
  REPO_ROOT,
  SHIM_ONLY_GLOBALS,
  TYPE_IMPORTS,
  declaredGlobalNames,
  parseKernelCadApiGlobals,
} from './typecheckExamples';

export const EDITOR_TYPINGS_VIRTUAL_ID = 'virtual:kcad-editor-typings';
const RESOLVED_VIRTUAL_ID = `\0${EDITOR_TYPINGS_VIRTUAL_ID}`;

const API_MODULE = 'src/modeling/api';

function moduleSourcePath(repoRoot: string, module: string): string {
  const file = join(repoRoot, `${module}.ts`);
  return existsSync(file) ? file : join(repoRoot, module, 'index.ts');
}

/** Emit the declarations of the entry modules as ONE file of ambient
 *  `declare module "src/..."` blocks (tsc `outFile` + AMD). */
function emitAmbientDeclarations(repoRoot: string, entryModules: readonly string[]): string {
  const configPath = join(repoRoot, 'tsconfig.app.json');
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    },
  });
  if (!parsed) throw new Error(`editorTypings: cannot read ${configPath}`);
  const options: ts.CompilerOptions = {
    ...parsed.options,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    outFile: join(repoRoot, 'kcad-editor-typings.d.ts'),
    module: ts.ModuleKind.AMD,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    verbatimModuleSyntax: false,
    rootDir: repoRoot,
    incremental: false,
    composite: false,
    tsBuildInfoFile: undefined,
    types: [],
  };
  const program = ts.createProgram(
    entryModules.map((module) => moduleSourcePath(repoRoot, module)),
    options,
  );
  let text: string | undefined;
  program.emit(undefined, (fileName, data) => {
    if (fileName.endsWith('.d.ts')) text = data;
  });
  if (text === undefined) throw new Error('editorTypings: tsc emitted no declarations');
  return text;
}

/** Module names a declaration block references: import/export specifiers and
 *  `import("...")` type queries. */
function referencedModules(node: ts.Node): string[] {
  const names: string[] = [];
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      names.push(n.moduleSpecifier.text);
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      names.push(n.argument.literal.text);
    } else if (ts.isExternalModuleReference(n) && ts.isStringLiteral(n.expression)) {
      names.push(n.expression.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return names;
}

/** Keep only the `declare module` blocks reachable from the entry modules. */
function pruneToReachable(bundle: string, entryModules: readonly string[]): { text: string; blocks: Map<string, ts.ModuleDeclaration> } {
  const sourceFile = ts.createSourceFile('bundle.d.ts', bundle, ts.ScriptTarget.Latest, true);
  const blocks = new Map<string, ts.ModuleDeclaration>();
  for (const statement of sourceFile.statements) {
    if (ts.isModuleDeclaration(statement) && ts.isStringLiteral(statement.name)) {
      blocks.set(statement.name.text, statement);
    }
  }
  const reachable = new Set<string>();
  const queue = [...entryModules];
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (reachable.has(name)) continue;
    const block = blocks.get(name);
    if (!block) continue; // external package (e.g. `replicad`): resolves to `any`
    reachable.add(name);
    queue.push(...referencedModules(block));
  }
  const kept = [...blocks.entries()].filter(([name]) => reachable.has(name));
  return {
    text: kept.map(([, block]) => block.getText(sourceFile)).join('\n'),
    blocks: new Map(kept),
  };
}

/** Type parameter list of an exported declaration, verbatim (`<T extends X = Y>`). */
function typeParameterText(block: ts.ModuleDeclaration | undefined, name: string): string {
  if (!block?.body || !ts.isModuleBlock(block.body)) return '';
  const sourceFile = block.getSourceFile();
  for (const statement of block.body.statements) {
    if (
      (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) &&
      statement.name?.text === name
    ) {
      const params = statement.typeParameters;
      if (!params || params.length === 0) return '';
      return `<${params.map((p) => p.getText(sourceFile)).join(', ')}>`;
    }
  }
  return '';
}

function typeArgumentText(params: string): string {
  if (params === '') return '';
  const inner = params.slice(1, -1);
  const names = inner.split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
  return `<${names.join(', ')}>`;
}

/**
 * Build the self-contained editor typings for the `.kcad.ts` language service.
 * Pure function of the source tree; deterministic output.
 */
export function buildEditorTypings(repoRoot: string = REPO_ROOT): string {
  const apiSource = readFileSync(join(repoRoot, `${API_MODULE}.ts`), 'utf8');
  const apiGlobalNames = parseKernelCadApiGlobals(apiSource);
  const entryModules = [API_MODULE, ...TYPE_IMPORTS.map((entry) => entry.module)];
  const bundle = emitAmbientDeclarations(repoRoot, entryModules);
  const { text: modules, blocks } = pruneToReachable(bundle, entryModules);

  const apiSet = new Set(apiGlobalNames);
  const lines: string[] = [
    '// Generated by scripts/editorTypings.ts — kernelCAD DSL for the Studio code editor.',
    '// A .kcad.ts script is a function body; these globals are injected at run time.',
    modules,
    '',
    `declare const kc: import("${API_MODULE}").KernelCadApi;`,
  ];
  for (const name of declaredGlobalNames(apiGlobalNames)) {
    if (name === 'kc') continue;
    if (apiSet.has(name)) {
      lines.push(`declare const ${name}: import("${API_MODULE}").KernelCadApi['${name}'];`);
    } else if (SHIM_ONLY_GLOBALS.includes(name)) {
      lines.push(`declare const ${name}: any;`);
    }
  }
  const declaredTypes = new Set<string>(['KernelCadApi']);
  lines.push(`type KernelCadApi = import("${API_MODULE}").KernelCadApi;`);
  for (const entry of TYPE_IMPORTS) {
    for (const name of entry.names) {
      if (declaredTypes.has(name)) continue;
      declaredTypes.add(name);
      const params = typeParameterText(blocks.get(entry.module), name);
      lines.push(`type ${name}${params} = import("${entry.module}").${name}${typeArgumentText(params)};`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** Vite plugin serving `buildEditorTypings()` as `virtual:kcad-editor-typings`
 *  (default export: the declaration text). Built once per process. */
export function kernelCadEditorTypingsPlugin(repoRoot: string = REPO_ROOT): Plugin {
  let cached: string | undefined;
  return {
    name: 'kernelcad-editor-typings',
    resolveId(id) {
      return id === EDITOR_TYPINGS_VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;
      cached ??= buildEditorTypings(repoRoot);
      return `export default ${JSON.stringify(cached)};`;
    },
  };
}
