# kernelCAD headless build API: B2B contract (spike draft)

Status: **design only**, written 2026-11-01 for the `spike/b2b-ecad` spike.
Nothing in §1–§8 is implemented as written. §9 maps each piece to code that
exists today, and §10 records real calls against the live endpoint.

> Source boundary: per AGENTS.md, hosted product APIs, quotas and commercial
> orchestration belong in the private server repo. This file is here because
> the spike brief asked for it. Move it to kernelCAD-server before anything
> here is built.

Buyer: a quoting, ECO or PLM platform. It submits a design and gets back
STEP, a DFM verdict and a hash it can store against its own revision. It
never opens a UI. The buyer needs four things:

- **Async:** builds take 2 to 60 s, and its own workers must not block.
- **Idempotent:** retries and duplicate ECO events cost nothing and return the same build.
- **Deterministic:** same input and runtime give the same bytes and the same hash. The ECO diff relies on this.
- **Auditable:** the runtime version is pinned and every artifact carries a sha256.

## 1. Transport, auth, versioning

- Base URL: `https://api.kernelcad.com/api/v1`. JSON over HTTPS. Request bodies use `Content-Type: application/json`.
- Auth: `Authorization: Bearer kc_live_<key>` (production) or `kc_test_<key>` (sandbox: same API, watermarked artifacts, not billed).
  - Keys belong to an **organization**, not a user. Scopes: `builds:write`, `builds:read`, `artifacts:read`.
  - A missing key returns `401` with `WWW-Authenticate: Bearer realm="kernelcad", error="invalid_request"`.
  - A bad key returns `401` with `error="invalid_token"`.
  - A key without the needed scope returns `403 insufficient_scope`.
  - There is **no anonymous access** on this surface. This differs on purpose from `/mcp` today, see §10.
- API version: the path prefix `/v1`. Additive changes only within v1.
- Runtime version: every build pins a kernelCAD runtime (`runtime: "0.17.4"`). If omitted, the org's default pin applies and the response echoes it. Pins are kept for at least 12 months after deprecation notice. A retired pin returns `410 runtime_retired`.

## 2. Resources

```
POST   /builds                      submit (async)            -> 202 | 200 (cache hit)
GET    /builds/{buildId}            status + result           -> 200
GET    /builds?inputHash=sha256:... lookup by input hash      -> 200 (list, newest first)
POST   /builds/{buildId}/cancel     cancel queued/running     -> 202 | 409 if terminal
GET    /builds/{buildId}/artifacts/{artifactId}               -> 302 to signed URL (TTL 15 min)
POST   /builds:validate             sync parse/type check, no geometry -> 200 | 422
GET    /runtimes                    available runtime pins + capabilities -> 200
```

### 2.1 Submit: `POST /builds`

Headers: `Idempotency-Key: <opaque, ≤ 255 chars>` (optional, recommended).
Optional `KernelCAD-Callback-Secret` registered once per org (see §5).

```jsonc
{
  "source": {
    // exactly one of:
    "kcad":     { "code": "<.kcad.ts source, ≤ 256 KiB>", "params": { "wall": "2.0" } },
    "template": { "id": "pcb-enclosure", "version": "1",
                  "inputs": { "board": { /* board JSON, schema in /runtimes */ } },
                  "params": { "wall": "2.0", "clearance": "0.5" } }
  },
  "runtime": "0.17.4",
  "outputs": [
    { "format": "step", "scope": "assembly" },          // one STEP, all parts
    { "format": "stl",  "scope": "parts" },             // one STL per part
    { "format": "svg-drawing", "options": { "autoAnnotate": true } }
  ],
  "checks": {
    "dfm": { "process": "fdm" }                          // fdm | cnc | injection-molding (501 until it exists)
  },
  "callbackUrl": "https://quotes.example.com/hooks/kernelcad",   // optional
  "metadata": { "ecoId": "ECO-1182", "rev": "C" }                // ≤ 4 KiB, echoed, not hashed
}
```

