// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Turn a parasolid-core face model into an OCCT solid. Planar loops are sewn.
// Any other surface kind is reported and not approximated.

import * as replicad from 'replicad';
import { getOC, initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ParasolidFace, ParasolidRead } from './native';

const TO_MM: Record<'m' | 'cm' | 'mm' | 'in' | 'ft', number> = {
  m: 1000,
  cm: 10,
  mm: 1,
  in: 25.4,
  ft: 304.8,
};

/** Build one solid from planar Parasolid faces. Coordinates are scaled into millimetres. */
export async function solidFromParasolid(
  model: ParasolidRead,
  sourceUnit: 'm' | 'cm' | 'mm' | 'in' | 'ft',
): Promise<OcctBackend> {
  const faces = model.faces ?? [];
  const foreign = [...new Set(faces.map((face) => face.kind).filter((kind) => kind !== 'plane'))];
  if (foreign.length > 0) {
    throw new Error(
      `parasolid import: surface kinds ${foreign.join(', ')} are read but not built into a solid yet`,
    );
  }
  const usable = faces.filter((face) => face.loops.some((loop) => loop.length >= 3));
  if (usable.length === 0) {
    throw new Error('parasolid import: the file has no planar face loops to build');
  }
  await initOcct();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const scale = TO_MM[sourceUnit];
  const sewing = new oc.BRepBuilderAPI_Sewing(1e-3, true, true, true, false);
  for (const face of usable) {
    addFace(oc, sewing, face, scale);
  }
  sewing.Perform(new oc.Message_ProgressRange_1());
  const sewed = sewing.SewedShape();
  sewing.delete?.();
  const shapeTypeRaw = sewed.ShapeType();
  const shapeType = typeof shapeTypeRaw === 'object' && shapeTypeRaw !== null
    ? (shapeTypeRaw as { value?: number }).value ?? shapeTypeRaw
    : shapeTypeRaw;
  if (shapeType !== 3) {
    throw new Error(`parasolid import: sewing produced shape type ${String(shapeType)} (expected a closed shell)`);
  }
  const shell = oc.TopoDS.Shell_1(sewed);
  const makeSolid = new oc.BRepBuilderAPI_MakeSolid_3(shell);
  if (!makeSolid.IsDone()) {
    makeSolid.delete?.();
    throw new Error('parasolid import: the sewn shell is not a closed solid');
  }
  const solid = makeSolid.Solid();
  makeSolid.delete?.();
  return new OcctBackend(replicad.cast(solid) as never);
}

function addFace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sewing: any,
  face: ParasolidFace,
  scale: number,
): void {
  const wires = face.loops.filter((loop) => loop.length >= 3).map((loop) => wireFromLoop(oc, loop, scale));
  const outer = wires[0];
  if (!outer) return;
  const maker = new oc.BRepBuilderAPI_MakeFace_15(outer, true);
  for (const inner of wires.slice(1)) maker.Add(inner);
  if (maker.IsDone()) sewing.Add(maker.Face());
  maker.delete?.();
}

function wireFromLoop(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  loop: number[][],
  scale: number,
): unknown {
  const wire = new oc.BRepBuilderAPI_MakeWire_1();
  const point = (xyz: number[]) => new oc.gp_Pnt_3(xyz[0] * scale, xyz[1] * scale, xyz[2] * scale);
  for (let i = 0; i < loop.length; i++) {
    const a = point(loop[i]);
    const b = point(loop[(i + 1) % loop.length]);
    const edge = new oc.BRepBuilderAPI_MakeEdge_3(a, b);
    if (edge.IsDone()) wire.Add_1(edge.Edge());
    a.delete?.();
    b.delete?.();
    edge.delete?.();
  }
  const built = wire.Wire();
  wire.delete?.();
  return built;
}
