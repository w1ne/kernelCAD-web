// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A fillet or chamfer keeps the birth labels of the edges it does not touch.
// BRepFilletAPI_MakeChamfer/MakeFillet report the untouched edges of a rebuilt
// face as deleted although the result keeps them, so after
// `box(60, 60, 6).chamfer(0.5, { face: 'bottom' })` the four `top-perimeter`
// labels were gone and a later
// `q.edge(q.createdBy(stock.id)).and(q.withLabel('top-perimeter'))` pick
// had nothing to select.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC, type Edge } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: CompilerDiagnostic[] }> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors };
}

/** Count of distinct labelled edges on the solid, per birth label. */
function labelCounts(solid: OcctBackend): Record<string, number> {
  const edges = (solid.getReplicadShape() as unknown as { edges: Edge[] }).edges;
  const seen = new Map<string, string>();
  for (const edge of edges) {
    const hash = ((edge as unknown as { wrapped: { HashCode(n: number): number } }).wrapped.HashCode(2147483647)).toString(16);
    const label = solid.edgeHistoryMap?.get(hash)?.labelName;
    if (label) seen.set(hash, label);
  }
  const counts: Record<string, number> = {};
  for (const label of seen.values()) counts[label] = (counts[label] ?? 0) + 1;
  return counts;
}

const valid = (s: OcctBackend) => isValidShape(getOC(), s.getReplicadShape().wrapped);

const A = 60;
const T = 6;
const C = 0.5;
const STOCK = `const stock = box(${A}, ${A}, ${T});`;
const pick = (label: string) => `q.edge(q.createdBy(stock.id)).and(q.withLabel('${label}'))`;
// 45° chamfers of leg c on the four edges of an a × a face, vertical corners
// sharp: four prisms c²/2 × a, less the four mitre overlaps of c³/3 each.
const faceChamfer = (a: number, c: number) => 4 * (c * c / 2) * a - 4 * (c * c * c) / 3;

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('edge labels through a fillet or chamfer', () => {
  it('keeps top-perimeter after a bottom chamfer', async () => {
    const { solid, errors } = await lower(`${STOCK} return stock.chamfer(${C}, { face: 'bottom' });`);
    expect(errors).toEqual([]);
    expect(labelCounts(solid!)).toEqual({ corner: 4, 'top-perimeter': 4 });
  });

  it('keeps bottom-perimeter after a top fillet', async () => {
    const { solid, errors } = await lower(`${STOCK} return stock.fillet(1, { face: 'top' });`);
    expect(errors).toEqual([]);
    expect(labelCounts(solid!)).toEqual({ corner: 4, 'bottom-perimeter': 4 });
  });

  it('chamfers the top perimeter by label after the bottom one', async () => {
    const { solid, errors } = await lower(
      `${STOCK} return stock.chamfer(${C}, ${pick('bottom-perimeter')}).chamfer(${C}, ${pick('top-perimeter')});`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    expect(solid!.volume()).toBeCloseTo(A * A * T - 2 * faceChamfer(A, C), 4);
    expect(solid!.faceHashes().length).toBe(6 + 8);
    expect(labelCounts(solid!)).toEqual({ corner: 4 });
  });

  it('builds the mounting-plate edge treatment through the labels', async () => {
    // Round the vertical corners, relieve the bottom edge, break the top edge.
    const byLabel = await lower(
      `${STOCK} return stock.fillet(6, ${pick('corner')})` +
        `.chamfer(${C}, ${pick('bottom-perimeter')}).chamfer(${C}, ${pick('top-perimeter')});`,
    );
    const byFace = await lower(
      `${STOCK} return stock.fillet(6, ${pick('corner')})` +
        `.chamfer(${C}, { face: 'bottom' }).chamfer(${C}, { face: 'top' });`,
    );
    expect(byLabel.errors).toEqual([]);
    expect(byFace.errors).toEqual([]);
    expect(valid(byLabel.solid!)).toBe(true);
    expect(byLabel.solid!.faceHashes().length).toBe(byFace.solid!.faceHashes().length);
    expect(byLabel.solid!.volume()).toBeCloseTo(byFace.solid!.volume(), 6);
    expect(byLabel.solid!.volume()).toBeLessThan(A * A * T - 4 * (36 - 9 * Math.PI) * T - 1);
  });
});