**inputHash**: `sha256:` + hex of the RFC 8785 (JCS) canonical JSON of
`{ source, runtime, outputs, checks }`. Whitespace and key order in the
request don't matter; `metadata`, `callbackUrl` and the idempotency key are
not part of it. The script is hashed as given. Normalising code would be a
semantic choice, and this contract doesn't make it.

Responses:

| Status | When | Body |
|---|---|---|
| `202 Accepted` | new build queued | `Build` (status `queued`), `Location: /api/v1/builds/{id}` |
| `200 OK` | a `succeeded` build with the same `inputHash` exists in this org and its artifacts are within retention | that `Build`, header `KernelCAD-Cache: hit`. No charge. |
| `200 OK` | same `Idempotency-Key` + same inputHash within 24 h | the original `Build` (any status) |
| `409 Conflict` | same `Idempotency-Key` with a different inputHash | `idempotency_key_reused` |
| `400` | malformed JSON / schema violation | `invalid_request` with `errors[]` (JSON pointer + message) |
| `413` | code > 256 KiB or body > 1 MiB | `payload_too_large` |
| `422` | unknown output format, unknown template id, `process` not supported by the pinned runtime | `unsupported` |
| `429` | rate or concurrency limit | `rate_limited`, `Retry-After` |
| `503` | queue full | `overloaded`, `Retry-After` |

The script failing to evaluate is **not** a 4xx. The build is accepted and
ends `failed`, with diagnostics. Callers only branch on transport errors at
submit time.

### 2.2 Build object: `GET /builds/{id}`

```jsonc
{
  "id": "bld_01JC5Q8V9R1T3W6Y0Z2X4A6B8D",
  "status": "succeeded",            // queued | running | succeeded | failed | canceled
  "inputHash": "sha256:…",
  "runtime": { "version": "0.17.4", "kernel": "occt-7.6", "serverBuild": "0.1.0+fbd569a11844" },
  "createdAt": "2026-11-01T12:00:00Z", "startedAt": "…", "finishedAt": "…",
  "usage": { "cpuMs": 6281 },     // illustrative (live evaluate_script took 6.3 s wall)
  "result": {
    "geometryHash": "kgh1:3f9a…",   // canonical, see §4
    "parts": [ { "name": "base", "volumeMm3": 10700.7, "bbox": [[-3.5,-2.5,0],[67.5,32.5,15.6]] }, … ],  // real values, devboard-65x30 spike build
    "artifacts": [
      { "id": "art_…", "format": "step", "scope": "assembly", "filename": "assembly.step",
        "bytes": 391973, "sha256": "…", "contentType": "model/step",
        "url": "/api/v1/builds/bld_…/artifacts/art_…", "expiresAt": "2026-12-01T12:00:00Z" },
      …
    ],
    "dfm": {
      "process": "fdm", "verdict": "pass",            // pass | warn | fail
      "checks": [ { "id": "dfm.minWall", "part": "base", "status": "pass",
                    "measured": 1.9999, "limit": 1.99, "unit": "mm" }, … ]
    },
    "requirements": [ … ],        // script-declared require()/dfmSpec gates, as evaluate returns them
    "diagnostics": [ … ]          // warn/info diagnostics (same codes as the CLI)
  },
  "error": null,                  // set when status = failed, same shape as §6
  "metadata": { "ecoId": "ECO-1182", "rev": "C" }
}
```

Poll with `GET /builds/{id}`. Clients should respect `Retry-After` on
`queued` and `running` responses (the server sets it from 1 to 5 s). For
waits under 30 s the server also supports `GET /builds/{id}?wait=25`, a long
poll that returns as soon as the build finishes or when the wait runs out.

## 3. Idempotency semantics

- **Idempotency-Key** (transport retries): the key is scoped to the org and kept for 24 h. A replay returns the original response.
- **inputHash dedupe** (business duplicates): a second submit of identical input returns the existing succeeded build with `KernelCAD-Cache: hit`, even under a different idempotency key. A previous `failed` build is **not** cached; the new submit runs again, because failures can be infrastructure failures.
- Callers can opt out with `"cache": "bypass"`, for example to re-verify on a new server build. The new build still has the same inputHash, and its artifacts must hash identically (§4). If they don't, that is a bug, reported as `diagnostics[].code = determinism.mismatch`.

