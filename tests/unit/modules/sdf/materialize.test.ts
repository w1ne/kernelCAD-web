// tests/unit/modules/sdf/materialize.test.ts
//
// End-to-end capture-side test: feed `materialize` an `SdfField`, get back a
// Shape whose backend was parked on session.importedGeometry; lowering the
// shape returns a closed solid with the right bbox.
//
// NOTE: companion file materialize.defaultRes.test.ts was split out for CI
// shard balance (per-file vitest sharding); it hosts the default-resolution
// (res=30) test, the slowest case in this suite.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { sphere, box } from '../../../../src/modeling/sdf/primitives';
import { materialize } from '../../../../src/modeling/sdf/materialize';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';

beforeAll(async () => {
  await initOcct();
});

describe('sdf.materialize (capture side)', () => {
  it('rejects resolution outside [10, 200] with the right code', () => {
    const session = new CaptureSession();
    expect(() => materialize({ session }, sphere(10), { resolution: 5 }))
      .toThrow(/resolution must be an integer in \[10, 200\]/);
    expect(() => materialize({ session }, sphere(10), { resolution: 250 }))
      .toThrow(/resolution must be an integer in \[10, 200\]/);
    expect(() => materialize({ session }, sphere(10), { resolution: 50.5 }))
      .toThrow(/resolution must be an integer in \[10, 200\]/);
    expect(() => materialize({ session }, sphere(10), { resolution: -10 }))
      .toThrow(/resolution must be an integer in \[10, 200\]/);
  });

  it('parks an OcctBackend on session.importedGeometry keyed by shape id', () => {
    const session = new CaptureSession();
    const s = materialize({ session }, sphere(2), { resolution: 20 });
    const parked = session.importedGeometry.get(s.id);
    expect(parked).toBeInstanceOf(OcctBackend);
  }, 60_000);

  it('round-trips through the lowerer to produce a non-empty solid', async () => {
    const session = new CaptureSession();
    // Use sphere(3) at res=20 to keep this test fast (~5s); the math works
    // identically at higher resolutions. True volume = (4/3) π · 27 ≈ 113.1.
    const s = materialize({ session }, sphere(3), { resolution: 20 });
    const engine = new RecomputeEngine(createOcctLowerer(session));
    const result = await engine.run(session.getRecords(), { paramTable: session.paramTable });
    const shape = result.shapes.get(s.id);
    expect(shape).toBeDefined();
    const v = shape!.volume();
    // Marching cubes at res=20 under-approximates by 5-15 %.
    expect(v).toBeGreaterThan(85);
    expect(v).toBeLessThan(120);
  }, 120_000);

  it('captures the field aabb in record metadata', () => {
    const session = new CaptureSession();
    const s = materialize({ session }, box([4, 2, 1]), { resolution: 15 });
    const record = session.getRecords().find(r => r.id === s.id)!;
    const meta = record.metadata as { aabb?: { min: [number, number, number]; max: [number, number, number] }; sdfKind?: string };
    expect(meta.aabb).toEqual({ min: [-2, -1, -0.5], max: [2, 1, 0.5] });
    expect(meta.sdfKind).toBe('box');
  }, 60_000);
});
