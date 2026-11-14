# Spike findings: ECAD-to-enclosure (A) and headless B2B API (B)

Date: 2026-11-01. Branch `spike/b2b-ecad` (from `develop` @ `0165bd66`).
Everything below was run in this worktree or against the live
`https://mcp.kernelcad.com/mcp`. Raw outputs are committed next to this file.

| Wedge | Verdict |
|---|---|
| A: board description to enclosure, no human | **PARTLY PROVEN.** The geometry half works end to end for two boards. The ECAD half (reading a real KiCad/Altium/ODB++ file) was not attempted, and the moulding claim is not checked by any tool. |
| B: headless B2B API | **PARTLY PROVEN.** The live server already runs submit-script, evaluate, STEP, DFM and signed download with no key. It lacks idempotency, a stable hash, an async job model, rate limits and machine keys. |

---

## Wedge A: ECAD to enclosure

### What was built

- `spike-b2b/enclosure/enclosure.kcad.ts` is one source. Its only board-specific
  lines sit between `// @board-begin` and `// @board-end`.
- `spike-b2b/enclosure/boards/*.json` holds the two board descriptions:
  - `devboard-65x30`: 65 × 30 mm, 2 mm chamfered corners, 4 × M2.5 holes,
    USB-C overhanging the -X short edge, one bottom-side part.
  - `controller-100x60`: 100 × 60 mm with one 8 mm chamfered corner, 4 × M3
    holes, barrel jack (-X), RJ45 (+X), 4-pole terminal block (+Y), one
    bottom-side MOSFET.
- `spike-b2b/enclosure/generate.ts` writes the JSON into the block and
  produces `out/<board>/<board>.kcad.ts`.
- `tests/integration/spike/b2bEnclosure.test.ts` is the derived-geometry
  test.

Everything is derived from the board data plus five knobs: `wall`,
`clearance`, `headroom`, `bossOD`, `screw`.

| Requirement | How it is derived | Proven by |
|---|---|---|
| Cavity = outline + clearance | Miter offset of the board polygon (non-rectangular outlines work) | envelope test, 4 sides + Z |
| Standoff bosses under the mounting holes, with OD and screw hole | One standoff per `holes[]`. Height = max(4, tallest bottom part + clearance + 1). Self-tap pilot is a `hole()` feature. Screw size is picked from the smallest hole Ø (≥ 3.1 → M3). Boss OD = screw clearance + 2 × wall. | boss-centre test (centre, OD, pilot open) |
| Cut-out for every edge connector, positioned from x/y, sized from w/d/h + clearance, with a lip | Edge = the bbox side nearest the footprint. Opening = footprint ± clearance, in Z from the board top (or bottom for bottom-side parts). The lip is a raised collar (width = wall, 1 mm proud). | port test: cut bbox = footprint ± clearance on all 4 sides; no base material in the connector cross-section; collar above and below the opening |
| Lid as a separate part, with mating bosses and screw closure | Lid plate, a locating skirt (0.2 mm slip fit) and one boss per mounting hole that clamps the PCB. The counterbored clearance bore is a `hole()` feature. Screw stack: lid → PCB → standoff. | boss test: lid and base boss centres equal each other and the hole within 0.005 mm; clearance bore and pilot open |
| Wall thickness, straight-wall variant reporting wall via dfmSpec | Straight walls, 0° draft. `dfmSpec({ minWall: wall - 0.01 })` | thickness test: 1 × 1 mm probe columns through all 4 walls, floor and lid each measure 2.000 mm. `kernelcad dfm` reports thinnest 1.9999 mm. |
| Same source, two different enclosures | Only the BOARD block differs | test asserts the sources are equal outside the block. Outer envelopes are 71 × 35 × 17.6 and 106 × 66 × 27.1 mm (see drawings). |

### Evidence (commands as run, outputs committed)

`spike-b2b/enclosure/out/<board>/evidence.log` has the full output of each
command. Abridged:

