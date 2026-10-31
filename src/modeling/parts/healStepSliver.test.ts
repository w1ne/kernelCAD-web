// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepSliver.test.ts
//
// Detection and safety cover for the micro-sliver import heal. The trigger
// case, CADGenBench 250's two-edge toroidal sliver, is external data; it is
// pinned by healStep.250.fixtures.test.ts when KCAD_CADGENBENCH_DATA is set.
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { SLIVER_MAX_PERIMETER_MM, removeSliverFaces, sliverFaces } from './healStepSliver';
import type { OcctHealApi } from './healStepOcct';

beforeAll(async () => { await initOcct(); }, 60000);

const oc = () => getOC() as unknown as OcctHealApi;

function tetra(p: Array<[number, number, number]>): replicad.Shape3D {
  const [a, b, c, d] = p;
  const faces = [[a, c, b], [a, b, d], [a, d, c], [b, c, d]].map((pts) => replicad.makePolygon(pts));
  return replicad.makeSolid(faces) as unknown as replicad.Shape3D;
}

/** A 10 mm box with its top corner clipped by a tetrahedron of edge `s`. */
function clippedBox(s: number): replicad.Shape3D {
  const box = replicad.makeBox([0, 0, 0], [10, 10, 10]);
  const corner = tetra([[10, 10, 10], [10 - s, 10, 10], [10, 10 - s, 10], [10, 10, 10 - s]]);
  return box.cut(corner) as replicad.Shape3D;
}

describe('sliverFaces', () => {
  it('finds nothing on a healthy box', () => {
    expect(sliverFaces(oc(), replicad.makeBox([0, 0, 0], [10, 10, 10]).wrapped)).toEqual([]);
  });

  it('finds a face whose edges sum under the threshold, and only that face', () => {
    const shape = clippedBox(0.01);
    const found = sliverFaces(oc(), shape.wrapped);
    expect(found).toHaveLength(1);
    expect(found[0].perimeter).toBeLessThanOrEqual(SLIVER_MAX_PERIMETER_MM);
  });

  it('keeps a small but real chamfer face', () => {
    expect(sliverFaces(oc(), clippedBox(1).wrapped)).toEqual([]);
  });
});

describe('removeSliverFaces', () => {
  it('leaves a body without slivers alone', () => {
    expect(removeSliverFaces(replicad.makeBox([0, 0, 0], [10, 10, 10]))).toBeUndefined();
  });

  it('drops a micro corner face and sews the hole shut without moving the body', () => {
    const shape = clippedBox(0.01);
    const out = removeSliverFaces(shape);
    expect(out).toBeDefined();
    expect(out!.faces.length).toBe(shape.faces.length - 1);
    expect(sliverFaces(oc(), out!.wrapped)).toEqual([]);
    const props = new (oc().GProp_GProps_1)();
    oc().BRepGProp.VolumeProperties_1(out!.wrapped, props, true, false, false);
    expect(props.Mass()).toBeCloseTo(1000, 3);
    props.delete();
  });

  it('refuses a multi-solid input', () => {
    const two = replicad.makeCompound([
      clippedBox(0.01),
      replicad.makeBox([20, 0, 0], [30, 10, 10]),
    ]) as unknown as replicad.Shape3D;
    expect(removeSliverFaces(two)).toBeUndefined();
  });
});
