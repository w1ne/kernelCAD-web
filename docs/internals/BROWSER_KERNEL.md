# Browser kernel: parameter edits rebuilt in a Web Worker

Status: behind a flag. `?kernel=browser` turns it on for one page load,
`?kernel=server` forces the server path; the build-time default is
`VITE_STUDIO_BROWSER_KERNEL` (`server` unless set).

## What it does

A declared-parameter edit in the Studio (Params tab, customizer, joint
sliders) is rebuilt in a dedicated Web Worker that hosts the
single-threaded OCCT build (`replicad-opencascadejs`), the modern script
runtime (`runScriptInBrowser`, the same capture engine the server runs) and
the mesher. A slider tick makes no network request.

The edit is the same stateless edit the server receives: choice and text
values are written into the source, number and boolean values are applied
to the param table before lowering. The worker keeps the last model built
(`builtModelFromRun`, the lowering half of `buildModel`) and applies an edit
with `updateModelParams`, so only the features the edited params reach are
lowered again.

Code: `src/studio/browserKernel/` (worker, protocol, client, cache,
lockdown, memory cap), `src/studio/context/geometry/browserKernelParamEdit.ts`
(routing and painting).

## Mesh quality

Nothing is decimated or simplified. Intermediate drag ticks are meshed with
the kernel's coarse tessellation profile (`COARSE_MESH_OPTIONS`, a chord
tolerance); the edit on release is always meshed at full display quality and
is the server's display mesh for the same source and params
(`workerCore.test.ts` compares every feature's fingerprint with the dev
server's `/__kernelcad/mesh` route).

## Protocol and data flow

- The page sends one `kc-init` message with a private `MessagePort`, the
  wasm bytes and the memory cap; every later message travels on that port.
- A job carries the document scope, the edit generation and a job id. The
  page keeps one job in flight and only the latest pending one; an older
  pending job is dropped as superseded, and a reply that is not for the
  running job is ignored. Jobs also appear in the rebuild queue (#1101).
- Results hold only the features whose fingerprint differs from what the
  page shows. A fingerprint covers every buffer and every other field of the
  feature mesh (transform, material, colour, ids, owners, names).
- Viewer dimensions follow the mesh as a separate message, after 250 ms
  without a new edit (they cost 80-600 ms on assemblies; the mesh 1-30 ms).
- A bounded LRU (8 rebuilds or 32 MiB) keyed by source, params, mesh quality
  and kernel version answers repeated documents (undo, dragging back).

## Fallback

The edit goes through the existing server path, unchanged, when the worker
is not warm yet, cannot start, crashes, misses its deadline (30 s for an
edit, 120 s for the first build of a model), exceeds the memory cap, or the
model needs the filesystem (`lib.fromSTEP`, the part library, fonts,
reference images). Timeouts, memory and filesystem models are remembered as
server-only for the page; after three infrastructure failures the browser
kernel switches itself off for the page. A build with no server at all (a
static preview) builds the model itself in the worker.

## Isolation

- Origin: in a production build the worker starts from a small `data:` URL
  bootstrap, so its origin is opaque. The bootstrap imports the kernel bundle
  from a blob URL it creates itself (browsers refuse `data:` URLs over 2 MB).
  A production worker that reports any other origin is not used.
- Capabilities: after the wasm is instantiated, `fetch`, XHR, WebSocket,
  EventSource, `importScripts`, IndexedDB, Cache Storage, BroadcastChannel,
  `postMessage` and the rest are replaced on the worker global and its
  prototype chain with non-configurable throwing stubs.
- Messaging: the page reads nothing from the worker object after start-up;
  replies come on the private port, held in a closure model code cannot
  reach, and every message is shape-checked.
- Memory: `WebAssembly.Memory.prototype.grow` is wrapped before OCCT starts;
  growth past 1.5 GiB is refused, the job fails with a memory error, the
  worker is replaced and the server builds the model.
- Time: the page terminates a worker whose job misses its deadline.

No COOP/COEP headers, no SharedArrayBuffer, no threads.

## Benchmark

`tests/perf/paramEditFrame.spec.ts` measures value entered → worker
request → response → meshes applied → installed in the viewer → next
rendered frame on a production build and reports p50/p95. It never fails on
time, only on errors or wrong geometry. CI runs it on a small fixture
(`param-edit-benchmark` job, results in the job summary and the
`param-edit-frame` artifact). Locally:

```sh
VITE_BASE_PATH=/ npx vite build
PARAM_PERF_GPU=1 PARAM_PERF_MODEL=examples/gallery/gearfinity-planetary-stage.kcad.ts \
PARAM_PERF_TICKS=driveAngleDeg=100,driveAngleDeg=110,driveAngleDeg=120 PARAM_PERF_CHECK_BOUNDS=0 \
npx playwright test -c playwright.perf.config.ts
```
