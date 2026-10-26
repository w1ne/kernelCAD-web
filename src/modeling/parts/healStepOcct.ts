// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepOcct.ts
//
// OCCT topology/geometry helpers shared by the STEP import heal
// (`healStep.ts`). Thin wrappers over the dynamically typed opencascade.js
// bindings; every allocation is released before returning.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

export type Vec3 = [number, number, number];

export interface Bounds {
  lo: Vec3;
  hi: Vec3;
}

export function debug(...args: unknown[]): void {
  if ((globalThis as { __KCAD_HEAL_DEBUG__?: boolean }).__KCAD_HEAL_DEBUG__) {
    console.log('[heal]', ...args);
  }
}

export type OcctHealApi = {
  BRepCheck_Analyzer: new (shape: unknown, geomControls: boolean, checkSubShape: boolean) => {
    IsValid_2(): boolean;
    delete(): void;
  };
  ShapeUpgrade_UnifySameDomain_2: new (
    shape: unknown,
    unifyEdges: boolean,
    unifyFaces: boolean,
    concatBSplines: boolean,
  ) => {
    Build(): void;
    Shape(): unknown;
    delete(): void;
  };
} & Record<string, any>;

export function facesOf(oc: OcctHealApi, shape: any): any[] {
  const out: any[] = [];
  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      out.push(oc.TopoDS.Face_1(explorer.Current()));
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

export function edgesOf(oc: OcctHealApi, face: any): any[] {
  const out: any[] = [];
  const explorer = new oc.TopExp_Explorer_2(
    face,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      out.push(oc.TopoDS.Edge_1(explorer.Current()));
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

export function isValid(oc: OcctHealApi, shape: any): boolean {
  const analyzer = new oc.BRepCheck_Analyzer(shape, true, true);
  try {
    return analyzer.IsValid_2();
  } finally {
    analyzer.delete();
  }
}

export function isPlanar(oc: OcctHealApi, face: any): boolean {
  const adapter = new oc.BRepAdaptor_Surface_2(face, true);
  try {
    const type = adapter.GetType();
    const plane = oc.GeomAbs_SurfaceType?.GeomAbs_Plane;
    if (!plane) return false;
    return type === plane || type?.value === plane?.value;
  } finally {
    adapter.delete();
  }
}

export function boundsOf(oc: OcctHealApi, shape: any): Bounds {
  const box = new oc.Bnd_Box_1();
  oc.BRepBndLib.Add(shape, box, false);
  const min = box.CornerMin();
  const max = box.CornerMax();
  const out: Bounds = {
    lo: [min.X(), min.Y(), min.Z()],
    hi: [max.X(), max.Y(), max.Z()],
  };
  box.delete();
  return out;
}

export function areaOf(oc: OcctHealApi, face: any): number {
  const props = new oc.GProp_GProps_1();
  try {
    oc.BRepGProp.SurfaceProperties_1(face, props, false, false);
    return props.Mass();
  } finally {
    props.delete();
  }
}

export function isReversedOrientation(oc: OcctHealApi, edge: any): boolean {
  const orientation =
    typeof edge.Orientation === 'function'
      ? edge.Orientation()
      : typeof edge.Orientation_1 === 'function'
        ? edge.Orientation_1()
        : edge.Orientation;
  const reversed = oc.TopAbs_Orientation?.TopAbs_REVERSED;
  if (reversed !== undefined) {
    return orientation === reversed || orientation?.value === reversed?.value;
  }
  // TopAbs_FORWARD=0, TopAbs_REVERSED=1, TopAbs_INTERNAL=2, TopAbs_EXTERNAL=3.
  return orientation?.value === 1;
}

/**
 * Sample an edge in wire traversal order. `BRepAdaptor_Curve` always walks the
 * underlying curve, so a REVERSED edge is flipped to match the wire.
 */
export function sampleEdge(oc: OcctHealApi, edge: any, count: number): Vec3[] {
  const curve = new oc.BRepAdaptor_Curve_2(edge);
  try {
    const first = curve.FirstParameter();
    const last = curve.LastParameter();
    const out: Vec3[] = [];
    const span = last - first;
    for (let i = 0; i < count; i++) {
      const point = curve.Value(first + (span * i) / (count - 1));
      out.push([point.X(), point.Y(), point.Z()]);
    }
    if (isReversedOrientation(oc, edge)) out.reverse();
    return out;
  } finally {
    curve.delete();
  }
}

export function distanceSq(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

export function pointsBounds(points: Vec3[]): Bounds {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < lo[k]) lo[k] = p[k];
      if (p[k] > hi[k]) hi[k] = p[k];
    }
  }
  return { lo, hi };
}

export function cutBox(oc: OcctHealApi, shape: any, box: Bounds): any | null {
  let tool: any | null = null;
  try {
    const from = new oc.gp_Pnt_3(box.lo[0], box.lo[1], box.lo[2]);
    const to = new oc.gp_Pnt_3(box.hi[0], box.hi[1], box.hi[2]);
    tool = new oc.BRepPrimAPI_MakeBox_4(from, to).Shape();
    const cut = new oc.BRepAlgoAPI_Cut_3(shape, tool, new oc.Message_ProgressRange_1());
    try {
      if (!cut.IsDone()) return null;
      const result = cut.Shape();
      if (!result || result.IsNull()) return null;
      if (facesOf(oc, result).length === 0) return null;
      return result;
    } finally {
      cut.delete();
    }
  } catch {
    return null;
  } finally {
    tool?.delete?.();
  }
}
