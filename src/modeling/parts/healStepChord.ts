// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepChord.ts
//
// Planar bow-tie repair for the STEP import heal: split an invalid planar
// face along a chord between two of its wire vertices, then sew the face list
// back into a solid.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

import {
  boundsOf,
  debug,
  distanceSq,
  edgesOf,
  isValid,
  sampleEdge,
  type OcctHealApi,
  type Vec3,
} from './healStepOcct';

/**
 * Order the face edges into a single closed chain by shared endpoints.
 *
 * `TopExp_Explorer` does not guarantee traversal order — on the bow-tie face
 * used by the 202 fixture it lists e0,e1,e2,e3,e4 while the actual loop is
 * e0,e4,e3,e2,e1. Walking by shared endpoints recovers the wire order, and the
 * edge is reversed when the chain needs it.
 */
function wireChain(
  oc: OcctHealApi,
  face: any,
): { edges: any[]; vertices: Vec3[] } | null {
  const edges = edgesOf(oc, face);
  if (edges.length < 3) return null;
  const ends = edges.map((edge) => sampleEdge(oc, edge, 2));
  const used = new Array<boolean>(edges.length).fill(false);
  const chainEdges: any[] = [edges[0]];
  const vertices: Vec3[] = [ends[0][0]];
  let current = ends[0][1];
  used[0] = true;

  for (let step = 1; step < edges.length; step++) {
    let found = -1;
    let reverse = false;
    let best = 1e-10;
    for (let k = 1; k < edges.length; k++) {
      if (used[k]) continue;
      const startDistance = distanceSq(ends[k][0], current);
      const endDistance = distanceSq(ends[k][1], current);
      if (startDistance <= best) {
        best = startDistance;
        found = k;
        reverse = false;
      }
      if (endDistance <= best) {
        best = endDistance;
        found = k;
        reverse = true;
      }
    }
    if (found < 0) return null;
    used[found] = true;
    vertices.push(current);
    const [start, end] = ends[found];
    chainEdges.push(reverse ? oc.TopoDS.Edge_1(edges[found].Reversed()) : edges[found]);
    current = reverse ? start : end;
  }

  debug('wire close', { edges: edges.length, gap: distanceSq(current, vertices[0]) });
  if (distanceSq(current, vertices[0]) > 1e-6) return null;
  return { edges: chainEdges, vertices };
}

function makeEdge(oc: OcctHealApi, from: Vec3, to: Vec3): any | null {
  const maker = new oc.BRepBuilderAPI_MakeEdge_3(
    new oc.gp_Pnt_3(from[0], from[1], from[2]),
    new oc.gp_Pnt_3(to[0], to[1], to[2]),
  );
  try {
    return maker.IsDone() ? maker.Edge() : null;
  } finally {
    maker.delete();
  }
}

function makeWire(oc: OcctHealApi, edges: any[]): any | null {
  const maker = new oc.BRepBuilderAPI_MakeWire_1();
  try {
    for (const edge of edges) maker.Add_1(edge);
    return maker.IsDone() ? maker.Wire() : null;
  } finally {
    maker.delete();
  }
}

function makeFace(oc: OcctHealApi, wire: any): any | null {
  const maker = new oc.BRepBuilderAPI_MakeFace_15(wire, true);
  try {
    return maker.IsDone() ? maker.Face() : null;
  } finally {
    maker.delete();
  }
}

/**
 * Split a planar bow-tie face along the first chord whose two halves are both
 * valid and whose areas add up to the original face area.
 */
export function chordRepair(oc: OcctHealApi, face: any): any[] | null {
  const faceBounds = boundsOf(oc, face);
  const chain = wireChain(oc, face);
  if (!chain) return null;
  const { edges, vertices } = chain;
  const count = edges.length;
  const within = (candidate: any): boolean => {
    const bounds = boundsOf(oc, candidate);
    return (
      bounds.lo[0] >= faceBounds.lo[0] - 1e-3 &&
      bounds.lo[1] >= faceBounds.lo[1] - 1e-3 &&
      bounds.lo[2] >= faceBounds.lo[2] - 1e-3 &&
      bounds.hi[0] <= faceBounds.hi[0] + 1e-3 &&
      bounds.hi[1] <= faceBounds.hi[1] + 1e-3 &&
      bounds.hi[2] <= faceBounds.hi[2] + 1e-3
    );
  };
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      if (i === 0 && j === count - 1) continue;
      const chord = makeEdge(oc, vertices[j], vertices[i]);
      if (!chord) continue;
      const chordReversed = oc.TopoDS.Edge_1(chord.Reversed());
      const firstWire = makeWire(oc, [
        ...edges.slice(i, j),
        chord,
      ]);
      const secondWire = makeWire(oc, [
        ...edges.slice(j),
        ...edges.slice(0, i),
        chordReversed,
      ]);
      if (!firstWire || !secondWire) continue;
      const first = makeFace(oc, firstWire);
      const second = makeFace(oc, secondWire);
      if (!first || !second) continue;
      const firstValid = isValid(oc, first);
      const secondValid = isValid(oc, second);
      debug('chord pair', i, j, { firstValid, secondValid });
      if (!firstValid || !secondValid) continue;
      // A bow-tie face reports a signed area, so the halves do not add up to
      // the original. The chord must simply stay inside the face's extent.
      if (within(first) && within(second)) return [first, second];
    }
  }
  return null;
}

/** Sew a face list back into a solid. */
export function buildSolid(oc: OcctHealApi, faces: any[]): any | null {
  const builder = new oc.TopoDS_Builder();
  const shell = new oc.TopoDS_Shell();
  builder.MakeShell(shell);
  for (const face of faces) builder.Add(shell, face);
  shell.Closed_2(true);

  const sewing = new oc.BRepBuilderAPI_Sewing(1e-6, true, true, true, false);
  try {
    sewing.SetSameParameterMode(false);
    sewing.Add(shell);
    sewing.Perform(new oc.Message_ProgressRange_1());
    const sewn = sewing.SewedShape();
    const outer = oc.TopoDS.Shell_1(sewn);
    const solid = new oc.TopoDS_Solid();
    builder.MakeSolid(solid);
    builder.Add(solid, outer);
    return isValid(oc, solid) ? solid : null;
  } finally {
    sewing.delete();
  }
}
