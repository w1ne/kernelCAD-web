// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/studioKernelWorker.ts
//
// Studio's kernel worker: the thread that builds and re-meshes the model the
// viewport shows. Mirrors site/island/docs-worker.ts — the 10.8 MB OCCT wasm,
// the script runtime and the mesher live here, the main thread never evaluates
// user code, and bin1 payloads are transferred, not copied.
//
// All protocol logic lives in kernelWorkerCore.ts, which is unit-tested with
// fake deps; this file only wires the real kernel deps and the message
// plumbing. Everything imported here must stay browser-safe — the graph guard
// in src/modeling/runtime/browserGraphNodeFree.test.ts walks this module.

import wasmUrl from 'replicad-opencascadejs/src/replicad_single.wasm?url';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScriptInBrowser } from '../../composition/browserRuntime';
import { transpileTsBrowser } from '../../modeling/runtime/transpileBrowser';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { resolveRootId } from '../../modeling/compute/resolveRootId';
import { updateModelParams } from '../../modeling/paramUpdate';
import { createKernelWorkerCore } from './kernelWorkerCore';
import type { KernelRequest, KernelResponse } from './protocol';

// Kick the wasm off at module load. The host spawns the worker on first
// interaction, so this overlaps the ~10.8 MB download with the user reading
// instead of with their first build. The explicit locateFile is load-bearing:
// Emscripten's default resolution reads `document.currentScript`, which does
// not exist in a worker, so the wasm would 404 against the page URL.
const enginePromise = initOcct({
  locateFile: (file: string) => (file.endsWith('.wasm') ? wasmUrl : file),
});

const core = createKernelWorkerCore({
  async runScript({ code, fileName }) {
    await enginePromise;
    // Gallery/Studio sources are TypeScript (.kcad.ts). The default browser
    // transpiler is a JS pass-through that refuses TS syntax by name, so the
    // worker opts into the real compiler via `transpileBrowser.ts` (the node
    // `transpileTs` reaches `node:module` and cannot load in a browser).
    const result = await runScriptInBrowser({ code, fileName, transpile: transpileTsBrowser });
    return {
      records: [...result.records],
      paramTable: result.paramTable,
      session: result.session,
      // The script's returned root. Without it `updateModelParams` falls back
      // to the chain tail, which lowers to no shape when the script's last
      // record is virtual (animationView / setCameraTarget / dfmSpec / …).
      rootId: resolveRootId(result.returnValue, result.records.at(-1)?.id),
    };
  },
  async mesh(records, paramTable, session) {
    const meshed = await meshFeaturesPerFeature(
      records as never,
      paramTable as never,
      session as never,
    );
    return {
      features: meshed.features,
      bounds: meshed.bounds,
      failedFeatureIds: meshed.failedFeatureIds,
    };
  },
  async updateParams(model, edits) {
    const next = await updateModelParams(model as never, edits as never);
    return {
      model: {
        records: [...next.model.records],
        // The session's table is the live one `updateModelParams` mutated, so
        // the echoed params and the re-mesh both see the edits.
        paramTable: next.model.session.paramTable,
        session: next.model.session,
      },
    };
  },
});

function postResponse(response: KernelResponse): void {
  // The bin1 payload is transferred, not copied — a dense model is megabytes
  // of triangles and structured-cloning would double the peak memory. Same
  // cast the app's OCCT worker uses (src/kernel/backends/occt/worker.ts):
  // without a `webworker` lib in scope `self` types as Window, whose
  // postMessage overloads do not accept a transfer list.
  const transfer = response.type === 'result' ? [response.payload.buffer] : [];
  self.postMessage(response, { transfer } as unknown as { transfer: Transferable[] });
}

self.onmessage = (event: MessageEvent<KernelRequest>): void => {
  void core.handle(event.data).then((responses) => {
    for (const response of responses) postResponse(response);
  });
};
