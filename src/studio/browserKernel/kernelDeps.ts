// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/kernelDeps.ts
//
// The real kernel behind the browser kernel worker core: the modern script
// runtime (`runScriptInBrowser`, the same capture engine the server runs,
// with sucrase for the TypeScript), the server's lowering (`builtModelFromRun`),
// its incremental param path (`updateModelParams`) and its mesher
// (`meshFeaturesPerFeature` + `serializeForBridge`'s field mapping).
//
// Browser-safe: the worker bundle imports this. The tests import it too and
// run it against the node build of OCCT.

import { runScriptInBrowser } from '../../composition/browserRuntime';
import { viewerDimensionsForRoot } from '../../composition/viewerDimensionsForModel';
import { builtModelFromRun } from '../../modeling/builtModelFromRun';
import type { BuiltModel } from '../../modeling/buildModel';
import { updateModelParams } from '../../modeling/paramUpdate';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { meshFeaturesPerFeature, type MeshFeaturesResult } from '../../modeling/capture/featureMeshing';
import { serializeForTransfer } from '../../modeling/capture/featureMeshSerialize';
import { transpileSucrase } from '../../modeling/runtime/transpileSucrase';
import { COARSE_MESH_OPTIONS } from '../../kernel/backends/occt/meshing';
import { isOcctWasmPoisoned } from '../../kernel/backends/occt/occtException';
import { KernelError } from '../../shared/intent/kernelError';
import type { KernelWorkerDeps } from './workerCore';
import { assertNoModuleLoading } from './moduleLoadingCheck';

/** File name the model runs under (script locations, stack traces). */
export const BROWSER_MODEL_FILE = 'studio-model.kcad.ts';

/** Bumped when the worker's output for the same input could change, so a
 *  cache entry from an older bundle is never reused. */
export const BROWSER_KERNEL_VERSION = `occt-replicad-single/${typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'}/1`;

export interface KernelMemoryProbe {
  bytes(): number;
  capHit(): boolean;
}

const HOST_FS_CODE = 'cli.host-fs-unavailable';

/** Type stripping, then the refusal of import() / import.meta. */
function checkedTranspile(source: string, fileName: string): ReturnType<typeof transpileSucrase> {
  const out = transpileSucrase(source, fileName);
  assertNoModuleLoading(out.code);
  return out;
}

function needsHostFs(model: BuiltModel): boolean {
  if (model.diagnostics.some((d) => d.code === HOST_FS_CODE)) return true;
  return JSON.stringify(model.records).includes(HOST_FS_CODE);
}

function isFatalKernelError(error: unknown): boolean {
  if (isOcctWasmPoisoned(error)) return true;
  return typeof WebAssembly !== 'undefined' && error instanceof WebAssembly.RuntimeError;
}

export function createKernelDeps(
  memory: KernelMemoryProbe,
  now: () => number = () => performance.now(),
): KernelWorkerDeps<BuiltModel, MeshFeaturesResult> {
  return {
    async build(source, params) {
      const run = await runScriptInBrowser({ code: source, fileName: BROWSER_MODEL_FILE, transpile: checkedTranspile });
      // The server's stateless override: set on the freshly captured table
      // before anything is lowered. Validation happens in ParamTable.set.
      for (const [name, value] of Object.entries(params)) run.paramTable.set(name, value);
      const model = await builtModelFromRun(run, (session) => createOcctLowerer(session), source);
      // Some filesystem features (referenceImage) report instead of throwing.
      // The browser would show a different model than the server: refuse.
      if (needsHostFs(model)) {
        throw new KernelError('cli.host-fs-unavailable', 'This model reads files, which the browser kernel cannot; the server builds it.');
      }
      return model;
    },
    async update(model, edits) {
      return (await updateModelParams(model, edits)).model;
    },
    mesh(model, quality) {
      return meshFeaturesPerFeature(
        model.records,
        model.session.paramTable,
        model.session,
        quality === 'coarse' ? { previewMeshOptions: COARSE_MESH_OPTIONS } : undefined,
      );
    },
    dimensions(model, meshing) {
      try {
        const rootShape = model.rootId === undefined ? undefined : meshing.shapes?.get(model.rootId);
        return viewerDimensionsForRoot({ records: model.records, rootId: model.rootId, rootShape }).dimensions;
      } catch {
        // Dimensions never fail a rebuild; the overlay falls back to bounds.
        return undefined;
      }
    },
    serialize: serializeForTransfer,
    memoryBytes: () => memory.bytes(),
    memoryCapHit: () => memory.capHit(),
    isFatal: isFatalKernelError,
    kernelVersion: BROWSER_KERNEL_VERSION,
    now,
  };
}
