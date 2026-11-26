// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ApiContext, KernelCadApi } from './api';
// Parts features (fromSTEP/fromBREP/fromSTL/from3MF/findPart/fetchPart/standard) are
// node-only: they read files and the parts catalog cache. They are reached
// through the capability-guarded façade so this module stays importable in a
// browser — see parts/hostParts.ts.
import {
  fromSTEPViaHost,
  fromNativeCADViaHost,
  fromBREPViaHost,
  fromSTLViaHost,
  from3MFViaHost,
  meshFromSTLViaHost,
  meshFromGLBViaHost,
  findPartViaHost,
  fetchPartViaHost,
  partViaHost,
  stackViaHost,
  standardPartsViaHost,
  fromDXFViaHost,
  fromSVGViaHost,
} from './parts/hostParts';

export function makePartsLib(ctx: ApiContext): Pick<KernelCadApi, 'lib'> {
  const { session } = ctx;
  return {
    lib: {
      fromSTEP: (path, opts) =>
        fromSTEPViaHost({ session, scriptDir: ctx.scriptDir }, path, opts),
      fromNativeCAD: (path, opts) =>
        fromNativeCADViaHost({ session, scriptDir: ctx.scriptDir }, path, opts),
      fromBREP: (path) => fromBREPViaHost({ session, scriptDir: ctx.scriptDir }, path),
      fromSTL: (path, opts) =>
        fromSTLViaHost({ session, scriptDir: ctx.scriptDir }, path, opts ?? {}),
      from3MF: (path, opts) =>
        from3MFViaHost({ session, scriptDir: ctx.scriptDir }, path, opts ?? {}),
      meshFromSTL: (path) => meshFromSTLViaHost({ session, scriptDir: ctx.scriptDir }, path),
      meshFromGLB: (path, opts) =>
        meshFromGLBViaHost({ session, scriptDir: ctx.scriptDir }, path, opts ?? {}),
      fromDXF: (path, opts) =>
        fromDXFViaHost({ session, scriptDir: ctx.scriptDir }, path, opts ?? {}),
      fromSVG: (path, opts) =>
        fromSVGViaHost({ session, scriptDir: ctx.scriptDir }, path, opts ?? {}),
      findPart: (query, opts) => findPartViaHost(query, opts ?? {}),
      fetchPart: (idOrQuery, opts) =>
        fetchPartViaHost(
          { session, ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}) },
          idOrQuery,
          opts ?? {},
        ),
      part: (request) =>
        partViaHost(
          { session, ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}) },
          request,
        ),
      stack: (request) =>
        stackViaHost(
          { session, ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}) },
          request,
        ),
      // Hole detection and seat cuts run on OCCT alone, so `insert` is
      // browser-safe; the dynamic import keeps the lowerer out of the static
      // graph of every script API consumer.
      insert: async (shape, request) => {
        const { insertFasteners } = await import('./parts/holeInsert');
        return insertFasteners({ session }, shape, request);
      },
      standard: standardPartsViaHost({
        session,
        ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}),
      }),
    },
  };
}
