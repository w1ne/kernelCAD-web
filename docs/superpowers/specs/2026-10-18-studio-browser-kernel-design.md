# Studio browser kernel + mesh payload diet — design

Status: draft for implementation (2026-10-18)
Repos: `kernelCAD-web` (primary), `kernelCAD-server` (Stage 0 server side, after vendor pin bump)

## Problem (measured)

- A param edit on the hosted gallery (e.g. `?gallery=hand-coffee-grinder`) is
  computed server-side and answered with a **~19.3 MB JSON payload** (measured
  against production); the static precompute for the same model is **~19.5 MB
  JSON**. At 25 Mbps that is ~6 s of transfer, plus 200–450 ms of main-thread
  `JSON.parse`.
- Cold server builds take **50–120 s**; incremental param updates ~**10 s**
  (0.5 s re-lower + ~9 s re-mesh). Production now keeps heavy param runs alive
  (`504 mesh.pending` + retry) since PR #315, but every edit still costs a
  server round-trip, a server kernel run, and the full payload.
- Animations are baked server-side (600-frame cap, 2/min rate limit) even for
  jointed mechanisms the client can already pose with cheap transforms.
- A full modern-kernel browser worker **already ships** in this repo
  (`site/island/docs-worker.ts`: `runScriptInBrowser` + `meshFeaturesPerFeature`
  + the ~10.8 MB replicad OCCT wasm, typed-array transfers). It is simply not
  wired into the Studio.

Research (2026-10-18, `reports/kernelCAD browser kernel speedup.md`) concluded:
Cloudflare Workers/Durable Objects are disqualified (128 MB isolate cap vs
~1 GB heap); Containers can host the kernel 1:1 but are not faster; browser
OCCT wasm runs at 1.10–1.77× native; meshopt/binary payloads compress CAD
tessellation ~4–10×; industry practice keeps drags and animation off the
exact kernel path.

## Goals

1. Subsequent param edits feel immediate: local compute (sub-second to ~2 s),
   no network for geometry, no server queue, no rate limit.
2. Model open stays instant (CDN precompute), with the kernel warming in the
   background so the first edit does not pay a cold build.
3. Payload diet applies to **both** paths (worker patches and server fallback):
   binary + partial updates, ~10× smaller.
4. Zero regressions: the server path remains the fallback (embed/ChatGPT,
   low-memory devices, exports, signed-in sessions) and must keep working
   exactly as today.
5. Animations (Stage 2, prepared for here) can later run entirely in the
   worker — joint curves + FK on cached meshes.

## Non-goals

- WASM threads / COOP+COEP builds in v1 (single-threaded wasm first; threads
  later as a tuning pass).
- Cloudflare migration (Stage 3 in the research report).
- Reworking the signed-in live-session (SSE `relower`) flow in v1 — sessions
  keep the server path; the worker serves the stateless/param-edit paths first.
- Changing MCP/ChatGPT embed behavior beyond backwards-compatible payload
  additions.

## Stage 0 — Mesh payload diet

### 0a. Binary bridge format v1 (`bin1`)

New isomorphic codec in `src/modeling/capture/featureMeshBinary.ts` (same
capture layer as `serializeForBridge`; must pass the browser graph guard in
`src/modeling/runtime/browserGraphNodeFree.test.ts` — no node builtins).

Container, little-endian:

```
magic   "KCB1" (4 bytes)
version u16 = 1
flags   u16 (bit0: partial payload)
count   u32
table   count × { featureIndex u32, metaLen u32, metaOffset u32,
                  bufferCount u32, bufferOffset u32 }  // offsets into payload
meta    concatenated UTF-8 JSON blobs (all FeatureMeshSerialized fields
        EXCEPT the numeric arrays: ids, kinds, materials, transforms, names)
        padded with zeros to the next 4-byte boundary
buffers concatenated typed arrays, each 4-byte aligned:
        per face: vertices f32, normals f32, uv f32 (optional), indices u32
        per mesh: positions f32, normals f32, indices u32
        edges u32
```

