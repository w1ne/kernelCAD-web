// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/importStl.ts
//
// STL (`.stl`) reader — ASCII and binary, via OCCT's `StlAPI_Reader`.
//
// WHAT YOU GET BACK, HONESTLY
// ---------------------------
// An STL file is a triangle soup. It carries no analytic surfaces, no edges,
// no feature history — a "cylinder" in STL is N planar quads, not a cylinder.
// So an STL import can never be a B-rep solid in the sense that
// `lib.fromSTEP` or `box()` produce one, and this module does not pretend
// otherwise. It reports what it actually built:
//
//   - `isSolid: true`  — the triangles sewed into a closed, `BRepCheck_Analyzer`
//                        -valid solid. Volume/mass properties are meaningful and
//                        booleans are well-defined. The faces are still planar
//                        facets: fillet/chamfer/shell and canonical face refs
//                        will not behave like they do on analytic geometry.
//   - `isSolid: false` — the mesh has holes, flipped normals, or non-manifold
//                        edges, so it sewed only into an open shell. Volume is
//                        NOT meaningful; booleans are undefined. Callers must
//                        surface this rather than silently returning a "solid".
//
// WHY NOT `replicad.importSTL`
// ----------------------------
// replicad ships an `importSTL`, but it is unusable for us on two counts,
// both measured (see importStl.test.ts):
//
//  1. It is dishonest. It pipes the shell through `BRepBuilderAPI_MakeSolid`
//     unconditionally and returns the result as a Solid, with no closedness
//     check. A single-triangle (wildly open) STL comes back claiming to be a
//     solid; asking it for a volume throws a raw Emscripten exception pointer
//     — a number, not an Error — which is exactly the wasm-abort failure mode
//     we are required not to expose.
//  2. It is slow for no benefit. It runs `ShapeUpgrade_UnifySameDomain` over
//     every facet to merge coplanar triangles. That pays off only on
//     box-like models; on a tessellated sphere, where nothing is coplanar and
//     nothing merges, it did not finish inside a 60s timeout.
//
// So we drive `StlAPI_Reader` directly and sew with the repo's existing
// `lowerSurfaceSew`, which already computes the closed/solid signals we need
// (free-edge count AND a BRepCheck-valid MakeSolid). One sewing implementation
// in the repo, not two.
//
// MEMFS
// -----
// `StlAPI_Reader::Read` takes a filesystem path, not a buffer. In the browser
// and under Node the "filesystem" is Emscripten's in-memory MEMFS, reachable
// as `oc.FS` (exported via EXPORTED_RUNTIME_METHODS). We write the bytes to a
// unique path, read, and unlink in a `finally` so a throwing read cannot leak
// heap into a long Studio session. This mirrors what replicad's own
// `importSTEP` does for `STEPControl_Reader`.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from './occtBackend';
import { lowerSurfaceSew } from '../../../modeling/backends/occt/surfaceSewLowerer';

/** Why an STL byte payload could not be turned into geometry. */
export type StlParseFailure = 'parse' | 'empty' | 'too-many-triangles';

export class StlParseError extends Error {
  readonly reason: StlParseFailure;
  constructor(reason: StlParseFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'StlParseError';
  }
}

export interface StlImportResult {
  /** The sewn geometry: a solid when `isSolid`, otherwise an open shell. */
  backend: OcctBackend;
  /**
   * True only when the triangles closed into a `BRepCheck_Analyzer`-valid
   * solid. When false the backend is an open shell — `volume()` is
   * meaningless and booleans are undefined.
   */
  isSolid: boolean;
  /** Triangle count read from the file header (binary) or facet count (ASCII). */
  triangleCount: number;
}

/**
 * Default cap on triangle count.
 *
 * Import cost is dominated by rebuilding topology from the triangle soup and
 * is roughly linear with a large constant. Measured on this machine (Apple
 * silicon, replicad-opencascadejs kcad-v0.25.0), importing this repo's own
 * export-grade STL output:
 *
 *     12 triangles (box)      ->    11 ms
 *   1004 triangles (cylinder) ->   449 ms
 *  32202 triangles (sphere)   -> 14684 ms
 *
 * That is ~0.45 ms/triangle, so this budget bounds a worst-case import at
 * roughly 90 seconds. A silent multi-minute stall is a worse failure than a
 * refusal, so anything past the budget is rejected with an actionable error
 * instead. The check runs on the header BEFORE any OCCT work, so an oversized
 * file fails in microseconds. Callers who genuinely want to wait can raise
 * `maxTriangles`.
 */
export const DEFAULT_MAX_TRIANGLES = 200_000;

export interface ImportStlOptions {
  /**
   * Vertex-merge tolerance in mm for sewing adjacent triangles. Default 1e-6.
   *
   * STL stores each triangle's three vertices independently, so a shared
   * corner appears once per incident triangle and must be re-merged to
   * recover topology. Binary STL stores float32: at a coordinate magnitude of
   * ~1000mm one ULP is ~6e-5mm, so 1e-6 is too tight for large models written
   * by a different toolchain than the one that computed them. Vertices
   * emitted from the same source value are bit-identical, which is why the
   * tight default works for round-trips; raise it for third-party meshes.
   */
  tolerance?: number;
  /** Override `DEFAULT_MAX_TRIANGLES`. */
  maxTriangles?: number;
}

