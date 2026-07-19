// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// GUARD: the browser script runtime's import graph must contain no node
// builtins.
//
// This is the property that rots silently. Every other test here can stay green
// while someone adds `import { readFileSync } from 'node:fs'` three modules deep
// in the capture layer — because in a node test process that import resolves
// fine. It only breaks in a browser, which no unit test runs in.
//
// So we assert it MECHANICALLY: walk the real static import graph from the
// browser entry and fail on any `node:` specifier. Rules that mirror what a
// bundler actually does:
//   - `import type` / `export type` edges are ERASED, so they are not followed
//     and a node builtin behind one is not a violation.
//   - `await import(...)` is CODE-SPLIT, so dynamic edges are not part of the
//     initial graph. That is exactly how the node-only features are reached,
//     and each one is guarded by `requireHostFs` before the import runs (see
//     parts/hostParts.ts) — the guard, not this test, is what makes them safe.
//
// If you are here because this test failed: do not add the offending module to
// an allowlist. Put the node call behind the host-fs port (shared/runtime/
// hostFs.ts) or behind a guarded dynamic import, the way parts/hostParts.ts and
// shared/fonts/loadFontHost.ts do.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');

/** Bare specifiers that are node builtins even without the `node:` prefix. */
const BARE_NODE_BUILTINS = new Set([
  'fs', 'path', 'url', 'os', 'crypto', 'child_process', 'module', 'stream',
  'util', 'events', 'buffer', 'zlib', 'http', 'https', 'net', 'tls', 'worker_threads',
]);

interface Violation {
  file: string;
  spec: string;
  chain: string[];
}

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g;
/** Bare side-effect import: `import 'x';` (no `from` clause). */
const SIDE_EFFECT_RE = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;

function resolveSpec(spec: string, fromFile: string): string | null {
  if (!spec.startsWith('.')) return null; // package — not our graph to police
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base,
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function walkGraph(entry: string): { files: Set<string>; violations: Violation[] } {
  const files = new Set<string>();
  const violations: Violation[] = [];

  function visit(file: string, chain: string[]): void {
    if (files.has(file)) return;
    files.add(file);
    const src = readFileSync(file, 'utf8');

    const edges: { spec: string; typeOnly: boolean }[] = [];
    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      const stmt = m[0].replace(/^\s+/, '');
      edges.push({ spec: m[1], typeOnly: /^(?:import|export)\s+type\b/.test(stmt) });
    }
    SIDE_EFFECT_RE.lastIndex = 0;
    while ((m = SIDE_EFFECT_RE.exec(src)) !== null) {
      edges.push({ spec: m[1], typeOnly: false });
    }
    // NOTE: `await import(...)` is intentionally NOT collected — see header.

    for (const { spec, typeOnly } of edges) {
      const isNodeBuiltin =
        spec.startsWith('node:') ||
        BARE_NODE_BUILTINS.has(spec) ||
        BARE_NODE_BUILTINS.has(spec.split('/')[0]);
      if (isNodeBuiltin) {
        // A type-only import of a node builtin is erased; it costs nothing.
        if (!typeOnly) {
          violations.push({
            file: relative(REPO_ROOT, file),
            spec,
            chain: [...chain, file].map((f) => relative(REPO_ROOT, f)),
          });
        }
        continue;
      }
      if (typeOnly) continue; // erased by the bundler
      const resolved = resolveSpec(spec, file);
      if (resolved !== null) visit(resolved, [...chain, file]);
    }
  }

  visit(entry, []);
  return { files, violations };
}

function formatViolations(violations: Violation[]): string {
  return violations
    .map((v) => `  ${v.file} imports '${v.spec}'\n    via ${v.chain.slice(-5).join('\n     -> ')}`)
    .join('\n');
}

describe('browser runtime import graph', () => {
  const ENTRY = resolve(REPO_ROOT, 'src/modeling/runtime/browserRuntime.ts');

  it('pulls no node: builtins', () => {
    const { files, violations } = walkGraph(ENTRY);
    // Sanity: the walker must actually be walking something. Without this, a
    // broken resolver would report zero violations over a one-file graph and
    // this guard would be vacuous.
    expect(files.size).toBeGreaterThan(50);
    expect(
      violations,
      violations.length === 0
        ? ''
        : `The browser runtime's import graph reaches node builtins:\n${formatViolations(violations)}`,
    ).toEqual([]);
  });

  it('reaches the modern API, so the graph above is the real one', () => {
    const { files } = walkGraph(ENTRY);
    const rel = [...files].map((f) => relative(REPO_ROOT, f));
    // If these ever drop out of the graph, the "no node builtins" assertion
    // above has become vacuous — it would be passing over a stub.
    expect(rel).toContain('src/modeling/api.ts');
    expect(rel).toContain('src/modeling/capture/captureSession.ts');
    expect(rel).toContain('src/modeling/capture/virtualFeatureRecords.ts');
    expect(rel).toContain('src/modeling/runtime/realmRunner.ts');
  });

  it('the NODE entry still does pull node builtins — proving the walker detects them', () => {
    // The inverse check. If the walker silently stopped detecting `node:`
    // specifiers, the browser assertion would pass for the wrong reason. The
    // node facade must trip it.
    const nodeEntry = resolve(REPO_ROOT, 'src/modeling/runtime/runScript.ts');
    const { violations } = walkGraph(nodeEntry);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.spec === 'node:vm')).toBe(true);
  });
});