```
$ kernelcad evaluate out/devboard-65x30/devboard-65x30.kcad.ts
Features: 68
Requirements: 2 pass, 0 fail, 0 not evaluated.
OK
$ kernelcad export step  ...  -> Wrote 391973 bytes (kernelcad-assembly.step, 8423 ents)
$ kernelcad export stl --parts all ...
wrote base -> stl/base.stl (8160 tris, watertight)
wrote lid  -> stl/lid.stl  (12188 tris, watertight)
wrote pcb  -> stl/pcb.stl  (4164 tris, watertight)
$ kernelcad export svg-drawing ... --options {"autoAnnotate":true} --parts-list
WARN [drawing.auto.hole-unclassified] ... left 4 bore(s) without a callout (4 stacked bores)
drawing: 7 annotation(s) placed, 0 overlapped
$ kernelcad dfm out/devboard-65x30/devboard-65x30.kcad.ts
DFM: 3 parts, 3 clearance pairs, 0 wall clusters, 0 voids — PASS            [exit 0]
$ kernelcad interference out/devboard-65x30/devboard-65x30.kcad.ts
No interferences detected (3 parts, 3 comparisons, ε=0.01mm³).               [exit 0]

$ kernelcad evaluate out/controller-100x60/controller-100x60.kcad.ts
Features: 84 / Requirements: 2 pass / OK
STEP 430912 bytes; base 8208 / lid 12168 / pcb 4188 tris, all watertight
DFM: 3 parts, 3 clearance pairs, 0 wall clusters, 0 voids — PASS            [exit 0]
No interferences detected (3 parts, 3 comparisons, ε=0.01mm³).               [exit 0]

$ npx vitest run tests/integration/spike/b2bEnclosure.test.ts
 ✓ tests/integration/spike/b2bEnclosure.test.ts (11 tests) 19473ms
 Tests  11 passed (11)
```

Mutation check: I deleted the port-cut line and moved the lid bosses
+0.4 mm in X, then reran the test. Five tests failed: port cut-out ×2,
boss centres ×2, and PCB fit (the USB-C ran into solid wall). After restoring
the source, all 11 pass. The test measures the geometry; it does not just
check that the build succeeded.

Artefacts per board in `out/<board>/`: `.kcad.ts`, `.step`, `stl/{base,lid,pcb}.stl`,
`.drawing.svg` + `.png`, `dfm.json`, `evidence.log`. The demo clip is
`enclosure/demo/same-source-two-boards.mp4`, a 6 s turntable of both boards
side by side. I inspected frames visually: the USB-C slot shows on the 65×30
case and the portrait barrel-jack opening on the 100×60. Renders of the
-X and +X ends and the 65×30 drawing were also checked: the 71 × 35 × 17.6
envelope matches 65 + 2·(0.5+2) + 1 collar, 30 + 5, and
2 + 4 + 1.6 + 5 + 3 + 2.

### What does not work, or was not proven

1. **No ECAD input.** The board JSON was written by hand. Both fixtures are
   realistic but synthetic, and the repo has no real board-outline fixture.
   Nothing reads KiCad `.kicad_pcb` (Edge.Cuts, footprints, 3D model
   offsets), IPC-2581, ODB++ or IDF/IDX. "A PCB changes and the enclosure
   regenerates" is proven only from the JSON boundary onward. The adapter is
   the actual product and has not been started.
2. **"Injection-mouldable" is not checked by anything.** `dfmSpec` supports
   only `process: 'fdm'` (`src/shared/intent/dfmSpecRecord.ts:56`).
   `dfm_review` offers `fdm | cnc`. There is no draft-angle check, no
   uniform-wall/sink check, no boss-to-wall ratio check (moulding practice is
   about 0.6 × wall; I held bosses at 1.0 × wall because `minWall` is global),
   no undercut or side-action detection (every port opening is a side
   action), and no parting-line check. Draft is 0°. `.draft()` exists but
   was not applied. The parts have no corner radii, and the sharp internal
   corners would be stress risers in a moulded part.
