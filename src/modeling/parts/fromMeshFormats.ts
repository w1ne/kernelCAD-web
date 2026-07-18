// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/fromMeshFormats.ts
//
// Host-side loaders for the two non-STEP import formats: `lib.fromBREP(path)`
// and `lib.fromSTL(path)`.
//
// Same shape as `fromSTEP.ts` and deliberately so: read the file on the host
// at capture time, produce an `OcctBackend`, park it on
// `session.importedGeometry` keyed by feature id, and let the lowerer hand it
// straight back. The geometry never travels through `FeatureRecord.metadata`
// because OCCT shapes carry circular references that trip the ParamRef
// metadata walker.
//
// Both live in one module because everything except the decode step — arg
// validation, script-relative path resolution, file read, KernelError
// shaping — is identical. `fromSTEP` predates this and keeps its own file.

import { readFile } from 'node:fs/promises';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { importBrepBytes, BrepParseError } from '../../kernel/backends/occt/importBrep';
import { importStlBytes, StlParseError } from '../../kernel/backends/occt/importStl';
import { Shape } from '../capture/proxy';
import { KernelError } from '../../shared/intent/kernelError';
import type { FromSTEPContext } from './fromSTEP';

/** Shared context shape with `lib.fromSTEP`. */
export type FromFileContext = FromSTEPContext;

function requirePath(path: string, fn: 'fromBREP' | 'fromSTL', ext: string): void {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `lib.${fn}(path): path must be a non-empty string.`,
      undefined,
      `invalid-args.lib.${fn} — pass a relative or absolute path to a ${ext} file (e.g. lib.${fn}('parts/widget${ext}')).`,
    );
  }
}

async function readOrThrow(
  absPath: string,
  path: string,
  fn: 'fromBREP' | 'fromSTL',
): Promise<Buffer> {
  try {
    return await readFile(absPath);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `lib.${fn}: cannot read file at ${absPath}.`,
      undefined,
      `invalid-args.lib.${fn}.path — verify the path '${path}' resolves under the script's directory; absolute paths are also accepted.`,
    );
  }
}

/**
 * `lib.fromBREP(path)` — import an OCCT native BREP file as a Shape.
 *
 * BREP is OCCT's own serialization: exact analytic surfaces and full
 * topology, no schema translation and no tessellation. The result is a real
 * B-rep body, indistinguishable from one built by `box()` or imported from
 * STEP, so every downstream operation (fillet, chamfer, shell, boolean, face
 * queries) is valid on it.
 */
export async function fromBREP(ctx: FromFileContext, path: string): Promise<Shape> {
  requirePath(path, 'fromBREP', '.brep');
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  const buf = await readOrThrow(absPath, path, 'fromBREP');

  await initOcct();
  let backend: OcctBackend;
  try {
    backend = importBrepBytes(buf);
  } catch (e) {
    if (e instanceof BrepParseError && e.reason === 'no-solid') {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromBREP: ${absPath} did not contain a 3D body.`,
        undefined,
        'kernel-failed.lib.fromBREP.no-solid — the BREP file must hold a solid, shell, or compound, not a bare wire/face/vertex.',
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromBREP: OCCT failed to parse BREP at ${absPath}: ${msg}`,
      undefined,
      'kernel-failed.lib.fromBREP.parse — file is not a valid OCCT BREP document (it may be truncated, or written by an incompatible OCCT topology version).',
    );
  }

  const shape = ctx.session.createShape({
    kind: 'importedBrep',
    params: {},
    inputs: {},
    metadata: { sourcePath: absPath },
  });
  ctx.session.importedGeometry.set(shape.id, backend);
  return shape;
}

/** Options for `lib.fromSTL`. */
export interface FromSTLOptions {
  /**
   * Vertex-merge tolerance in mm used to sew the triangle soup back into
   * topology. Default 1e-6. Raise it for third-party meshes whose shared
   * vertices are not bit-identical (see importStl.ts).
   */
  tolerance?: number;
  /**
   * Accept an open (non-watertight) mesh instead of failing.
   *
   * Default false: an STL that does not close into a valid solid is refused,
   * because the alternative — silently handing back an open shell whose
   * `volume()` is meaningless and whose booleans are undefined — is exactly
   * the kind of quiet wrongness that shows up three steps later as a bad
   * mass property or an empty boolean. Pass true when you genuinely want the
   * shell (inspection, repair, visualization).
   */
  allowOpen?: boolean;
  /** Raise the triangle-count budget. See DEFAULT_MAX_TRIANGLES. */
  maxTriangles?: number;
}

/**
 * `lib.fromSTL(path, opts?)` — import an STL mesh as a Shape.
 *
 * WHAT YOU ACTUALLY GET: STL is triangles, not analytic geometry. The
 * importer sews the facets back into topology and, when they close, promotes
 * them to a valid solid — so booleans, volume, mass properties, bbox and
 * export all work. But the faces remain planar facets: a hole that was a
 * cylinder in the source CAD is now a fan of quads. Operations that depend on
 * analytic surfaces — `fillet`/`chamfer` on a "curved" edge, canonical face
 * refs, hole detection — will not behave as they do on STEP or BREP input.
 * Prefer `lib.fromSTEP` or `lib.fromBREP` whenever the source is available.
 *
 * A mesh that does not close into a valid solid is refused by default rather
 * than returned as an open shell; see `opts.allowOpen`.
 */
export async function fromSTL(
  ctx: FromFileContext,
  path: string,
  opts: FromSTLOptions = {},
): Promise<Shape> {
  requirePath(path, 'fromSTL', '.stl');
  const absPath = resolveScriptRelativePath(ctx.scriptDir, path);
  const buf = await readOrThrow(absPath, path, 'fromSTL');

  await initOcct();
  let result: ReturnType<typeof importStlBytes>;
  try {
    result = importStlBytes(buf, {
      tolerance: opts.tolerance,
      maxTriangles: opts.maxTriangles,
    });
  } catch (e) {
    if (e instanceof StlParseError && e.reason === 'too-many-triangles') {
      throw new KernelError(
        'feature.kernel-failed',
        `lib.fromSTL: ${absPath} — ${e.message}`,
        undefined,
        'kernel-failed.lib.fromSTL.too-many-triangles — decimate the mesh in the source tool, or pass { maxTriangles } to opt into a slow import.',
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromSTL: could not read STL at ${absPath}: ${msg}`,
      undefined,
      'kernel-failed.lib.fromSTL.parse — file is not a valid ASCII or binary STL.',
    );
  }

  if (!result.isSolid && !opts.allowOpen) {
    result.backend.dispose?.();
    throw new KernelError(
      'feature.kernel-failed',
      `lib.fromSTL: ${absPath} is not watertight — its ${result.triangleCount} triangles ` +
        'sewed into an open shell, not a closed solid. Volume and booleans would be undefined.',
      undefined,
      'kernel-failed.lib.fromSTL.open-mesh — repair the mesh (close holes, fix flipped normals) in the source tool, raise { tolerance } if shared vertices are not bit-identical, or pass { allowOpen: true } to accept the open shell deliberately.',
    );
  }

  const shape = ctx.session.createShape({
    kind: 'importedStl',
    params: {},
    inputs: {},
    metadata: {
      sourcePath: absPath,
      // Provenance the agent (and `inspect`) can read back: this geometry is
      // faceted, not analytic. Kept as plain scalars so the metadata walker
      // stays happy.
      geometryKind: 'mesh',
      triangleCount: result.triangleCount,
      isSolid: result.isSolid,
    },
  });
  ctx.session.importedGeometry.set(shape.id, result.backend);
  return shape;
}
