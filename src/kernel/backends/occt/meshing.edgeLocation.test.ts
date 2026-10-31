// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: BREP edge lines must sit on their shaded faces when the shape's
// sub-shapes carry a non-identity TopLoc_Location (STEP imports placed by an
// assembly transform, then moved by translate/rotate). replicad's meshEdges
// dropped the face location, so Studio drew "ghost" edge clusters of imported
// SG90 servo horns tens of mm away from the horns themselves.
import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct } from './occtBackend';
import { meshShape, FINE_MESH_OPTIONS } from './meshing';

beforeAll(async () => {
  await initOcct();
});

function bounds(points: ArrayLike<number>): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < points.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, points[i + k]!);
      max[k] = Math.max(max[k]!, points[i + k]!);
    }
  }
  return { min, max };
}

/** A cylinder whose solid sits inside a compound under a located placement —
 *  the topology shape of a STEP assembly import — then moved again. */
function locatedCylinder(): replicad.AnyShape {
  const oc = getOC() as any;
  const trsf = new oc.gp_Trsf_1();
  trsf.SetTranslation_1(new oc.gp_Vec_4(27, 36, 26));
  const loc = new oc.TopLoc_Location_2(trsf);
  const solid = replicad.makeCylinder(4, 5);
  const placed = solid.wrapped.Moved(loc, false);
  const builder = new oc.TopoDS_Builder();
  const compound = new oc.TopoDS_Compound();
  builder.MakeCompound(compound);
  builder.Add(compound, placed);
  const shape = replicad.cast(compound) as replicad.AnyShape;
  return shape.translate([-27, -36, -26]).rotate(180, [0, 0, 0], [1, 0, 0]).translate([50, 30, 40]);
}

describe('meshShape edges on located sub-shapes', () => {
  it('puts every edge vertex on the shaded body', () => {
    const mesh = meshShape(locatedCylinder(), FINE_MESH_OPTIONS)!;
    const facePoints = mesh.faces.flatMap((f) => Array.from(f.vertices));
    const faceBox = bounds(facePoints);
    expect(mesh.edges?.length).toBeGreaterThan(0);
    const edgeBox = bounds(mesh.edges!);
    for (let k = 0; k < 3; k++) {
      expect(edgeBox.min[k]).toBeCloseTo(faceBox.min[k]!, 3);
      expect(edgeBox.max[k]).toBeCloseTo(faceBox.max[k]!, 3);
    }
    // Sanity: the body really is where the transforms put it (r=4, h=5, flipped).
    expect(faceBox.min[2]).toBeCloseTo(35, 3);
    expect(faceBox.max[2]).toBeCloseTo(40, 3);
  });

  it('keeps one edge range per BREP edge, matching the old grouping on plain shapes', () => {
    const box = replicad.makeBaseBox(10, 20, 30);
    const mesh = meshShape(box, FINE_MESH_OPTIONS)!;
    const legacy = box.meshEdges(FINE_MESH_OPTIONS);
    expect(Array.from(mesh.edges!)).toEqual(legacy.lines);
    expect(mesh.edgeRanges!.length / 2).toBe(12);
  });
});
