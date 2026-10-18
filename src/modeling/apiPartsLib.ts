// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ApiContext, KernelCadApi } from './api';
// Parts features (fromSTEP/fromBREP/fromSTL/findPart/fetchPart/standard) are
// node-only: they read files and the parts catalog cache. They are reached
// through the capability-guarded façade so this module stays importable in a
// browser — see parts/hostParts.ts.
import { createFixtureParts } from './parts/fixtureParts';
import {
  fromSTEPViaHost,
  fromBREPViaHost,
  fromSTLViaHost,
  meshFromSTLViaHost,
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
      fromSTEP: (path) => fromSTEPViaHost({ session, scriptDir: ctx.scriptDir }, path),
      fromBREP: (path) => fromBREPViaHost({ session, scriptDir: ctx.scriptDir }, path),
      fromSTL: (path, opts) =>
        fromSTLViaHost({ session, scriptDir: ctx.scriptDir }, path, opts ?? {}),
      meshFromSTL: (path) => meshFromSTLViaHost({ session, scriptDir: ctx.scriptDir }, path),
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
      fixture: createFixtureParts({
        session,
        ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}),
      }),
      standard: standardPartsViaHost({
        session,
        ...(ctx.scriptDir !== undefined ? { scriptDir: ctx.scriptDir } : {}),
      }),
    },
  };
}
