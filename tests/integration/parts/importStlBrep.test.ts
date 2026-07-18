// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Round-trip verification for `lib.fromBREP` / `lib.fromSTL`.
//
// "It didn't throw" is not evidence an importer works. Every test here
// exports a shape whose exact properties are known analytically, re-imports
// it, and compares volume / bbox / topology against the original — then
// feeds the result into a downstream boolean to prove the geometry is really
// usable and not just constructible.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { importBrepBytes, BrepParseError } from '../../../src/kernel/backends/occt/importBrep';
import {
  importStlBytes,
  countStlTriangles,
  StlParseError,
} from '../../../src/kernel/backends/occt/importStl';
import { createApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { KernelError } from '../../../src/shared/intent/kernelError';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';

let dir: string;

beforeAll(async () => {
  await initOcct();
  dir = mkdtempSync(join(tmpdir(), 'kcad-import-'));
});

/** A 10x20x30 box: volume exactly 6000 mm^3, 6 faces, 12 edges. */
function makeBox(): OcctBackend {
  return new OcctBackend(replicad.makeBaseBox(10, 20, 30) as replicad.Shape3D);
}

function faceCount(b: OcctBackend): number {
  let n = 0;
  for (const _f of (b as any).shape.faces) n++;
  return n;
}

function bbox(b: OcctBackend): { min: number[]; max: number[] } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bounds = (b as any).shape.boundingBox.bounds;
  return { min: bounds[0], max: bounds[1] };
}

describe('BREP round-trip (lib.fromBREP)', () => {
  it('re-imports an exported box with volume, bbox and topology preserved exactly', () => {
    const original = makeBox();
    const bytes = original.exportBREP();
    expect(bytes.length).toBeGreaterThan(0);

    const reimported = importBrepBytes(bytes);

    // BREP is a lossless serialization of the kernel's own representation:
    // exact analytic surfaces, no tessellation, no schema translation. So the
    // tolerance here is floating-point noise, not a modeling tolerance.
    expect(reimported.volume()).toBeCloseTo(6000, 9);
    expect(reimported.volume()).toBeCloseTo(original.volume(), 9);
    expect(reimported.surfaceArea()).toBeCloseTo(original.surfaceArea(), 9);

    // Topology must survive, not just the volume integral.
    expect(faceCount(reimported)).toBe(6);
    expect(faceCount(reimported)).toBe(faceCount(original));

    const a = bbox(original);
    const b = bbox(reimported);
    for (let i = 0; i < 3; i++) {
      expect(b.min[i]).toBeCloseTo(a.min[i], 9);
      expect(b.max[i]).toBeCloseTo(a.max[i], 9);
    }
  });

  it('preserves analytic (non-planar) surfaces — a sphere stays exactly a sphere', () => {
    const sphere = new OcctBackend(replicad.makeSphere(10) as replicad.Shape3D);
    const exact = (4 / 3) * Math.PI * 1000;

    const reimported = importBrepBytes(sphere.exportBREP());

    // The point of BREP over STL: the surface is still an analytic sphere, so
    // the volume matches the closed-form value to kernel precision rather
    // than to a tessellation tolerance.
    expect(reimported.volume()).toBeCloseTo(exact, 6);
    // One spherical face (plus its seam), not thousands of facets.
    expect(faceCount(reimported)).toBeLessThanOrEqual(2);
  });

  it('a re-imported shape participates in downstream booleans', () => {
    const reimported = importBrepBytes(makeBox().exportBREP());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cut = (reimported as any).shape.clone().cut(replicad.makeBaseBox(10, 20, 10));
    // Cutting a 10x20x10 corner out of the 10x20x30 box: the cutter is
    // centred at the origin like the box, so it removes exactly its own
    // 2000mm^3 overlap.
    expect(replicad.measureVolume(cut)).toBeCloseTo(4000, 6);
  });

  it('rejects a truncated BREP with a typed error, not a wasm abort', () => {
    const good = makeBox().exportBREP();
    const truncated = good.slice(0, Math.floor(good.length / 2));

    let caught: unknown;
    try {
      importBrepBytes(truncated);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BrepParseError);
    expect((caught as BrepParseError).reason).toBe('parse');
  });

  it('rejects non-BREP bytes and empty input with a typed error', () => {
    for (const payload of [
      new TextEncoder().encode('this is definitely not a BREP document'),
      new Uint8Array([0xff, 0x00, 0xff, 0x00]),
      new Uint8Array(0),
    ]) {
      let caught: unknown;
      try {
        importBrepBytes(payload);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BrepParseError);
    }
  });
});