3. **The min-wall gate fails a wall that is exactly at minWall.**
   `src/modeling/runtime/dfm/minWall.ts:185` compares strictly (`t < minWallMm`)
   on rays offset by `RAY_EPS_MM = 1e-4`, so a perfect 2.000 mm wall measures
   1.9999 and fails `minWall: 2`. The spike declares `wall - 0.01`. This needs a
   tolerance in the gate.
4. **The clearance gate proved nothing here.** All three part pairs are mated
   (exempt) or ignored (the lid clamps the PCB by design). The board fit comes
   from `kernelcad interference` and the test's PCB ∩ base/lid probes. The
   0.5 mm port clearance is asserted by the test, not by DFM.
5. **The drawing has no hole callouts for the screw stack.** autoAnnotate
   skips "stacked bores" (`drawing.auto.hole-unclassified`). The drawing is
   overall size + datums only, which is not a fabrication drawing.
6. **Spike limits on port handling.** A port's edge must lie on the
   outline's bounding box. Ports on a notch or an angled edge are not handled.
   There's one opening per connector and no merging of adjacent openings.
   Connector bodies are boxes from w/d/h, not vendor STEP, so plug overmould
   clearance is a guess (the clearance knob).
7. Single-file `.kcad.ts` scripts cannot import data, and the CLI has no
   `--param` override. Board data therefore has to be spliced into the source
   text (`generate.ts`). That works, but every board becomes a new script
   with a new hash. A B2B API needs a real "script + JSON inputs" call.

### What is missing to make it sellable