- `encodeFeatureMeshes(features: FeatureMesh, trailer?): Uint8Array` and
  `decodeFeatureMeshes(bytes): { features: FeatureMeshSerialized[]; trailer? }`
  (decode returns typed arrays where the JSON shape had `number[]`; a
  `toJsonFeatures()` adapter keeps every legacy consumer working). The partial
  trailer (`unchangedIds`, `removedIds`) is carried as a reserved entry
  `__partial` in the meta blob, so a partial payload is a single
  self-describing container.
- A per-feature **fingerprint**: a 64-bit fast hash (xxh64-style or two
  independent FNV-1a lanes) over the concatenated geometry buffers, face ids,
  and buffer lengths; hex16. 64-bit minimum because a collision silently
  paints stale geometry. Stable across runs; metadata-only changes are not
  fingerprint changes (they ride along when a feature is re-sent). Hashing
  ~19 MB stays in the tens of ms with a synchronous fast hash; the worker and
  server compute the same value from the same bytes (one shared module).

### 0b. Transport negotiation

- `POST /__kernelcad/mesh` (server route + dev middleware): when the request
  `Accept` includes `application/x-kernelcad-mesh+bin`, respond `200` with
  `Content-Type: application/x-kernelcad-mesh+bin` and `x-mesh-format: bin1`;
  otherwise JSON exactly as today. `504 mesh.pending` / error bodies stay
  JSON in both modes (the client retry logic reads them).
- Precompute: `site/scripts/build-gallery.ts` writes `<sha>.bin` next to the
  existing `<sha>.json` (one extra file per entry; `.json` kept for old
  clients and embeds). Because a custom binary content type is not on
  Cloudflare's default auto-compression list, the build writes `<sha>.bin.br`
  alongside and the client requests it with `Content-Encoding: br` handling
  (fallback: uncompressed `.bin`); immutable cache headers like the JSON.
- Client: `gallerySource.galleryPrecomputedMeshUrl` gains a binary variant;
  `meshSourceHosted` tries `.bin` first, falls back to `.json`, then server
  JSON (never a hard failure).

### 0c. Partial updates

- Param edit requests (server and worker protocol) carry
  `have: { [featureId]: fingerprintHex }` — the fingerprints the client
  currently holds (computed by the decoder on receipt; kept in
  `GeometryContext` state).
- The response (bin1, `flags.partial`) carries `changed` features only plus a
  JSON trailer: `{ unchangedIds: string[], removedIds: string[] }`.
  - Server: fingerprints are computed from the freshly meshed `FeatureMesh`
    buffers; `have` is trusted only for ids present in the result.
  - Worker: same function, same fingerprints.
- Non-geometry channels (`params`, `featureRecords`, `bounds`, `review`) are
  small JSON and ALWAYS ride the full, current response — only the geometry
  buffers are partial.
- Client merge: keyed by `featureId` in a map; unchanged ids keep their
  existing `GeometryResult` and array position, changed ids are replaced in
  place, new ids append, removed ids drop. A `full: true` response (no
  `have`, or a fingerprint-format upgrade) replaces everything.
- Fallback safety: if merge state is inconsistent (missing ids), the client
  re-requests once without `have` for a full payload.

### 0d. Client edit coalescing

`src/studio/context/geometry/paramEditsForMesh.ts`: while a param request is
in flight, coalesce further edits per param name to the latest value and fire
one trailing request (one in-flight + one trailing — same policy as the
session params endpoint). Applies to both server and worker paths; kills the
drag-storm queue churn and the 5/min-limit collisions.

## Stage 1 — Studio browser kernel worker

### Components

- `src/studio/kernel/protocol.ts` — versioned message types shared by worker
  and client (`build`, `params`, `dispose`, `ready`, `result`, `error`).
