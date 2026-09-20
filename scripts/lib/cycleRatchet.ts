// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import madge from 'madge';
import { resolve } from 'node:path';

export function canonicalCycle(nodes: string[]): string {
  let best = 0;
  for (let i = 1; i < nodes.length; i++) if (nodes[i] < nodes[best]) best = i;
  return [...nodes.slice(best), ...nodes.slice(0, best)].join(' > ');
}

export interface CollectCyclesResult {
  cycles: string[];
  skipped: string[];
}

export async function collectCyclesDetailed(root: string, tsConfig: string): Promise<CollectCyclesResult> {
  const res = await madge(resolve(root, 'src'), {
    fileExtensions: ['ts', 'tsx'],
    tsConfig: resolve(root, tsConfig),
    excludeRegExp: [/\.test\.tsx?$/, /\.d\.ts$/, /\.gen\.tsx?$/],
    detectiveOptions: { ts: { skipTypeImports: true }, tsx: { skipTypeImports: true } },
  });
  const cycles = [...new Set(res.circular().map(canonicalCycle))].sort();
  const skipped = res.warnings().skipped ?? [];
  return { cycles, skipped };
}

export async function collectCycles(root: string, tsConfig: string): Promise<string[]> {
  return (await collectCyclesDetailed(root, tsConfig)).cycles;
}

export function diffCycles(current: string[], baseline: string[]): { ok: boolean; added: string[]; stale: string[] } {
  const b = new Set(baseline);
  const c = new Set(current);
  const added = current.filter((x) => !b.has(x));
  const stale = baseline.filter((x) => !c.has(x));
  return { ok: added.length === 0 && stale.length === 0, added, stale };
}

export function planCycleRegen(
  current: string[],
  existing: string[] | undefined,
  allowNew: boolean,
): { write: boolean; report: string[] } {
  if (existing === undefined) {
    return { write: true, report: ['no existing cycleBaseline.json — writing first baseline'] };
  }
  const r = diffCycles(current, existing);
  const offenders = r.added.map((c) => `NEW CYCLE   ${c}`);
  if (offenders.length > 0 && !allowNew) {
    return { write: false, report: offenders };
  }
  return { write: true, report: [] };
}
