// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { afterEach, describe, expect, it } from 'vitest';
import { measureGlbStats } from '../../../../src/kernel/export/assetStats';
import { exportGlbAsync, type MeshedGlbPart } from '../../../../src/kernel/backends/occt/exportGlb';
import type { SolvedRigAssembly } from '../../../../src/kernel/export/rigHierarchy';
import type { PBRMaterial } from '../../../../src/shared/intent/material';
import { Transform } from '../../../../src/shared/runtime/se3';
import { assetManifestTool } from '../../../../src/agent/mcp/tools/assetManifest';
import { clearActiveMcpSession, setActiveMcpSession } from '../../../../src/agent/mcp/activeSession';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import type { ShapeBackend } from '../../../../src/kernel/backends/backend';

afterEach(() => clearActiveMcpSession());

/** Axis-aligned box in kernelCAD millimetres. Two triangles per face (12). */
function boxMesh(
  sizeMm: readonly [number, number, number],
  originMm: readonly [number, number, number] = [0, 0, 0],
): { vertices: number[]; triangles: number[] } {
  const [sx, sy, sz] = sizeMm;
  const [ox, oy, oz] = originMm;
  const corners = [
    [ox, oy, oz],
    [ox + sx, oy, oz],
    [ox + sx, oy + sy, oz],
    [ox, oy + sy, oz],
    [ox, oy, oz + sz],
    [ox + sx, oy, oz + sz],
    [ox + sx, oy + sy, oz + sz],
    [ox, oy + sy, oz + sz],
  ];
  const quads = [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [3, 7, 4, 0],
  ];
  const triangles: number[] = [];
  for (const [a, b, c, d] of quads) triangles.push(a!, b!, c!, a!, c!, d!);
  return { vertices: corners.flat(), triangles };
}

function part(name: string, mesh: { vertices: number[]; triangles: number[] }, material?: PBRMaterial): MeshedGlbPart {
  return {
    name,
    mesh,
    shape: undefined as never,
    ...(material === undefined ? {} : { material }),
  };
}

function parseGlbStats(bytes: Uint8Array): {
  triangles: number;
  sizeM: number[];
  minUpM: number;
  materials: number;
  drawCalls: number;
  parts: number;
  hasRig: boolean;
  hasIk: boolean;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x46546c67);
  const jsonLength = view.getUint32(12, true);
  expect(view.getUint32(16, true)).toBe(0x4e4f534a);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as {
    asset?: { extras?: { kernelcad?: { stats?: ReturnType<typeof parseGlbStats> } } };
  };
  const stats = json.asset?.extras?.kernelcad?.stats;
  expect(stats).toBeDefined();
  return stats!;
}

const hinge: SolvedRigAssembly = {
  groundedPart: 'base',
  parts: [
    { name: 'base', worldTransform: Transform.identity().toMat4() },
    { name: 'lid', worldTransform: Transform.translation(0, 0, 1000).toMat4() },
  ],
  mates: [{ name: 'lid', type: 'revolute', a: 'base.hinge', b: 'lid.hinge', limitsDeg: [0, 90] }],
  connectorsByPartName: {
    base: [{ name: 'hinge', type: 'axis', origin: [0, 0, 1000], axis: [0, 0, 1] }],
    lid: [{ name: 'hinge', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] }],
  },
};

