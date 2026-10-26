// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/occtGlueFunction.ts
//
// Vite plugin: the OCCT Emscripten glue (replicad-opencascadejs) keeps its
// own reference to `Function`.
//
// The Studio's browser kernel worker removes `Function` (and every other way
// to turn a string into code) once OCCT is up, so model code cannot
// synthesize a dynamic `import()` (src/studio/browserKernel/workerLockdown.ts).
// Embind, however, builds some invokers lazily with `new Function(...)` —
// `__emval_get_method_caller` runs during ordinary kernel calls such as
// `Bnd_Box.Get`. This rewrites the glue's references to the global `Function`
// into a module-scoped alias taken when the module loads, which model code
// cannot reach. Behaviour is otherwise unchanged (same constructor).

import type { Plugin } from 'vite';

const GLUE = /replicad-opencascadejs[\\/]src[\\/]replicad_[a-z_]+\.js$/;
const ALIAS = '__kernelcadGlueFunction';
/** The identifier `Function`, not a property, string or longer name. */
const FUNCTION_IDENTIFIER = /(?<![\w.$"'])Function(?![\w$])/g;

export function rewriteGlueFunction(code: string): string {
  return `const ${ALIAS} = Function;\n${code.replace(FUNCTION_IDENTIFIER, ALIAS)}`;
}

export function occtGlueOwnFunction(): Plugin {
  return {
    name: 'kernelcad-occt-glue-own-function',
    enforce: 'pre',
    transform(code, id) {
      if (!GLUE.test(id.split('?')[0]!)) return null;
      return { code: rewriteGlueFunction(code), map: null };
    },
  };
}
