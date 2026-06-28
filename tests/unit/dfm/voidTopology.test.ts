// tests/unit/dfm/voidTopology.test.ts
//
// Voxel void/channel topology (W3 Task 6). Exercises:
//   - grid primitives directly (voxelize volume + parity sanity, edt2 on
//     tiny masks, components at 6- vs 26-connectivity),
//   - a 20 mm cube with a Ø4 through-hole: found = 2 mouths (clean against
//     a declared `openings: 2`, mismatch against `openings: 3` — the
//     orchestrator (Task 7) turns found ≠ declared into a diagnostic),
//   - a T-shaped tunnel (through-hole + side branch): found = 3,
//   - a Ø4×10 blind hole: found = 1,
//   - a fully internal 6 mm cavity: undeclared → one sealedVoids entry with
//     an in-cavity location and a mm³ volume; declared
//     `{ openings: 0, sealed: true }` → consumed, clean,
//   - no declared channels and no cavities → the mouth-count phase is
//     skipped (asserted via the returned `phases` flags, not timing).
//
// The T-tunnel test prints its analyzeVoids wall time (console.info) as the
// budget reference for Task 9.

import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeVoids } from '../../../src/modeling/runtime/dfm/voidTopology';
import { voxelize, edt2, components } from '../../../src/modeling/runtime/dfm/voxelGrid';
import { TriangleBvh, type DfmMesh } from '../../../src/modeling/runtime/dfm/meshBvh';
import {
  initOcct,
  OcctBackend,
  meshShapeForExport,
} from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import type { DfmChannelSpec } from '../../../src/shared/intent/dfmSpecRecord';

/** Build an inline script and return its export-grade mesh (the Task 3
 *  recipe: buildModel → root OcctBackend → meshShapeForExport). */
