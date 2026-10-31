// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { importStlBytes } from './importStl';
import { makeDrawingCamera, prepareShapeForDrawing, projectShapeForDrawing } from './drawingProjection';
import { MESH_FACET_MIN, recogniseDrawingFeatures } from './drawingFeatures';

beforeAll(async () => {
  await initOcct();
});

describe('prepareShapeForDrawing', () => {
  it('projects small shapes exactly', () => {
    const box = replicad.makeBaseBox(20, 10, 5);
    const source = prepareShapeForDrawing(box);
    try {
      expect(source.mode).toBe('exact');
    } finally {
      source.dispose();
      box.delete();
    }
  });

  it('projects shapes past the face threshold on triangles, without touching the source', () => {
    const body = replicad.makeCylinder(10, 20).fillet(2);
    const exact = projectShapeForDrawing(body, makeDrawingCamera('front'));
    const source = prepareShapeForDrawing(body, { meshMinFaces: 1 });
    try {
      expect(source.mode).toBe('mesh');
      const view = source.project(makeDrawingCamera('front'));
      expect(view.visibleSharp.length + view.visibleOutline.length).toBeGreaterThan(0);
      // The caller's shape still projects exactly as it did before.
      expect(projectShapeForDrawing(body, makeDrawingCamera('front'))).toEqual(exact);
    } finally {
      source.dispose();
      body.delete();
    }
  });

  it('projects mesh-derived parts on triangles', () => {
    const bytes = new Uint8Array(readFileSync('examples/robot-arm/so100/parts/sim/Base_Motor.stl'));
    const imported = importStlBytes(bytes);
    const source = prepareShapeForDrawing(imported.backend.getReplicadShape() as never);
    try {
      expect(source.mode).toBe('mesh');
      const view = source.project(makeDrawingCamera('iso'), { withHidden: false });
      expect(view.visibleSharp.length).toBeGreaterThan(0);
      expect(view.hiddenSharp).toEqual([]);
    } finally {
      source.dispose();
    }
  });
});

describe('recogniseDrawingFeatures on a mesh-derived part', () => {
  it('skips the triangle facets', () => {
    const bytes = new Uint8Array(readFileSync('examples/robot-arm/so100/parts/sim/Base_Motor.stl'));
    const imported = importStlBytes(bytes);
    expect(imported.triangleCount).toBeGreaterThan(MESH_FACET_MIN);
    const model = recogniseDrawingFeatures(imported.backend);
    expect(model.meshFacetsSkipped).toBe(imported.triangleCount);
    expect(model.planar).toEqual([]);
    expect(model.chamfers).toEqual([]);
  });

  it('leaves ordinary bodies alone', () => {
    const model = recogniseDrawingFeatures(OcctBackend.box(20, 10, 5));
    expect(model.meshFacetsSkipped).toBeUndefined();
    expect(model.planar).toHaveLength(6);
  });
});