describe('measureGlbStats', () => {
  it('measures a 1 m cube as 12 triangles standing on the origin', () => {
    const stats = measureGlbStats([
      { mesh: boxMesh([1000, 1000, 1000]), name: 'cube' },
    ]);

    expect(stats.triangles).toBe(12);
    expect(stats.sizeM[0]).toBeCloseTo(1, 6);
    expect(stats.sizeM[1]).toBeCloseTo(1, 6);
    expect(stats.sizeM[2]).toBeCloseTo(1, 6);
    expect(stats.minUpM).toBeCloseTo(0, 6);
    expect(stats.parts).toBe(1);
    expect(stats.materials).toBe(1);
    expect(stats.drawCalls).toBe(1);
    expect(stats.hasRig).toBe(false);
    expect(stats.hasIk).toBe(false);
  });

  it('reports a raised part above the origin and swaps Y-up size axes', () => {
    const stats = measureGlbStats([
      { mesh: boxMesh([1000, 2000, 3000], [0, 0, 200]), name: 'bracket' },
    ]);

    expect(stats.sizeM[0]).toBeCloseTo(1, 6);
    expect(stats.sizeM[1]).toBeCloseTo(3, 6);
    expect(stats.sizeM[2]).toBeCloseTo(2, 6);
    expect(stats.minUpM).toBeCloseTo(0.2, 6);
  });

  it('counts two named materials as at least two materials and two draw calls', () => {
    const stats = measureGlbStats([
      {
        mesh: boxMesh([1000, 1000, 1000]),
        name: 'body',
        material: { name: 'brass', baseColor: '#c8a24a', metalness: 1, roughness: 0.35 },
      },
      {
        mesh: boxMesh([1000, 1000, 200], [0, 0, 1000]),
        name: 'cap',
        material: { name: 'paint', baseColor: '#224488', roughness: 0.6 },
      },
    ]);

    expect(stats.materials).toBeGreaterThanOrEqual(2);
    expect(stats.drawCalls).toBe(2);
    expect(stats.parts).toBe(2);
    expect(stats.triangles).toBe(24);
  });

  it('shares one low-poly palette material across opaque parts', () => {
    const stats = measureGlbStats([
      { mesh: boxMesh([1000, 1000, 500]), name: 'trunk', color: '#8b5a2b' },
      { mesh: boxMesh([800, 800, 500], [0, 0, 500]), name: 'crown', color: '#3f8f3f' },
    ], { style: 'lowpoly' });

    expect(stats.materials).toBe(1);
    expect(stats.drawCalls).toBe(2);
    expect(stats.parts).toBe(2);
  });

  it('sets hasRig when rig metadata exists and hasIk only when that metadata says so', () => {
    const rigged = measureGlbStats([
      { mesh: boxMesh([1000, 1000, 1000]), name: 'base' },
    ], {
      rig: { rig: { lid: { type: 'rotate', axis: 'z', range: [0, 90], node: 'pivot:lid' } } },
    });
    expect(rigged.hasRig).toBe(true);
    expect(rigged.hasIk).toBe(false);

    const solved = measureGlbStats([
      { mesh: boxMesh([1000, 1000, 1000]), name: 'base' },
    ], {
      rig: { rig: { tip: { type: 'rotate', axis: 'z', range: [-90, 90], node: 'pivot:tip', ik: true } } },
    });
    expect(solved.hasRig).toBe(true);
    expect(solved.hasIk).toBe(true);
  });
});

describe('GLB asset.extras.kernelcad.stats', () => {
  it('writes the extended stats for a 1 m cube', async () => {
    const bytes = await exportGlbAsync([
      part('cube', boxMesh([1000, 1000, 1000]), { name: 'paint', baseColor: '#888888' }),
    ], { format: 'glb' });
    const stats = parseGlbStats(bytes);

    expect(stats.triangles).toBe(12);
    expect(stats.sizeM[0]).toBeCloseTo(1, 6);
    expect(stats.sizeM[1]).toBeCloseTo(1, 6);
    expect(stats.sizeM[2]).toBeCloseTo(1, 6);
    expect(stats.minUpM).toBeCloseTo(0, 6);
    expect(stats.materials).toBeGreaterThanOrEqual(1);
    expect(stats.drawCalls).toBe(1);
    expect(stats.parts).toBe(1);
    expect(stats.hasRig).toBe(false);
    expect(stats.hasIk).toBe(false);
  });

  it('writes materials >= 2 and hasRig when the assembly has rig metadata', async () => {
    const bytes = await exportGlbAsync([
      part('base', boxMesh([1000, 1000, 1000]), { name: 'steel', baseColor: '#888888', metalness: 1, roughness: 0.4 }),
      part('lid', boxMesh([1000, 1000, 200], [0, 0, 1000]), { name: 'paint', baseColor: '#224488', roughness: 0.6 }),
    ], { format: 'glb' }, hinge);
    const stats = parseGlbStats(bytes);

    expect(stats.materials).toBeGreaterThanOrEqual(2);
    expect(stats.parts).toBe(2);
    expect(stats.drawCalls).toBe(2);
    expect(stats.hasRig).toBe(true);
    expect(stats.hasIk).toBe(false);
  });
});

describe('asset_manifest stats', () => {
  it('returns the same stats object, with hasRig when the scene has rig metadata', () => {
    const scene = {
      target: 'export-occt',
      assemblyName: 'manifest rig',
      parts: [],
      rig: hinge,
      _kind: 'scene',
    } as const;
    setActiveMcpSession({ session: new CaptureSession(), rootShape: scene as unknown as ShapeBackend });

    const manifest = assetManifestTool();
    expect(manifest.stats).toMatchObject({
      triangles: 0,
      sizeM: [0, 0, 0],
      minUpM: 0,
      materials: 0,
      drawCalls: 0,
      parts: 0,
      hasRig: true,
      hasIk: false,
    });
  });

  it('returns zero stats before a model has been evaluated', () => {
    expect(assetManifestTool().stats).toMatchObject({
      triangles: 0,
      sizeM: [0, 0, 0],
      minUpM: 0,
      materials: 0,
      drawCalls: 0,
      parts: 0,
      hasRig: false,
      hasIk: false,
    });
  });
});
