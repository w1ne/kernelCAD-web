// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/stepAssemblyExport.ts
//
// Multi-body STEP writer (XCAF document + STEPCAFControl_Writer): one named,
// coloured body per part.
//
// Why not `replicad.exportSTEP`: it registers the raw XSControl_WorkSession
// with its GC FinalizationRegistry AND wraps the same object in a
// Handle_XSControl_WorkSession that is registered too. Whichever finalizer
// runs second frees memory that is already freed (the handle's refcount
// drop deletes the session; the raw `.delete()` deletes it again). The
// raw TDocStd_Document is likewise deleted by a finalizer regardless of the
// handles that reference it. Because finalizers run whenever V8 collects,
// the corruption surfaces later and somewhere else — typically as
// `memory access out of bounds` or `null function or function signature
// mismatch` in the next unrelated OCCT call (seen in CI as the
// usecase-twisted-vase eval failing after the rpi4 enclosure's STEP export).
//
// Ownership rule used here: every Standard_Transient (document, work
// session) is owned by exactly one Handle, and only handles are deleted.
// Value objects (labels, strings, colours, progress) are deleted
// explicitly. Nothing is left to the finalizer.

import { getOC } from 'replicad';
import { makeStepReproducible } from '../../export/stepReproducible';

export interface StepAssemblyPart {
  /** Raw TopoDS_Shape (replicad `shape.wrapped`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shape: any;
  name: string;
  /** `#rrggbb` / `#rgb`; defaults to red like replicad's exporter. */
  color?: string;
}

export interface StepWriteOptions {
  /**
   * Write surface 2D curves (pcurves) alongside the 3D curves. Default true,
   * the interchange-friendly form. `false` is the recovery form: some STEP
   * sources carry a pcurve that OCCT's reader accepts only on the native
   * side, so a re-export that keeps it writes a face other readers reject as
   * unorientable. The 3D curves and surfaces already define the geometry;
   * every STEP reader rebuilds pcurves from them.
   */
  surfaceCurves?: boolean;
}

/** Embind object with an explicit destructor. */
interface Deletable {
  delete(): void;
}

function rgbFromHex(hex: string): [number, number, number] {
  let c = hex.startsWith('#') ? hex.slice(1) : hex;
  if (c.length === 3) c = c.replace(/([0-9a-f])/gi, '$1$1');
  return [0, 1, 2].map((i) => parseInt(c.slice(i * 2, i * 2 + 2), 16) / 255) as [number, number, number];
}

/** Run `fn` with a scope that deletes every tracked value afterwards, in reverse order. */
function withScope<T>(fn: (track: <V extends Deletable>(v: V) => V) => T): T {
  const owned: Deletable[] = [];
  const track = <V extends Deletable>(v: V): V => {
    owned.push(v);
    return v;
  };
  try {
    return fn(track);
  } finally {
    for (let i = owned.length - 1; i >= 0; i--) owned[i].delete();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addParts(oc: any, docHandle: any, parts: readonly StepAssemblyPart[]): void {
  withScope((track) => {
    const main = track(docHandle.get().Main());
    const shapeToolHandle = track(oc.XCAFDoc_DocumentTool.ShapeTool(main));
    const colorToolHandle = track(oc.XCAFDoc_DocumentTool.ColorTool(main));
    const shapeTool = shapeToolHandle.get();
    const colorTool = colorToolHandle.get();
    for (const part of parts) {
      const label = track(shapeTool.NewShape());
      shapeTool.SetShape(label, part.shape);
      const name = track(new oc.TCollection_ExtendedString_2(part.name, true));
      track(oc.TDataStd_Name.Set_1(label, name));
      const [r, g, b] = rgbFromHex(part.color ?? '#f00');
      const color = track(new oc.Quantity_ColorRGBA_5(r, g, b, 1));
      colorTool.SetColor_3(label, color, oc.XCAFDoc_ColorType.XCAFDoc_ColorSurf);
    }
    shapeTool.UpdateAssemblies();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeDocument(oc: any, docHandle: any, filename: string, surfaceCurves: boolean): boolean {
  return withScope((track) => {
    // Order matters on teardown (reverse): writer, then the session handle
    // that frees the session. The raw session is never deleted directly.
    const sessionHandle = track(new oc.Handle_XSControl_WorkSession_2(new oc.XSControl_WorkSession()));
    const writer = track(new oc.STEPCAFControl_Writer_2(sessionHandle, false));
    writer.SetColorMode(true);
    writer.SetLayerMode(true);
    writer.SetNameMode(true);
    // The STEP writer statics are process-global, and replicad's single-shape
    // `blobSTEP()` inherits whatever is set here (it only pins the schema).
    // Restore the pcurve mode so a pcurve-free heal/repair write cannot
    // silently change the next export.
    const previousSurfaceCurves = oc.Interface_Static.IVal('write.surfacecurve.mode');
    oc.Interface_Static.SetIVal('write.surfacecurve.mode', surfaceCurves ? true : 0);
    oc.Interface_Static.SetIVal('write.precision.mode', 0);
    oc.Interface_Static.SetIVal('write.step.assembly', 2);
    oc.Interface_Static.SetIVal('write.step.schema', 5);
    const progress = track(new oc.Message_ProgressRange_1());
    try {
      writer.Transfer_1(docHandle, oc.STEPControl_StepModelType.STEPControl_AsIs, null, progress);
      return writer.Write(filename) === oc.IFSelect_ReturnStatus.IFSelect_RetDone;
    } finally {
      oc.Interface_Static.SetIVal('write.surfacecurve.mode', previousSurfaceCurves);
    }
  });
}

/**
 * Pin the export-order-dependent values (time stamp, auto PRODUCT name index)
 * in STEP bytes OCCT just wrote, so identical input gives identical bytes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reproducibleOcctStep(oc: any, bytes: Uint8Array): Uint8Array {
  return makeStepReproducible(bytes, oc.Interface_Static.CVal('write.step.product.name'));
}

/**
 * Write `parts` as one STEP file with a named, coloured body per part.
 * Output matches `replicad.exportSTEP(shapes)` without unit overrides, except
 * that it is byte-reproducible (see `reproducibleOcctStep`).
 */
export function writeStepAssembly(
  parts: readonly StepAssemblyPart[],
  opts: StepWriteOptions = {},
): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const filename = 'kernelcad-assembly.step';
  return withScope((track) => {
    const format = track(new oc.TCollection_ExtendedString_2('XmlOcaf', true));
    const docHandle = track(new oc.Handle_TDocStd_Document_2(new oc.TDocStd_Document(format)));
    oc.XCAFDoc_ShapeTool.SetAutoNaming(false);
    addParts(oc, docHandle, parts);
    if (!writeDocument(oc, docHandle, filename, opts.surfaceCurves !== false)) throw new Error('WRITE STEP FILE FAILED.');
    const bytes = oc.FS.readFile('/' + filename) as Uint8Array;
    oc.FS.unlink('/' + filename);
    return reproducibleOcctStep(oc, bytes);
  });
}