- `src/studio/kernel/studioKernelWorker.ts` — worker entry, bundled by vite
  the same way `docs-worker.ts` is:
  - imports `replicad_single.wasm?url` and `initOcct({ locateFile })`;
  - uses the composition entry `src/composition/browserRuntime`
    (`runScriptInBrowser`) exactly like `docs-worker.ts` — NOT the lower-level
    `modeling/runtime/browserRuntime`;
  - `updateModelParams` is imported from `src/modeling/paramUpdate` (the
    browser-safe module), never from `buildModel.ts` (statically imports
    `node:fs`);
  - `build { source, fileName }` → `runScriptInBrowser` +
    `meshFeaturesPerFeature` → bin1 payload + `params` + `featureRecords`
    (same shapes as the server bridge result, so all downstream consumers are
    shared);
  - `params { edits }` → `updateModelParams` + re-mesh → **partial** bin1
    patch (fingerprints from the per-part mesh caches);
  - keeps the built model + session mesh caches alive between requests;
  - transfers typed arrays (no copies);
  - the browser-graph guard test
    (`src/modeling/runtime/browserGraphNodeFree.test.ts`) gains the studio
    worker entry as a third graph to walk, so a future stray `node:` import
    fails CI instead of production.
- `src/studio/kernel/browserKernelClient.ts` — lifecycle:
  - capability gate and lazy spawn; `warm(source)` starts the background
    build on model open;
  - state machine `cold → warming → warm → failed(sticky-for-source)`;
  - request correlation, revision guard (superseded edits dropped);
  - crash/OOM detection (`worker.onerror`, `onmessageerror`, non-zero exit)
    → respawn once, then sticky server-only for that source + telemetry;
  - the 30 s script budget (`BROWSER_SCRIPT_TIMEOUT_MS`) is a
    **script-phase-only watchdog**: armed when `build` starts, disarmed by the
    worker's `script-done` message, so heavy meshing is never killed by it.
    A separate generous hard cap (300 s, server-budget parity) terminates a
    pathological meshing run → fallback.

### Routing policy (GeometryContext)

- Model open: paint CDN precompute immediately (unchanged); if the worker flag
  is on, start `warm(source)` in the background (deferred until the tab is
  visible; `visibilitychange` — never start a heavy build on a hidden tab).
  Identical geometry (both paths run the same pipeline), so no visual jump.
  Known cost: each open tab builds its own copy — accepted for now.
