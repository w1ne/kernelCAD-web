// tests/integration/lowering/sceneStepInstances.test.ts
//
// Issue #1592: a Scene STEP export must keep the product structure. A part
// shape placed more than once is one STEP product with one placed instance
// per use, not one unrelated copied solid per use. Checked by reading the
// exported bytes back through the XCAF importer.
import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';
import type { StepAssemblySnapshot, StepImportOccurrence } from '../../../src/kernel/import/stepAssemblyTypes';

const FIXTURE = `
  const pin = cylinder(8, 2).color('#3366cc');
  const plate = box(40, 20, 4).color('#cc6633');
  const asm = assembly('pinned_plate');
  asm.part('plate', plate);
  asm.part('pin_left', pin, { at: [-12, 0, 4] });
  asm.part('pin_right', pin, { at: [12, 3, 4] });
  return asm.model();
`;

async function roundTrip(code: string): Promise<StepAssemblySnapshot> {
  const result = await runAndExport({ code, fileName: 'scene-step-instances.kcad.ts', format: 'step' });
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return importStepAssembly(result.bytes, 'scene-step-instances.step');
}

function byName(snapshot: StepAssemblySnapshot, name: string): StepImportOccurrence {
  const found = snapshot.occurrences.filter((o) => o.name === name);
  expect(found).toHaveLength(1);
  return found[0];
}

function translation(o: StepImportOccurrence): [number, number, number] {
  return [o.transform[12], o.transform[13], o.transform[14]];
}

describe('Scene STEP export keeps repeated parts as placed instances', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('writes one product for a shape placed twice and one instance per placement', async () => {
    const snapshot = await roundTrip(FIXTURE);

    expect(snapshot.occurrences.map((o) => o.name).sort()).toEqual(['pin_left', 'pin_right', 'plate']);
    const left = byName(snapshot, 'pin_left');
    const right = byName(snapshot, 'pin_right');
    const plate = byName(snapshot, 'plate');

    // Product structure: the two pins share one definition; the plate has its own.
    expect(snapshot.definitions).toHaveLength(2);
    expect(left.definitionId).toBe(right.definitionId);
    expect(plate.definitionId).not.toBe(left.definitionId);

    // The shared definition is the local-frame pin (r=2, h=8), not a world-frame copy.
    const pinDef = snapshot.definitions.find((d) => d.id === left.definitionId)!;
    expect(pinDef.solidCount).toBe(1);
    expect(pinDef.volumeMm3).toBeCloseTo(Math.PI * 2 * 2 * 8, 3);
    expect(pinDef.boundsMm.min[2]).toBeCloseTo(0, 3);
    expect(pinDef.boundsMm.max[2]).toBeCloseTo(8, 3);
    expect((pinDef.boundsMm.min[0] + pinDef.boundsMm.max[0]) / 2).toBeCloseTo(0, 3);

    // Placements carry the per-instance position.
    const [lx, ly, lz] = translation(left);
    const [rx, ry, rz] = translation(right);
    expect([lx, ly, lz].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([-12, 0, 4]);
    expect([rx, ry, rz].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([12, 3, 4]);

    // The instance paths sit under the assembly root.
    expect(left.sourcePath).toEqual(['pinned_plate', 'pin_left']);

    // Total placed volume equals the source model: one plate plus two pins.
    const volumeOf = (o: StepImportOccurrence) => snapshot.definitions.find((d) => d.id === o.definitionId)!.volumeMm3;
    expect(volumeOf(plate) + volumeOf(left) + volumeOf(right)).toBeCloseTo(40 * 20 * 4 + 2 * Math.PI * 4 * 8, 2);

    // Colours survive on every instance.
    expect(left.color?.hex).toBe('#3366cc');
    expect(right.color?.hex).toBe('#3366cc');
    expect(plate.color?.hex).toBe('#cc6633');
  }, 120_000);

  it('keeps a rotated instance placement rigid and measurable', async () => {
    const axisY = "{ type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] }";
    const snapshot = await roundTrip(`
      const pin = cylinder(8, 2).color('#3366cc');
      const asm = assembly('pins');
      asm.part('pin_up', pin).connector('axis', ${axisY});
      asm.part('pin_side', pin).connector('axis', ${axisY});
      asm.mate('hinge', 'pin_up.axis', 'pin_side.axis', 'revolute', { pose: 90 });
      return asm.solvedModel({});
    `);
    const up = byName(snapshot, 'pin_up');
    const side = byName(snapshot, 'pin_side');
    expect(snapshot.definitions).toHaveLength(1);
    expect(side.definitionId).toBe(up.definitionId);
    // A 90 degree turn about Y carries local +Z (the pin axis) onto world X.
    expect(Math.abs(side.transform[8])).toBeCloseTo(1, 6);
    expect(side.transform[9]).toBeCloseTo(0, 6);
    expect(side.transform[10]).toBeCloseTo(0, 6);
    expect(up.transform[10]).toBeCloseTo(1, 6);
  }, 120_000);

  it('instances separately authored parts with identical content, and only those', async () => {
    const snapshot = await roundTrip(`
      const asm = assembly('rack');
      asm.part('rail', box(60, 10, 3).color('#888888'));
      for (let i = 0; i < 3; i++) {
        asm.part('post_' + i, cylinder(15, 4).color('#3366cc'), { at: [-20 + i * 20, 0, 3] });
      }
      asm.part('post_tall', cylinder(16, 4).color('#3366cc'), { at: [0, 20, 3] });
      asm.part('post_red', cylinder(15, 4).color('#cc3333'), { at: [20, 20, 3] });
      return asm.model();
    `);
    const posts = [0, 1, 2].map((i) => byName(snapshot, 'post_' + i));
    expect(new Set(posts.map((p) => p.definitionId)).size).toBe(1);
    expect(posts.map((p) => translation(p).map((v) => Math.round(v * 1e6) / 1e6))).toEqual([[-20, 0, 3], [0, 0, 3], [20, 0, 3]]);
    // A different height or a different colour is a different product.
    const tall = byName(snapshot, 'post_tall');
    const red = byName(snapshot, 'post_red');
    expect(tall.definitionId).not.toBe(posts[0].definitionId);
    expect(red.definitionId).not.toBe(posts[0].definitionId);
    expect(red.color?.hex).toBe('#cc3333');
    expect(snapshot.definitions).toHaveLength(4);
    const volumeOf = (o: StepImportOccurrence) => snapshot.definitions.find((d) => d.id === o.definitionId)!.volumeMm3;
    expect(volumeOf(posts[0])).toBeCloseTo(Math.PI * 16 * 15, 3);
    expect(volumeOf(tall)).toBeCloseTo(Math.PI * 16 * 16, 3);
  }, 120_000);

  it('keeps the flat body list when no shape is repeated', async () => {
    const snapshot = await roundTrip(`
      const asm = assembly('pair');
      asm.part('plate', box(40, 20, 4).color('#cc6633'));
      asm.part('pin', cylinder(8, 2).color('#3366cc'), { at: [12, 3, 4] });
      return asm.model();
    `);
    expect(snapshot.definitions).toHaveLength(2);
    const pin = byName(snapshot, 'pin');
    // World-frame body: no assembly root, identity placement, offset in the geometry.
    expect(pin.sourcePath).toEqual(['pin']);
    expect(translation(pin)).toEqual([0, 0, 0]);
    const pinDef = snapshot.definitions.find((d) => d.id === pin.definitionId)!;
    expect(pinDef.boundsMm.min[2]).toBeCloseTo(4, 3);
    expect(pin.color?.hex).toBe('#3366cc');
  }, 120_000);
});
