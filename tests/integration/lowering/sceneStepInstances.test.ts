// tests/integration/lowering/sceneStepInstances.test.ts
//
// Issue #1592: a Scene STEP export must keep the product structure. A part
// shape placed more than once is one STEP product with one placed instance
// per use, not one unrelated copied solid per use. Checked by reading the
// exported bytes back through the XCAF importer.
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';
import type { StepAssemblySnapshot, StepImportOccurrence } from '../../../src/kernel/import/stepAssemblyTypes';
import { writeStepBundle } from '../../../src/kernel/import/stepBundleWriter';

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

/** Round to 1e-6 mm; `+ 0` turns -0 into 0. */
function micron(value: number): number {
  return Math.round(value * 1e6) / 1e6 + 0;
}

/** World-frame bounds of an occurrence: its definition's bounds corners moved by its placement. */
function worldBounds(snapshot: StepAssemblySnapshot, o: StepImportOccurrence): number[] {
  const { min, max } = snapshot.definitions.find((d) => d.id === o.definitionId)!.boundsMm;
  const m = o.transform;
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((bits) => {
    const [x, y, z] = [0, 1, 2].map((axis) => ((bits >> axis) & 1 ? max : min)[axis]);
    return [0, 1, 2].map((row) => m[row] * x + m[4 + row] * y + m[8 + row] * z + m[12 + row]);
  });
  return [
    ...[0, 1, 2].map((axis) => micron(Math.min(...corners.map((c) => c[axis])))),
    ...[0, 1, 2].map((axis) => micron(Math.max(...corners.map((c) => c[axis])))),
  ];
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

  it('instances a part whose rigid placement is authored on the shape', async () => {
    const snapshot = await roundTrip(`
      const pin = cylinder(8, 2).color('#3366cc');
      const asm = assembly('pins');
      asm.part('pin_up', pin);
      asm.part('pin_moved', pin.translate(10, 0, 0), { at: [0, 5, 0] });
      asm.part('pin_side', pin.rotateY(90).translate(0, 20, 3));
      asm.part('pin_pivot', pin.rotate([0, 0, 2], 90, [5, 0, 0]));
      asm.part('pin_wide', pin.scale(1.5).translate(30, 0, 0));
      return asm.model();
    `);
    const up = byName(snapshot, 'pin_up');
    const moved = byName(snapshot, 'pin_moved');
    const side = byName(snapshot, 'pin_side');
    const pivot = byName(snapshot, 'pin_pivot');
    const wide = byName(snapshot, 'pin_wide');

    // The rigid placements are instances of the one authored pin; the scaled pin is its own product.
    expect(snapshot.definitions).toHaveLength(2);
    for (const instance of [moved, side, pivot]) expect(instance.definitionId).toBe(up.definitionId);
    expect(wide.definitionId).not.toBe(up.definitionId);
    const pinDef = snapshot.definitions.find((d) => d.id === up.definitionId)!;
    expect(pinDef.volumeMm3).toBeCloseTo(Math.PI * 2 * 2 * 8, 3);
    expect(pinDef.boundsMm.min.map(micron)).toEqual([-2, -2, 0]);
    expect(pinDef.boundsMm.max.map(micron)).toEqual([2, 2, 8]);

    // Shape translate and part \`at\` add up.
    expect(translation(moved).map(micron)).toEqual([10, 5, 0]);
    expect(moved.transform[10]).toBeCloseTo(1, 9);
    // rotateY(90) carries the pin axis (local +Z) onto world +X, then the translate applies.
    expect(side.transform.slice(8, 11).map(micron)).toEqual([1, 0, 0]);
    expect(translation(side).map(micron)).toEqual([0, 20, 3]);
    // A quarter turn about Z through (5, 0, 0) carries the origin to (5, -5, 0).
    expect(pivot.transform.slice(0, 3).map(micron)).toEqual([0, 1, 0]);
    expect(translation(pivot).map(micron)).toEqual([5, -5, 0]);
    // The scale is geometry; the translate after it is the scaled product's placement.
    const wideDef = snapshot.definitions.find((d) => d.id === wide.definitionId)!;
    expect(wideDef.volumeMm3).toBeCloseTo(Math.PI * 3 * 3 * 12, 3);
    expect(wideDef.boundsMm.min.map(micron)).toEqual([-3, -3, 0]);
    expect(translation(wide).map(micron)).toEqual([30, 0, 0]);
  }, 120_000);

  it('places shape-placed instances where the flat export puts the same bodies', async () => {
    // An L-shaped bracket has no symmetry, so a wrong placement moves its bounds.
    const scene = (colours: string[]) => `
      const bracket = (c) => box(30, 8, 4).union(box(4, 8, 20)).color(c);
      const asm = assembly('brackets');
      asm.part('a', bracket('${colours[0]}'));
      asm.part('b', bracket('${colours[1]}').rotateZ(90).translate(40, 0, 0), { at: [0, 0, 6] });
      asm.part('c', bracket('${colours[2]}').rotate([1, 0, 0], 90, [0, 10, 5]).rotateY(-90).translate(-7, 3, 50));
      asm.part('d', bracket('${colours[3]}').translate(0, 30, 0).rotate([1, 1, 0], 180));
      return asm.model();
    `;
    const instanced = await roundTrip(scene(['#888888', '#888888', '#888888', '#888888']));
    // Four colours keep four products, which is the flat world-frame body list.
    const flat = await roundTrip(scene(['#888888', '#cc3333', '#33cc33', '#3333cc']));
    expect(instanced.definitions).toHaveLength(1);
    expect(flat.definitions).toHaveLength(4);
    for (const name of ['a', 'b', 'c', 'd']) {
      expect(flat.occurrences.find((o) => o.name === name)!.sourcePath).toEqual([name]);
      expect(worldBounds(instanced, byName(instanced, name)), name).toEqual(worldBounds(flat, byName(flat, name)));
    }
    expect(worldBounds(instanced, byName(instanced, 'a'))).toEqual([0, 0, 0, 30, 8, 20]);
    expect(worldBounds(instanced, byName(instanced, 'b'))).toEqual([32, 0, 6, 40, 30, 26]);
  }, 120_000);

  it('keeps instances through import-step and a second export', async () => {
    const first = await runAndExport({ code: FIXTURE, fileName: 'scene-step-instances.kcad.ts', format: 'step' });
    const imported = await importStepAssembly(first.bytes, 'pinned_plate.step');
    const dir = mkdtempSync(join(tmpdir(), 'kcad-step-roundtrip-'));
    try {
      const bundle = await writeStepBundle({
        inputName: 'pinned_plate.step',
        inputBytes: first.bytes,
        outDir: join(dir, 'bundle'),
        assemblyName: 'pinned_plate',
        snapshot: imported,
      });
      const second = await runAndExport({ code: readFileSync(bundle.script, 'utf8'), fileName: bundle.script, scriptDir: bundle.outDir, format: 'step' });
      expect(second.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const snapshot = await importStepAssembly(second.bytes, 'pinned_plate.step');

      // Part names survive both legs: no STEP-path prefix is added on import.
      expect(readFileSync(bundle.script, 'utf8').match(/imported\.part\("[^"]*"/g)).toEqual([
        'imported.part("plate"', 'imported.part("pin_left"', 'imported.part("pin_right"',
      ]);
      expect(snapshot.occurrences.map((o) => o.sourcePath)).toEqual([
        ['pinned_plate', 'plate'], ['pinned_plate', 'pin_left'], ['pinned_plate', 'pin_right'],
      ]);
      expect(snapshot.definitions).toHaveLength(2);
      const left = byName(snapshot, 'pin_left');
      const right = byName(snapshot, 'pin_right');
      const plate = byName(snapshot, 'plate');
      expect(left.definitionId).toBe(right.definitionId);
      expect(plate.definitionId).not.toBe(left.definitionId);
      expect(translation(left).map(micron)).toEqual([-12, 0, 4]);
      expect(translation(right).map(micron)).toEqual([12, 3, 4]);
      expect([left.color?.hex, right.color?.hex, plate.color?.hex]).toEqual(['#3366cc', '#3366cc', '#cc6633']);
      const pinDef = snapshot.definitions.find((d) => d.id === left.definitionId)!;
      expect(pinDef.volumeMm3).toBeCloseTo(Math.PI * 2 * 2 * 8, 3);
      expect(pinDef.boundsMm.min[2]).toBeCloseTo(0, 3);
      expect(pinDef.boundsMm.max[2]).toBeCloseTo(8, 3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