- Param edits: worker when `warm`; otherwise the existing server path (which
  already handles pending/retry thanks to PR #315). When the worker becomes
  warm, subsequent edits switch over seamlessly — both paths feed the same
  merge/apply code.
- Source change (code edit, new gallery model): `dispose` current model; warm
  the new source only if the model stays open (debounced), never for a
  one-shot preview.
- Server-only sources: a cheap precheck marks sources that need materialized
  assets (literal relative imports / `lib.fromSTEP`, `lib.fromSTL`, fonts) as
  server-side before warming — the worker would throw
  `cli.host-fs-unavailable` for them anyway; a worker-side diagnostic of that
  class also flips the source sticky-server for the session.
- Sessions/embeds: unchanged server path in v1 (flag applies to the stateless
  path first).

### Flags & capability

- `VITE_STUDIO_BROWSER_KERNEL=auto|off|force` (default `off` in the first
  release; `auto` flips after the local measurements below).
  `auto` = hosted hostname + `WebAssembly` available + not a
  `navigator.deviceMemory < 4` device + not Safari-iOS (until measured).
- `?kernel=off|force` query override for support/debugging.
- The embed/studio-lib build (`vite.studio.config.ts`) must NOT ship the
  kernel worker (it strips the legacy geometry worker today for the same
  reason): spawn it through a lazy dynamic import so the ~11 MB worker chunk
  never enters the embed bundle, and keep the flag `off` for embeds.

### Telemetry

Client timings reported through the existing telemetry module: wasm init ms,
warm build ms, param compute ms, patch bytes vs full bytes, fallback reason
(`worker-crash`, `worker-oom`, `flag-off`, `unsupported`). These numbers are
the acceptance evidence for the "blazingly fast" claim.

## Data flow

```
open gallery model ──► CDN _mesh/<sha>.bin (paint now)
                       └► worker.warm(source)  (background, ~cold build)
slider edit ──► worker.params(edits, have)
             │      └► updateModelParams + re-mesh changed parts
             │      └► partial bin1 patch (~sub-MB) ──► merge ──► paint
             └─ (worker failed) ──► server /__kernelcad/mesh (pending/retry)
                                     └► partial bin1 patch ──► merge ──► paint
```

## Error handling

- Script errors (either path) surface the same diagnostics/review shapes; UI
  unchanged.
- Worker crash/OOM: one respawn; second failure → sticky server-only for the
  source this session; a toast/inline notice (existing error surfaces), never
  a blank viewport.
- wasm init failure (network/unsupported): flag → server-only silently.
- Partial merge mismatch: one full re-request, then full replace.
- Server fallback stays rate-limited as today (5/min anonymous); worker edits
  are not rate-limited (local compute).

## Testing

- Unit: codec round-trip (all fields, optional arrays, empty meshes);
  fingerprint stability across runs; partial merge (changed/removed/unchanged
  + fingerprint mismatch → full refetch); protocol parser; coalescer
  (one-in-flight + one-trailing).
- Server: `Accept` negotiation (bin vs json vs missing), old-client JSON
  passthrough byte-compatible; partial responses honor `have`; pending/error
  bodies stay JSON; metrics keep their shape.
- Web: `browserKernelClient` lifecycle with a fake worker (warm, crash,
  respawn, sticky fallback); routing tests in `paramEditsForMesh`.
- E2E (Playwright, hosted build against the local server): open gallery →
  precompute paints → param edit completes through the worker with **zero**
  mesh POSTs (network interceptor); forced worker crash → edit completes via
  server; payload sizes logged.
- Perf record (committed to the PR): wasm init ms, coffee-grinder warm build
  ms, param edit ms and bytes in-browser; server-path numbers after the diet.
- Repo demo discipline: short MP4 of a param drag on the coffee grinder
  running locally in the browser worker.

## Sequencing

1. **PR A (web)** — Stage 0 client/worker-independent parts: codec, decode +
   merge, coalescing, precompute `.bin`, client `.bin` preference. Server
   still serves JSON; everything degrades gracefully.
2. **PR B (server)** — after a vendor pin bump: `Accept` negotiation + partial
   responses + metrics; tests. (Vendor pin bump follows the existing
   `bump-vendor.yml` flow.)
3. **PR C (web)** — worker + client + GeometryContext routing behind
   `VITE_STUDIO_BROWSER_KERNEL` (default `off`), telemetry, E2E.
4. Flip `auto` after the measurements below pass on production.

## Open measurements (before `auto`)

- replicad wasm startup in the studio bundle (cold + warm cache).
- In-browser warm build time and param edit time for the coffee grinder.
- Worker memory after build/param cycles (wasm never shrinks) and respawn
  thresholds.
- Mobile Safari behavior (memory, wasm init) — decides the gate.

## Risks

- ~11 MB wasm in a lazy worker chunk: cached, but must never load for casual
  page views or embeds.
- Low-memory devices: worker OOM kills only the worker (page survives) —
  respawn + fallback covers it.
- Precompute duplication (`.bin` + `.json`) in the CDN: ~1 extra file per
  gallery entry, acceptable; `.json` retires once old clients are gone.
- The server fallback path is load-bearing until `auto` is proven — it keeps
  priority in tests.
- Worker and CDN precompute share the web repo's kernel version; the server
  fallback may run a different vendored pin, so falling back mid-session can
  repaint microscopically differently — acceptable, and covered by a test that
  only asserts geometry validity, not byte equality, across paths.