async function exportMesh(code: string): Promise<DfmMesh> {
  const model = await buildModel({ fileName: 'voids.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const shape = (model.rootShape as OcctBackend).getReplicadShape();
  return meshShapeForExport(shape);
}

const bore = (openings: number): DfmChannelSpec => ({
  part: 'shape',
  name: 'bore',
  openings,
});

describe('voxelGrid primitives', () => {
  it('edt2 computes exact squared distances on a 1-D mask', () => {
    // Single feature voxel at x = 2 of 5.
    const d = edt2(new Uint8Array([0, 0, 1, 0, 0]), { nx: 5, ny: 1, nz: 1 });
    expect(Array.from(d)).toEqual([4, 1, 0, 1, 4]);
  });

  it('edt2 computes exact squared EUCLIDEAN (not chamfer) distances in 2-D', () => {
    // 3×3, single feature at the center: corners are at squared distance 2.
    const mask = new Uint8Array(9);
    mask[4] = 1;
    const d = edt2(mask, { nx: 3, ny: 3, nz: 1 });
    expect(Array.from(d)).toEqual([2, 1, 2, 1, 0, 1, 2, 1, 2]);
  });

  it('edt2 with an empty mask reports unreachable everywhere', () => {
    const d = edt2(new Uint8Array(8), { nx: 2, ny: 2, nz: 2 });
    for (const v of d) expect(v).toBeGreaterThan(1e18);
  });

  it('components separates a diagonal pair at 6-conn and joins it at 26-conn', () => {
    // 3×3×1: features at (0,0) and (1,1) — edge-disjoint, corner-adjacent.
    const mask = new Uint8Array(9);
    mask[0] = 1; // (0,0,0)
    mask[4] = 1; // (1,1,0)
    const dims = { nx: 3, ny: 3, nz: 1 };

    const six = components(mask, dims, 6);
    expect(six.components).toHaveLength(2);
    expect(six.components[0]).toEqual({ voxelCount: 1, bbox: [0, 0, 0, 0, 0, 0], seed: 0 });
    expect(six.components[1]).toEqual({ voxelCount: 1, bbox: [1, 1, 0, 1, 1, 0], seed: 4 });
    expect(six.labels[0]).toBe(0);
    expect(six.labels[4]).toBe(1);
    expect(six.labels[1]).toBe(-1); // non-mask voxel

    const twentySix = components(mask, dims, 26);
    expect(twentySix.components).toHaveLength(1);
    expect(twentySix.components[0]).toEqual({ voxelCount: 2, bbox: [0, 0, 0, 1, 1, 0], seed: 0 });
  });
});

describe('analyzeVoids — OCCT export meshes', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  it('voxelizes a 20 mm cube to ~8000 mm³ of solid with no cracked columns', async () => {
    const mesh = await exportMesh('return box(20, 20, 20);');
    const grid = voxelize(mesh, new TriangleBvh(mesh));
    expect(grid.voxelMm).toBeCloseTo(0.4, 9); // under the 2M clamp → target
    expect(grid.crackedColumns).toBe(0);
    let filled = 0;
    for (const v of grid.solid) filled += v;
    const volumeMm3 = filled * grid.voxelMm ** 3;
    expect(volumeMm3).toBeGreaterThan(8000 * 0.97);
    expect(volumeMm3).toBeLessThan(8000 * 1.03);
  }, 30000);

  it('counts 2 mouths on a Ø4 through-hole (clean vs openings: 2, mismatch vs 3)', async () => {
    const mesh = await exportMesh(
      'return box(20, 20, 20).subtract(cylinder(22, 2).translate(10, 10, -1));',
    );
    const bvh = new TriangleBvh(mesh);

    const clean = analyzeVoids(mesh, bvh, [bore(2)]);
    expect(clean.phases).toEqual({ sealedVoids: true, mouthCount: true });
    expect(clean.crackedColumns).toBe(0);
    expect(clean.sealedVoids).toEqual([]);
    expect(clean.detectedSealedVoidCount).toBe(0); // through-hole is outside-connected
    expect(clean.channelOpenings).toBeDefined();
    expect(clean.channelOpenings!.found).toBe(2); // === declared → clean
    // Hole volume π·2²·20 ≈ 251 mm³ (voxelized, closing meniscus at mouths).
    expect(clean.channelOpenings!.channelVolumeMm3).toBeGreaterThan(200);
    expect(clean.channelOpenings!.channelVolumeMm3).toBeLessThan(300);
    // One mouth location per counted mouth, near the two z extremes of the
    // bore (z = 0 and z = 20 faces; closing meniscus slop < 2 mm), both
    // inside the hole's xy footprint (centre [10, 10], r = 2).
    const mouths = clean.channelOpenings!.mouthLocations;
    expect(mouths).toHaveLength(2);
    const zs = mouths.map(m => m[2]).sort((a, b) => a - b);
    expect(zs[0]).toBeLessThan(2);
    expect(zs[1]).toBeGreaterThan(18);
    for (const m of mouths) {
      expect(m[0]).toBeGreaterThan(7);
      expect(m[0]).toBeLessThan(13);
      expect(m[1]).toBeGreaterThan(7);
      expect(m[1]).toBeLessThan(13);
    }
    // Channel seed lies inside the bore (xy within the hole footprint).
    const seed = clean.channelOpenings!.channelSeed;
    expect(seed).toBeDefined();
    expect(seed![0]).toBeGreaterThan(7);
    expect(seed![0]).toBeLessThan(13);
    expect(seed![1]).toBeGreaterThan(7);
    expect(seed![1]).toBeLessThan(13);

    // Same geometry, declared openings: 3 — analyzeVoids still reports the
    // measured found: 2; Task 7 surfaces found ≠ declared as the mismatch.
    const declared3 = bore(3);
    const mismatch = analyzeVoids(mesh, bvh, [declared3]);
    expect(mismatch.channelOpenings!.found).toBe(2);
    expect(mismatch.channelOpenings!.found).not.toBe(declared3.openings);
  }, 30000);

  it('counts 3 mouths on a T-shaped tunnel (timing reference)', async () => {
    // Vertical Ø4 through-hole + Ø4 side branch from the junction out the
    // x = 20 face: mouths on z = 0, z = 20, x = 20 — well separated.
    const mesh = await exportMesh(
      'return box(20, 20, 20)' +
        '.subtract(cylinder(22, 2).translate(10, 10, -1))' +
        '.subtract(cylinder(12, 2).rotate([0, 1, 0], 90).translate(9.5, 10, 10));',
    );
    const bvh = new TriangleBvh(mesh);

    const t0 = performance.now();
    const res = analyzeVoids(mesh, bvh, [bore(3)]);
    const elapsed = performance.now() - t0;
    console.info(`analyzeVoids on cube-with-tunnel: ${elapsed.toFixed(0)} ms (voxelMm ${res.voxelMm})`);

    expect(res.crackedColumns).toBe(0);
    expect(res.sealedVoids).toEqual([]);
    expect(res.channelOpenings!.found).toBe(3);
    // Vertical bore ≈ 251 mm³ + branch ≈ 130 mm³ − junction overlap ≈ 43 mm³.
    expect(res.channelOpenings!.channelVolumeMm3).toBeGreaterThan(250);
    expect(res.channelOpenings!.channelVolumeMm3).toBeLessThan(450);
  }, 30000);

  it('counts 1 mouth on a Ø4×10 blind hole', async () => {
    // Hole from the top face down to z = 10 (cutter overshoots the face).
    const mesh = await exportMesh(
      'return box(20, 20, 20).subtract(cylinder(11, 2).translate(10, 10, 10));',
    );
    const res = analyzeVoids(mesh, new TriangleBvh(mesh), [bore(1)]);
    expect(res.crackedColumns).toBe(0);
    expect(res.sealedVoids).toEqual([]);
    expect(res.channelOpenings!.found).toBe(1);
    // Single mouth at the top face (the hole opens at z = 20).
    expect(res.channelOpenings!.mouthLocations).toHaveLength(1);
    expect(res.channelOpenings!.mouthLocations[0][2]).toBeGreaterThan(18);
    // π·2²·10 ≈ 126 mm³.
    expect(res.channelOpenings!.channelVolumeMm3).toBeGreaterThan(100);
    expect(res.channelOpenings!.channelVolumeMm3).toBeLessThan(160);
  }, 30000);

  it('reports an undeclared internal cavity as a sealed void; a declared sealed channel consumes it', async () => {
    // 6 mm cube cavity fully inside the 20 mm cube: no path out.
    const mesh = await exportMesh(
      'return box(20, 20, 20).subtract(box(6, 6, 6).translate(7, 7, 7));',
    );
    const bvh = new TriangleBvh(mesh);

    // Undeclared → reported.
    const res = analyzeVoids(mesh, bvh, []);
    expect(res.phases).toEqual({ sealedVoids: true, mouthCount: false });
    expect(res.channelOpenings).toBeUndefined();
    expect(res.crackedColumns).toBe(0);
    expect(res.detectedSealedVoidCount).toBe(1);
    expect(res.sealedVoids).toHaveLength(1);
    const v = res.sealedVoids[0];
    expect(v.volumeMm3).toBeGreaterThan(170); // 6³ = 216 mm³ voxelized
    expect(v.volumeMm3).toBeLessThan(270);
    // Location lies inside the cavity (7..13 on every axis, half-voxel slop).
    for (let axis = 0; axis < 3; axis++) {
      expect(v.location[axis]).toBeGreaterThan(6.5);
      expect(v.location[axis]).toBeLessThan(13.5);
    }

    // Declared sealed → consumed, clean; mouth phase stays skipped (no
    // non-sealed channel declared). The PRE-consumption count stays 1 so
    // consumers can still see how many cavities physically exist.
    const declared = analyzeVoids(mesh, bvh, [
      { part: 'shape', name: 'pocket', openings: 0, sealed: true },
    ]);
    expect(declared.sealedVoids).toEqual([]);
    expect(declared.detectedSealedVoidCount).toBe(1);
    expect(declared.channelOpenings).toBeUndefined();
    expect(declared.phases).toEqual({ sealedVoids: true, mouthCount: false });

    // Over-declaration (2 sealed channels, only 1 cavity) leaves sealedVoids
    // empty — detectedSealedVoidCount is the only signal that one declared
    // sealed channel has NO matching cavity. Task 7 turns
    // declaredSealed > detectedSealedVoidCount into a diagnostic.
    const overDeclared = analyzeVoids(mesh, bvh, [
      { part: 'shape', name: 'pocket', openings: 0, sealed: true },
      { part: 'shape', name: 'phantom', openings: 0, sealed: true },
    ]);
    expect(overDeclared.sealedVoids).toEqual([]);
    expect(overDeclared.detectedSealedVoidCount).toBe(1);
  }, 30000);

  it('skips the mouth-count phase when no channels are declared (phase flags)', async () => {
    const mesh = await exportMesh('return box(20, 20, 20);');
    const res = analyzeVoids(mesh, new TriangleBvh(mesh), []);
    expect(res.phases).toEqual({ sealedVoids: true, mouthCount: false });
    expect(res.channelOpenings).toBeUndefined();
    expect(res.sealedVoids).toEqual([]);
    expect(res.detectedSealedVoidCount).toBe(0);
    expect(res.crackedColumns).toBe(0);
  }, 30000);

  // ── Multiple INDEPENDENT openings ─────────────────────────────────────────
  // A part can have several narrow openings that are NOT one connected channel
  // (an enclosure's separate port cutouts, two unrelated bores). Each is its
  // own outside-connected neck component; the count must be the TOTAL across
  // all of them, not the mouths of whichever single component is largest.

  it('partOpenings counts 2 separate blind holes (found, the single channel, stays 1)', async () => {
    // Two Ø4 blind holes into a solid block from the top — disjoint necks.
    // `found` binds to ONE channel (the largest neck) and is 1; the part-level
    // count sees both openings.
    const mesh = await exportMesh(
      'return box(40, 20, 20)' +
        '.subtract(cylinder(11, 2).translate(10, 10, 10))' +
        '.subtract(cylinder(11, 2).translate(30, 10, 10));',
    );
    const res = analyzeVoids(mesh, new TriangleBvh(mesh), [bore(2)]);
    expect(res.phases).toEqual({ sealedVoids: true, mouthCount: true });
    expect(res.channelOpenings!.found).toBe(1);
    expect(res.channelOpenings!.partOpenings).toBe(2);
    expect(res.channelOpenings!.partMouthLocations).toHaveLength(2);
  }, 30000);

  it('partOpenings counts every port of a hollow enclosure tray (3 ports → 3)', async () => {
    // The proto.cat enclosure case: a SHELLED tray (open top) with three
    // narrow external ports — a USB-C slot, an M12 panel bore, an IR aperture.
    // The wide cavity is not one ≤16mm channel, so found (largest neck) is 1;
    // the real opening count is 3, reported by partOpenings.
    const mesh = await exportMesh(
      'let b = box(74, 49, 30).shell(2.4, { face: { byNormal: "Z" } });' +
        'const usb = box(10, 6, 4).translate(16, 44, 7);' +
        'const m12 = cylinder(7, 6.25).rotateY(90).translate(-1, 24, 14);' +
        'const mlx = box(13, 6, 13).translate(44, 44, 9);' +
        'return b.subtract(usb, m12, mlx);',
    );
    const res = analyzeVoids(mesh, new TriangleBvh(mesh), [bore(3)]);
    expect(res.phases).toEqual({ sealedVoids: true, mouthCount: true });
    expect(res.channelOpenings!.partOpenings).toBe(3);
  }, 30000);

  it('a port-less hollow tray reports partOpenings 1, NOT inflated by internal corners', async () => {
    // Regression guard for the part-level sum: the 8mm closing fills fillets
    // along the tray's internal edges, but those are absorbed into the one
    // cavity component (the open top) — they must NOT each become a mouth.
    const mesh = await exportMesh(
      'return box(74, 49, 30).shell(2.4, { face: { byNormal: "Z" } });',
    );
    const res = analyzeVoids(mesh, new TriangleBvh(mesh), [bore(1)]);
    expect(res.channelOpenings!.found).toBe(1);
    expect(res.channelOpenings!.partOpenings).toBe(1);
  }, 30000);

  it('partOpenings equals found for a single connected channel (through-hole)', async () => {
    // No regression of the single-channel contract: one channel, two mouths —
    // found and partOpenings agree.
    const mesh = await exportMesh(
      'return box(20, 20, 20).subtract(cylinder(22, 2).translate(10, 10, -1));',
    );
    const res = analyzeVoids(mesh, new TriangleBvh(mesh), [bore(2)]);
    expect(res.channelOpenings!.found).toBe(2);
    expect(res.channelOpenings!.partOpenings).toBe(2);
  }, 30000);
});
