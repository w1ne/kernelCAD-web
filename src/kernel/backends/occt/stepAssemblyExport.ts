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

export interface StepAssemblyPart {
  /** Raw TopoDS_Shape (replicad `shape.wrapped`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shape: any;
  name: string;
  /** `#rrggbb` / `#rgb`; defaults to red like replicad's exporter. */
  color?: string;
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
function writeDocument(oc: any, docHandle: any, filename: string): boolean {
  return withScope((track) => {
    // Order matters on teardown (reverse): writer, then the session handle
    // that frees the session. The raw session is never deleted directly.
    const sessionHandle = track(new oc.Handle_XSControl_WorkSession_2(new oc.XSControl_WorkSession()));
    const writer = track(new oc.STEPCAFControl_Writer_2(sessionHandle, false));
    writer.SetColorMode(true);
    writer.SetLayerMode(true);
    writer.SetNameMode(true);
    oc.Interface_Static.SetIVal('write.surfacecurve.mode', true);
    oc.Interface_Static.SetIVal('write.precision.mode', 0);
    oc.Interface_Static.SetIVal('write.step.assembly', 2);
    oc.Interface_Static.SetIVal('write.step.schema', 5);
    const progress = track(new oc.Message_ProgressRange_1());
    writer.Transfer_1(docHandle, oc.STEPControl_StepModelType.STEPControl_AsIs, null, progress);
    return writer.Write(filename) === oc.IFSelect_ReturnStatus.IFSelect_RetDone;
  });
}

/**
 * Write `parts` as one STEP file with a named, coloured body per part.
 * Output matches `replicad.exportSTEP(shapes)` without unit overrides.
 */
export function writeStepAssembly(parts: readonly StepAssemblyPart[]): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const filename = 'kernelcad-assembly.step';
  return withScope((track) => {
    const format = track(new oc.TCollection_ExtendedString_2('XmlOcaf', true));
    const docHandle = track(new oc.Handle_TDocStd_Document_2(new oc.TDocStd_Document(format)));
    oc.XCAFDoc_ShapeTool.SetAutoNaming(false);
    addParts(oc, docHandle, parts);
    if (!writeDocument(oc, docHandle, filename)) throw new Error('WRITE STEP FILE FAILED.');
    const bytes = oc.FS.readFile('/' + filename) as Uint8Array;
    oc.FS.unlink('/' + filename);
    return bytes;
  });
}