## 4. Determinism and hashes

Three hashes, each with a different promise:

| Hash | Over | Promise |
|---|---|---|
| `inputHash` | canonical request (§2.1) | identity of the *question* |
| `artifacts[].sha256` | exact bytes | same inputHash + same runtime ⇒ **byte-identical** files. STL is already byte-identical; STEP is not yet (see FINDINGS item B2). |
| `geometryHash` (`kgh1:`) | per part, in name order: topology counts (solids, faces, edges, vertices), surface-type histogram, volume/area/bbox/centroid rounded to 1e-6 mm | same geometry ⇒ same hash **across runtimes and STEP schemas**. ECO tools use this to tell "geometry changed" from "the file header changed". |

The STEP header is stamped from the build, not the wall clock:
`FILE_NAME` time_stamp = build `createdAt` truncated to the day, or a fixed
epoch with `"reproducible": true`. Styled-item order is sorted by part name.

## 5. Webhooks

If `callbackUrl` is set, the server POSTs `{ "type": "build.succeeded" | "build.failed" | "build.canceled", "build": <Build> }`.

- Signature header: `KernelCAD-Signature: t=<unix>,v1=<hex hmac-sha256(secret, t + "." + body)>`.
- Delivery is at least once: 8 retries with exponential backoff up to 24 h, and `KernelCAD-Delivery-Id` is constant across retries for dedupe.
- Any 2xx within 10 s counts as delivered.

## 6. Errors

One shape everywhere, RFC 9457 `application/problem+json`:

```json
{
  "type": "https://docs.kernelcad.com/errors/idempotency_key_reused",
  "title": "Idempotency key reused with a different request",
  "status": 409,
  "code": "idempotency_key_reused",
  "detail": "Key 'eco-1182-c' was first used with inputHash sha256:94e0… at 2026-11-01T12:00:00Z.",
  "requestId": "req_01JC…",
  "errors": [ { "pointer": "/source/kcad/code", "message": "…" } ]
}
```

A failed build carries the same shape in `build.error`, with
`code ∈ { script_error, timeout, kernel_failure, export_failure, internal }`
and `diagnostics[]` using the CLI diagnostic codes (for example
`feature.invalid-args`, `dfm.wall.too-thin`). `script_error` is the caller's
fault and not retryable. `kernel_failure` is retryable once.
`internal` is our fault, not billed, and alerted on our side.

## 7. Limits and rate limits

Per org, enforced across all server processes (not per process):

| Limit | Default (plan-tunable) | On breach |
|---|---|---|
| Control-plane requests | 600 / min | `429`, `Retry-After` |
| Concurrent running builds | 4 | extra builds stay `queued`; nothing is rejected |
| Queued builds | 500 | `503 overloaded`, `Retry-After` |
| Builds / month | plan quota | `402 quota_exceeded` with `resetAt` |
| Build wall time | 120 s | build `failed`, `code: timeout` |
| Code size / body | 256 KiB / 1 MiB | `413` |
| Artifact retention | 30 days (signed link TTL 15 min, reissued on GET) | `410 artifact_expired` |

Every response carries `RateLimit-Limit`, `RateLimit-Remaining` and
`RateLimit-Reset` (IETF ratelimit-headers), plus `KernelCAD-Request-Id`.

## 8. What the buyer gets back for the ECAD wedge

Submit `source.template = { id: "pcb-enclosure", version: "1", inputs: { board } }`
with the board JSON from `spike-b2b/enclosure/boards/*.json`. The response
has `step` + `stl` per part + a drawing + `dfm` + `geometryHash`. When the
PCB changes, the buyer sends the new board and diffs `geometryHash` per
part. An unchanged lid keeps its hash.

---

## 9. What exists today and what is missing

Server paths are in `kernelCAD-server` (read at `b2e96c12`); web paths are in
this repo.