- A KiCad (then IPC-2581/ODB++) → board JSON adapter that pulls Edge.Cuts,
  mounting holes (NPTH/PTH by footprint class), connector footprints with real
  3D bodies (from the footprint's STEP model, `lib.fromSTEP`) and the side.
- An injection-moulding DFM process: draft per face against the pull
  direction, nominal-wall uniformity, boss/rib ratios, undercut / side-action
  report, and corner radii in the generator.
- Rules for real enclosure features: snap fits, ribs, gasket groove, light
  pipes, button actuators, vents, and labels/logo.
- A regression corpus of 20+ real boards. Two hand-written boards are a demo,
  not evidence of coverage.

### Single biggest risk (A)

**The ECAD side.** Real board data is messy: connectors overhang the board
and their bodies come from 3D models, not footprints. Mounting holes are
ambiguous (PTH vs NPTH vs fiducials). Keep-outs and tall parts away from the
edges matter. The geometry generator is the easy half, and the spike shows
it works. Turning arbitrary KiCad/Altium exports into a correct board
description without a human is unproven, and so is a moulder accepting the
result without the moulding DFM in item 2.

---

## Wedge B: headless B2B API

### What was done

1. I read the MCP tool surface in this repo (`src/agent/mcp/toolRegistry.ts`,
   `src/agent/mcp/registry/*`, `src/agent/mcp/cloudClient.ts`) and the export
   path (`src/agent/script-runtime/exportPhases.ts`). I also surveyed the
   server routes in `kernelCAD-server` at `b2e96c12`, not behind `origin/main`,
   and spot-checked the auth, rate-limit and job-handoff claims by reading
   the code.
2. I wrote `spike-b2b/API-CONTRACT.md`: an async `POST /builds` job model,
   `Idempotency-Key` + inputHash dedupe, three hashes (input, artifact bytes,
   canonical geometry), webhooks, problem+json errors, per-org limits with
   `RateLimit-*` headers, and an exists/missing table with server and web
   file paths (§9).
3. I made real calls against `https://mcp.kernelcad.com/mcp` (§10 of the
   contract, raw output in `spike-b2b/evidence/mcp-live/`). **I had no API
   key and did not need one.**

### Evidence (live, 2026-11-01 ~11:58 UTC, no credentials)

```
initialize                     -> 200 text/event-stream, serverInfo kernelcad 1.0.0, protocol 2025-06-18
/.well-known/oauth-protected-resource -> 200, authorization_servers ["https://mcp.kernelcad.com"]
tools/list                     -> 74 tools; search_assets/get_asset/get_variant absent
tools/call search_assets       -> isError: "Vendor evaluator failed: Unknown tool: search_assets"
evaluate_script (spike enclosure, 12602 B)   -> ok, 68 features, size [71,35,17.6], dfm.minWall pass   6.3 s
export step (same)             -> signed URL, 392003 B, sha256 18ae3c82…, download verified        4.5 s
dfm_review fdm (same)          -> verdict fail (overhang/bridge in assembly orientation), min-wall pass  5.3 s
export box twice, same Idempotency-Key -> 2 export ids, sha256 f3021dcd… ≠ 1937eecd…; no RateLimit-* headers
```

The brief said search_assets/get_asset/get_variant are on the live server.
**That is wrong.** They exist only in this repo's asset-catalog registry
(`src/agent/mcp/registry/assetCatalogTools.ts`). The hosted runtime build
does not include them, and calling one fails as shown above.

### Verdict: PARTLY PROVEN

The core loop already exists and is reachable headless. A script goes in;
evaluation, a signed STEP with sha256, and a DFM verdict come back in about
5 s per call, from a stock HTTP client. The things a B2B buyer pays for are
missing:

- **B1. No auth on the build path.** `/mcp` passes anonymous requests through
  (`kernelCAD-server/src/routes/mcpAuth.ts:102,118`). Only billable and collab
  tools are gated. Anyone can run STEP + DFM for free at 60 requests per
  minute per IP. Machine PATs (`kc_…`) exist but are per user, work only on
  `/api/v1/mcp/*`, and there is no org or tenant model.
- **B2. No determinism.** Two identical exports seconds apart produced
  different sha256s. `FILE_NAME` carries the wall-clock time
  (`src/kernel/export/stepHeader.ts` stamps only `originating_system`). The
  server (0.17.2, AP242) and local (0.17.4, AP214) STEP differ in header and
  in `STYLED_ITEM` order, though the geometry is the same. STL is
  byte-identical run to run (verified locally). STEP is the format the
  buyer wants.
- **B3. No idempotency.** The `Idempotency-Key` header is ignored, and there
  is no inputHash result cache for exports. The `callBudget` handoff only
  joins jobs that are still running.
- **B4. The job model is not durable.** Jobs live in memory (15 min TTL, lost
  on restart), there are no webhooks, rate limits are per process, and no
  `RateLimit-*` headers are sent.
- **B5. Three round trips, three evaluations.** evaluate, export and dfm are
  separate tool calls, and each rebuilds the model (6.3 s + 4.5 s + 5.3 s).
- **B6. Version drift.** Live runs kernelCAD 0.17.2 while `develop` is 0.17.4,
  and the caller can't pin a runtime.

### What is missing to make it sellable

In order: an org-key-gated `POST /builds` with a durable queue (B1, B4).
Reproducible STEP: header timestamp from the build, sorted styled items
(B2), which is a small change in `stepHeader.ts` / `stepAssemblyExport.ts`.
An inputHash cache, the `Idempotency-Key` header and one evaluation per
build (B3, B5). Runtime pinning (B6). A canonical `geometryHash`. Webhooks.
Then the sellable feature: an `injection-molding` DFM process, which is
wedge A item 2.

### Single biggest risk (B)

**Trust in the hash and the verdict.** An ECO or quoting platform stores
our hash and our DFM verdict against its revision. Today the same input
gives a different STEP hash on every call, the server version differs from
the repo, and the DFM processes on offer (FDM, CNC) are not the one an
enclosure buyer quotes (injection moulding). The API plumbing is a few
weeks of ordinary work. Reproducible output and a moulding DFM check that
a buyer will accept are the parts that decide whether this sells.

---

## Process notes

- AGENTS.md's commercial-source boundary says hosted API, quota and
  commercial orchestration design belongs in the private server repo.
  `API-CONTRACT.md` is in this PR because the brief asked for it; move it
  before merging anything here. No competitor comparison was written.
- No production code was changed. The two gate bugs found (min-wall
  equality, STEP timestamp) are reported here, not fixed.
