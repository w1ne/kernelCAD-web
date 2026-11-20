// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/stepAssemblyExport.ts
//
// STEP writer (XCAF document + STEPCAFControl_Writer): one named body per
// part, or a product tree (one product per distinct part with one placed
// instance per use) when a part is repeated. A single body without an
// assembly tree is written the same way (`writeStepBody`). A colour is
// written only for a part that has one.
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
import { linearRgbFromHex } from './stepColour';

export interface StepAssemblyPart {
  /** Raw TopoDS_Shape (replicad `shape.wrapped`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shape: any;
  name: string;
  /** `#rrggbb` / `#rgb`. Without it the part is written with no colour. */
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

/** One placed use of a {@link StepAssemblyProduct}. */
export interface StepAssemblyInstance {
  name: string;
  /** Column-major rigid 4x4 placing the product's local-frame shape. */
  transform: readonly number[];
}

/** A distinct part: local-frame geometry written once, placed per instance. */
export interface StepAssemblyProduct {
  /** Raw local-frame TopoDS_Shape (replicad `shape.wrapped`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shape: any;
  name: string;
  /** `#rrggbb` / `#rgb`. Without it the product is written with no colour. */
  color?: string;
  instances: readonly StepAssemblyInstance[];
}

/** A placed part before grouping. */
export interface StepPlacedPart {
  /** Identity of the shared source geometry; undefined for a one-off part. */
  sourceId?: string;
  name: string;
  color?: string;
}

/**
 * Group placed parts into products. Parts share a product when they place the
 * same source geometry with the same colour; a colour difference keeps them
 * apart so no instance loses its colour. Order follows first use.
 */
export function groupStepProducts<P extends StepPlacedPart>(parts: readonly P[]): P[][] {
  const byKey = new Map<string, P[]>();
  const groups: P[][] = [];
  for (const part of parts) {
    const key = part.sourceId === undefined ? undefined : JSON.stringify([part.sourceId, (part.color ?? '').toLowerCase()]);
    let group = key === undefined ? undefined : byKey.get(key);
    if (group === undefined) {
      group = [];
      groups.push(group);
      if (key !== undefined) byKey.set(key, group);
    }
    group.push(part);
  }
  return groups;
}

/** Embind object with an explicit destructor. */
interface Deletable {
  delete(): void;
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
function setColour(oc: any, track: <V extends Deletable>(v: V) => V, colorTool: any, label: any, hex: string | undefined): void {
  // No colour stays no colour: a default here would put a colour in the file
  // that the author never set, and a re-import would return it as theirs.
  if (hex === undefined) return;
  const [r, g, b] = linearRgbFromHex(hex);
  const color = track(new oc.Quantity_ColorRGBA_5(r, g, b, 1));
  colorTool.SetColor_3(label, color, oc.XCAFDoc_ColorType.XCAFDoc_ColorSurf);
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
      setColour(oc, track, colorTool, label, part.color);
    }
    shapeTool.UpdateAssemblies();
  });
}

const RIGID_TOLERANCE = 1e-9;

function assertRigid(m: readonly number[], instanceName: string): void {
  const col = (c: number): [number, number, number] => [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]];
  const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const [x, y, z] = [col(0), col(1), col(2)];
  const det = dot(x, [y[1] * z[2] - y[2] * z[1], y[2] * z[0] - y[0] * z[2], y[0] * z[1] - y[1] * z[0]]);
  const orthonormal = [dot(x, x) - 1, dot(y, y) - 1, dot(z, z) - 1, dot(x, y), dot(x, z), dot(y, z), det - 1]
    .every((residual) => Math.abs(residual) <= RIGID_TOLERANCE);
  if (m.length !== 16 || !m.every(Number.isFinite) || !orthonormal) {
    throw new Error(`STEP instance '${instanceName}' has a placement that is not a rigid transform.`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setName(oc: any, track: <V extends Deletable>(v: V) => V, label: any, value: string): void {
  const name = track(new oc.TCollection_ExtendedString_2(value, true));
  track(oc.TDataStd_Name.Set_1(label, name));
}

function addProductTree(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docHandle: any,
  assemblyName: string,
  products: readonly StepAssemblyProduct[],
): void {
  withScope((track) => {
    const main = track(docHandle.get().Main());
    const shapeToolHandle = track(oc.XCAFDoc_DocumentTool.ShapeTool(main));
    const colorToolHandle = track(oc.XCAFDoc_DocumentTool.ColorTool(main));
    const shapeTool = shapeToolHandle.get();
    const colorTool = colorToolHandle.get();
    const root = track(shapeTool.NewShape());
    setName(oc, track, root, assemblyName);
    for (const product of products) {
      const label = track(shapeTool.NewShape());
      shapeTool.SetShape(label, product.shape);
      setName(oc, track, label, product.name);
      setColour(oc, track, colorTool, label, product.color);
      for (const instance of product.instances) {
        const m = instance.transform;
        assertRigid(m, instance.name);
        const trsf = track(new oc.gp_Trsf_1());
        trsf.SetValues(m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14]);
        const location = track(new oc.TopLoc_Location_2(trsf));
        const component = track(shapeTool.AddComponent_1(root, label, location));
        setName(oc, track, component, instance.name);
      }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeStepDocument(populate: (oc: any, docHandle: any) => void, opts: StepWriteOptions): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const filename = 'kernelcad-assembly.step';
  return withScope((track) => {
    const format = track(new oc.TCollection_ExtendedString_2('XmlOcaf', true));
    const docHandle = track(new oc.Handle_TDocStd_Document_2(new oc.TDocStd_Document(format)));
    oc.XCAFDoc_ShapeTool.SetAutoNaming(false);
    populate(oc, docHandle);
    if (!writeDocument(oc, docHandle, filename, opts.surfaceCurves !== false)) throw new Error('WRITE STEP FILE FAILED.');
    const bytes = oc.FS.readFile('/' + filename) as Uint8Array;
    oc.FS.unlink('/' + filename);
    return reproducibleOcctStep(oc, bytes);
  });
}

/**
 * Write `parts` as one STEP file with a named body per part. A part's colour
 * is written only when `part.color` is set. Output matches
 * `replicad.exportSTEP(shapes)` without unit overrides, except that it is
 * byte-reproducible (see `reproducibleOcctStep`) and a part without a colour
 * is not written as red.
 */
export function writeStepAssembly(
  parts: readonly StepAssemblyPart[],
  opts: StepWriteOptions = {},
): Uint8Array {
  return writeStepDocument((oc, docHandle) => addParts(oc, docHandle, parts), opts);
}

/**
 * Write one shape as a STEP file with one named product and no assembly
 * tree. The colour is written only when `part.color` is set; a shape without
 * a colour stays without one.
 */
export function writeStepBody(part: StepAssemblyPart, opts: StepWriteOptions = {}): Uint8Array {
  return writeStepDocument((oc, docHandle) => addParts(oc, docHandle, [part]), opts);
}

/**
 * Write `products` as one STEP assembly named `assemblyName`: each product's
 * geometry is written once and every instance is a named placement of it, so
 * a repeated part stays one product with N occurrences. Throws when an
 * instance placement is not rigid; nothing is flattened to make the file open.
 */
export function writeStepProductTree(
  assemblyName: string,
  products: readonly StepAssemblyProduct[],
  opts: StepWriteOptions = {},
): Uint8Array {
  if (products.length === 0 || products.some((p) => p.instances.length === 0)) {
    throw new Error('writeStepProductTree: every product needs at least one instance.');
  }
  return writeStepDocument((oc, docHandle) => addProductTree(oc, docHandle, assemblyName, products), opts);
}
