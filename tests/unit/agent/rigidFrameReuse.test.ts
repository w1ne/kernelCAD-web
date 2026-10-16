import { describe, expect, it } from 'vitest';
import { canReuseLoadedMeshes, type ReusableFeature } from '../../../src/agent/render/rigidFrameReuse';

const TRI = (positions: number[]): ReusableFeature['mesh'] => ({
  positions: new Float32Array(positions),
  normals: new Float32Array(positions.map(() => 0)),
  indices: new Uint32Array([0, 1, 2]),
});
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const link = (id: string, positions: number[], transform: number[] | undefined = IDENTITY): ReusableFeature => ({
  featureId: id, featureKind: 'solvedAssembly', faces: [], transform, mesh: TRI(positions),
});
const POS = [0, 0, 0, 10, 0, 0, 0, 10, 0];

describe('canReuseLoadedMeshes', () => {
  it('reuses when only transforms changed between frames', () => {
    const moved = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1];
    expect(canReuseLoadedMeshes([link('a', POS)], [link('a', POS, moved)])).toBe(true);
  });

  it('has nothing to reuse before the first load', () => {
    expect(canReuseLoadedMeshes(undefined, [link('a', POS)])).toBe(false);
  });

  it('rejects a changed feature list', () => {
    expect(canReuseLoadedMeshes([link('a', POS)], [link('a', POS), link('b', POS)])).toBe(false);
    expect(canReuseLoadedMeshes([link('a', POS)], [link('z', POS)])).toBe(false);
  });

  it('rejects a changed mesh buffer, even when the transform is the same', () => {
    expect(canReuseLoadedMeshes([link('a', POS)], [link('a', [0, 0, 0, 10, 0, 0, 0, 11, 0])])).toBe(false);
  });

  it('rejects a feature with no transform', () => {
    const untransformed: ReusableFeature = { featureId: 'a', featureKind: 'solvedAssembly', faces: [], mesh: TRI(POS) };
    expect(canReuseLoadedMeshes([link('a', POS)], [untransformed])).toBe(false);
  });

  it('rejects BRep faces', () => {
    const brep: ReusableFeature = { featureId: 'a', featureKind: 'box', faces: [{}], transform: IDENTITY, mesh: TRI(POS) };
    expect(canReuseLoadedMeshes([brep], [brep])).toBe(false);
  });

  it('accepts non-geometry records that stay empty on both sides', () => {
    const record: ReusableFeature = { featureId: 'anim', featureKind: 'animationView', faces: [] };
    expect(canReuseLoadedMeshes([record, link('a', POS)], [record, link('a', POS)])).toBe(true);
  });

  it('rejects a record that gains geometry', () => {
    const record: ReusableFeature = { featureId: 'anim', featureKind: 'animationView', faces: [] };
    expect(canReuseLoadedMeshes([record], [link('anim', POS)])).toBe(false);
  });
});
