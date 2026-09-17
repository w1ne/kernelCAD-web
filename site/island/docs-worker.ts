// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The docs Run button's execution thread.
//
// Everything expensive lives here: the 10.8 MB OCCT wasm, the script runtime,
// and the mesher. The page loads none of it until a reader interacts, and the
// main thread never evaluates reader code.
//
// Two reasons it is a worker rather than an async function on the page:
//
//   1. `runScriptInBrowser` runs the script with `new Function`, which cannot be
//      interrupted. `while (true) {}` in the editor would freeze the tab for
//      good. `worker.terminate()` is the only interrupt the platform has, and it
//      needs a thread to terminate. The deadline is enforced by the host — see
//      docs-island.ts — because a worker cannot time out its own synchronous
//      code any more than the page can.
//   2. OCCT meshing is synchronous and takes long enough to drop frames.
//
// There is no fallback path. If the script throws, the diagnostic goes back
// verbatim and the page renders the error. It never renders a stand-in shape:
// a placeholder that looks like geometry is how a broken example survives for
// months.

import wasmUrl from 'replicad-opencascadejs/src/replicad_single.wasm?url';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { runScriptInBrowser } from '../../src/modeling/runtime/browserRuntime';
import {
  meshFeaturesPerFeature,
  selectTerminalFeatures,
} from '../../src/modeling/capture/featureMeshing';
import { appearanceOf, type DocsAppearance } from './docsAppearance';

/** Sent by the host for every Run. */
export interface DocsRunRequest {
  /** Correlates the reply; the host drops replies for superseded runs. */
  id: number;
  code: string;
}

/** One drawable body. Typed arrays are transferred, not copied. */
export interface DocsMeshFace {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface DocsMeshFeature {
  featureId: string;
  faces: DocsMeshFace[];
  /** What the script asked to be drawn in — `.color()` and `.material()`. */
  appearance: DocsAppearance;
  /** Column-major 4x4, present on assembly parts. */
  transform?: readonly number[];
}

export type DocsRunResponse =
  | {
      id: number;
      ok: true;
      features: DocsMeshFeature[];
      bounds: { min: [number, number, number]; max: [number, number, number] };
      featureCount: number;
      elapsedMs: number;
    }
  | { id: number; ok: false; error: string };

/** Message the worker posts once the engine is live, so the page can say so. */
export interface DocsReadyMessage {
  kind: 'ready';
}

// Kick the wasm off at module load. The host imports the worker on first
// interaction, so this is already lazy; starting here overlaps the ~10.8 MB
// download with the reader reading, instead of with their first Run.
//
// The explicit locateFile is load-bearing: Emscripten's default resolution
// reads `document.currentScript`, which does not exist in a worker, so without
// this the wasm is fetched relative to the docs page and 404s.
const enginePromise = initOcct({
  locateFile: (file: string) => (file.endsWith('.wasm') ? wasmUrl : file),
});

void enginePromise.then(
  () => {
    const ready: DocsReadyMessage = { kind: 'ready' };
    self.postMessage(ready);
  },
  // A failed init is reported on the next Run with the real message rather
  // than swallowed here, where no request is in flight to attach it to.
  () => {},
);

function describeError(err: unknown): string {
  if (err instanceof Error) {
    // Kernel diagnostics carry a code the docs should show — it is what the
    // reader would search for.
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' ? `${code}: ${err.message}` : err.message;
  }
  return String(err);
}

async function run(request: DocsRunRequest): Promise<void> {
  const started = Date.now();
  try {
    await enginePromise;
    const result = await runScriptInBrowser({
      code: request.code,
      fileName: 'docs-example.kcad.js',
    });
    const meshed = await meshFeaturesPerFeature(
      result.records,
      result.paramTable,
      result.session as unknown as Parameters<typeof meshFeaturesPerFeature>[2],
    );
    if (meshed.failedFeatureIds.length > 0) {
      // Rendering the features that DID mesh would show a model with holes in
      // it and no indication anything went wrong. Fail instead.
      throw new Error(
        `these features failed to mesh: ${meshed.failedFeatureIds.join(', ')}`,
      );
    }

    const features: DocsMeshFeature[] = [];
    // Transferred, not copied — a dense model is several MB of triangles and
    // structured-cloning it would double the peak memory for no reason.
    const transfer: Transferable[] = [];
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    // Only the terminal features are the result; the intermediates would stack
    // the original box over the finished body. The rule lives in featureMeshing
    // beside the DAG it reads, not here.
    for (const feature of selectTerminalFeatures(meshed.features)) {
      // Construction geometry (a Curve3D used only for measurement) carries no
      // triangles. Skipping it is not a fallback — it has nothing to draw.
      if (feature.faces.length === 0) continue;
      const faces = feature.faces.map((face) => {
        for (let i = 0; i < face.vertices.length; i += 3) {
          for (let axis = 0; axis < 3; axis++) {
            const v = face.vertices[i + axis];
            if (v < min[axis]) min[axis] = v;
            if (v > max[axis]) max[axis] = v;
          }
        }
        transfer.push(
          face.vertices.buffer as ArrayBuffer,
          face.normals.buffer as ArrayBuffer,
          face.indices.buffer as ArrayBuffer,
        );
        return { vertices: face.vertices, normals: face.normals, indices: face.indices };
      });
      features.push({
        featureId: feature.featureId,
        faces,
        // Reduced here, with the same function the prebake uses, so the live
        // result and the prebaked model are shaded from identical inputs.
        appearance: appearanceOf(feature.color, feature.material),
        transform: feature.transform,
      });
    }

    if (features.length === 0) {
      throw new Error('the script produced no drawable geometry — did it return a shape?');
    }

    const response: DocsRunResponse = {
      id: request.id,
      ok: true,
      features,
      // Framed on what is actually drawn. `meshed.bounds` spans the whole DAG,
      // so a subtract whose tool sticks far out of the body would zoom the
      // camera out to fit a cylinder the reader cannot see.
      bounds: { min, max },
      featureCount: features.length,
      elapsedMs: Date.now() - started,
    };
    // Same cast the app's OCCT worker uses (src/kernel/backends/occt/worker.ts):
    // without a `webworker` lib in scope, `self` types as Window, whose
    // postMessage overloads do not accept a transfer list.
    self.postMessage(response, { transfer } as unknown as { transfer: Transferable[] });
  } catch (err) {
    const response: DocsRunResponse = {
      id: request.id,
      ok: false,
      error: describeError(err),
    };
    self.postMessage(response);
  }
}

self.addEventListener('message', (event: MessageEvent<DocsRunRequest>) => {
  void run(event.data);
});
