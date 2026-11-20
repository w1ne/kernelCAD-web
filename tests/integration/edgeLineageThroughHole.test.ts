// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `hole`, `holes` and `cutout` must carry the body's edge lineage. They used to
// return a result with no edge history, so a lineage edge query after them,
// `q.edge(q.createdBy(plate.id)).and(q.withLabel('corner'))`, failed with
// `query.unsupported-entity-type` although the same query works after
// `subtract`. A drilled plate with filleted corners is the common case.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { descendsFromFeature } from '../../src/kernel/naming/operationLineage';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: CompilerDiagnostic[]; ids: string[] }> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors, ids: run.records.map((rec) => rec.id) };
}

// 60 × 40 × 5 plate. Four R3 fillets on the vertical corners remove
// 4 · (3² − π·3²/4) · 5 mm³.
const PLATE = 60 * 40 * 5;
const CORNER_FILLETS = 4 * (9 - (9 * Math.PI) / 4) * 5;
const BORE = Math.PI * 2 * 2 * 5; // Ø4 through a 5 mm plate
const CORNERS = `fillet(3, q.edge(q.createdBy(s.id)).and(q.withLabel('corner')))`;

const CASES: { name: string; cut: string; removed: number }[] = [
  { name: 'hole', cut: `hole('top', { u: 10, v: 5, diameter: 4, depth: 'through' })`, removed: BORE },
  {
    name: 'holes',
    cut: `holes('top', { positions: [{ u: 10, v: 5 }, { u: -10, v: -5 }], diameter: 4, depth: 'through' })`,
    removed: 2 * BORE,
  },
  {
    name: 'cutout',
    cut: `cutout(path().moveTo(-6, -4).lineTo(6, -4).lineTo(6, 4).lineTo(-6, 4).close(), { face: 'top', depth: 2 })`,
    removed: 12 * 8 * 2,
  },
];

describe('edge lineage through hole, holes and cutout', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  for (const c of CASES) {
    it(`a corner-label fillet after ${c.name} rounds exactly the four corners`, async () => {
      const { solid, errors } = await lower(`const s = box(60, 40, 5); return s.${c.cut}.${CORNERS};`);
      expect(errors.map((d) => d.code)).toEqual([]);
      expect(isValidShape(getOC(), solid!.getReplicadShape().wrapped)).toBe(true);
      expect(solid!.volume()).toBeCloseTo(PLATE - c.removed - CORNER_FILLETS, 3);
    });
  }

  it('matches the same query after an explicit subtract', async () => {
    const { solid, errors } = await lower(
      `const s = box(60, 40, 5); return s.subtract(cylinder(10, 2).translate(10, 5, -1)).${CORNERS};`,
    );
    expect(errors).toEqual([]);
    expect(solid!.volume()).toBeCloseTo(PLATE - BORE - CORNER_FILLETS, 3);
  });

  it('stamps the hole on every result edge and keeps the box edge labels', async () => {
    const labelsOf = (solid: OcctBackend) =>
      solid.edgeHashes().map((h) => solid.edgeHistoryMap?.get(h)?.labelName ?? '-').sort();
    const plain = await lower(`return box(60, 40, 5);`);
    const { solid, errors, ids } = await lower(
      `return box(60, 40, 5).hole('top', { u: 10, v: 5, diameter: 4, depth: 'through' });`,
    );
    expect(errors).toEqual([]);
    const [boxId, holeId] = ids;
    const map = solid!.edgeHistoryMap!;
    for (const h of solid!.edgeHashes()) expect(descendsFromFeature(map.get(h)!, holeId)).toBe(true);
    // The twelve box edges keep their corner / perimeter birth labels.
    const fromBox = solid!.edgeHashes().filter((h) => map.get(h)!.rootFeatureId === boxId);
    expect(labelsOf(solid!).filter((l) => l !== '-')).toEqual(labelsOf(plain.solid!));
    expect(fromBox.length).toBe(plain.solid!.edgeHashes().length);
    // Entry rim, exit rim and the bore seam are born on the hole.
    const born = solid!.edgeHashes().filter((h) => map.get(h)!.rootFeatureId === holeId);
    expect(born.length).toBeGreaterThan(0);
  });
});
