// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import madge from 'madge';
import { resolve } from 'node:path';

export function canonicalCycle(nodes: string[]): string {
  let best = 0;
  for (let i = 1; i < nodes.length; i++) if (nodes[i] < nodes[best]) best = i;
  return [...nodes.slice(best), ...nodes.slice(0, best)].join(' > ');
}

export async function collectCycles(root: string, tsConfig: string): Promise<string[]> {
  const res = await madge(resolve(root, 'src'), {
    fileExtensions: ['ts', 'tsx'],
    tsConfig: resolve(root, tsConfig),
    excludeRegExp: [/\.test\.tsx?$/, /\.d\.ts$/],
    detectiveOptions: { ts: { skipTypeImports: true }, tsx: { skipTypeImports: true } },
  });
  return [...new Set(res.circular().map(canonicalCycle))].sort();
}

export function diffCycles(current: string[], baseline: string[]): { ok: boolean; added: string[]; stale: string[] } {
  const b = new Set(baseline);
  const c = new Set(current);
  const added = current.filter((x) => !b.has(x));
  const stale = baseline.filter((x) => !c.has(x));
  return { ok: added.length === 0 && stale.length === 0, added, stale };
}
