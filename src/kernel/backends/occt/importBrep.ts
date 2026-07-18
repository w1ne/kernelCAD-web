// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/importBrep.ts
//
// OCCT BREP (`.brep`) reader/writer.
//
// BREP is OCCT's own native serialization of a TopoDS_Shape: exact analytic
// geometry, full topology, no tessellation and no translation layer. A BREP
// round-trip is therefore lossless in a way STEP is not — no AP203/AP214
// schema mapping, no unit conversion, no re-derivation of surfaces. That
// makes it the right format for caching kernel state and for moving shapes
// between kernelCAD processes.
//
// The binding used here is `oc.BRepToolsWrapper`, a replicad-opencascadejs
// convenience class that constructs the `BRep_Builder` internally (the
// builder itself is NOT bound, and does not need to be). It is string-based,
// not path-based, so unlike the STL reader this needs no Emscripten MEMFS
// detour.

// The writer half lives on `OcctBackend.exportBREP()` rather than here, so
// this module's dependency on `occtBackend` stays one-directional.

import * as replicad from 'replicad';
import { OcctBackend } from './occtBackend';

/** Why a BREP payload could not be turned into a shape. */
export type BrepParseFailure = 'parse' | 'no-solid';

export class BrepParseError extends Error {
  readonly reason: BrepParseFailure;
  constructor(reason: BrepParseFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'BrepParseError';
  }
}

/**
 * Structural pre-flight check on BREP text, run BEFORE OCCT ever sees it.
 *
 * THIS IS NOT DEFENSIVE PROGRAMMING — IT IS LOAD-BEARING.
 *
 * `BRepTools::Read` has no recovery path for a truncated document. Fed one,
 * it spins (measured: ~9s on a half-truncated 1.6KB box) and then calls
 * Emscripten `abort()`. That tears down the entire wasm module: every
 * subsequent OCCT call in the process throws `RuntimeError: Aborted()` or a
 * bare exception pointer, no matter how unrelated. In Studio that means one
 * bad file bricks the session until reload. Catching the JS exception at the
 * call site does NOT help, because the damage is to the module, not the call.
 *
 * So the only safe design is to never hand OCCT a payload we have not first
 * shown to be structurally whole. The check exploits BREP's self-describing
 * layout: the `TShapes <n>` section header declares exactly how many shape
 * records follow, and each record ends with a `*` terminator line. A
 * truncated file always disagrees.
 *
 * Verified across box / sphere / cylinder / fused-boolean documents: all
 * valid files pass, and all 16 truncation points tested (25%, 50%, 90%, 99%
 * of each) are caught. The trailing root-reference check alone was NOT
 * sufficient — 3 of those 16 truncations happened to end on a well-formed
 * root reference — which is why the count comparison is the primary signal.
 */
export function validateBrepStructure(text: string): string | null {
  if (!/CASCADE Topology V/.test(text.slice(0, 200))) {
    return 'missing the "CASCADE Topology" header — not an OCCT BREP document';
  }

  const marker = text.match(/\bTShapes\s+(\d+)/);
  if (!marker || marker.index === undefined) {
    return 'missing the TShapes section — the document is truncated or not a BREP';
  }

  const declared = Number(marker[1]);
  const body = text.slice(marker.index + marker[0].length);
  const actual = (body.match(/\*\s*$/gm) ?? []).length;
  if (actual !== declared) {
    return `TShapes header declares ${declared} shape records but the document contains ${actual} — the file is truncated or corrupt`;
  }

  // The document closes with the root shape reference, e.g. "\n+1 0 ".
  if (!/\n\+\d+\s+\d+\s*$/.test(text)) {
    return 'missing the trailing root-shape reference — the document is truncated';
  }

  return null;
}

/**
 * Parse OCCT BREP bytes into an `OcctBackend`.
 *
 * Failure modes and why each is caught explicitly:
 *
 *  - Non-BREP / truncated input. `BRepTools::Read` does not return a status;
 *    it prints "File was not written with this version of the topology" to
 *    stdout and hands back a NULL TopoDS_Shape. replicad's `cast` then throws
 *    a bare `Error('This shape has not type, it is null')`. Left alone that
 *    surfaces to the agent as an opaque internal message, so it is remapped to
 *    `BrepParseError('parse')` here.
 *  - A BREP holding only a wire / face / vertex. Valid BREP, but not a 3D
 *    body. Duck-typed the same way `stepParseCache` does it: `meshShape` lives
 *    on replicad's `_3DShape` prototype only.
 *
 * @throws {BrepParseError}
 */
export function importBrepBytes(bytes: Uint8Array | Buffer): OcctBackend {
  if (bytes.length === 0) {
    throw new BrepParseError('parse', 'BREP payload is empty');
  }

  const text = new TextDecoder().decode(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  );

  // MUST run before OCCT touches the payload — see validateBrepStructure.
  const structuralFault = validateBrepStructure(text);
  if (structuralFault !== null) {
    throw new BrepParseError('parse', `invalid BREP document: ${structuralFault}`);
  }

  let imported: replicad.AnyShape;
  try {
    imported = replicad.deserializeShape(text);
  } catch (e) {
    throw new BrepParseError('parse', e instanceof Error ? e.message : String(e));
  }

  if (!imported || typeof (imported as { meshShape?: unknown }).meshShape !== 'function') {
    throw new BrepParseError('no-solid', 'BREP payload contained no 3D body');
  }

  return new OcctBackend(imported as replicad.Shape3D);
}