| Contract piece | Exists today | Missing |
|---|---|---|
| Submit a script, get a build | `/mcp` tools `evaluate_script`, `export`, `dfm_review` run hosted, in-process child pools: server `src/routes/export.ts:21-26,457`, `src/tools/registry.ts:95`. The geometry runtime is this repo: `src/agent/script-runtime/exportPhases.ts` (`exportSceneStep` :453), `src/composition/scriptEvaluation.ts` (`evaluateAndBuildScript`). | A REST `POST /builds` resource; one call that returns STEP + DFM + hashes together (today it is three tool calls, and each re-evaluates the script). |
| Template + JSON inputs | none. `.kcad.ts` can't import data, and the CLI has no `--param` (web `src/agent/cli/commands/export.ts`). | A `template` source kind: a script plus a typed input document, without splicing source text (spike uses `spike-b2b/enclosure/generate.ts`). |
| Async job model | In-memory jobs only: Studio export `?async=1` → `202 {jobId,statusUrl}` (server `src/routes/export.ts:709-731`, `src/lib/exportJobs.ts:42-44`, 15 min TTL, lost on restart). MCP deferred export polls via `export({job_id})` (`src/mcpTools/hostedExport.ts:385-527`). There is a generic still-running handoff (`src/mcp/callBudget.ts`). | A durable queue and jobs table, cancel, long-poll, and webhooks (none outbound: server `workers/` has only order-mail and telemetry). |
| Machine auth | Per-user PAT `kc_…` stored as sha256 (server `src/lib/mcpTokenAuth.ts:49-66`), but it is accepted only on `/api/v1/mcp/*`. `/mcp` takes only OAuth tokens (`src/routes/mcpAuth.ts:70`). OAuth 2.1 + DCR + PKCE via oidc-provider (`src/oauth/provider.ts`). | Org/tenant model (no `org_id`/`tenant` anywhere in server src or migrations), scoped org keys, test vs live keys. |
| Anonymous access off for B2B | `/mcp` lets anonymous calls through (`src/routes/mcpAuth.ts:102,118`). Only billable tools and collab tools require auth (`src/mcp/toolAccess.ts`). | A surface that requires a key. Today an unauthenticated client gets free STEP + DFM (verified live, §10). |
| Idempotency | Body-level keys only, for collab change sets and manufacturing quotes (`src/routes/manufacturingQuotes.ts:421`, `409 manufacturing.idempotency_conflict`). The handoff key sha256(caller+tool+args) joins *running* jobs only (`src/mcp/callBudget.ts`). | An `Idempotency-Key` header, an inputHash result cache for exports (none found for STEP/STL; mesh/render caches only, `src/routes/mesh.ts:549`). Live repeat calls create a new export each time (§10). |
| Artifact sha256 | Yes: `downloads[].sha256` (server `src/lib/exportDownloads.ts:317`), verified live. | Byte-determinism: STEP `FILE_NAME` carries the wall-clock time (web `src/kernel/export/stepHeader.ts` stamps only `originating_system`). Styled-item order differs between server and local builds (§10). |
| geometryHash | Building blocks only: `src/kernel/backends/occt/bindingFingerprint.ts`, per-feature fingerprints. | A canonical per-part geometry hash exposed in results. |
| DFM report | `dfm_review` (fdm, cnc) and the `dfmSpec` gates: web `src/modeling/runtime/dfm/runDfmChecks.ts`, `src/shared/intent/dfmSpecRecord.ts`. | `injection-molding` process (draft, uniform wall, bosses/ribs, undercuts). A `minWall` tolerance (`src/modeling/runtime/dfm/minWall.ts:185` compares strictly). |
| Runtime pinning | `_meta.serverBuild` on every result (server `src/mcp/toolResult.ts:83-93`). | Selectable runtime versions. Live is kernelCAD **0.17.2** per the STEP header, while this repo is 0.17.4. A buyer can't pin either. |
| Rate limits | `/mcp`: in-memory per process, 60/min anonymous, 120/min user, 600 or 1200/min IP; `429` + `Retry-After: 60` + `{"error":"rate_limited"}` (server `src/routes/mcpStreamable.ts:41-44,109,119`). Export: 20/min/user, `503` when the queue is full (`src/routes/export.ts:103-117,694-704`). | Per-org limits shared across processes, `RateLimit-*` headers (none emitted; none seen live), monthly quota for builds. |
| Retention | Signed links `/api/v1/exports/<id>/<file>?exp&sig`, 24 h, `410 download_expired` (server `src/routes/exportDownload.ts:53`, `src/lib/exportDownloads.ts`). Supabase bucket, 25 MB. | 30-day retention, customer-bucket delivery, link reissue. |
| Error shape | Several REST shapes (`{error}`, `{error,details}`, `{error:"tool_failed",code,message}`, `402 {quota_exceeded,…}`); MCP `{isError:true, content:[text]}` with plain text. | One problem+json shape with stable codes. |

