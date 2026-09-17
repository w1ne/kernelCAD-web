// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureKind } from '../../../../shared/intent/types';
import type { KindLowerer } from './context';
import {
  lowerAssemblyConnect,
  lowerAssemblyExport,
  lowerAssemblyJoint,
  lowerAssemblyModel,
  lowerAssemblyPart,
  lowerSolvedAssembly,
} from './assembly';
import { lowerBoolean } from './boolean';
import { lowerCurve3d, lowerEmbossText, lowerProjectCurve, lowerVariableSweep } from './curves';
import { lowerChamfer, lowerFillet } from './edgeFeatures';
import { lowerCutout, lowerHole, lowerHoles } from './holes';
import { lowerImported, lowerSdfMaterialize } from './imported';
import { lowerLoft } from './loft';
import { lowerMirror, lowerPattern } from './mirrorPattern';
import { lowerBox, lowerCylinder, lowerSphere } from './primitives';
import { lowerRevolve } from './revolve';
import { lowerSheetMetal, lowerSheetMetalBend } from './sheetMetal';
import { lowerDraft, lowerShell } from './shellDraft';
import { lowerExtrude, lowerSketch } from './sketchExtrude';
import { lowerSurfaceSew, lowerSurfaceThicken, lowerSurfaceToShape } from './surfaces';
import { lowerSweep } from './sweep';
import { lowerVirtualRecord } from './virtual';

/**
 * Every feature kind `OcctLowerer` can lower, and the function that does it.
 *
 * This table IS the supported set — `OcctLowerer.supports` is derived from its
 * keys, so a kind can never be advertised without a lowerer or lowered without
 * being advertised. The `Partial<Record<FeatureKind, …>>` annotation keeps the
 * keys inside `FeatureKind` and the values shaped like `KindLowerer`, and makes
 * a lookup yield `KindLowerer | undefined`: kinds absent here fall through to
 * the unsupported-kind diagnostic in `lower()`.
 */
export const LOWERERS: Partial<Record<FeatureKind, KindLowerer>> = {
  // primitives
  box: lowerBox,
  cylinder: lowerCylinder,
  sphere: lowerSphere,
  // imports + materialised implicit geometry
  importedStep: lowerImported,
  importedBrep: lowerImported,
  importedStl: lowerImported,
  sdfMaterialize: lowerSdfMaterialize,
  // 2D to 3D
  sketch: lowerSketch,
  extrude: lowerExtrude,
  revolve: lowerRevolve,
  sweep: lowerSweep,
  loft: lowerLoft,
  // booleans and edge/face features
  boolean: lowerBoolean,
  fillet: lowerFillet,
  chamfer: lowerChamfer,
  shell: lowerShell,
  draft: lowerDraft,
  hole: lowerHole,
  holes: lowerHoles,
  cutout: lowerCutout,
  // symmetry and instancing
  mirror: lowerMirror,
  pattern: lowerPattern,
  // sheet metal
  sheetMetal: lowerSheetMetal,
  sheetMetalBend: lowerSheetMetalBend,
  // assemblies
  assemblyPart: lowerAssemblyPart,
  assemblyJoint: lowerAssemblyJoint,
  assemblyConnect: lowerAssemblyConnect,
  assemblyModel: lowerAssemblyModel,
  solvedAssembly: lowerSolvedAssembly,
  assemblyExport: lowerAssemblyExport,
  // NURBS surfaces
  surfaceThicken: lowerSurfaceThicken,
  surfaceToShape: lowerSurfaceToShape,
  surfaceSew: lowerSurfaceSew,
  // curves and face authoring
  curve3d: lowerCurve3d,
  variableSweep: lowerVariableSweep,
  embossText: lowerEmbossText,
  projectCurve: lowerProjectCurve,
  // capture-only declarations — no BREP output
  referenceImage: lowerVirtualRecord,
  renderEnvironment: lowerVirtualRecord,
  cameraTarget: lowerVirtualRecord,
  dfmSpec: lowerVirtualRecord,
  feaStudy: lowerVirtualRecord,
  drawingDatum: lowerVirtualRecord,
  drawingTolerance: lowerVirtualRecord,
};
