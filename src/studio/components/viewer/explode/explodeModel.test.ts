// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { explodedGeometries, explodeLinks, explodeParts, layoutForView, poseSignature } from './explodeModel';

/** A unit-cube-ish mesh spanning [min, max] in its local frame. */
function mesh(name: string, min: [number, number, number], max: [number, number, number], transform?: number[]): GeometryResult {
  const vertices = new Float32Array([...min, ...max]);
  return {
    faces: [{ vertices, indices: new Uint32Array([0, 1, 0]), normals: new Float32Array(6), faceId: 0 }],
    assemblyPartName: name,
    ...(transform ? { transform } : {}),
  };
}

const translation = (x: number, y: number, z: number): number[] => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
// 90° about X: local +Z maps to world -Y.
const rotX90 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

function assemblyRecords(mates: { a: string; b: string; type?: string }[], connectors: Record<string, { name: string; normal?: number[]; axis?: number[] }[]>): FeatureRecord[] {
  const parts = Object.keys(connectors).map((name) => ({
    id: `part-${name}`, kind: 'assemblyPart', params: {}, inputs: {}, metadata: { partName: name },
  }));
  const connectorsByPartId = Object.fromEntries(Object.entries(connectors).map(([n, list]) => [`part-${n}`, list]));
  return [
    ...parts,
    {
      id: 'solved', kind: 'solvedAssembly', params: {}, inputs: {},
      metadata: { mates: mates.map((m, i) => ({ name: `m${i}`, type: m.type ?? 'fastened', ...m })), connectorsByPartId },
    },
  ] as unknown as FeatureRecord[];
}

describe('explodeParts', () => {
  it('builds world boxes per assembly part through the part transform', () => {
    const { parts } = explodeParts([mesh('a', [0, 0, 0], [2, 2, 2], translation(10, 0, 0))]);
    expect(parts).toEqual([{ key: 'a', center: [11, 1, 1], size: [2, 2, 2] }]);
  });

  it('merges meshes of one part and skips empty meshes', () => {
    const empty: GeometryResult = { faces: [], assemblyPartName: 'ghost' };
    const { parts } = explodeParts([mesh('a', [0, 0, 0], [1, 1, 1]), mesh('a', [4, 0, 0], [5, 1, 1]), empty]);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.size).toEqual([5, 1, 1]);
  });
});

describe('explodeLinks', () => {
  it('reads mates with the connector normal mapped through the part transform', () => {
    const records = assemblyRecords(
      [{ a: 'base.top', b: 'lid.seat' }],
      { base: [{ name: 'top', normal: [0, 0, 1] }], lid: [{ name: 'seat', normal: [0, 0, 1] }] },
    );
    const links = explodeLinks(records, new Map([['base', rotX90], ['lid', undefined]]));
    expect(links).toHaveLength(1);
    expect(links[0]!.a).toBe('base');
    expect(links[0]!.b).toBe('lid');
    expect(links[0]!.axis![1]).toBeCloseTo(-1, 9);
  });

  it('reads joint primitives and connect placements, and skips malformed refs', () => {
    const records = [
      { id: 'p1', kind: 'assemblyPart', params: {}, inputs: {}, metadata: { partName: 'arm' } },
      { id: 'p2', kind: 'assemblyPart', params: {}, inputs: {}, metadata: { partName: 'hand', placedBy: { connector: 'c', to: { partId: 'p1', partName: 'arm', connector: 'c' } } } },
      { id: 'j', kind: 'assemblyJoint', params: {}, inputs: { a: { kind: 'feature', id: 'p1' }, b: { kind: 'feature', id: 'p2' } }, metadata: { jointName: 'wrist', jointKind: 'revolute', axis: [1, 0, 0] } },
      { id: 's', kind: 'solvedAssembly', params: {}, inputs: {}, metadata: { mates: [{ name: 'bad', a: 'nodot', b: 'x.y', type: 'fastened' }] } },
    ] as unknown as FeatureRecord[];
    const links = explodeLinks(records, new Map());
    expect(links).toEqual([
      { a: 'arm', b: 'hand' },
      { a: 'arm', b: 'hand', axis: [1, 0, 0] },
    ]);
  });
});

describe('layoutForView + explodedGeometries', () => {
  const base = mesh('base', [-20, -20, 0], [20, 20, 2]);
  const lid = mesh('lid', [-5, -5, 2], [5, 5, 4]);
  const records = assemblyRecords(
    [{ a: 'base.top', b: 'lid.seat' }],
    { base: [{ name: 'top', normal: [0, 0, 1] }], lid: [{ name: 'seat', normal: [0, 0, 1] }] },
  );

  it('uses the mate graph when feature records carry mates', () => {
    const { layout, partCount } = layoutForView([base, lid], records);
    expect(partCount).toBe(2);
    expect(layout.mode).toBe('mates');
    expect(layout.root).toBe('base');
    const o = layout.offsets.get('lid')!;
    expect(o[0]).toBeCloseTo(0, 9);
    expect(o[2]).toBeGreaterThan(0);
  });

  it('falls back to radial without records (a stored mesh artifact)', () => {
    expect(layoutForView([base, lid], []).layout.mode).toBe('radial');
  });

  it('moves only the transform and keeps the mesh arrays', () => {
    const { layout } = layoutForView([base, lid], records);
    const out = explodedGeometries([base, lid], layout, 1);
    expect(out[0]).toBe(base); // the root does not move
    expect(out[1]).not.toBe(lid);
    expect(out[1]!.faces).toBe(lid.faces);
    expect(out[1]!.transform![14]).toBeCloseTo(layout.offsets.get('lid')![2], 9);
    expect(lid.transform).toBeUndefined(); // the input is not mutated
    expect(explodedGeometries([base, lid], layout, 0)[1]).toBe(lid);
  });

  it('left-composes the offset onto an existing transform', () => {
    const moved = mesh('lid', [-5, -5, 2], [5, 5, 4], translation(3, 0, 0));
    const { layout } = layoutForView([base, moved], records);
    const out = explodedGeometries([base, moved], layout, 0.5);
    expect(out[1]!.transform![12]).toBeCloseTo(3 + 0.5 * layout.offsets.get('lid')![0], 9);
    expect(out[1]!.transform![14]).toBeCloseTo(0.5 * layout.offsets.get('lid')![2], 9);
  });
});

describe('poseSignature', () => {
  it('is stable for copies and changes when a part moves or the mesh changes', () => {
    const a = mesh('a', [0, 0, 0], [1, 1, 1]);
    const sig = poseSignature([a]);
    expect(poseSignature([{ ...a }])).toBe(sig);
    expect(poseSignature([{ ...a, transform: translation(1, 0, 0) }])).not.toBe(sig);
    expect(poseSignature([mesh('a', [0, 0, 0], [1, 1, 1])])).not.toBe(sig);
  });
});
