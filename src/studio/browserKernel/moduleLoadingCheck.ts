// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/moduleLoadingCheck.ts
//
// Refuse model code that could load code or reach the network through module
// syntax: dynamic `import()` and `import.meta`. `import()` is syntax, so no
// global stub can remove it; the browser kernel instead (1) parses the
// transpiled model here and refuses those forms, and (2) removes every way to
// create code from a string at run time (workerLockdown.ts,
// `lockDownCodeGeneration`), so the syntax cannot be synthesized either.
//
// A parser, not a regex: strings, comments and template literals cannot hide
// or fake an `import(`. Code the parser cannot read is refused too (fail
// closed); the server builds it instead.

import { parse, type Node } from 'acorn';
import { full } from 'acorn-walk';
import { KernelError } from '../../shared/intent/kernelError';

const MESSAGE = 'import() and import.meta are not available to models in the browser kernel: a model cannot load code at run time.';

/** True when the node loads a module or reads module metadata. */
function loadsModules(node: Node): boolean {
  if (node.type === 'ImportExpression' || node.type === 'ImportDeclaration') return true;
  if (node.type === 'MetaProperty') return (node as unknown as { meta: { name: string } }).meta.name === 'import';
  return false;
}

/** Throws a KernelError when `code` (transpiled JavaScript, a function body)
 *  contains `import()` / `import.meta`, or cannot be parsed. */
export function assertNoModuleLoading(code: string): void {
  let ast: Node;
  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
  } catch (error) {
    // A script cannot contain `import.meta` at all; name it.
    if (/\bimport\s*\.\s*meta\b/.test(code)) throw new KernelError('cli.script-exception', MESSAGE);
    throw new KernelError(
      'cli.script-exception',
      `The browser kernel could not check this model before running it (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
  let found = false;
  full(ast, (node) => { if (loadsModules(node)) found = true; });
  if (found) throw new KernelError('cli.script-exception', MESSAGE);
}
