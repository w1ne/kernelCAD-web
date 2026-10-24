// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/workerNodeStubs.ts
//
// Vite plugin for the app's WORKER bundles: node builtins resolve to stub
// modules whose exports throw when CALLED, instead of Vite's empty
// `__vite-browser-external` (which fails the build on a named import).
//
// Why workers need this: the Studio's browser kernel worker is started from a
// `data:` URL (an opaque origin, its security boundary), so it cannot load
// sibling chunks — every worker bundle is emitted as ONE file with its
// dynamic imports inlined. The kernel's filesystem features (lib.fromSTEP,
// the parts catalog, TTF fonts) reach `node:fs` & co. only down paths that
// call `requireHostFs()` first, which throws `cli.host-fs-unavailable` in a
// browser before any builtin is touched. Inlined, those modules' imports
// become static, so they must resolve to something that loads. A stub that
// throws on use keeps the failure loud if a path ever does reach it.

import { builtinModules } from 'node:module';
import type { Plugin } from 'vite';

const PREFIX = '\0kernelcad-node-stub:';
const BUILTINS = new Set(builtinModules.filter((name) => !name.startsWith('_')));
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function builtinName(id: string): string | null {
  const bare = id.startsWith('node:') ? id.slice('node:'.length) : id;
  const root = bare.split('/')[0];
  return BUILTINS.has(bare) || BUILTINS.has(root) ? bare : null;
}

async function stubSource(name: string): Promise<string> {
  let names: string[] = [];
  try {
    names = Object.keys(await import(`node:${name}`)).filter((key) => key !== 'default' && IDENTIFIER.test(key));
  } catch {
    // An unknown builtin still gets a default export.
  }
  const lines = [
    'function unavailable(what) {',
    '  return function nodeBuiltinUnavailable() {',
    "    throw new Error(what + ' is not available in the browser');",
    '  };',
    '}',
    ...names.map((key) => `export const ${key} = unavailable(${JSON.stringify(`node:${name}.${key}`)});`),
    `export default new Proxy({}, { get: (_target, key) => unavailable(${JSON.stringify(`node:${name}.`)} + String(key)) });`,
  ];
  return lines.join('\n');
}

export function workerNodeBuiltinStubs(): Plugin {
  return {
    name: 'kernelcad-worker-node-builtin-stubs',
    enforce: 'pre',
    resolveId(id) {
      const name = builtinName(id);
      return name ? `${PREFIX}${name}` : null;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      return stubSource(id.slice(PREFIX.length));
    },
  };
}
