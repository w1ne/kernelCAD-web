// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepSliver.ts
//
// Import-time removal of micro sliver faces from a STEP solid.
//
// Some STEP sources carry a face far smaller than any meshing deflection: a
// fillet run-out that the writing system trimmed to a two-edge strip a few
// hundredths of a millimetre long. CADGenBench 250's input has one: a toroidal
// face bounded by two 0.0188 mm edges that share both vertices, one edge on a
// cylinder and one on a plane. The B-rep is BRepCheck-valid, but any mesher
// discretises both edges as the same straight segment, so that mesh edge is
// used by four triangles (the sliver's two plus one from each neighbour). A
// strict manifold gate rejects the file, and every edit inherits the defect.
//
// The repair drops each micro face (total edge length at most
// `SLIVER_MAX_PERIMETER_MM`), then sews the remaining faces with a tolerance
// that closes a gap of the sliver's size, which merges the two neighbours'
// edges into one shared edge. The result replaces the import only when it is
// one closed, BRepCheck-valid solid with the same solid count, exactly the
// dropped faces fewer, and the same volume (relative `SLIVER_VOLUME_TOL`).
// Anything else, including any OCCT throw, returns undefined and the import is
// kept as parsed.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

import * as replicad from 'replicad';
import { getOC } from 'replicad';

import { debug, facesOf, isValid, type OcctHealApi } from './healStepOcct';

/** A face whose edges sum to at most this is below every meshing deflection
 *  the exporters and gates use, so it carries no shape a mesh can show. */
export const SLIVER_MAX_PERIMETER_MM = 0.1;

/** Volume change accepted across the repair. Dropping a micro face moves at
 *  most a sliver of material; this rejects a sew that changed the body. */
export const SLIVER_VOLUME_TOL = 1e-5;

/** Faces dropped in one repair. Beyond this the import is not a stray sliver
 *  but a tessellated or damaged body, which this repair is not for. */
const MAX_SLIVERS = 8;

function perimeterOf(oc: OcctHealApi, face: any): number {
  const props = new oc.GProp_GProps_1();
  try {
    oc.BRepGProp.LinearProperties(face, props, false, false);
    return props.Mass();
  } finally {
    props.delete();
  }
}

function volumeOf(oc: OcctHealApi, shape: any): number {
  const props = new oc.GProp_GProps_1();
  try {
    oc.BRepGProp.VolumeProperties_1(shape, props, true, false, false);
    return props.Mass();
  } finally {
    props.delete();
  }
}

function countOf(oc: OcctHealApi, shape: any, kind: string): number {
  const explorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum[kind], oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let n = 0;
  try {
    while (explorer.More()) {
      n++;
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return n;
}

/** Indices (into `facesOf`) and perimeters of the micro faces of `shape`. */
export function sliverFaces(oc: OcctHealApi, shape: any): Array<{ index: number; perimeter: number }> {
  const out: Array<{ index: number; perimeter: number }> = [];
  facesOf(oc, shape).forEach((face, index) => {
    const perimeter = perimeterOf(oc, face);
    if (perimeter > 0 && perimeter <= SLIVER_MAX_PERIMETER_MM) out.push({ index, perimeter });
  });
  return out;
}

/**
 * Drop the micro sliver faces of a single-solid import and sew the gap shut.
 * Returns the repaired solid, or undefined when there is nothing to drop or
 * the repaired body is not a valid, volume-identical replacement.
 */
export function removeSliverFaces(shape: replicad.Shape3D): replicad.Shape3D | undefined {
  let oc: OcctHealApi;
  try {
    oc = getOC() as unknown as OcctHealApi;
  } catch {
    return undefined;
  }
  if (typeof oc?.BRepBuilderAPI_Sewing !== 'function' || typeof oc?.BRepGProp?.LinearProperties !== 'function') {
    return undefined;
  }
  try {
    const repaired = dropSlivers(oc, (shape as any).wrapped);
    return repaired ? (new replicad.Solid(repaired) as unknown as replicad.Shape3D) : undefined;
  } catch (error) {
    debug('sliver repair threw', error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

function dropSlivers(oc: OcctHealApi, wrapped: any): any | null {
  if (countOf(oc, wrapped, 'TopAbs_SOLID') !== 1) return null;
  const slivers = sliverFaces(oc, wrapped);
  if (slivers.length === 0 || slivers.length > MAX_SLIVERS) return null;
  const faces = facesOf(oc, wrapped);
  const drop = new Set(slivers.map((s) => s.index));
  // The gap left by a dropped face is narrower than its perimeter; sew at
  // that size so the neighbours' edges merge, and no coarser.
  const tolerance = Math.max(...slivers.map((s) => s.perimeter));
  const repaired = sewSolid(oc, faces.filter((_, i) => !drop.has(i)), tolerance);
  if (!repaired || countOf(oc, repaired, 'TopAbs_FACE') !== faces.length - drop.size) return null;
  const before = volumeOf(oc, wrapped);
  const after = volumeOf(oc, repaired);
  if (!(after > 0) || Math.abs(after - before) > SLIVER_VOLUME_TOL * Math.max(1, Math.abs(before))) {
    debug('sliver repair changed volume', before, after);
    return null;
  }
  debug('dropped sliver faces', slivers);
  return repaired;
}

function sewSolid(oc: OcctHealApi, faces: any[], tolerance: number): any | null {
  const sewing = new oc.BRepBuilderAPI_Sewing(tolerance, true, true, true, false);
  try {
    for (const face of faces) sewing.Add(face);
    sewing.Perform(new oc.Message_ProgressRange_1());
    if (sewing.NbFreeEdges() !== 0 || sewing.NbMultipleEdges() !== 0) return null;
    const sewn = sewing.SewedShape();
    if (countOf(oc, sewn, 'TopAbs_SHELL') !== 1) return null;
    const shell = oc.TopoDS.Shell_1(
      sewn.ShapeType() === oc.TopAbs_ShapeEnum.TopAbs_SHELL ? sewn : firstShell(oc, sewn),
    );
    const maker = new oc.BRepBuilderAPI_MakeSolid_3(shell);
    try {
      const fixer = new oc.ShapeFix_Solid_2(maker.Solid());
      try {
        fixer.Perform(new oc.Message_ProgressRange_1());
        const solid = fixer.Solid();
        return isValid(oc, solid) ? solid : null;
      } finally {
        fixer.delete();
      }
    } finally {
      maker.delete();
    }
  } finally {
    sewing.delete();
  }
}

function firstShell(oc: OcctHealApi, shape: any): any {
  const explorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_SHELL, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    return explorer.Current();
  } finally {
    explorer.delete();
  }
}