describe('STL round-trip (lib.fromSTL)', () => {
  /**
   * Tolerance rationale for STL.
   *
   * A box is the one case where STL is exact: its 12 triangles lie in the 6
   * true planes of the solid, so sewing recovers the original volume to
   * float precision. The only loss is float32 storage in binary STL, whose
   * ULP at a coordinate magnitude of 30mm is ~2e-6mm — hence 6 decimal
   * places rather than the 9 used for BREP.
   *
   * Curved geometry is a different story and is asserted separately below,
   * where the error is a genuine chord-height effect and NOT float noise.
   *
   * Measured round-trip error via this repo's own export mesher:
   *   box      12 tris   ->  0.0000%   (facets lie in the true planes)
   *   cylinder 1004 tris -> -0.0104%
   *   sphere   32202 tris-> -0.0459%
   * Always negative: an inscribed polyhedron under-fills a convex round body.
   *
   * For contrast, the BREP round-trip of the same three shapes is lossless to
   * machine epsilon (relative error 0, 8.9e-16, -4.4e-16) with face counts
   * preserved exactly (6->6, 3->3, 1->1).
   */
  it('re-imports an exported box as a closed solid with exact volume and bbox', async () => {
    const original = makeBox();
    // Use the repo's own export-grade mesher, i.e. the real export path.
    const bytes = await original.exportSTLAsync();

    const { count, binary } = countStlTriangles(bytes);
    expect(binary).toBe(true);
    expect(count).toBe(12); // 6 quad faces -> 2 triangles each

    const res = importStlBytes(bytes);
    expect(res.isSolid).toBe(true);
    expect(res.triangleCount).toBe(12);

    expect(res.backend.volume()).toBeCloseTo(6000, 6);
    expect(res.backend.surfaceArea()).toBeCloseTo(original.surfaceArea(), 6);

    const a = bbox(original);
    const b = bbox(res.backend);
    for (let i = 0; i < 3; i++) {
      expect(b.min[i]).toBeCloseTo(a.min[i], 6);
      expect(b.max[i]).toBeCloseTo(a.max[i], 6);
    }
  }, 60_000);

  it('is honest about faceting: a cylinder loses volume to chord error', async () => {
    // r=10, h=20 -> exact volume 2000*pi ~= 6283.185
    const cyl = new OcctBackend(replicad.makeCylinder(10, 20) as replicad.Shape3D);
    const exact = Math.PI * 100 * 20;

    const res = importStlBytes(await cyl.exportSTLAsync());
    expect(res.isSolid).toBe(true);

    const v = res.backend.volume();
    // An inscribed polygonal approximation always UNDER-estimates a convex
    // round volume — the facets cut the chord. This is the honest, expected
    // direction of the error and asserting it is what distinguishes a real
    // mesh import from one that secretly re-fit an analytic surface.
    expect(v).toBeLessThan(exact);
    // Bounded. Measured on this machine: 1004 triangles, -0.0104% error.
    // The 0.1% bound leaves ~10x headroom over the observed value, so this
    // catches a real fidelity regression without being flaky.
    expect(v).toBeGreaterThan(exact * 0.999);

    // The bbox is likewise inscribed in the true one, never larger.
    const b = bbox(res.backend);
    expect(b.max[0]).toBeLessThanOrEqual(10 + 1e-6);
    expect(b.max[2]).toBeCloseTo(20, 4);

    // And the faces really are facets, not one analytic cylinder wall.
    expect(faceCount(res.backend)).toBeGreaterThan(20);
  }, 120_000);

  it('an imported STL solid participates in downstream booleans', async () => {
    const res = importStlBytes(await makeBox().exportSTLAsync());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cut = (res.backend as any).shape.clone().cut(replicad.makeBaseBox(10, 20, 10));
    expect(replicad.measureVolume(cut)).toBeCloseTo(4000, 4);
  }, 60_000);

  it('reports an open mesh as not-solid instead of faking a solid', () => {
    // One triangle: as open as a shell gets.
    const ascii = [
      'solid t',
      'facet normal 0 0 1',
      ' outer loop',
      '  vertex 0 0 0',
      '  vertex 10 0 0',
      '  vertex 0 10 0',
      ' endloop',
      'endfacet',
      'endsolid t',
    ].join('\n');

    const res = importStlBytes(new TextEncoder().encode(ascii));
    // The whole point: replicad's own importSTL returns this as a "Solid".
    expect(res.isSolid).toBe(false);
    expect(res.triangleCount).toBe(1);
  });

  it('counts ASCII and binary triangle headers correctly', async () => {
    const bin = await makeBox().exportSTLAsync();
    expect(countStlTriangles(bin)).toEqual({ count: 12, binary: true });

    const ascii = new TextEncoder().encode(
      'solid s\nfacet normal 0 0 1\n outer loop\n  vertex 0 0 0\n  vertex 1 0 0\n  vertex 0 1 0\n endloop\nendfacet\nendsolid s',
    );
    expect(countStlTriangles(ascii)).toEqual({ count: 1, binary: false });
  });

  it('rejects truncated / garbage / empty STL with a typed error, not a wasm abort', async () => {
    const good = await makeBox().exportSTLAsync();

    // Truncated binary: header promises 12 triangles, body is cut short.
    const truncated = good.slice(0, 100);
    let caught: unknown;
    try {
      importStlBytes(truncated);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StlParseError);

    for (const payload of [new Uint8Array([1, 2, 3, 4]), new Uint8Array(0)]) {
      let err: unknown;
      try {
        importStlBytes(payload);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(StlParseError);
    }
  });

  it('refuses a file past the triangle budget without doing the OCCT work', async () => {
    const bytes = await makeBox().exportSTLAsync();
    const t0 = Date.now();
    let caught: unknown;
    try {
      importStlBytes(bytes, { maxTriangles: 4 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StlParseError);
    expect((caught as StlParseError).reason).toBe('too-many-triangles');
    // Fails on the header, so it must be effectively instant.
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe('lib.fromBREP / lib.fromSTL agent-facing surface', () => {
  it('captures an importedBrep record and parks lowered geometry', async () => {
    const path = join(dir, 'box.brep');
    writeFileSync(path, makeBox().exportBREP());

    const session = new CaptureSession();
    const api = createApi({ session });
    const shape = await api.lib.fromBREP(path);

    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('importedBrep');
    expect(records[0].metadata?.sourcePath).toBe(path);

    const parked = session.importedGeometry.get(shape.id);
    expect(parked).toBeDefined();
    expect((parked as OcctBackend).volume()).toBeCloseTo(6000, 6);
  });

  it('captures an importedStl record carrying faceted provenance', async () => {
    const path = join(dir, 'box.stl');
    writeFileSync(path, await makeBox().exportSTLAsync());

    const session = new CaptureSession();
    const api = createApi({ session });
    const shape = await api.lib.fromSTL(path);

    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('importedStl');
    // The agent must be able to see that this is mesh-derived geometry.
    expect(records[0].metadata?.geometryKind).toBe('mesh');
    expect(records[0].metadata?.triangleCount).toBe(12);
    expect(records[0].metadata?.isSolid).toBe(true);

    expect(
      (session.importedGeometry.get(shape.id) as OcctBackend).volume(),
    ).toBeCloseTo(6000, 6);
  }, 60_000);

  it('refuses a non-watertight STL by default, and accepts it with allowOpen', async () => {
    const path = join(dir, 'open.stl');
    writeFileSync(
      path,
      'solid t\nfacet normal 0 0 1\n outer loop\n  vertex 0 0 0\n  vertex 10 0 0\n  vertex 0 10 0\n endloop\nendfacet\nendsolid t',
    );

    const session = new CaptureSession();
    const api = createApi({ session });

    await expect(api.lib.fromSTL(path)).rejects.toThrow(KernelError);
    await expect(api.lib.fromSTL(path)).rejects.toThrow(/not watertight/);

    // Opt-in escape hatch still works and is recorded as not-solid.
    const session2 = new CaptureSession();
    const api2 = createApi({ session: session2 });
    await api2.lib.fromSTL(path, { allowOpen: true });
    expect(session2.getRecords()[0].metadata?.isSolid).toBe(false);
  });

  it('raises a typed KernelError for a missing file and a bad path argument', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });

    await expect(api.lib.fromBREP(join(dir, 'nope.brep'))).rejects.toThrow(KernelError);
    await expect(api.lib.fromSTL(join(dir, 'nope.stl'))).rejects.toThrow(KernelError);
    await expect(api.lib.fromBREP('')).rejects.toThrow(/non-empty string/);
    await expect(api.lib.fromSTL('')).rejects.toThrow(/non-empty string/);
  });

  /**
   * The `supports` set on OcctLowerer is authoritative: a FeatureKind absent
   * from it is silently skipped, so a capture-only test would pass while the
   * import produced nothing downstream. These two drive the real
   * RecomputeEngine and assert on the LOWERED geometry.
   */
  it('lowers an importedBrep record through the real engine', async () => {
    const path = join(dir, 'lower.brep');
    writeFileSync(path, makeBox().exportBREP());

    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: dir });
    await api.lib.fromBREP('lower.brep');
    const records = session.getRecords();

    const lowerer = new OcctLowerer();
    lowerer.importedGeometry = session.importedGeometry;
    const engine = new RecomputeEngine(lowerer);
    const result = await engine.run(records, { paramTable: session.paramTable });

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    const lowered = result.shapes.get(records[0].id) as OcctBackend;
    expect(lowered).toBeDefined();
    expect(lowered.volume()).toBeCloseTo(6000, 6);
  });

  it('lowers an importedStl record through the real engine', async () => {
    const path = join(dir, 'lower.stl');
    writeFileSync(path, await makeBox().exportSTLAsync());

    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: dir });
    await api.lib.fromSTL('lower.stl');
    const records = session.getRecords();

    const lowerer = new OcctLowerer();
    lowerer.importedGeometry = session.importedGeometry;
    const engine = new RecomputeEngine(lowerer);
    const result = await engine.run(records, { paramTable: session.paramTable });

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    const lowered = result.shapes.get(records[0].id) as OcctBackend;
    expect(lowered).toBeDefined();
    expect(lowered.volume()).toBeCloseTo(6000, 4);
  }, 60_000);

  it('surfaces a corrupt BREP file as kernel-failed, not an internal message', async () => {
    const path = join(dir, 'corrupt.brep');
    writeFileSync(path, 'DBRep_DrawableShape\nnot really\n');

    const session = new CaptureSession();
    const api = createApi({ session });
    await expect(api.lib.fromBREP(path)).rejects.toThrow(/failed to parse BREP/);
  });
});
