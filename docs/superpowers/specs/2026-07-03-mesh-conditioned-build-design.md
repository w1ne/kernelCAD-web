# Mesh-conditioned "Build as parametric CAD" — design

**Date:** 2026-07-03
**Validated by:** `kernelCAD-private` spike (`experiments/mesh2cad/`, results memo
`docs/strategy/2026-07-03-mesh-conditioned-parametric-spike-RESULTS.md`).

## Problem

"Build as parametric CAD →" (kernelCAD-web `StudioGenerate.buildConceptAsCad`)
today calls `submit(conceptPrompt, undefined)` — a text-only agent build with just
the prompt. For underspecified prompts this yields a flat plate (the "looks nothing
like the request" failure) or times out. The spike proved that conditioning
generation on the concept mesh (Tripo render + measured proportions) turns the
bracket flat-plate into a real bracket (proportion-match 0.73 → 0.98).

## Approach

When the button fires with a concept mesh in hand, route `/api/v1/generate` to a
**single-shot vision draft** instead of the text tool-loop, emitting the SAME SSE
events so the existing review/accept UI works unchanged. All existing auth, quota,
and kill-switch protection on `/api/v1/generate` applies unchanged.

Rejected: threading images through the gemma tool-loop (re-introduces the latency
wall; the spike validated single-shot VL). Rejected: draft-then-auto-refine (bigger
build, same latency risk) — the VL draft IS the reviewable result; the user edits
from there.

## Data flow

```
preview (has the Tripo mesh already) ─► preview_done gains:
    renderImageUrl (Tripo output.rendered_image)  +  proportions (GLB bbox ratios)
        │ web stores them on the preview phase
   click "Build as parametric CAD →"
        │ startGeneration({ prompt, mesh: { renderImageUrl, proportions } })
   /api/v1/generate:  mesh present → generateFromMesh (Qwen3-VL-30B, 1 shot + 1 repair)
                      mesh absent  → existing orchestrator (UNCHANGED)
        │ same SSE: generation → done{artifact} | error
   existing diff-review UI: Use / Discard
```

## Components

### Server (kernelCAD-server)

- **`src/lib/meshFingerprint.ts`** — `fingerprintGlb(url): Promise<{extentRatios:[x,y,z]}>`.
  Fetch the GLB, parse the binary header + JSON chunk, union every POSITION
  accessor's `min`/`max` → bounding box → ratios normalized to the longest axis.
  No geometry decode, no new dependency. Returns `null` on any parse failure
  (conditioning degrades to prompt-only, never blocks the build).
- **`src/lib/dimensionPrompt.ts`** — pure helpers:
  - `hasExplicitDimensions(prompt): boolean` — regex for `\d+ *mm`, `\d+ *cm`,
    `\d+ *[x×] *\d+` (the dimension-aware gate).
  - `buildMeshConditionedMessages({prompt, proportions, hasDims}): {system, userText}`
    — the spike's proven param-free system + conditioning text. When `hasDims` is
    true the conditioning says "the prompt's stated dimensions are authoritative;
    use the mesh only for overall FORM and feature layout" (fixes the enclosure
    regression where normalized proportions fought stated mm).
- **`src/agent/meshToScript.ts`** — `generateFromMesh(input): Promise<AgentResult>`
  where `input = {prompt, renderImageUrl, proportions, onEvent, signal, timeoutMs}`.
  Builds vision messages (text + `image_url`) via `getLLM()` (the openai SDK client
  already supports vision content), model `Qwen/Qwen3-VL-30B-A3B-Instruct`, extracts
  the fenced param-free script, validates with `createServerGateRunner()`, and on
  gate failure does ONE repair retry with the error fed back. Returns the same
  `AgentResult` shape the route already handles (`parseArtifact` for the artifact).
- **`src/routes/generate.ts`** — accept optional `mesh?: {renderImageUrl, proportions}`
  in the body (zod). When present → `generateFromMesh`; else the existing path.
  Same SSE emission for both.
- **`src/routes/preview.ts`** — `preview_done` gains `renderImageUrl` (Tripo
  `output.rendered_image`) and `proportions` (from `fingerprintGlb`). `tripoClient`
  already parses the output; extend `Text3dResult` with `renderImageUrl`; the route
  fingerprints the GLB before emitting. Both additive/optional.

### Web (kernelCAD-web)

- **`previewClient.ts` / `useTextTo3dPreview.ts`** — `preview_done` parsing and the
  `done` phase carry `renderImageUrl?: string` and `proportions?: number[]`.
- **`generateClient.ts` `startGeneration`** — accept optional
  `mesh?: {renderImageUrl, proportions}`, forward in the POST body.
- **`useGeneration.submit`** — accept an optional third arg `mesh` and pass through.
- **`StudioGenerate.tsx`** — `buildConceptAsCad` passes the preview's mesh context
  into `submit`. Keep the existing fresh-generation semantics (never an edit).
  The concept prompt + mesh both come from the last preview.

## Error handling

- `fingerprintGlb` failure → `proportions` omitted; generation still runs
  (render image alone is strong signal). Never blocks.
- VL build gate-fails twice → normal `error` event → existing error UI.
- Mesh fields absent (e.g. user typed a prompt and hit Build without a preview) →
  text path, exactly as today. Fully backward compatible.

## Testing

- `meshFingerprint.test.ts` — a tiny hand-built GLB (or fixture) with known
  accessor min/max → expected ratios; parse-failure → null.
- `dimensionPrompt.test.ts` — `hasExplicitDimensions` truth table (bracket=false,
  "70x50x30mm"=true, "40mm"=true); conditioned message includes the param-free rule
  and the dims-authoritative clause only when hasDims.
- `meshToScript.test.ts` — mock `getLLM()` returning a fenced script; assert vision
  content shape (image_url present), param-free extraction, gate-pass → artifact,
  gate-fail-then-pass → one retry, gate-fail-twice → error.
- `generate.integration` — body with `mesh` routes to the mesh path (mock
  generateFromMesh); without `mesh` uses the orchestrator (unchanged).
- Web: `useTextTo3dPreview` surfaces the new fields; `StudioGenerate` passes `mesh`
  into submit (mock useGeneration, assert 3rd arg).

## Deploy order

Server first (new preview fields + mesh generate path are additive/backward-compatible),
then web (which sends `mesh` and reads the new preview fields). A web deploy before
the server just means `mesh` is ignored and preview fields are undefined — degrades
to today's behavior, never breaks.

## Out of scope

CAD-Recode / hosted mesh→code model (later upgrade, same UX); solidity metric
(render image carries shape-class); multi-view renders (Tripo's single canonical
render sufficed in the spike); auto-refine loop.