## 10. Live call record: `https://mcp.kernelcad.com/mcp`

Made 2026-11-01 ~11:58 UTC, **without any API key or OAuth token** (I don't
have a machine key, and none is needed). Raw transcripts with signatures
redacted are in `spike-b2b/evidence/mcp-live/`.

```
POST /mcp  initialize (Accept: application/json, text/event-stream)
HTTP/2 200   content-type: text/event-stream
mcp-session-id: kc1.<base64 {"n":"spike-b2b-probe","v":"0.0.1"}>.<sig>
data: {"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{},"resources":{}},
       "serverInfo":{"name":"kernelcad","version":"1.0.0"}},"jsonrpc":"2.0","id":1}

GET /.well-known/oauth-protected-resource -> 200
{"resource":"https://mcp.kernelcad.com/mcp","authorization_servers":["https://mcp.kernelcad.com"],
 "scopes_supported":["openid","offline_access"],"bearer_methods_supported":["header"]}

tools/list -> 74 tools. search_assets / get_asset / get_variant are NOT among them.
tools/call search_assets -> 200, {"isError":true,"content":[{"text":"Vendor evaluator failed: Unknown tool: search_assets"}]}

tools/call evaluate_script {code: <devboard-65x30 enclosure, 12602 B, sha256 94e0e707…>}  6.3 s
  -> ok:true, featureCount 68, size [71,35,17.6], requirements dfm.minWall.base pass 1.9999 (limit 1.99),
     dfm.minWall.lid pass 1.99974
tools/call export {target:"model", format:"step", code:<same>}  4.5 s
  -> download_url https://api.kernelcad.com/api/v1/exports/20261101-…/devboard-65x30.step?exp=…&sig=<redacted>
     byte_count 392003, sha256 18ae3c82…, expires 2026-11-02T11:59:22Z
     downloaded: HTTP 200, 392003 bytes, sha256 matches the response
tools/call dfm_review {code:<same>, processes:["fdm"]}  5.3 s
  -> verdict "fail": base overhang 13.9 mm², lid overhang 735.5 mm² + 26.6 mm bridge (expected:
     the parts are modelled in assembly orientation, not print orientation); min-wall pass on all parts
export of the same box twice, same Idempotency-Key header:
  -> two different export ids, sha256 f3021dcd… vs 1937eecd…  (Idempotency-Key ignored; no RateLimit headers)
```

What this confirms about auth and transport:

- **Transport:** stateless MCP Streamable HTTP (JSON-RPC 2.0 over POST, SSE-framed replies). The `mcp-session-id` is not a session; it encodes client info.
- **Auth:** OAuth 2.1 (DCR + PKCE) is advertised, but **the build tools need no auth at all**. That is fine for the free agent channel and wrong for a B2B contract. It is the first thing to change.
- The STEP from the live server (kernelCAD 0.17.2, AP242 header) and the local export (0.17.4, AP214 header) have the same 8435 entities and identical geometry. They differ in the header and in the order of 2 `STYLED_ITEM` colour bindings (`evidence/mcp-live/live-vs-local-step.diff`). That is why §4 separates `artifacts[].sha256` from `geometryHash`.