/**
 * Count triangles without handing the bytes to OCCT.
 *
 * Binary STL is an 80-byte header, a uint32 little-endian triangle count,
 * then 50 bytes per triangle. ASCII STL is counted by `facet` occurrences.
 * The discriminator is the same one replicad uses: a file whose length
 * matches the binary layout exactly is binary, regardless of whether it
 * happens to start with the ASCII marker `solid` (many binary writers put
 * "solid" in the header, which is why a naive prefix sniff is wrong).
 */
export function countStlTriangles(bytes: Uint8Array): { count: number; binary: boolean } {
  if (bytes.byteLength >= 84) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = view.getUint32(80, true);
    if (bytes.byteLength === 84 + n * 50) return { count: n, binary: true };
  }
  // ASCII fallback: count "facet" keywords.
  const text = new TextDecoder().decode(bytes);
  const m = text.match(/\bfacet\b/g);
  return { count: m ? m.length : 0, binary: false };
}

/**
 * Read STL bytes into an OCCT shell via MEMFS.
 *
 * Returns null when `StlAPI_Reader` rejects the payload (it returns false and
 * leaves the shell null rather than throwing, which is why garbage input does
 * NOT abort the wasm module here).
 */
function readStlShell(bytes: Uint8Array): unknown | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const path = `/kcad-stl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  oc.FS.writeFile(path, bytes);
  try {
    const reader = new oc.StlAPI_Reader();
    const shell = new oc.TopoDS_Shell();
    let ok = false;
    try {
      ok = Boolean(reader.Read(shell, path));
    } finally {
      reader.delete?.();
    }
    if (!ok || shell.IsNull()) {
      shell.delete?.();
      return null;
    }
    return shell;
  } finally {
    // Always unlink: a leaked MEMFS entry pins its bytes in the wasm heap for
    // the life of the module.
    try {
      oc.FS.unlink(path);
    } catch {
      /* already gone */
    }
  }
}

/**
 * Parse STL bytes (ASCII or binary) into geometry, reporting honestly whether
 * the triangles actually closed into a solid.
 *
 * @throws {StlParseError} on empty input, unreadable input, or a triangle
 *   count past the budget. Never throws a raw wasm exception pointer.
 */
export function importStlBytes(
  bytes: Uint8Array | Buffer,
  opts: ImportStlOptions = {},
): StlImportResult {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.length === 0) {
    throw new StlParseError('empty', 'STL payload is empty');
  }

  const { count: triangleCount } = countStlTriangles(buf);
  if (triangleCount === 0) {
    throw new StlParseError(
      'parse',
      'STL payload contains no triangles (not a valid ASCII or binary STL)',
    );
  }

  const budget = opts.maxTriangles ?? DEFAULT_MAX_TRIANGLES;
  if (triangleCount > budget) {
    throw new StlParseError(
      'too-many-triangles',
      `STL has ${triangleCount} triangles, past the ${budget} budget. ` +
        'Decimate the mesh, or raise maxTriangles and expect a long import.',
    );
  }

  const shellTopo = readStlShell(buf);
  if (shellTopo === null) {
    throw new StlParseError('parse', 'StlAPI_Reader could not read the payload as STL');
  }

  // Re-merge the triangle soup into real topology. `lowerSurfaceSew` is the
  // repo's single sewing implementation; it returns the closedness signals
  // (no free edges AND a BRepCheck-valid MakeSolid) that make the honesty
  // claim above defensible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shell = new replicad.Shell(shellTopo as any);
  const faces: replicad.Face[] = [];
  for (const f of shell.faces) faces.push(f);

  if (faces.length === 0) {
    throw new StlParseError('parse', 'STL read produced no faces');
  }

  const sewn = lowerSurfaceSew(faces, { tolerance: opts.tolerance ?? 1e-6 });

  // Release the raw triangle shell now that it has been sewn. Without this,
  // every import pins its full facet soup in the wasm heap until GC happens
  // to run — at the 200k-triangle budget that is not a rounding error.
  //
  // MUST go through the replicad wrapper's `delete()`, NOT the underlying
  // handle's. `WrappingObj` registers every handle it wraps with a
  // FinalizationRegistry that calls `.delete()` on collection; deleting the
  // raw handle directly leaves that registration in place, and the finalizer
  // later fires a second delete, spraying
  // `BindingError: TopoDS_Shell instance already deleted` from GC at
  // unpredictable times. `WrappingObj.delete()` unregisters first, so it is
  // the only safe teardown. Safe for the sewn result: TopoDS_Shape handles
  // are refcounted, and the sewing output holds its own references.
  shell.delete();

  return {
    backend: sewn.backend,
    isSolid: sewn.isSolid,
    triangleCount,
  };
}

/** Re-exported so callers can type against the backend without a deep import. */
export type { OcctBackend };
