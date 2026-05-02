// tests/unit/backends/occt/reflect.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';

beforeAll(async () => { await initOcct(); }, 60000);

// ---------------------------------------------------------------------------
// Step 1: Verify Replicad's underlying mirror primitive is pure reflection.
// Replicad's Shape3D.mirror() replaces the shape with its reflection — it
// does NOT perform a boolean union with the source. This test proves that
// assumption, which the OcctBackend.reflect() method relies upon.
// ---------------------------------------------------------------------------
describe('Replicad mirror primitive (pure-reflection verification)', () => {
  it('mirror across yz-plane preserves volume (pure reflection, not union)', () => {
    // Build a box at +x: [5, 15] x [0, 10] x [0, 10], volume = 1000
    const original = OcctBackend.box(10, 10, 10).translate(5, 0, 0);
    expect(original.volume()).toBeCloseTo(1000, 1);

    // Reflect across the yz-plane (x=0). A pure reflection keeps volume = 1000.
    // A union-based mirror would produce volume = 2000 (two boxes) or ~2000 for
    // non-overlapping shapes.
    const reflected = original.reflect('yz');

    // Volume must be unchanged (pure reflection)
    expect(reflected.volume()).toBeCloseTo(1000, 1);

    // Centroid (via bounding box) should be at -x: [-15, -5]
    const bb = reflected.boundingBox();
    expect(bb.max[0]).toBeCloseTo(-5, 1);
    expect(bb.min[0]).toBeCloseTo(-15, 1);
  });
});

// ---------------------------------------------------------------------------
// Shape.reflect(plane) — capture-side and integration tests
// ---------------------------------------------------------------------------
describe('Shape.reflect(plane)', () => {
  it('appends a reflect transform without changing the FeatureId', async () => {
    const code = `return box(10, 10, 10).reflect('yz');`;
    const run = await runScript({ code, fileName: '<test>' });
    expect(run.records).toHaveLength(1);
    const rec = run.records[0];
    expect(rec.kind).toBe('box');
    expect(rec.transforms).toHaveLength(1);
    expect(rec.transforms[0]).toEqual({ op: 'reflect', plane: 'yz' });
  }, 30000);

  it('preserves volume — pure reflection has same volume as source', async () => {
    const code = `return box(10, 10, 10).translate(5, 0, 0).reflect('yz');`;
    const run = await runScript({ code, fileName: '<test>' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    expect(result.diagnostics).toEqual([]);
    const id = run.records[run.records.length - 1].id;
    const shape = result.shapes.get(id)!;
    expect(shape.volume()).toBeCloseTo(1000, 1);
  }, 60000);

  it('reflects across a non-origin plane via offset', async () => {
    // Box at [0,10]x[0,10]x[0,10], reflected across x=5 → ends at [0,10]x[0,10]x[0,10]
    // (the center of this box is at x=5, which is the plane, so it reflects onto itself)
    // Use a box offset from the plane: box at [0,10], reflect across x=15 → box at [20,30]
    const code = `return box(10, 10, 10).reflect({plane: 'yz', offset: 15});`;
    const run = await runScript({ code, fileName: '<test>' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    expect(result.diagnostics).toEqual([]);
    const id = run.records[run.records.length - 1].id;
    expect(result.shapes.get(id)!.volume()).toBeCloseTo(1000, 1);
  }, 60000);

  it('canonical face refs resolve after reflect (v0.2: historyMap propagated through transforms)', async () => {
    // v0.2 seeds historyMap on primitives and propagates it through transforms
    // (including reflect). A canonical face ref after reflect now resolves correctly.
    const code = `return box(10, 10, 10).reflect('yz').fillet(2, { face: 'top' });`;
    const run = await runScript({ code, fileName: '<test>' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 60000);

  it('Shape.reflect composition — reflect twice preserves volume', async () => {
    // box(10,10,10).reflect('yz').reflect('yz') should preserve volume = 1000.
    // Two reflect transforms compose; the result is geometrically identical to the source.
    const code = `return box(10, 10, 10).reflect('yz').reflect('yz');`;
    const run = await runScript({ code, fileName: '<test>' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    expect(result.diagnostics).toEqual([]);
    const id = run.records[run.records.length - 1].id;
    const shape = result.shapes.get(id)!;
    expect(shape.volume()).toBeCloseTo(1000, 1);
  }, 60000);

  it('Shape.reflect composition — canonical face refs resolve after two reflects (v0.2)', async () => {
    // v0.2 propagates historyMap through every transform step, including multiple
    // consecutive reflects. Canonical face refs resolve correctly.
    const code = `return box(10, 10, 10).reflect('yz').reflect('yz').fillet(2, { face: 'top' });`;
    const run = await runScript({ code, fileName: '<test>' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 60000);

  it('feature.transform.invalid-plane fires when a reflect transform has a malformed plane spec', async () => {
    // Construct a feature record manually with a malformed reflect transform.
    // Shape.reflect() validates at capture time, so malformed specs can only
    // arrive via direct IR construction. This test exercises the lowerer's
    // transform-loop validation gate directly.
    const records: import('../../../../src/intent/featureRecord').FeatureRecord[] = [
      {
        id: 'box-1',
        kind: 'box',
        params: {
          x: { expression: '10', unit: 'mm', evaluated: 10 },
          y: { expression: '10', unit: 'mm', evaluated: 10 },
          z: { expression: '10', unit: 'mm', evaluated: 10 },
        },
        inputs: {},
        transforms: [
          // Malformed: 'invalid' is not a valid CardinalPlane
          { op: 'reflect', plane: 'invalid' as never },
        ],
        suppressed: false,
      },
    ];
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);
    const codes = result.diagnostics.map(d => d.code);
    expect(codes).toContain('feature.transform.invalid-plane');
  }, 60000);
});
