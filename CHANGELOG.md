## [Unreleased]

### Changed — diagnostic vocabulary collapse (milestone C)

The kernel-emitted diagnostic surface shrinks from ~80 codes (12 namespaces)
to **24** (8 namespaces). Every remaining code corresponds to a distinct
agent recovery action. `hint` is now a mandatory field on every
`CompilerDiagnostic`; the parallel `hints[]` array previously returned by
`why_did_this_fail` is retired (per-code hints now live inline on every
diagnostic). The `reachable` meta-classification (`engine-path` /
`direct-lowerer-only` / `tool-error-field` / `reserved`) is dropped entirely.

`why_did_this_fail` is reshaped to a pure upstream-walk tool: returns
`chain[]` of `{ feature_id, kind, health, diagnostics }` in topological
order, with the requested feature last. New MCP tool `list_diagnostic_codes`
enumerates the 24-code catalogue with hint templates (15 → 16 MCP tools).

`SKILL.md` shrinks from 537 → 365 lines (the ~150-line `## Diagnostic Codes`
section is replaced by an 8-line `## When something fails` block).

Pre-1.0 hard rename — no aliases, no deprecation period. Migration table
(every emitted code on `develop` before this change → its replacement):

```
OLD CODE                                              → NEW CODE
feature.fillet.no-base                                → feature.invalid-args
feature.fillet.no-radius                              → feature.invalid-args
feature.fillet.empty-groups                           → feature.invalid-args
feature.fillet.invalid-group                          → feature.invalid-args
feature.fillet.invalid-edge-ref                       → feature.invalid-args
feature.fillet.failed                                 → feature.kernel-failed
feature.chamfer.no-base                               → feature.invalid-args
feature.chamfer.no-distance                           → feature.invalid-args
feature.chamfer.empty-groups                          → feature.invalid-args
feature.chamfer.invalid-group                         → feature.invalid-args
feature.chamfer.invalid-edge-ref                      → feature.invalid-args
feature.chamfer.failed                                → feature.kernel-failed
feature.shell.no-base                                 → feature.invalid-args
feature.shell.no-thickness                            → feature.invalid-args
feature.shell.failed                                  → feature.kernel-failed
feature.mirror.no-base                                → feature.invalid-args
feature.mirror.invalid-plane                          → feature.invalid-args
feature.mirror.failed                                 → feature.kernel-failed
feature.transform.invalid-translate                   → feature.invalid-args
feature.transform.invalid-rotate                      → feature.invalid-args
feature.transform.invalid-scale                       → feature.invalid-args
feature.transform.invalid-reflect                     → feature.invalid-args
feature.transform.invalid-plane                       → feature.invalid-args (folded for safety)
feature.extrude.unsupported-profile                   → feature.invalid-args
feature.extrude.bad-sketch                            → feature.invalid-args
feature.extrude.bad-points                            → feature.invalid-args
feature.extrude.bad-params                            → feature.invalid-args
feature.extrude.failed                                → feature.kernel-failed
feature.revolve.unsupported-profile                   → feature.invalid-args
feature.revolve.crosses-axis                          → feature.revolve.crosses-axis  (kept)
feature.revolve.empty-profile                         → feature.invalid-args
feature.revolve.failed                                → feature.kernel-failed
feature.revolve.bad-sketch                            → feature.invalid-args
feature.sweep.invalid-rail                            → feature.invalid-args
feature.sweep.failed                                  → feature.kernel-failed
feature.sweep.multi-face-profile                      → feature.kernel-failed
feature.sweep.profile-too-large                       → feature.kernel-failed
feature.sweep.spine-self-intersection                 → feature.kernel-failed
feature.sweep.bad-sketch                              → feature.invalid-args
feature.sweep.unsupported-profile                     → feature.invalid-args
feature.loft.empty-sections                           → feature.invalid-args
feature.loft.invalid-planes                           → feature.invalid-args
feature.loft.failed                                   → feature.kernel-failed
feature.loft.bad-sketch                               → feature.invalid-args
feature.sketch.degenerate-arc                         → feature.sketch.degenerate-arc  (kept)
feature.sketch.reflect.invalid-axis                   → feature.invalid-args
feature.sketch.failed                                 → feature.kernel-failed
feature.sketch.bad-commands                           → feature.invalid-args
feature.path.label-without-segment                    → feature.invalid-args
feature.path.duplicate-label                          → feature.invalid-args
feature.edge-feature.face-ref-not-resolvable          → feature.face-ref.not-resolvable
feature.edge-feature.face-ref-not-applicable          → feature.face-ref.not-applicable
feature.edge-feature.face-ref-not-supported           → feature.face-ref.not-supported
feature.edge-feature.face-ref-ambiguous-after-split   → feature.face-ref.ambiguous-after-split
feature.edge-feature.face-ref-removed                 → feature.face-ref.removed
feature.edge-feature.no-edges-match                   → feature.selection.no-match
feature.edge-feature.ambiguous-selection              → feature.selection.ambiguous
feature.edge-feature.invalid-query                    → feature.invalid-args
feature.face-feature.face-required                    → feature.invalid-args
feature.face-feature.face-ref-not-resolvable          → feature.face-ref.not-resolvable
feature.face-feature.face-ref-not-applicable          → feature.face-ref.not-applicable
feature.face-feature.face-ref-not-supported           → feature.face-ref.not-supported
feature.face-feature.face-ref-ambiguous-after-split   → feature.face-ref.ambiguous-after-split
feature.face-feature.face-ref-removed                 → feature.face-ref.removed
feature.face-feature.no-match                         → feature.selection.no-match
feature.face-feature.label-not-resolvable             → DROPPED (already deprecated)
feature.label.unknown-name                            → feature.label.unknown-name  (kept)
feature.label.no-upstream-sketch                      → feature.label.no-upstream-sketch  (kept)
feature.label.unsupported-base                        → feature.label.unsupported-base  (kept)
feature.label.mixed-convexity                         → feature.label.mixed-convexity  (kept)
feature.label.collision                               → feature.label.collision  (kept)
feature.label.query-no-match                          → feature.selection.no-match
feature.label.unsupported-on-shape                    → feature.face-ref.not-applicable
feature.face-query.invalid-axis                       → feature.invalid-args
capture.faceLabels.invalid-shape                      → feature.invalid-args
capture.faceLabels.invalid-key                        → feature.invalid-args
capture.faceLabels.invalid-value                      → feature.invalid-args
recompute.input.missing                               → recompute.input.missing  (kept)
recompute.lowering.exception                          → recompute.lowering.exception  (kept)
cli.script.exception                                  → cli.script-exception
cli.file.read                                         → cli.file-read
cli.no-input                                          → cli.invalid-args
cli.export.exception                                  → cli.export-exception
export.feature-not-found                              → export.feature-not-found  (kept)
export.no-shape                                       → export.no-shape  (kept)
export.shape-not-lowered                              → recompute.input.missing
```

The CLI codes change from dotted (`cli.script.exception`) to dashed
(`cli.script-exception`) for namespace consistency.

Spec: diagnostic-vocabulary-milestone-c-design (in kernelCAD-private).
Plan: 2026-05-05-diagnostic-vocabulary-milestone-c (in kernelCAD-private).

### Added — User-tracking pipeline (kernelcad.com + daily stats)

- **Cloudflare Web Analytics** anonymous beacon snippet on `site/index.html` and `site/thanks.html` — pageviews + uniques without cookies, no IP storage. Token wired in by `.github/workflows/setup-user-tracking.yml` on first run.
- **Email opt-in form** on the landing page → POST to `site/functions/api/subscribe.ts` (Cloudflare Pages Function) → INSERT OR IGNORE into `subscribers` D1 table. Form is no-JS-fallback friendly (303 redirect on success or `?error=...` on failure). Source attribution via `?ref=hn` URL params.
- **`/thanks` success page** at `site/thanks.html`.
- **D1 schema** at `site/migrations/0001_subscribers.sql`: `subscribers (email PK, source, ip_country, created_at)`.
- **`site/wrangler.toml`** with D1 binding template (database_id filled by setup workflow).
- **`scripts/setup-user-tracking.sh`** — one-time local provisioning script. Creates D1, applies schema migration, provisions Web Analytics site (if `CLOUDFLARE_API_TOKEN` env var is set), patches `site/wrangler.toml` + `site/index.html` + `site/thanks.html` with the actual IDs/tokens. Run once with `bash scripts/setup-user-tracking.sh` after `npx wrangler login`. Idempotent — re-runs detect existing resources and skip.
- **`.github/workflows/usage-stats.yml`** — daily cron (03:30 UTC) pulling GitHub traffic + repo stats + npm download counts; appends/updates a row in `docs/usage/daily.md` and auto-commits to develop.
- **7 vitest tests** for the subscribe Pages Function at `site/functions/api/subscribe.test.ts` covering happy path, malformed email, missing email, source fallback, D1 failure, and dedup.

Spec: user-tracking-design (in kernelCAD-private).

### Changed — CI parallelization (~40-45% wall-clock reduction)

- **`ci.yml` and `deploy.yml` refactored** into three parallel QC jobs (`lint`, `build-and-checks`, `test`) plus a `web-build` job in `deploy.yml` for the Pages bundle. Estimated wall-clock reduction from ~3:30 to ~1:30 (≈45%).
- **New composite action** `.github/actions/setup-cad/action.yml` shares setup steps (setup-node + caches + conditional `npm ci`) across all jobs.
- **Three caches added**: `node_modules` keyed on `package-lock.json`, build artefacts (`.tsbuildinfo` + `node_modules/.cache` + `node_modules/.vite`) keyed on TS/vite source hashes, plus the existing `~/.npm` cache from `actions/setup-node`.
- **`package.json` scripts split**: new `qc:lint` / `qc:build` / `qc:test` sub-scripts; existing `qc` becomes the meta-script `npm run qc:lint && npm run qc:build && npm run qc:test`. Local-dev workflow unchanged — `npm run qc` still runs the full chain.
- **`Build` step removed from `ci.yml`**: it was redundant with `qc:build`'s `typecheck + build:cli`. The Vite production build still runs in `deploy.yml`'s `web-build` job for Pages upload.
- **`e2e` job in both workflows** now `needs: [lint, build-and-checks, test]` (gates on all three QC jobs being green).

See ci-acceleration-design (in kernelCAD-private) for design rationale.

### Added — v0.21 synchronized live-build demo automation

- **Kernel feature-event stream** (`FeatureEvent`/`FeatureEventSink`) emitted from `RecomputeEngine.run()` per topo-ordered feature.
- **`/demo-player` route** with chrome-free split-screen + `window.__demoPlayer` driver API.
- **Tier-2 kind-specific animation engine** (5 transitions: add / boolean.cut / boolean.fuse / modifier / transform).
- **Adaptive pacing engine** with caps + per-feature override (`--pacing <override.json>`).
- **`scripts/captureDemo.ts` orchestrator** — Vite + Playwright + ffmpeg pipeline producing 1920×1080 30fps H.264 MP4 ≤30s + sharp 4-quadrant H11 static panel.
- **`scripts/lint-demos.ts` CI gate** enforcing per-module-ship demo set presence + non-`TODO:` `whats-new.md`.

### Changed

- **H11 amended** in v0.2-to-v1.0 gap-closure roadmap spec: GIF dropped, MP4-only, synchronized live-build narrative locked.
- **Workstream #21 row** in roadmap inventory: renamed "Synchronized live-build demos (visual verifier deferred to v0.21.1 follow-up)".

### Deferred

- Visual verifier loop (`render_views`, `compare_to_intent`, VLM-critique) → v0.21.1 follow-up workstream.

### Added — Cookbook v1 (workstream #22)

- **12 curated `.kcad.ts` pattern snippets under `cookbook/snippets/`** covering edge features, booleans, holes, sketches, symmetry, and parameters. Each snippet is a markdown file with YAML frontmatter (`id`, `title`, `tags`, `keywords`, `when_to_use`) plus a fenced TypeScript body. Tag whitelist at `cookbook/tags.json`.
- **Pure BM25 retrieval module at `src/cookbook/`** — `search(query, snippets, k=3)` ranks over `title + tags + keywords + when_to_use` (body excluded), score floor 0.5, k clamped to [1, 5]. ~60 LoC pure TS, no external deps. Snapshot test locks ranking on 5 hand-picked queries.
- **MCP tool `lookup_cookbook(query, k?)`** — registered alongside the 14 existing tools. Returns `{ ok, hits[] }`; empty hits is a valid success ("no canonical pattern; proceed without cookbook help").
- **SKILL.md cookbook index** — build-generated section between `<!-- COOKBOOK:START -->` / `<!-- COOKBOOK:END -->` markers. CI gate: `npm run cookbook:build && git diff --exit-code src/skill/SKILL.md`.
- **Eval `--cookbook` flag** — pre-injects top-3 retrieval results into a separate `cache_control` block on the system prompt; emits a `cookbook_inject` `TranscriptEvent` per task. A/B golden test (`eval/cookbook.test.ts`) locks deterministic ranking against the bracket-holes prompt.
- **`npm run eval:ab`** convenience script — runs the suite twice (off then on) and prints the per-task score / token delta.
- **CI gates wired into `npm run qc`**: `cookbook:validate` (frontmatter + tag whitelist), `cookbook:evaluate` (every body must `kernelcad evaluate` clean), `cookbook:build` + diff-check.

Continuous growth contract per spec §"Continuous": same-PR additions; eval-driven additions; snapshot-test gate on ranking shifts; tag whitelist gate on vocabulary growth.

Per the gap-closure roadmap §I4 / first-wave dispatch doc, this is workstream #22.

---

## v0.21.1 — demo-quality patch (2026-05-03)

### Added

- **Per-feature mesh organization in demo player.** Reveal order now matches the feature graph (was OCCT iteration order). Each feature becomes a named `THREE.Group` built Node-side via `meshFeaturesPerFeature` (uses `RecomputeEngine` + `OcctLowerer` — same path as eval). Bridge serialization (`serializeForBridge` / `rehydrateFromBridge`) handles TypedArray transport over the Playwright `page.evaluate` boundary.
- **AnimationEngine color-flash transitions fire.** `boolean.cut` (red on cutter), `boolean.fuse` (yellow glow), and `modifier` (cyan flash on fillet/chamfer) now actually run because the per-feature `THREE.Group` lookup succeeds. Predecessors fade out as the carved/fused/modified result fades in. Material aligned to `MeshPhongMaterial` (matches `buildMeshFromFace`) — pre-existing `MeshStandardMaterial` probe was a silent no-op since v0.21.
- **Browser worker `{ face: 'top'|'bottom'|'left'|'right'|'front'|'back' }` parity.** `v01ApiShim` lowers canonical face refs to a Replicad `EdgeFinder` via axis-aligned bbox lookup. Closes the v0.2 syntax gap that previously forced demo fallback to `box-minus-divider`. Live-editor verified: `box(50,50,8).subtract(cyl).fillet(r, { face: 'top' })` produces 7→12 faces (fillet adds 5).
- **Shared meshing helpers** at `src/backends/occt/meshing.ts` — both browser worker and Node-side capture use the same face/edge extraction code.
- **`FeatureEvent.op`** field — explicit `'subtract' | 'union' | 'intersect'` populated Node-side (replaces the implicit `shape.__op` probe in AnimationEngine).
- **`MeshFeaturesResult.failedFeatureIds`** surfaces partial-failure state from `meshFeaturesPerFeature` so `captureDemo` can abort with a clear error instead of producing a broken scene.

### Changed

- **v0.2 demo re-captured** with the original `subtract-then-fillet-rim` intent — square plate, through-hole, fillet on top edges (perimeter + hole rim, both belonging to the same `top` face after the boolean). Replaces `box-minus-divider/` fallback (git-removed; history preserved via the v0.21 ship commit).
- **v0.21 hero demo re-captured** to verify color-flash transitions fire end-to-end.

### Fixed (bugs surfaced during integration)

- **`v01ApiShim.unwrap()`** used the `in` operator which fires the Proxy `has` trap (undefined → always false), so it was effectively a no-op. Tests passed because Replicad accepted the proxy via transparent get-forwarding. Switched to property access which fires the `get` trap correctly.
- **`meshFeaturesPerFeature` missing `await initOcct()`** — every feature failed with "OCCT not initialized" in production paths; unit tests passed because of `beforeAll(initOcct)`.
- **`CameraController.nudgeTo`** cast scene objects to `THREE.Mesh` (worked pre-v0.21.1 when scenes held meshes named by featureId; broken after Task 5's `THREE.Group` refactor). Now uses `THREE.Box3().setFromObject()` which works on any `Object3D`.
- **Camera rotation hard-cut to `(rotateRadius, 80, 0)`** at t=0 and ended there at t=1, producing edge-on hero frames for flat geometry (e.g., the v0.2 plate). Now orbits from the camera's current iso angle and returns to it.
- **`bboxOf` degenerate fallback** silently returned `Infinity` bounds when neither `boundingBox` nor face-mesh was available; now throws a clear diagnostic.
- **Material `transparent: true` left set** by `AnimationEngine.setOpacity` even at full opacity, causing `MeshPhongMaterial + DoubleSide` depth-sort artifacts (ghost geometry visible through front faces). Added `setOpaque()` helper.

### Known limitations

- **Rotated/transformed canonical face refs** in the browser worker still throw a clear deferred-feature error (matches Node `findCanonicalFaceHash` is the source of truth). Tracking deferred to a future workstream.
- **`captureDemo`'s "latest run" picker** resolves to the alphabetically-last `eval/runs/` dir — if multiple runs exist for different tasks, the wrong dir may be picked. Workaround: use explicit `--script`/`--prompt` flags. Pre-existing latent bug, not blocking v0.21.1.

### Reframed

- **Visual verifier loop** (`render_views`, `compare_to_intent`, VLM-critique) — was tagged for v0.21.1 in the v0.21 design; reframed to **v0.22** (separate workstream).

---

## [0.2.1] — 2026-05-04

Closes workstream #1 (v0.2 finish). Delivers a complete face-reference story: canonical tracked refs across transforms and booleans (PR #53, already on `develop`), user-named face labels via `faceLabels` on creating ops, `FaceQuery` polish with four new filter keys, two new label-driven eval tasks, and expanded MCP introspection. No npm publish.

### Added

- **Tracked face/edge refs** through every transform (`.translate`, `.rotate`, `.scale`, `.reflect`, `.mirror`) and every unambiguous boolean (`.subtract`, `.union`, `.intersect`). PR #53. Per-shape `historyMap: Map<FaceHash, FaceLineage>` on `OcctBackend`; resolution walks back to the originating primitive via OCCT `BRepAlgoAPI_*::Generated/Modified/IsDeleted` callbacks, then forward through history. Scripts that previously required "apply edge feature before transforms" now work with no syntax change.

- **`faceLabels` API** on `box`, `cylinder`, `extrudeRect`, `extrudeCircle`, `extrudePolygon`, `extrudeRoundedRect`, `revolveRect`, and sketch-derived `Sketch.extrude` / `Sketch.revolve` / `Sketch.sweep` / `Sketch.loft`. Option arg is `Record<string, CanonicalFace | FaceQuery>`: keys are user-chosen labels; values are either a canonical face alias (`'top'`, `'bottom'`, etc.) or a `FaceQuery` descriptor. Labels survive transforms and unambiguous booleans via the same lineage walker as canonical refs. `sphere` rejects `faceLabels` with `feature.label.unsupported-on-shape`.

- **`FaceQuery` polish** — four new filter keys:
  - `byNormal: 'X' | '-X' | 'Y' | '-Y' | 'Z' | '-Z'` — signed-axis normal selector; rejects invalid axis strings with `feature.face-query.invalid-axis`.
  - `minArea` / `maxArea` — face-area filters in mm².
  - `boundingBoxIn: BoundingRegion` — face bbox containment filter, symmetric with `EdgeQuery.within`.

- **Diagnostic codes** — all with HINTS entries:
  - `feature.label.collision` — two upstream features declare the same label visible to a consumer.
  - `feature.label.query-no-match` — a query-based label resolves to zero faces at the consumer site.
  - `feature.label.unsupported-on-shape` — `sphere` rejects `faceLabels`.
  - `feature.face-query.invalid-axis` — `byNormal` received an unrecognized axis string.
  - Capture-time codes: `capture.faceLabels.invalid-shape`, `capture.faceLabels.invalid-key`, `capture.faceLabels.invalid-value` — malformed `faceLabels` option arg.
  - `feature.edge-feature.face-ref-ambiguous-after-split` and `feature.edge-feature.face-ref-removed` — from PR #53 tracked-refs work.
  - `feature.face-feature.face-ref-ambiguous-after-split` and `feature.face-feature.face-ref-removed` — same, for `.shell()`.

- **`list_face_labels` MCP tool extended** to surface `faceLabels`-declared labels alongside existing sketch-segment labels. Each `LabelSummary` gains a `source` discriminator (`'faceLabels'` vs `'sketch-segment'`).

- **`list_api` MCP tool** advertises `faceLabels` per accepting feature kind via a new `featureKindFaceLabels` section in tool output.

- **Eval corpus** — five tasks total, all verified via `eval/corpus-v0.2.test.ts` at 100% expert score:
  - `fillet-translated-box`, `subtract-then-fillet-rim`, `chamfer-rotated-wedge` — three v0.2 tracked-refs tasks (canonical face refs surviving transforms/booleans).
  - `labeled-bracket-fillet`, `labeled-cylinder-shell` — two new label-driven tasks exercising `faceLabels` declaration + consumption.

- **SKILL.md** — "Labels" subsection added documenting `faceLabels` syntax, lineage rules, and one sample script. Per-op signature lines updated to include `faceLabels?` for all six accepting ops.

### Updated hints

- `face-ref-not-resolvable`: drops the obsolete "apply transforms after fillet/chamfer" workaround language (no longer needed).
- `face-ref-not-supported` for `tracked` / `created` / `propagated`: reclassified from "v0.5+ reserved" to "internal-only / planned for future versions".

### Added — Demos

- **`docs/demos/v0.2/labeled-extrude-bracket/`** — 60×30×12 mm bracket built via `extrudeRect` with a query-based `faceLabels: { rim: { atZ: 12, parallelTo: 'XY' } }`, then filleted by label name.
- **`docs/demos/v0.2/labeled-cylinder-cap/`** — hollow cylinder with canonical-alias `faceLabels: { cap: 'top' }`, shelled through the labeled face, then translated. Exercises label survival across transforms.
- **`docs/demos/v0.2/subtract-then-fillet-rim/`** — refreshed `whats-new.md` to the three-section memorable-builds-policy format. Existing demo content unchanged.

All three pass `npm run lint-demos`. v0.2 is grandfathered in the memorable-builds-policy catalog, so the `heroArtifact` slug isn't enforced.

### What's NOT in this release

- `edgeLabels` (symmetric `Record<userLabel, CanonicalEdge | EdgeQuery>`) — deferred to v0.3 alongside `hole()` / `cut()`.
- Geometry-snapshot fallback for ambiguous face splits — planned for a future release. Ambiguous cases produce a clear diagnostic with workaround language.
- `created` face refs and `propagated` face refs — planned for future releases.
- npm publish — explicitly deferred (README polish + smoke-tested install path not yet ready).

### Project status

This release is part of an ongoing prototype effort. The kernel surface is growing; the agent layer (eval harness, agent loop) remains the priority for upcoming work.

---

## v0.1.0 — first public release + NORTHSTAR re-baseline (2026-05-02)

The first kernelCAD release published to the npm registry. Install with `npm install -g kernelcad`.

### Re-baseline note

Prior to this release, the repo carried 34 internal tags (`v0.0.1` through `v0.13.0-rc.17`) reflecting iterative development. None were ever published. All have been deleted; this release starts a clean, NORTHSTAR-aligned numbering line where each `v0.N.0` corresponds to one NORTHSTAR module fully delivered.

`v0.1.0` ships NORTHSTAR's v0.1 module ("Foundation"): feature graph, recompute engine, OCCT backend via Replicad, primitives (box/cylinder/sphere), CLI (`evaluate`, `export stl`, `export step`), JSON diagnostics, canonical face refs.

### Bonus surface (NORTHSTAR modules partly delivered out-of-order)

Beyond the v0.1 contract, this release also includes:

- **v0.2 partial** — `.fillet()`, `.chamfer()`, `.shell()`, `path()` builder with `lineTo`/`tangentArc`/`threePointsArc`/`sagittaArc`/`bulgeArc`/`radiusArc`, `.label()`. Tracked face/edge refs across transforms/booleans **deferred to v0.2.0**.
- **v0.3 partial** — `.shell()` ships. `hole`/`cut`/`draft` as first-class features and `created` face refs **deferred to v0.3.0**.
- **v0.7** — `.sweep()` and `.loft()` (curves + surfacing).
- **v0.11** — MCP server with 13 introspection tools (`why_did_this_fail`, `list_topology`, `get_shape_info`, `list_edges`, `list_faces`, `list_face_labels`, `list_features`, `list_api`, `evaluate_script`, `get_edges_of`, `set_param_value`, `add_feature`, `remove_feature`).
- **v0.12 partial** — MCP AST-edit tools (`add_feature`, `remove_feature`, `set_param_value`). Skill installer and one-file context bundler **deferred to v0.12.0**.

### Symmetry features (not on the NORTHSTAR module roadmap, additive)

- `.mirror(plane)` / `.reflect(plane)` for symmetric parts.
- Binary STL export (`kernelcad export stl ...` and `export_stl` MCP tool).
- Variable-radius fillet/chamfer.
- Edge/face query selectors (`selectEdges`, `selectEdge`, `EdgeQuery`, `FaceQuery`).

### Diagnostic surface

53 documented diagnostic codes across feature/recompute/cli/export categories, each with a HINTS entry, structurally enforced by a CI sentinel.

### Positioning

kernelCAD is the open, MCP-native, AST-edit-primacy CAD kernel for iterative agent workflows. Source is on GitHub. Diagnostics are structured and hint-rich. The MCP server lets an agent introspect a live model across many queries in one session instead of re-running the script per question.

### License

MIT License.

---

## v0.13.0-rc.17 — quality pass v5 (2026-05-01)

A pure quality milestone closing the rc.16 review punch list (1 Critical + 5 Important + 8 Nits) plus a structural backstop for the entire "diagnostic emitted but no hint" failure class.

### Structural HINTS-coverage sentinel
- New `tests/unit/mcp/hintsCoverage.test.ts` walks the kernel's diagnostic-emitting source files (`script-runtime/export.ts`, `compute/recomputeEngine.ts`, `backends/occt/occtLowerer.ts`, `backends/occt/edgeSelection.ts`, `capture/proxy.ts`, `capture/sketch.ts`, `intent/kernelError.ts`), extracts every `code: '...'` literal, and asserts each has a HINTS entry OR is on a documented allowlist.
- The sentinel's first run discovered **5 silent gaps** that had accumulated across rcs: `feature.extrude.bad-sketch`, `feature.extrude.bad-points`, `feature.extrude.bad-params`, `feature.extrude.failed`, `feature.sketch.bad-commands`. All emitted diagnostic codes that gave agents no hint when fired through `why_did_this_fail`. Each got a HINTS entry plus a SKILL.md row.
- `export.feature-not-found` (rc.16 C1) gets its missing entry too.
- Future regressions of this class are now caught at CI time, not at review time.

### Path validator hardening
- `validateOutputPath` walks the parent directory chain to the deepest existing ancestor and `realpathSync`-canonicalizes it before deny-list check. Closes a bypass where a user-created symlink (e.g. `~/safe-link → /etc/passwd`) could route a write through the deny-list.
- The deny-list runs against both the literal-path and the resolved-path, defense-in-depth against encoded path traversal.
- `~user/...` (other-user home) tilde patterns now reject explicitly with a clear error.
- The `resolved` field returned to callers is the canonical realpath-resolved path (handles macOS `/tmp → /private/tmp` transparently).

### Path validator deny-list extensions
- Seven new credential-dir patterns: `~/.kube/`, `~/.docker/`, `~/.npmrc`, `~/.netrc`, `~/.pypirc`, `~/.gitconfig`, `~/.git-credentials`. Together with rc.16's `.bashrc/.zshrc/.ssh/.gnupg/.aws/.gcp/` set, the validator now covers the most common credential foot-guns.

### `formatScalarForError` robustness
- The capture-time error-message helper now handles circular objects (`<circular>`), BigInts (`123n`), Symbols (`Symbol(name)`), and stringification-failures (`<unrepresentable>`) without crashing the validation pipeline. Capture-time validators run on agent-supplied input; an agent passing `1n` to `.scale()` no longer crashes the validation pipeline.

### Binary STL header forensic stamping
- Default header now reads `kernelcad <version> <iso-date>` (e.g. `kernelcad 0.13.0-rc.17 2026-05-01`) instead of static text. STLs that show up later in slicer logs or downstream-tool failure reports now self-identify which kernelCAD version + date produced them.
- 80-byte header truncation is now `console.warn`-loud with `<truncated>` marker (was silent slice).

### Diagnostic surface
- `cli.no-input` reclassified from `'tool-error-field'` to `'reserved'` — it's CLI-only and not reachable through MCP. `KNOWN_RESERVED` constant + exact-match assertion added to the reachability sentinel (mirrors `KNOWN_DIRECT_LOWERER_ONLY`).

### Documentation + discipline
- `feedback_propagate_implementer_deviations.md` memory rule sharpened with a new trigger: when an implementer mentions a diagnostic code surfacing through a new path, controller MUST audit HINTS + SKILL.md. The rc.17 Task 1 structural sentinel automates this at CI time; the discipline rule remains valuable as a controller-side checkpoint.
- rc.16 CHANGELOG cosmetic correction: "3-5×" → "4-5×" (actual ratio 3052/684 ≈ 4.46×).

### Misc
- `OcctBackend` Buffer-view conversion now uses `Uint8Array.from(buf)` instead of `new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)`. The latter is a view; the former copies. Avoids Buffer-pool lifetime concerns if the buffer were ever held across a tick.
- Binary STL encoder now guards against triangle-count overflow (`uint32` max 4.29B); throws clear error if the mesh exceeds the format limit.

---

## v0.13.0-rc.16 — binary STL + rc.15 review closure (2026-05-01)

A bundled feature + quality milestone. Upgrades `export_stl` from ASCII to true binary STL output (the rc.15 contract was right; the implementation finally matches). Closes the rc.15 review punch list (2 Critical + 6 Important + 2 Nits) plus a new "deviation propagation" discipline memory entry.

### Feature surface
- **`export_stl` now emits true binary STL.** rc.15 shipped ASCII despite the contract claiming binary; this milestone implements direct binary encoding via Replicad's mesh primitives. Files are ~4-5× smaller (684 bytes for a 12-triangle box vs ~3052 ASCII bytes). Format: 80-byte header + uint32 LE triangle count + 50 bytes per triangle (3× float32 normal + 9× float32 vertices + uint16 attribute count). Encoder lives at `src/script-runtime/exportStlBinary.ts`; integrated into `runAndExport`.
- All three agent-readable description surfaces (SKILL.md, MCP tool description, JSDoc) now match what ships.

### Path validation
- New `validateOutputPath` helper at `src/script-runtime/safeOutputPath.ts`. `export_stl` rejects: paths containing `..` segments, dangerous absolute paths (`/etc/`, `/proc/`, `/sys/`, `/dev/`, `/root/`), and user-config paths (`~/.bashrc`, `~/.zshrc`, `~/.ssh/`, `~/.gnupg/`, `~/.aws/`, `~/.gcp/`). Allowed: relative paths within cwd, `/tmp/`, paths within `$HOME` not matching the protected patterns. 19 unit tests + 2 integration tests cover the policy.
- First MCP tool with file-write side-effects sets the precedent for future writers (thumbnail, STEP-export, etc.).

### Diagnostic surface
- `HintReachability` value `'cli-path'` renamed to `'tool-error-field'`. Describes the actual axis: where in the wire format the code appears (in tool result's `error`/`errorCode` field, not `diagnostics[]`). Four `cli.*` codes reclassified accordingly.
- `formatScalarForError` helper added to `src/intent/types.ts`. Preserves `NaN` / `Infinity` / `-Infinity` in error messages instead of letting `JSON.stringify` drop them to `null`. Used in five transform validators (rotate, scale, reflect, mirror; translate's template-literal form already preserved).
- `feature.mirror.invalid-plane` reachability classification noted accurately.

### Test coverage
- 3 new `feature_id`-path integration tests for `export_stl`: explicit-id success, intermediate-feature export, feature-not-found error path. Exercises `export.feature-not-found` diagnostic that was previously dead by tests.
- 4 new NaN/Infinity preservation assertions for transform validators.
- 19 new unit tests for `validateOutputPath`.

### Documentation + tooling
- `feature_count` semantics clarified across three surfaces (MCP description, JSDoc, SKILL.md): "total features in the script, not the count contributing to the exported shape."
- 6 SKILL.md drift sentinels refactored to call shared `assertEveryNameInSKILL` from `tests/unit/skill/_helpers.ts` (the helper was created in rc.15 but had no callers).
- rc.15 CHANGELOG entry corrected: "Five new diagnostic codes" → "Four" (the fifth — `feature.mirror.invalid-plane` — was reused, not new).
- Five `OcctBackend` methods' JSDocs had ephemeral plan-task references already stripped in rc.15 Task 7.

### Discipline
- New memory entry `feedback_propagate_implementer_deviations.md` codifies the rule: when a subagent implementer reports a spec deviation, the controller MUST audit all agent-readable surfaces (SKILL.md, MCP descriptions, JSDoc, CHANGELOG, lineage memory) and verify they match what shipped, not the spec's original claim. The rc.15 ASCII-STL gap surfaced this rule's necessity.

---

## v0.13.0-rc.15 — export_stl + rc.14 review closure (2026-05-01)

A bundled feature + quality milestone. New `export_stl` MCP tool closes the agent output-workflow gap; closes the rc.14 review punch list (6 Important + 2 Nits).

### Feature surface
- New `export_stl({ file? | code?, output_path, feature_id? })` MCP tool — server-side write of STL geometry. Required `output_path`; optional `feature_id` selects which feature to export (default: last). Returns `{ ok, output_path, byte_count, feature_count, diagnostics }`. Five error paths covered: missing file/code, missing output_path, script lowering failure, file-write failure, unknown feature_id. Existing CLI export pipeline (`src/script-runtime/export.ts`) reused — both CLI command and MCP tool call the same helper.
- Tool count goes from 13 to 14; SKILL.md updated; drift sentinels green.

### Capture-time validation
- `Shape.translate`, `Shape.rotate`, `Shape.scale`, `Shape.reflect`, `Shape.mirror` now validate their arguments at capture time and throw `KernelError` with feature-namespaced codes if invalid. Four new diagnostic codes: `feature.transform.invalid-translate`, `feature.transform.invalid-rotate`, `feature.transform.invalid-scale`, `feature.transform.invalid-reflect` (mirror reuses the existing `feature.mirror.invalid-plane`).
- Agents now get script-line precision in stack traces for malformed transform arguments, matching the `Sketch.reflect` precedent.
- The lowering-time `feature.transform.invalid-plane` gate from rc.14 stays as forward-looking infrastructure (reclassified to `'direct-lowerer-only'`).

### Error attribution
- `KernelError.featureId` is now a `readonly` constructor-injected field. Throw sites pass it as the third constructor arg instead of mutating after construction. Seven throw sites collapsed to single-line construction.
- `kernelErrorToDiagnostic` drops its optional `featureId` parameter; reads solely from `e.featureId`. No more catch-side-overrides-throw-site precedence ambiguity.

### Drift sentinel coverage
- New sentinels for `GLOBALS` (14 entries) and `PATH_BUILDER_METHODS` (9 entries) parallel the existing four. Six sentinels total cover the full agent-discoverable surface.
- `escapeRegExp` factored into `tests/unit/skill/_helpers.ts`; previously duplicated across 4 sentinels.

### Diagnostic surface
- `HintReachability` gains a fourth value: `'cli-path'`. Four `cli.*` codes (cli.script.exception, cli.file.read, cli.no-input, cli.export.exception) reclassified from `'engine-path'` to `'cli-path'`. `KNOWN_CLI_PATH` exact-match assertion added to the reachability sentinel.
- SKILL.md's reachability classification paragraph documents the fourth value.

### Backend documentation
- `OcctBackend.mirror`/`reflect`/`fillet`/`chamfer`/`shell` JSDoc references to ephemeral plan-task numbers ("Task 2", "Task 3") replaced with stable cross-references and descriptive text.

---

## v0.13.0-rc.14 — quality pass v4 (2026-05-01)

A pure quality milestone: closes the rc.13 review punch list (1 Critical + 6 Important + 7 Nits). No new user-facing API.

### Skill doc + drift prevention
- `src/skill/SKILL.md` aggressively overhauled to match the current kernel state. Stale claims removed (no more `// v0.2-alpha` markers; no more "lofts/sweeps deferred" when both shipped). Shape methods, Sketch methods, and PathBuilder methods now match `listApi.ts` source-of-truth. Diagnostic codes table expanded from 18 to 64 entries to match the current HINTS table. Sample scripts refreshed to use the current API (sketch+extrude pipeline, variable-radius blend, mirror-based symmetric part).
- New drift sentinels (`tests/unit/skill/skillShapeMethodsDrift.test.ts`, `skillSketchMethodsDrift.test.ts`, `skillDiagnosticCodesDrift.test.ts`) import the canonical source-of-truth arrays and assert SKILL.md mentions every entry. Word-boundary regex matching (closes rc.13 review N2). Together with the existing `skillToolCountDrift` sentinel, the rc.6→rc.13 drift class can no longer accumulate silently.

### API surface refinements
- `OcctBackend.mirror(Vec3)` legacy overload deleted along with `ShapeBackend.mirror`, `ShapeTransform`'s `op: 'mirror'` arm, and the lowerer's transform-loop `case 'mirror':` block. The remaining `OcctBackend.mirror(plane: PlaneSpec)` is the single canonical form. User-facing `Shape.mirror` unchanged.
- `feature.transform.invalid-plane` validation now fires at the lowerer's transform-loop `case 'reflect':` site. Previously, the mirror feature path validated PlaneSpec but the reflect transform path didn't — same input, two paths, only one validates.
- `AxisSpec.offset` is now optional (matches `PlaneSpec` convention). `Sketch.reflect({ axis: 'x' })` is equivalent to `Sketch.reflect('x')`.

### Diagnostics + error attribution
- `Sketch.reflect` now captures `inputs.source: { kind: 'feature', id: <upstream-sketch-id> }` so `recompute.input.missing` cascades correctly when the upstream sketch fails to lower.
- `feature.mirror.failed` hint refreshed to describe the actual unreliable failure mode (boolean union sometimes accepts coplanar configurations, sometimes throws — the hint now guides agents toward translation/offset workarounds without overpromising).
- `KernelError.featureId` field added; `kernelErrorToDiagnostic` propagates it. The `feature.sketch.reflect.invalid-axis` diagnostic now carries the source sketch's FeatureId so `why_did_this_fail`'s upstream walker can anchor it.
- Reachability sentinel's `KNOWN_DIRECT_LOWERER_ONLY` exact-match assertion now produces an actionable failure message pointing to both the constant in this test and the error-attribution policy memo.

### Backend correctness
- `OcctBackend.mirror`'s `clone()` call no longer requires the `as unknown as { clone: () => ReplicadShape3D }` double-cast. Replicad publicly types `Shape<Type>.clone(): this`; a direct call works without any cast.
- `applyVariableEdgeFeature` synth-record builder now uses an explicit kind switch (replaces silent-drop conditional spreads); a runtime-narrowed `inputs.base` check (replaces the loose `as { id: string }` cast); and a discriminated-union return type. New diagnostic codes `feature.fillet.invalid-edge-ref` and `feature.chamfer.invalid-edge-ref` cover the unsupported ref-kind case.

### Documentation cleanup
- Lineage prose stripped from rc.12 and rc.13 spec/plan files (per `feedback_no_competitor_refs_in_repo`). New `tests/unit/docs/specsPlansCompetitorRefs.test.ts` sentinel greps committed spec/plan markdown for competitor names; backtick code spans + fenced blocks are excluded from the search.
- `tests/integration/mcp/spawn.test.ts` skip-rationale comment refreshed to reflect the rc.12 invariant (qc runs `build:cli` before tests; the skip only triggers for inner-loop runs).

---

## v0.13.0-rc.13 — mirror+reflect + rc.12 review closure (2026-05-01)

A bundled feature + quality milestone. Adds three symmetric-construction primitives to the agent-facing API and closes the rc.12 review punch list (6 Important + 1 Nit).

### Feature surface
- `Shape.reflect(plane)` — pure reflection across a plane, treated as a transform alongside `translate`/`rotate`. Volume preserved; canonical face refs become unresolvable after reflect (same rule as other transforms). Plane spec accepts `'xy' | 'xz' | 'yz'` or `{ plane: '<cardinal>', offset: number }`.
- `Shape.mirror(plane)` — boolean union of source + reflection, the symmetric-part shortcut. Lives as a new `'mirror'` `FeatureKind` in the lowerer; dispatches to `OcctBackend.mirror(plane)` which composes existing `union` + `reflect`. Mirror result is a non-primitive composite; canonical face refs unresolvable.
- `Sketch.reflect(axis)` — 2D path reflection. Walks the sketch command list, reflecting `(x, y)` coordinates per the axis spec. Arc winding inverts via the existing sign-encoded scalar params (`sagitta`, `bulge`, `radius`). Labels preserved on their original segments. Sketches do not get a `mirror()` method because there is no boolean union at the sketch level.

### Diagnostic surface
- New diagnostic codes (all `reachable: 'engine-path'`):
  - `feature.mirror.no-base`
  - `feature.mirror.invalid-plane`
  - `feature.mirror.failed`
  - `feature.sketch.reflect.invalid-axis`
- New `feature.fillet.invalid-edge-ref` and `feature.chamfer.invalid-edge-ref` for the variable-edge-feature helper's tightened ref-kind handling.
- HINTS table now has 64 entries.

### Refactor + hardening
- `applyVariableEdgeFeature` (rc.12 lowerer helper) now uses an explicit kind switch for the synth-record builder (replaces the silent-drop conditional spreads); a runtime-narrowed `inputs.base` check (replaces the loose `as { id: string }` cast); and a discriminated-union return type `{ ok: true; shape; diagnostics } | { ok: false; diagnostics }` (removes `?.shape!` non-null assertions at callers).
- The reachability sentinel for `whyDidThisFail` is now a runtime-import test (replaces the brittle source-text parser that forced an undocumented field-ordering convention). Field ordering inside HINTS entries is no longer load-bearing.
- esbuild banner is now self-contained: `import{createRequire as __bcr}from'node:module';` plus `const require=__bcr(import.meta.url);`. The `__bcr` alias dodges the duplicate-binding crash that hit rc.11 because the source-level import in `server.ts` uses the un-aliased name. Removing source-level `createRequire` imports no longer breaks the bundle.

### Tests
- New `tests/e2e/fixtures/symmetric-bracket.kcad.ts` exercises `Shape.mirror({ plane: 'yz' })` end-to-end on a parameterized U-bracket with bolt holes.
- New `tests/unit/backends/occt/reflect.test.ts` (volume preservation, canonical-face-ref unresolvable after reflect, offset-plane form).
- New `tests/unit/backends/occt/mirror.test.ts` (2× volume on non-overlapping mirror, degenerate plane-on-shape behavior, face-ref unresolvable after mirror).
- New `tests/unit/skill/skillToolCountDrift.test.ts` — drift sentinel ensures SKILL.md's documented MCP tool count matches the actual `TOOLS` array.

### Documentation
- `CHANGELOG.md` rc.12 entry's banner-fix description updated to describe what actually shipped.
- Repo-wide native-framing sweep extended to catch case-sensitivity and missing-comparator-name regex misses (3 hits removed: lowercase `forgecad`, no-space `Fusion360`, `CATIA`/`NX` references).
- `tests/integration/mcp/spawn.test.ts` skip-rationale comment updated to reflect rc.12's `qc`-runs-`build:cli`-first invariant.
- `src/skill/SKILL.md` updated from "6 tools" to the correct 13 tools, with all names listed.

---

## v0.13.0-rc.12 — quality pass v3 (2026-05-01)

A pure quality milestone: closes the rc.11 review punch list and clears pre-existing competitor-reference debt. No new user-facing API.

### Tooling + bundle hardening
- New non-skippable `tests/integration/cli-bundle/startup.test.ts` boots the bundled CLI and asserts a JSON-RPC initialize response. Closes the silent-skip gap that let the rc.11 bundle crash sail past `npm test`.
- The `qc` script now runs `build:cli` before tests, ensuring the pre-merge gate always exercises a fresh artifact.
- Removed the `createRequire` import from the esbuild banner entirely; the bundle's `const require=createRequire(...)` line now relies on the source-level `import { createRequire } from 'node:module'` in `src/mcp/server.ts` (hoisted by ESM). The rc.11 hotfix alias is reverted. (rc.13 follows up with a banner-internal `__bcr` alias to make the bundle fully self-contained.)

### Refactors (no behavior change)
- `isSameEdge` is now exported from `src/backends/occt/edgeQueries.ts` with a documenting JSDoc covering the 1e-6 mm-scale tolerance. The backend's `filletVariable` and `chamferVariable` methods replace inline endpoint-comparison logic with calls to the helper.
- `applyVariableEdgeFeature` extracted in `src/backends/occt/occtLowerer.ts`. The `case 'fillet':` and `case 'chamfer':` arms — previously ~80 lines of duplicated synthetic-FeatureRecord plumbing — now share a single helper. Each arm's variable branch shrinks to ~10 lines.

### Test coverage
- `tests/e2e/fixtures/bracket-bevels.kcad.ts` exercises the variable-distance chamfer array form end-to-end.
- `tests/integration/backends/occt/variableFilletFaceWrapper.test.ts` asserts geometric correctness of `Shape.fillet([{edges: {face: 'top'}, radius}])` — the previously untested face-wrapper resolution branch.

### Diagnostic surface
- `whyDidThisFail` hints now carry a `reachable` classification: `'engine-path'` (most codes, fires through normal recompute), `'direct-lowerer-only'` (`feature.loft.bad-sketch` and `feature.sweep.multi-face-profile`, which the recompute engine short-circuits before reaching), or `'reserved'`. Agents can filter by reachability when ranking diagnostics.
- New `tests/unit/mcp/whyDidThisFailReachability.test.ts` sentinel ensures every hint entry carries a classification.
- `WhyDidThisFailOutput.hints` wire format changes from `string[]` to `Array<{ code, hint, reachable }>`. Consumers that unpacked `hints[0]` as a string need to read `hints[0].hint`.

### Documentation
- New position memo at the error-attribution-policy spec (in kernelCAD-private) captures the architectural trade-off between root-cause-first and feature-specific error attribution. Sets interim policy for forward-looking diagnostic codes; rc.13+ revisits the engine-side question.
- Repo-wide native-framing sweep across source and CHANGELOG.

---

## v0.13.0-rc.11 (NORTHSTAR roadmap: variable-radius blends + bundled rc.10 fixes) — 2026-05-01

### Added
- **`Shape.fillet([{edges, radius}, ...])`** — variable-radius fillet via array overload. Each group specifies an `EdgeSelector` (canonical face, label, query, segments) and a per-group radius. Edges that don't match any group pass through unfilleted (opt-in semantics). Distinguished from existing `fillet(2, edges)` by first-arg type.
- **`Shape.chamfer([{edges, distance}, ...])`** — same shape for chamfer.
- **`OcctBackend.filletVariable(groups)` / `chamferVariable(groups)`** — backend instance methods using Replicad's `RadiusConfig` function form `(e: Edge) => number | null`. Per-edge geometric matching via endpoint comparison (~1e-6 tolerance) handles Replicad's per-iteration `Edge` instance churn. Mixed-radius fillet on a 10×10×5 box (top r=2, bottom r=0.5) measured at 466.63 mm³ (analytic ~463).
- **`CaptureSession.variableEdgeFeature`** — capture helper that registers a `'fillet'` or `'chamfer'` FeatureRecord with `metadata.variable: true` + per-group `metadata.groups[i]` radius/distance + `inputs.edge_group_${i}` FeatureRef.
- **4 new diagnostic codes:** `feature.fillet.empty-groups`, `feature.fillet.invalid-group`, `feature.chamfer.empty-groups`, `feature.chamfer.invalid-group`. Each has a `whyDidThisFail` hint.
- E2E fixture `tests/e2e/fixtures/bracket-blends.kcad.ts` — mounting plate with `topRadius=2.0` on top edges and `bottomRadius=0.5` on bottom edges.

### Changed
- **MCP `serverInfo.version` derived from `package.json`** (rc.10 review I-C). Pre-rc.11 the value was hardcoded `'0.11.0-alpha.1'` — agents reading the MCP `initialize` response saw stale version data and couldn't tell which kernel features were available. New version drift sentinel test (`tests/integration/mcp/serverInfoVersion.test.ts`) prevents regression.
- **`feature.loft.failed` split for missing-input case** (rc.10 review I-B). When `inputs.byKey['sketch_${i}']` is missing, the lowerer now emits `feature.loft.bad-sketch` with a hint pointing to the upstream `feature.sketch.failed` diagnostic. Replicad-thrown errors continue to use the catch-all `feature.loft.failed`. Note: the engine path's `recompute.input.missing` short-circuit means agents currently see the upstream sketch diagnostic + recompute-input-missing rather than `feature.loft.bad-sketch` — same forward-looking infrastructure pattern as rc.10's `feature.sweep.multi-face-profile`.
- **Loft `planes` success path test coverage** added (rc.10 review I-A). Two new tests covering axial origin and non-axial origin variants. The lowerer's explicit-planes branch is now end-to-end tested.
- **Drift sentinel contract documentation** (rc.10 review I-D). Added header comments above `Sketch`, `PathBuilder`, and `Shape` class declarations explaining that adding a public method requires updating `src/mcp/tools/listApi.ts` or the drift sentinel test fails.

### Deferred to subsequent rcs
- Closed-rail sweep (torus-like) — rc.12
- 3D path builder (`path3d()`) — rc.12+ (or never; agents have `helix()` and raw polylines)
- Text/embossing primitives — rc.12+ (would activate dormant `feature.sweep.multi-face-profile` code path)
- Other rc.10 nits (N-1..N-10) — rc.12 quality pass

---

## v0.13.0-rc.10 (NORTHSTAR roadmap: sketch loft + bundled rc.9 fixes) — 2026-05-01

### Added
- **`Sketch.loft(other, opts?)`** — loft a profile through one or more additional sections to produce a 3D solid that smoothly interpolates between them. Use for nozzles (round-to-square), wings/airfoils (varying-cross-section ribs), fairings, transition pieces, gear teeth varying along thickness. `other` accepts either a single `Sketch` or `Sketch[]` for N-section lofts.
- **Loft section positioning:** `opts.spacing: number` z-stacks axially (default 10 mm); `opts.planes: PlaneSpec[]` provides explicit per-section placement and takes precedence.
- **Loft surface options:** `opts.ruled: true` produces straight (faceted) transitions; `opts.startPoint` / `opts.endPoint` extend the loft past the first / last section to a single point.
- **`OcctBackend.loftFromSketches(sketches, planes, opts?)`** — backend factory using Replicad's `Sketch.loftWith(others, loftConfig)`. Frustum volume measured at exactly the analytic 280 mm³ for the canonical 2x2 → 4x4 frustum at h=30.
- **3 new diagnostic codes:** `feature.loft.empty-sections`, `feature.loft.invalid-planes`, `feature.loft.failed`. Each has a `whyDidThisFail` hint.
- E2E fixtures: `tests/e2e/fixtures/nozzle.kcad.ts` (circle-to-square loft), `tests/e2e/fixtures/airfoil.kcad.ts` (4-rib wing).
- `loft` advertised in `list_api`'s `sketchMethods`.

### Changed
- **`Shape.lower()` cache invalidates on transform-count change** in addition to record-count growth (rc.9 review C1 fix). The previous cache returned stale geometry after `Shape.translate/rotate/scale` because `appendTransform` mutates `record.transforms` in place without changing `records.length`. Agents calling `selectEdges` after a transform now get edges from the post-transform frame.
- **`EDGE_QUERY_KEYS` and `FACE_QUERY_KEYS`** now have a true compile-time exhaustiveness check via `Exclude<keyof T, typeof KEYS[number]> extends never` (rc.9 review I1 fix). Adding a key to `EdgeQuery`/`FaceQuery` without updating the array produces a TypeScript compile error. The runtime magic-number length test was dropped — TS catches the regression.
- New **`tests/integration/mcp/serverToolDispatch.test.ts`** enforces parity between `server.ts:TOOLS` and the call-handler switch (rc.9 review I2 fix). Source-text-parse comparison; same shape as the `list_api` drift sentinel that paid off in rc.9.
- **L-bend sweep bounding-box assertion** tightened from 2 loose checks (`max[0] > 28`, `max[2] > 28`) to a strict 6-bound assertion covering both `min` and `max` for x/y/z (rc.9 review I5 fix). The asymmetric rule was discovered empirically: profile half-width extends ±1 perpendicular to each leg's direction but NOT along rail-end tangent. Documented inline.

### Deferred to subsequent rcs
- Closed-rail sweep (torus-like) — rc.11
- 3D path builder (`path3d()`) — rc.11+ (or never; agents have `helix()` and raw polylines)
- Other rc.9 review items (I3 sweep-discriminator regression test, I4 multi-face guard for extrude/revolve, I6 RailPoint cleanup, all 5 rc.9 nits) — rc.11 quality pass
- Persistent topological IDs across booleans/transforms — v0.5+

---

## v0.13.0-rc.9 (NORTHSTAR roadmap: quality pass v2 — close all rc.8 review + rc.7 deferred) — 2026-05-01

### Added
- **`src/backends/occt/queryKeys.ts`** — single source of truth for `EDGE_QUERY_KEYS` / `FACE_QUERY_KEYS`. Imported by capture-side dispatch, lowerer-side validation, and MCP `list_api`. `keyof` type-level test catches drift.
- **`list_api` drift sentinel test** — verifies `GLOBALS.map(g => g.name)` matches `Object.keys(createApi(ctx))`; same for `SHAPE_METHODS` against `Shape.prototype` and `SKETCH_METHODS` / `PATH_BUILDER_METHODS`. The first run of this sentinel found 5 globals (`extrudeRect`, `extrudeCircle`, `extrudePolygon`, `extrudeRoundedRect`, `revolveRect`) that were public API but missing from `list_api` — agents now discover them.
- **3 new sweep diagnostic codes** split out from `feature.sweep.failed`:
  - `feature.sweep.multi-face-profile` — profile drawing produces multiple faces (forward-looking; activates when text/boolean-composed sketches land in rc.10+)
  - `feature.sweep.profile-too-large` — profile cross-section exceeds rail's tightest curvature radius
  - `feature.sweep.spine-self-intersection` — rail self-intersects when extruded
- Each new code has a `whyDidThisFail` hint with concrete recovery actions.
- Soft cap on `rail.length` (5000); over-cap emits `feature.sweep.invalid-rail` with a hint to reduce `pointsPerTurn`. Prevents runaway helix-resolution from silently consuming minutes of CPU.
- `Shape.lower()` lazy cache — repeated calls (common in scripts that use `selectEdges` multiple times) return the cached lowered backend instead of re-running `RecomputeEngine.run()`. Invalidated by record-count growth.
- `OcctBackend.liftSketchToFace` — private static helper that consolidates the `sketch._drawing.sketchOnPlane(plane).face().outerWire()` cast pattern + multi-face check.
- `helix()` `startAngle` parameter test (was an API-surface-without-regression-guard gap).
- Sweep bounding-box assertions on pipe + L-bend tests — catches the wrong-shape regression class where OCCT returns a valid-but-wrong solid.

### Changed
- `EDGE_QUERY_KEYS` / `FACE_QUERY_KEYS` no longer duplicated across 4 files; all consumers import from `queryKeys.ts`.
- `Vec3` is the canonical type alias for `[number, number, number]`. The duplicate in `edgeQueries.ts` re-exports from `intent/types`. `RailPoint` in `helix.ts` becomes a re-export of `Vec3`.
- `Sketch.sweep` rail parameter type: `[number, number, number][]` → `Vec3[]` (alias change; runtime identical).
- All 7 MCP tools that wrap `runScript` now set `errorCode` on the lowering-error path (was only on the `runScript` catch path in rc.7). Uniform structured-failure protocol regardless of where the failure occurred. The lowering-path failures use `diagnostics.find(d => d.featureId === targetId && d.severity === 'error')` to surface the error from the actual failing feature.
- `listFeatures` no longer silently returns `{ features: [] }` on script error; emits `error` and `errorCode` like its sibling tools. File-read failure and missing-input return paths also now use the structured shape.
- `feature.sweep.failed` is now a fallback code; the discriminator in the lowerer prefers the 3 specific codes above.
- `isKernelError` no longer accepts plain objects with structural `KernelError` shape — the cross-realm scenario it guarded doesn't exist in current code paths. Reintroduce when `KernelError` is exposed to the vm sandbox.

### Deferred to subsequent rcs
- Loft / closed-rail sweep / 3D path builder — rc.10 (the next geometric feature milestone)
- Persistent topological IDs across booleans / transforms — v0.5+
- Variable-radius fillet/chamfer per edge — rc.11+
- Custom sweep options (`auxiliarySpine`, `withContact`, transition modes) — rc.11+
- Removal of deprecated `feature.face-feature.label-not-resolvable` — rc.10 (one rc grace, scheduled)

---

## v0.13.0-rc.8 (NORTHSTAR roadmap: sketch sweep + bundled quality fixes) — 2026-05-01

### Added
- **`Sketch.sweep(rail, opts?)`** — sweep a closed profile along a 3D polyline rail. `opts.frenet: true` for helices and curved rails (profile rotates with tangent + curvature); default `false` for straight pipes and planar polyline rails (profile keeps fixed world-up vector). Returns a `Shape` (3D solid).
- **`helix({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? })`** — pure function returning a polyline approximation of a helix curve, ready to pass to `Sketch.sweep`. Default 32 points per turn; agents tune for tight threads.
- **`OcctBackend.sweepFromSketch(sketch, rail, opts?)`** — backend factory that lifts the profile sketch's drawing onto XY, assembles the rail polyline into a spine wire, and calls the kernel's generic sweep.
- **4 new diagnostic codes:** `feature.sweep.invalid-rail`, `feature.sweep.failed`, `feature.sweep.bad-sketch`, `feature.sweep.unsupported-profile`. Each has a `whyDidThisFail` hint.
- **`list_api` MCP tool** — advertises the script-runtime surface (globals, Shape methods, Sketch methods, PathBuilder methods, EdgeQuery/FaceQuery key sets) so agents can discover the API via MCP without reading source. Closes rc.7 review finding I-3. Total MCP surface: 12 → 13 tools.
- E2E fixtures `tests/e2e/fixtures/pipe.kcad.ts` (square-profile pipe) and `tests/e2e/fixtures/spring.kcad.ts` (helical spring with `frenet: true`).

### Changed
- **`pickFace` query-mismatch diagnostic namespace fixed** — was `feature.edge-feature.no-edges-match`, now `feature.face-feature.no-match`. Closes rc.7 review finding I-1. Agents pattern-matching `feature.face-feature.*` now correctly receive face-feature errors from `Shape.shell({face: query})` calls.
- New hint entry for `feature.face-feature.no-match`.

### Deferred to subsequent rcs
- Closed-rail sweep (torus-like) — rc.9
- Variable-profile loft — rc.9+ (separate feature kind)
- Custom sweep options (`auxiliarySpine`, `withContact`, transition modes) — rc.9+
- 3D path builder (`path3d()`) — rc.9 if needed
- Other rc.7 review findings (I-2 EDGE_QUERY_KEYS DRY, I-4 errorCode lowering path, I-5 listFeatures gap, I-6 perf, I-7 cross-realm) — rc.9 quality pass

---

## v0.13.0-rc.7 (NORTHSTAR roadmap: quality pass — close all rc.6 review findings) — 2026-05-01

### Added
- **`KernelError` class** — kernel throws now carry a structured `code` field that flows through the script-runtime exception path into `CompilerDiagnostic`s. `whyDidThisFail` registers hints that are now actually reachable.
- **`pickFace` query/label dispatch parity** — `Shape.shell({ face: { atZ: 5 } })` and `Shape.shell({ face: 'rim' })` work end-to-end. Type-vs-runtime mismatch closed.
- **`selectEdges` / `selectEdge` script-runtime globals** — agents can pre-select edges in `.kcad.ts` files and pass the result back to fillet/chamfer for compose / multi-step refinement.
- **`Shape.lower()` lazy accessor** — eagerly lowers a captured `Shape` for inspection, used internally by `selectEdges`.
- **Top-level await support in `.kcad.ts` scripts** — script body now wraps in an async IIFE, so agents can `await selectEdges(shape, ...)` at top level.
- **5 new diagnostic codes:** `feature.label.unknown-name`, `feature.label.no-upstream-sketch`, `feature.label.unsupported-base`, `feature.label.mixed-convexity` (split from the rc.6 lumped code), and `feature.edge-feature.invalid-query` for unknown EdgeQuery keys.
- **`FaceQuery.inPlane` implementation** — was silently ignored in rc.6.
- **`EdgeSegment.normalA` and `normalB` populated** — were typed `Vec3 | null` but always `null` in rc.6.
- **`EDGE_QUERY_KEYS` whitelist in `buildEdgeFeatureRef`** — replaces structural duck-typing; unknown keys surface a diagnostic at lowering time instead of silently passing through.
- E2E fixture `tests/e2e/fixtures/preselected-edges.kcad.ts` exercises the `selectEdges → fillet` round-trip.
- Chamfer + shell integration tests with EdgeQuery / FaceQuery (coverage symmetry with the existing fillet path).

### Changed
- `ResolvedInputs._allRecords` renamed to `ResolvedInputs.records` — drops the leading underscore.
- `pickEdges` and `pickFace` signatures now take a third `records` parameter — concurrency-safe, no module-level mutable state in the lowering pipeline.
- `feature.face-feature.label-not-resolvable` is deprecated; the hint message points to the new specific codes. Will be removed in rc.8.
- `EdgeQuery.near` JSDoc explicitly documents that it sorts (closest first) but does not filter.
- The `feature.edge-feature.face-ref-not-supported` and `feature.face-feature.face-ref-not-supported` hint messages updated — previously contained a stale "v0.2-alpha" reference.

### Deferred to subsequent rcs
- `coalesceEdges()` collinear merge (rc.8)
- Per-edge variable radius `fillet([{edge, r:1}, {edge, r:2}])` (rc.8)
- Labels on revolve (rc.8 — needs different probe strategy for axisymmetric faces)
- Persistent topological IDs across booleans / transforms (v0.5+)
- Set ops on edge / face selections (rc.8+)
- Removal of the deprecated `feature.face-feature.label-not-resolvable` code (rc.8)

---

## v0.13.0-rc.6 (NORTHSTAR roadmap: query-first edge/face selection) — 2026-05-01

### Added
- **Query-based edge/face selection** — `Shape.fillet(r, EdgeSelector)` / `Shape.chamfer(d, EdgeSelector)` / `Shape.shell(t, { face: FaceSelector })` accept inline `EdgeQuery` / `FaceQuery`, pre-selected `EdgeSegment` / `EdgeSegment[]`, or canonical face names (existing behavior preserved).
- **`EdgeQuery` keys:** `atZ`, `atX`, `atY`, `near`, `within`, `parallel`, `perpendicular`, `convex`, `concave`, `minAngle`, `maxAngle`, `ofCurveType`, `tolerance`, `angleTolerance`. Multiple keys are AND-combined.
- **`FaceQuery` keys:** `atZ`, `atX`, `atY`, `parallelTo`, `inPlane`, `ofSurfaceType`, `containsPoint`, `near`, `tolerance`.
- **`selectEdges(shape, query)` / `selectEdge(shape, query)`** — pre-select for compose / reuse. `selectEdge` throws when ambiguous (>1 match) or empty.
- **`PathBuilder.label(name)`** — tag the most recent segment so it can be referenced later as `{ face: 'name' }`. Resolution flows through the same query path under the hood — no duplicate codepath. Pick non-canonical names to avoid collision with canonical face dispatch.
- **3 new MCP tools** for agent shape introspection: `list_edges` (with optional EdgeQuery filter), `list_faces` (with optional FaceQuery filter), `list_face_labels` (sketch labels with chord endpoints). Total MCP surface: 9 → 12.
- **5 new diagnostic codes:** `feature.edge-feature.no-edges-match`, `feature.edge-feature.ambiguous-selection`, `feature.edge-feature.invalid-query`, `feature.path.label-without-segment`, `feature.path.duplicate-label`. Each has a `whyDidThisFail` hint.
- E2E fixture `tests/e2e/fixtures/tabbed-plate.kcad.ts` — labeled rectangular plate with fillet on a labeled side via `{ face: 'tab-side' }`.

### Changed
- `FaceRef` and `EdgeRef` unions widened with new variants: `query`, `label`, `segment`, `segments`. Existing `canonical` / `tracked` / `created` / `propagated` variants unchanged.
- `Shape.fillet/chamfer/shell` arg-2 type widened from canonical-face-string-only to `EdgeSelector` / `FaceSelector`. Calling `.fillet(2, { face: 'top' })` on a box still works (canonical fast-path preserved).
- `OcctLowerer` `pickEdges` now dispatches on the ref kind (`canonical` / `query` / `label` / `segment` / `segments`). Canonical resolution path is unchanged.
- `ResolvedInputs` gains an optional `_allRecords` field so the lowerer can resolve labels by walking the upstream sketch.

### Deferred to subsequent rcs
- `coalesceEdges()` — collinear-segment merge (rc.7)
- Per-edge variable radius `fillet([{edge, r:1}, {edge, r:2}])` — rc.7
- Labels on revolve (rc.7 — needs different probe strategy for axisymmetric faces)
- Persistent topological IDs across booleans / transforms — separate "named topology" problem (v0.5+)
- Set ops on edge/face selections — rc.7+
- Custom JS predicates `{ predicate: (e) => ... }` — agent-hostile, MCP can't introspect functions

---

## v0.13.0-rc.5 (NORTHSTAR roadmap: v0.4-rc arc vocabulary) — 2026-05-01

### Added
- **`PathBuilder.threePointsArc(x, y, midX, midY)`** — arc through 3 points (start = current position, mid = via, end = (x,y)). No prior tangent required.
- **`PathBuilder.sagittaArc(x, y, sagitta)`** — arc by chord + perpendicular bulge height. Sign chooses bulge side (positive = ccw).
- **`PathBuilder.bulgeArc(x, y, bulge)`** — arc by chord + DXF bulge factor (`tan(includedAngle/4)`). Sign chooses bulge side.
- **`PathBuilder.radiusArc(x, y, radius)`** — arc by chord + explicit radius. Always minor arc. Sign chooses bulge side. Validates `|radius| >= chord/2` and `chord > 0`.
- New `SketchCommand` variants: `threePointsArc`, `sagittaArc`, `bulgeArc`, `radiusArc`. Stored in sketch metadata.
- New diagnostic code: `feature.sketch.degenerate-arc` — fires when `radiusArc` has `|radius| < chord/2` or degenerate chord. Hint entry in `whyDidThisFail`.
- E2E fixtures: `tests/e2e/fixtures/gear-blank.kcad.ts` (4-arc circle via threePointsArc), `tests/e2e/fixtures/cam-profile.kcad.ts` (mixed lineTo + sagittaArc + radiusArc).

### Changed
- `OcctBackend.fromSketchCommands` now tracks `currentX`/`currentY` in its replay loop so `radiusArc` can compute chord length. Replicad's `BaseSketcher2d.pointer` is protected; this is the cleanest workaround.
- `OcctLowerer` `'sketch'` arm narrows caught errors starting with `radiusArc:` to the new `feature.sketch.degenerate-arc` code (was `feature.sketch.failed`).

### Deferred to subsequent rcs
- Beziers (`quadraticBezierTo`, `cubicBezierTo`, `bezierTo`) — rc.6
- `centerArc(center, end)` — center+end form
- Major-arc opt-in for `radiusArc` (use `threePointsArc` for now)
- Convenience variants (`vSagittaArc`, `hBulgeArc`, etc.)
- Elliptical arcs

---

## v0.13.0-rc.4 (NORTHSTAR roadmap: v0.4-rc sketch revolve) — 2026-04-30

### Added
- **`Sketch.revolve()`** — terminal `.revolve()` on the path builder produces a 360° solid of revolution around the Z axis. Profile coordinates are interpreted as `(radial-X, axial-Z)`. Mirrors `Sketch.extrude(d)` in API shape — no parameters required for the basic case.
- `OcctBackend.revolveFromSketch(sketch)` — static factory that lifts a sketch-tagged backend's drawing onto the XZ plane and revolves it around `[0, 0, 1]`.
- `OcctBackend.getSketchCommands()` — accessor for original `SketchCommand[]` on sketch-tagged backends. Used by the lowerer to validate revolve profiles before construction.
- New diagnostic codes: `feature.revolve.crosses-axis`, `feature.revolve.empty-profile`, `feature.revolve.failed`, `feature.revolve.bad-sketch`. Each has a hint entry in `whyDidThisFail`.
- E2E fixtures `tests/e2e/fixtures/washer.kcad.ts` and `tests/e2e/fixtures/mug-body.kcad.ts` — washer (rect profile) and tall mug body (tangentArc profile).

### Changed
- Lowerer's `revolve` arm now dispatches on `profileKind`. The pre-existing `'rect'` branch (`revolveRect`) is unchanged. New `'sketch'` branch validates `x >= 0` for all profile points and rejects empty profiles before calling Replicad.

### Deferred to subsequent rcs / v0.14
- Partial revolves (`{ angleDeg }`) — needs wedge-boolean implementation.
- Non-Z axis (`{ axis: 'X' | 'Y' | 'Z' | [x,y,z] }`) — needs plane derivation.
- Sweep along path (`Sketch.sweep(rail)`) — different feature kind.
- Sketch labels for downstream face references.

---

## v0.13.0-rc.3 (NORTHSTAR roadmap: v0.4-rc tangentArc) — 2026-04-30

### Added
- **`PathBuilder.tangentArc(x, y)`** — first curved 2D segment in the path builder. Continues tangent from the previous segment to the target point. Enables rounded corners, smooth gear-tooth profiles, and other curve-between-segment patterns. Mirrors Replicad's `tangentArcTo`.
- New `SketchCommand` variant `{ kind: 'tangentArc', x, y }`. Stored in sketch metadata alongside existing moveTo/lineTo/close.
- E2E fixture `tests/e2e/fixtures/rounded-l-bracket.kcad.ts` — L-bracket with a rounded inner corner via tangentArc.

### Changed
- `OcctBackend.fromSketchCommands` switch now handles tangentArc commands. Calling `tangentArc` as the first segment surfaces a `feature.sketch.failed` diagnostic (Replicad rejects with "You need a previous curve").

### Deferred to subsequent rcs / v0.14
- `threePointsArc(end, midpoint)` — explicit 3-point arc
- `sagittaArc` / `bulgeArc` — DXF-style arc specs
- `bezierTo` / `quadraticBezierTo` / `cubicBezierTo` — bezier curves
- `lineH` / `lineV` / `lineAngled` / `polarLine` — convenience line variants
- Path labels (`.label('name')`) — for downstream face references
- Sketch revolve / sweep
- Sketch constraints

---

## v0.13.0-rc.2 (NORTHSTAR roadmap: v0.4-rc sketch builder, lines-only) — 2026-04-30

### Added
- **Sketch builder**: `path()` returns a `PathBuilder`; chain `.moveTo(x,y).lineTo(x,y).close()` to get a `Sketch`; `Sketch.extrude(depth)` returns a `Shape`. First architectural step toward Phase 1 of the agent-first feature-parity roadmap.
- New `Sketch` capture proxy alongside existing `Shape`. Sketch records are captured with `metadata.commands: SketchCommand[]` array.
- New OcctBackend factories: `fromSketchCommands(commands)` (returns a sketch-tagged backend with internal Drawing) and `extrudeFromSketch(sketch, depth)`.
- New lowerer cases: top-level `'sketch'` and `'extrude'` `profileKind === 'sketch'` arm.
- E2E fixture: `tests/e2e/fixtures/l-bracket.kcad.ts` — agent-friendly demo of path-based 2D construction.
- New diagnostic codes: `feature.sketch.bad-commands`, `feature.sketch.failed`, `feature.extrude.bad-sketch`.

### Changed
- `OcctBackend.kind` widened to include `'sketch'` alongside primitive kinds. Sketch-tagged instances cannot be transformed/booleaned directly — only consumed by `extrudeFromSketch`. Future architectural cleanup will split into Solid/Sketch/Curve subtypes.

### Deferred to v0.14+ (per the agent-first geometry roadmap)
- Arc support (`arcTo`, `tangentArc`, `lineH`, `lineV`, `lineAngled`)
- Path labels (`.label('name')` for downstream face references)
- `polygon(points)` and `roundedRect(w, h, r)` as Sketch-returning conveniences (currently flat `extrudePolygon` / `extrudeRoundedRect` remain as released API)
- Stroke (open polylines)
- Sketch revolve / sweep
- Sketch constraints (Phase 2 of the parity roadmap)

---

## v0.13.0-rc.1 (NORTHSTAR roadmap: v0.12 final remove_feature) — 2026-04-30

### Added
- **Third MCP write tool: `remove_feature`** — removes a single line from a `.kcad.ts` script by substring match. Side-effect-free; returns `new_code` + re-evaluated diagnostics.
  - Input: `{ code, match }`
  - Output: `{ ok, new_code?, diagnostics?, error? }`
  - Refuses to remove the `return` line (state-machine detects top-level return at brace depth 0)
  - Errors on 0 or >1 matches (agent must disambiguate)
- 11 new tests (7 primitive + 4 tool) + 1 integration spawn test

### Why string-match (not feature_id)
`FeatureRecord.scriptLocation` is declared but never populated; adding source-position tracking is a separate architectural piece. String match mirrors `set_param_value`'s `param_name` — agents already have a reliable identifier (the line they wrote). Once scriptLocation lands later, `feature_id` could be added as an alternative.

### Deferred to v0.14+
- `suppress_feature` — wraps a line in `// @suppress` annotation
- `feature_id` alternative for set/remove tools (requires scriptLocation)

---

## v0.13.0-beta.1 (NORTHSTAR roadmap: v0.4-beta extrudeRoundedRect) — 2026-04-30

### Added
- **`extrudeRoundedRect(width, height, radius, depth)`** — second arbitrary-2D-profile primitive after `extrudePolygon`. Auto-clamps `radius` to `min(width/2, height/2)` (with a tiny safety margin for Replicad's exact-half edge case). Zero radius behaves like a sharp rectangle.
- e2e fixture `tests/e2e/fixtures/rounded-plate.kcad.ts` + acceptance test.

### Changed
- `extrude` FeatureKind now accepts `profileKind: 'rounded-rect'` in addition to existing `'rect'` / `'circle'` / `'polygon'`.

### Deferred to v0.4-rc / v0.4 final
- `path()` builder for arbitrary 2D paths
- Full `Sketch` builder type
- Sketch revolve / sweep
- Open polylines (`.stroke(width)`)

## v0.13.0-alpha.1 (NORTHSTAR roadmap: v0.4-alpha extrudePolygon) — 2026-04-30

### Added
- **`extrudePolygon(points, depth)`** — first arbitrary-2D-profile primitive. Takes an array of `[x, y]` points in millimetres and an extrude depth. Auto-normalizes winding (CW input silently reversed to CCW). Closed by default. Minimum 3 points.
- New diagnostic codes: `feature.extrude.bad-points` (missing/invalid metadata.points), `feature.extrude.failed` (OCCT exception during extrusion).
- e2e fixture `tests/e2e/fixtures/triangle-extrusion.kcad.ts` + acceptance test.
- `FeatureSpec.metadata` propagated through `CaptureSession.register()` so feature-specific structured data (like polygon points) can be attached without widening the param shape.

### Changed
- `extrude` FeatureKind now accepts `profileKind: 'polygon'` in addition to existing `'rect'` and `'circle'`.
- Lowerer's `'extrude'` case refactored to extract `height` per-profile-arm rather than unconditionally — fixed a latent bug where polygon records (which have no `height` param) would have crashed before reaching the polygon arm.

### Deferred to v0.4-beta+
- Sketch builder pattern (`sketch.polygon().extrude()`, `sketch.path().lineTo().close()`)
- `roundedRect` and `circle2d` as Sketch primitives
- Open polylines (`.stroke(width)`)
- Sketch revolve / sweep
- Self-intersection validation

---

## v0.12.0-rc.1 — 2026-04-30

### Added
- **Second MCP write tool: `add_feature`** — inserts a single-statement line into a `.kcad.ts` script before the last top-level `return`. Side-effect-free; caller persists via standard file tools.
  - Input: `{ code, feature_code }`
  - Output: `{ ok, new_code?, diagnostics?, error? }`
  - Implementation: state-machine that finds the last brace-depth-0 `return` line (skips inner returns in helper functions / arrow bodies), preserves indentation, respects strings/comments
- 11 new tests (7 primitive + 3 tool + 1 integration spawn)
- Live verification: spawned `kernelcad mcp`, sent JSON-RPC `tools/call` for `set_param_value`, confirmed the round-trip works end-to-end as Claude would consume it

### Deferred to v0.12.0 (final) / v0.13+
- `remove_feature(code, feature_id)` — needs `FeatureRecord.scriptLocation` to be populated by the capture session (currently declared but never set)
- `suppress_feature(code, feature_id)` — same scriptLocation requirement, plus capture-time `// @suppress` annotation parsing or `.suppress()` modifier method on the Shape proxy

The decision to ship just `add_feature` (without remove/suppress) is driven by the scriptLocation gap — adding source-position tracking to capture is its own architectural change worth a separate plan. v0.12.0 final would land after that work or after additional agent feedback.

---

## v0.12.0-beta.1 — 2026-04-30

### Added
- **First MCP write tool: `set_param_value`** — edits a `param()` default value in `.kcad.ts` source and returns the modified code plus diagnostics from re-evaluating the result. Side-effect-free; caller persists via standard file tools.
  - Input: `{ code, param_name, new_value }`
  - Output: `{ ok, new_code?, diagnostics?, error? }`
  - Implementation: regex-state-machine in `src/mcp/edits/setParamValue.ts` (handles single/double quotes, optional opts, nested braces in option objects, multi-line calls, multiple-match rejection)
- 14 new unit tests + 1 spawn integration test (10 primitive cases + 4 tool cases + 1 spawn round-trip)

### Changed
- None — additive only.

### Deferred to v0.12-rc / v0.12.0
- `add_feature(code, code_to_insert, position?)` — needs ts-morph or careful AST walker
- `remove_feature(code, feature_id)` — needs `FeatureRecord.scriptLocation` to map IDs to source lines
- `suppress_feature(code, feature_id)` — wrap a line in `// @suppress` annotation

The decision to ship just `set_param_value` for v0.12-beta is deliberate YAGNI — `param()` value tweaks are by far the most common agent edit, and adding more tools should be driven by usage rather than speculation.

---

## v0.12.0-alpha.1 — 2026-04-30

### Added
- **Skill installer** — second agent-first surface (companion to v0.11's MCP server)
  - `kernelcad skill install [--dir <path>]` — copies SKILL.md to `<dir>/SKILL.md` (default `~/.agents/skills/kernelcad/`, the conventional location agent skill discovery reads from)
  - `kernelcad skill one-file [<path>]` — emits SKILL.md to a user-specified path (default `./kernelcad-context.md`) for chat-UI agents
- `src/skill/SKILL.md` (213 lines) — single-file kernelCAD model authoring guide. Hand-authored against the actual codebase (subagent caught and corrected 7 factual errors in the original plan):
  - API surface (param/box/cylinder/sphere/extrudeRect/extrudeCircle/revolveRect + Shape methods)
  - Canonical face refs constraint with workarounds
  - 3 sample scripts (parametric bracket, rounded bracket, hollow box)
  - 26-entry diagnostic codes table (synced with `whyDidThisFail`'s HINTS)
  - CLI commands + MCP companion tool reference
  - Out-of-scope deferred-features list
- Spawn integration test that drives the built CLI's `skill install` subcommand end-to-end

### Changed
- `build:cli` now copies `src/skill/SKILL.md` to `dist/cli/SKILL.md` so the runtime can find it (alongside `index.js` and `replicad_single.wasm`)
- Bundle banner: replaced `fileURLToPath` import (which collided with the same import in `src/cli/commands/skill.ts`) with inline `new URL(import.meta.url).pathname` / `new URL('.', import.meta.url).pathname`

### Deferred to v0.12-beta+ / v0.13+
- Auto-generated SKILL.md from `src/intent/types.ts` and the actual exported API surface (so the skill stays in sync with code automatically)
- AST-edit MCP tools (`replace_param_value`, `add_feature`, `remove_feature`)
- `--dev` flag for SKILL-dev.md (internals + conventions docs)
- `Shape.mirror()` method exposure (currently only on `OcctBackend`, not the user-facing capture proxy)

---

## v0.11.0 — 2026-04-30

### Added
- **3 new MCP topology tools** completing the v0.11 read-tools surface:
  - `list_topology(file?, code?, feature_id?)` — canonical face names + edge count for an introspected feature. Returns empty face list and `hasTrackedTopology: false` for non-primitives.
  - `get_edges_of(file?, code?, feature_id?, face_name)` — boundary edges of a named canonical face. Returns `[{ index, centroid, length, isClosed }]`. Centroid uses Replicad's parametric `pointAt(0.5)` so it's correct for arcs/circles, not just straight edges.
  - `why_did_this_fail(file?, code?, feature_id?)` — focused diagnostic view + upstream chain walk + **human-readable hints lookup** (26 entries covering known kernel diagnostic codes — fillet/chamfer/shell failures, face-ref errors, recompute cascade, CLI errors). Returns the suggestion directly inline so agents don't have to consult skill docs to interpret codes.
- 3 new spawn integration tests covering the new tools (5 total: 2 from alpha + 3 from final).

### Changed
- v0.11 milestone closed at final (no separate `-beta` tag in the public history). Version progresses 0.11.0-alpha.1 → 0.11.0.

### Deferred to v0.12+
- AST-edit tools (deferred per NORTHSTAR roadmap)
- Geometric edge selection (`select_edges` for non-primitive shapes)
- HTTP transport (currently stdio-only)
- Skill installer (`kernelcad skill install`)

## v0.11.0-alpha.1 — 2026-04-30

### Added
- **MCP server** — first agent-first surface (`kernelcad mcp` subcommand, stdio transport)
  - `evaluate_script(file? | code?)` — run a script, report pass/fail + feature count + diagnostics
  - `list_features(file? | code?)` — list captured features (kind, id, params, inputs, transform count, suppression)
  - `get_shape_info(file?, code?, feature_id?)` — volume / surfaceArea / bbox for the resolved feature (defaults to last)
- `@modelcontextprotocol/sdk` v1.29 dependency
- `src/mcp/` module with three pure tool functions reusable outside the MCP transport
- `tests/integration/mcp/spawn.test.ts` — subprocess + JSON-RPC integration test covering both initialize and tools/call

### Changed
- `EvaluateInput` (in `src/cli/commands/evaluate.ts`) widened to accept `{ code?: string }` for inline source. Existing `kernelcad evaluate <file>` surface unchanged.
- `vitest.config.ts` — `tests/integration/**` added to include path

### Deferred to v0.11-beta+ / v0.12
- `get_edges_of(feature_id)`, `get_faces_of(feature_id)` — topology query tools
- `why_did_this_fail(feature_id)` — guided diagnostic explainer
- AST-edit tools (deferred to v0.12 per NORTHSTAR)
- HTTP transport
- Skill installer (v0.12) — deliver kernelCAD docs as Claude Code / Codex skills

---

## v0.2.0-alpha.2 — 2026-04-30

### Added
- **`shell`** — third edge/face feature in v0.2-alpha (`Shape.shell(thickness, { face })`)
  - Required `face` input (no all-faces default); canonical face only on un-transformed primitives
  - Wraps OCCT's `BRepOffsetAPI_MakeThickSolid` via Replicad's `Shape3D.shell(thickness, finder)`
  - Diagnostic codes: `feature.shell.failed`, `feature.shell.no-base`, `feature.shell.no-thickness`, `feature.face-feature.face-required`, `feature.face-feature.face-ref-not-resolvable`, `feature.face-feature.face-ref-not-supported`, `feature.face-feature.face-ref-not-applicable`
- `pickFace(record, base)` helper in `edgeSelection.ts` — sister of `pickEdges`, returns the canonical face directly for face-features
- `findCanonicalFace` private helper extracted from prior `canonicalBoxFaceEdges` / `canonicalCylinderEndCapEdges`; both pickEdges and pickFace now share the resolution logic
- `OcctBackend.shell(face, thickness)` instance method
- `OcctLowerer 'shell'` switch case
- `Shape.shell` capture proxy (delegates to `CaptureSession.edgeFeature('shell', ...)`)
- `tests/e2e/fixtures/hollow-box.kcad.ts` fixture + e2e volume-regression test (shelled volume < 30% of solid equivalent)

### Changed
- `CaptureSession.edgeFeature()` widened to accept `kind: 'fillet' | 'chamfer' | 'shell'` and `valueParamName: 'radius' | 'distance' | 'thickness'`. No call-site changes for fillet/chamfer.

### Deferred to v0.3+
- `hole` as a distinct feature (v0.1 already supports `subtract(cylinder)` which covers the geometry; ergonomic wrapper deferred)
- `cut` as a distinct feature (v0.1 `subtract` already covers it)
- `draft` (face angle modification) — also a face-feature; same canonical-refs limitation
- Tracked refs / `NamingHistory`
- Non-canonical face filters

---

## v0.2.0-alpha.1 — 2026-04-30

### Added
- **`fillet` and `chamfer`** — first edge features in the kernelCAD module API
  - `Shape.fillet(radius, opts?)` and `Shape.chamfer(distance, opts?)` on the capture proxy (`src/capture/proxy.ts`)
  - Canonical face filter via `opts.face` (`'top'|'bottom'|'left'|'right'|'front'|'back'`) on un-transformed primitives — `box(20,20,5).fillet(2, { face: 'top' })`
  - Symmetric (45°) chamfer only; asymmetric two-distance variant deferred
- `pickEdges(record, base)` helper (`src/backends/occt/edgeSelection.ts`) — resolves face filter to OCCT edges via gap-aware bounding-box face matching
- `OcctBackend` `kind?` tag set by static factories; transforms and booleans drop the tag — used to enforce "canonical face refs require an un-transformed primitive"
- `OcctBackend.fillet(edges, radius)` / `.chamfer(edges, distance)` instance methods wrapping `BRepFilletAPI_MakeFillet` / `BRepFilletAPI_MakeChamfer`
- `OcctLowerer` switch arms for `'fillet'` and `'chamfer'` with structured diagnostics (`feature.fillet.failed`, `feature.chamfer.failed`, `feature.edge-feature.face-ref-not-resolvable`, `feature.edge-feature.face-ref-not-applicable`, `feature.edge-feature.face-ref-not-supported`)
- `CaptureSession.edgeFeature(kind, base, valueParamName, value, face?)` registrar mirroring the `boolean()` pattern
- `tests/e2e/fixtures/rounded-bracket.kcad.ts` parametric demo + e2e volume-regression test

### Spec deviations
- One combined error code `feature.edge-feature.face-ref-not-resolvable` covers both "non-primitive base" and "transformed primitive" cases. Splitting them cleanly would require refactoring `FeatureLowerer.lower()` to receive the base FeatureRecord — bigger blast radius than v0.2-alpha warrants.

### Deferred to v0.2 / v0.2-beta
- `tracked` / `created` / `propagated` FaceRef variants and `NamingHistory` walking
- Asymmetric (two-distance) chamfer
- Per-edge variable radii
- Canonical face refs on transformed primitives
- shell, hole, cut, draft features

## v0.1.0 (internal architecture milestone, never published) — 2026-04-29

### Added
- New flat feature-graph IR (`src/intent/`)
- Runtime feature capture (`src/capture/`) — script-primary, no AST walk
- `ParamRegistry` with mathjs expressions, units, cycle detection (`src/compute/paramRegistry.ts`)
- `DependencyGraph` with topo sort + canReorder validation (`src/compute/dependencyGraph.ts`)
- `RecomputeEngine` with input-resolution and health states (`src/compute/recomputeEngine.ts`)
- `ShapeBackend` + `FeatureLowerer` interfaces (`src/backends/backend.ts`)
- `OcctBackend` + `OcctLowerer` for box/cylinder/sphere/extrude/revolve/boolean (`src/backends/occt/`)
- TypeScript script transpile + `vm`-based execution isolation (`src/script-runtime/`)
- `kernelcad` CLI: `evaluate` + `export stl|step` (`src/cli/`, esbuild bundle)
- v0.1 acceptance demo: parametric plate with hole

### Changed
- Version reset 0.10.0 → 0.1.0 per NORTHSTAR roadmap (new architecture line)
- Moved `src/lib/worker.ts` → `src/backends/occt/worker.ts`

### Deferred to v0.2+
- Edge features (fillet, chamfer, shell, hole, cut, draft) — require stable naming
- 2D sketch primitives + `tracked`/`created`/`propagated` topology refs
- `NamingHistory` walking + geometry-snapshot fallback

### Documentation
- New NORTHSTAR architecture spec (in kernelCAD-private)
- Ported internal docs from `kernelCAD-private` into `docs/internals/`
- Added clean-room IP boundary clause to `CONTRIBUTING.md`
- Archived 22 obsolete docs to `archive/doc/`

---

# 🚀 kernelCAD v0.10.0

**Modern Programmable CAD for the Web**

---

## 📋 What's New

- chore: cleanup test artifacts (de01ddf)
- chore: ignore test results (11f4197)
- chore(release): prepare version for automation (a7ec6a3)
- chore(release): resolve build errors and test regressions (d423c72)
- chore(release): fix lint errors and improve type safety (47b96f6)
- chore(release): synchronize version and apply stabilization fixes (7b3d4ba)
- docs: update CHANGELOG for v0.10.0 (1ce0ea6)
- feat: add E2E test suite, release automation, and documentation improvements (337680c)
- feat: expand E2E test coverage and improve sketching reliability (91b0fc3)
- feat: fix sketch visibility, harden worker, and expand E2E test coverage (a32c71c)
- test: add standard workflow validation suite (2ca0540)
- feat: complete v0.6.1 architecture refactor and regression suite (dc6d3f7)
- Refactor: Implement Sketch on Face and Extrude Direction (37ead84)
- fix: resolve correct variable names in Extrude Face feature (4aa8cb8)
- fix: add plane validation to prevent invalid face sketching (70c2979)
- fix: prevent duplicate variable names in face sketch workflow (259acb2)
- refactor: Phase 2 - Extract face selection into custom hook (c23c71f)
- chore: enforce Node.js 22+ requirement (cf7ebc7)
- refactor: Phase 1 - Add plane utilities and constants (f16817f)
- feat: implement sketch visualization and complete phase 1.1 milestones (dc45a38)
- docs: add development experience and testing techniques to roadmap (b95bb10)
- feat: implement Face Selection and Extrude from Face workflows (b03a437)
- feat: implement Revolve, Fillet/Chamfer enhancements, and Boolean operations with full test coverage (7ed7c85)
- docs: restructure roadmap to prioritize professional CAD workflows (97332c1)
- feat(workflow): implement decoupled sketch-extrude workflow and standalone construction tools (e1f12b3)
- fix: resolve Sketcher.extrude error and implement circle tool support (9707001)
- test: fix SceneBrowser tests for new folder-based UI and mandatory props (d090643)
- feat: advanced plane infrastructure & scene browser evolution (e22a316)
- feat: refined sketching system v0.5.0 (07dfc1e)
- fix: extrude dialog number input validation (c4a0d80)
- feat: complete sketch → code → extrude workflow (4182aa7)
- feat: implement 2D sketch canvas with drawing tools (45a350f)
- feat: verify Replicad Sketcher API in browser (e0f139c)
- feat: add sketch mode infrastructure for v0.5.0 (34afc28)
- docs: reprioritize v0.5.0 as Sketching System (8ac0a00)
- docs: fix semantic versioning in roadmap (8d00b26)
- docs: clean up roadmap - mark v0.4.0 complete, reorganize phases (6801ebc)
- docs: add Feature History/Timeline phase to roadmap (9c1c30c)

---

## ✅ Test Results (Automated)

- **QC Check**: Passed (Linting & Build)
- **Unit Tests**: Ran successfully
- **E2E Tests**: Manual verification recommended

---

## 📦 Build Information

- **Version**: 0.10.0
- **Build Date**: 2026-02-04 14:54:08 UTC
- **Platform**: Web / linux

## 🎯 Supported Features

kernelCAD v0.10.0 supports:

| Feature | Description | Status |
|---------|-------------|--------|
| Sketcher | 2D constraint solver | Stable |
| Extrude | 3D extrusion from faces | Stable |
| Fillet/Chamfer | Edge modifications | Beta |
| STEP Export | CNC/CAM compatibility | Stable |

---

## 📥 Installation

### Use Online
Visit [kernelcad.com](https://kernelcad.com).

### Run Locally

```bash
git clone https://github.com/w1ne/kernelCAD.git
cd kernelCAD
git checkout v0.10.0
npm install
npm run dev
```

---

## 🐛 Report Issues
Found a bug? [Open an issue](https://github.com/w1ne/kernelCAD/issues)


# Changelog

All notable changes to this project will be documented in this file.
 
## [Unreleased]
### Added - Visibility & Selection System
- **Visibility Persistence**:
    - Implemented `localStorage` persistence for `hiddenIds`.
    - Hiding objects in Scene Browser (via Eye icon) is now preserved across page reloads.
- **Universal Selection**:
    - **Plane Selection**: Made all plane types (Base, Offset, Face-derived) selectable in the 3D Viewer.
    - **Visual Feedback**: Clicking a plane highlights it with `selection-blue`.
    - **Synchronization**: Selection state stays in sync between 3D Viewer and Scene Browser.
- **Testing Infrastructure**:
    - Enhanced `WorkbenchContext` to expose `setCode`, `startFaceSelection` and selection helpers to `window` for robust E2E testing.
    - Added `tests/visibility_selection.spec.ts` to verify persistence and interaction flows.

## [0.10.0] - 2026-02-04
### Added - Release Automation & Testing Infrastructure
- **Release Automation**:
    - Created `scripts/release.ts` for automated version bumping, tagging, and release note generation.
    - Integrated release script with `npm run release -- [major|minor|patch]` command.
    - Automated CHANGELOG updates and git tag creation.
- **Comprehensive E2E Test Suite**:
    - Added `tests/core_workflows.spec.ts` covering Box, Cylinder, Extrude, Revolve, Fillet, and Boolean operations.
    - Added `tests/error_handling.spec.ts` for edge case validation and error recovery.
    - Added `tests/extrude_face_anonymous_shape.spec.ts` and `tests/extrude_from_code_sketch.spec.ts`.
    - Improved Playwright configuration for better test stability and parallelization.
- **Custom Icon System**:
    - Created `src/icons/cad.ts` with custom CAD-specific icons.
    - Added `src/components/CustomIcons.tsx` for icon component library.
- **Integration Test Suite**:
    - Added `src/integration/e2e_workflows.test.ts` for workflow validation.
    - Added `src/integration/ui_workflows.test.tsx` for UI interaction testing.

### Changed
- **Documentation**:
    - Updated `RELEASE_STRATEGY.md` with Git Flow branching model and branch protection rules.
    - Added comprehensive release note template matching professional standards.
    - Enhanced `TESTING_STRATEGY.md` with detailed testing approach and coverage goals.
    - Updated `INTERFACES.md` with improved API documentation.
- **Worker Improvements**:
    - Refactored geometry worker for better error handling and reliability.
    - Improved memory management and buffer transfers.
    - Enhanced sketch processing and validation.
- **Type System**:
    - Added `src/types/editor.ts`, `src/types/replicad-opencascadejs.d.ts`, and `src/types/window-globals.d.ts`.
    - Improved type safety across the codebase.

### Fixed
- **Build Configuration**:
    - Updated `vite.config.ts` for better build performance.
    - Enhanced `tsconfig.app.json` with stricter type checking.
- **Test Stability**:
    - Removed flaky test artifacts and improved test isolation.
    - Fixed empty sketch validation tests.

### Technical
- **Code Quality**: Added ESLint rules for better code organization.
- **Dependencies**: Updated package-lock.json with latest compatible versions.
- **Cleanup**: Removed obsolete files (`scripts/release.sh`, `public/opencascade.wasm`).

## [0.9.0] - 2026-02-01
### Fixed - Critical Sketch Bugs
- **Empty Sketch Extrusion Crash**:
    - System now detects empty sketches (no geometry drawn) and throws a descriptive error instead of crashing with "No lines to convert into a wire".
    - Implemented `_hasGeometry` tracking in `SafeSketcher` via Proxy pattern to intercept drawing commands.
    - Updated `extrude` helper in `geometryHelpers.ts` to provide user-friendly error messages.
    - Added comprehensive unit tests in `tests/reproduce_empty_sketch.test.ts`.
- **Anonymous Shape Sketching Bug**:
    - Fixed AST parser incorrectly resolving chained expressions (e.g., `box.cut(tool)`) to base variables (`box`).
    - This caused sketches to attach to the wrong parent shape, leading to visual/parametric mismatches and empty sketch generation.
    - Implemented strict `resolveVariableName` in `src/lib/ast.ts` to only resolve direct identifiers.
    - System now generates safe "detached sketches" (`new Sketcher(plane)`) for anonymous shapes, ensuring correct global coordinates.
- **Sketch Code Generation Split**:
    - Resolved issue where sketch entities were generated in separate code blocks instead of being combined into the parent `sketchOnFace` call.

### Changed
- **SafeSketcher Proxy**: Enhanced method chaining to correctly return proxy instance for all drawing operations.
- **AST Resolution**: Removed recursive variable resolution for `CallExpression` and `MemberExpression` to prevent false parent identification.

### Technical
- **Tests**: +6 new unit tests for empty sketch handling and AST resolution.
- **Architecture**: Improved reliability layer defensive programming patterns.

## [0.8.0] - 2026-01-31
### Added - Sketch Visibility & Test Expansion
- **Sketch Visibility**:
    - Connected `sketchesGeometries` to the `Viewer` for real-time visualization.
    - Standardized `THREE.Line` rendering for continuous polylines.
    - Automatic conversion of single return values to arrays in AST when sketches are added.
- **E2E Test Coverage**:
    - 10 new Playwright tests covering Primitives (Box, Cylinder), Booleans (Union, Cut), Exports (STEP, STL), and UI interactions (Undo/Redo, View Modes).
    - Exposed `window.isEditorReady` and `window.getSketches` for test synchronization and validation.
- **Worker Robustness**:
    - Ultra-robust error handling in geometry worker via multiple try-catch layers.
    - Graceful handling of invalid/zero-length geometry without engine crashes.
    - Vertex-based sketch deduplication to prevent redundant rendering.
 
### Fixed
- **UI Stability**:
    - Resolved a null-pointer crash during `sketchOnFace` initialization in `WorkbenchLayout`.
    - Implemented zero-length entity filtering in `SketchCanvas` to prevent invalid Replicad inputs.
- **E2E Regression**:
    - Updated stress tests to use proper drag motions and verify visual geometry presence.
 
## [0.7.0] - 2026-01-30
### Added - Reliability & Testing Overhaul
- **Comprehensive Fuzzing Suite**: Property-based testing using `fast-check` to validate geometry kernels against edge cases (`NaN`, infinite inputs, disjoint unions).
- **Workflow Validation Framework**: Automated regression testing for complete end-to-end user workflows (`src/workflows`).
- **Testing Strategy Documentation**: detailed guide in `doc/TESTING_STRATEGY.md`.

### Changed
- **Robustness**:
    - **Logic**: Enforced disjoint inputs for Boolean Union to prevent kernel crashes in headless mode.
    - **Validation**: Strict validation of operations (Fillet, Chamfer) with fallback checks for missing properties.
- **Architecture**:
    - **Linting**: Added architectural boundaries to prevent circular dependencies (e.g., forbidding imports from `src/components` into `src/lib`).

### Fixed
- **Headless Operations**: Resolved issues where `Chamfer` and `Union` operations returned valid shapes but missed `volume`/`boundingBox` properties in test environments.
- **State Machine**: Hardened `WorkbenchContext` against invalid state transitions during sketch mode.


## [0.6.0] - 2026-01-27
### Added - Professional Modeling Workflow
- **Sketch Visualization**: Toggleable cyan/blue line rendering for sketches in the 3D scene.
- **Show/Hide Sketches**: Toolbar button to toggle visibility of all sketches.
- **Face Selection & Sketching**: Support for `.sketchOnFace()` and creating sketch planes from 3D faces.
- **Advanced Boolean UI**: Cleaner interfaces for Union, Subtract, and Intersect operations.
- **Geometry Engine Updates**: Worker now extracts and meshes sketch wires for visualization.
- **Enhanced Feature Execution**: Support for target selection and contextual feature execution.

### Changed
- **Workbench Architecture**: Updated `WorkbenchContext` to manage sketch geometries and visibility state.
- **Viewer Component**: Now renders `lineSegments` for sketches alongside solid geometries.
- **Worker Logic**: Injected `startSketch` wrapper to automatically capture all sketches created in user code.

### Fixed
- **Worker Stability**: Improved handling of large meshes and buffer transfers.
- **Coordinate System**: Better alignment between sketch planes and 3D world coordinates for face-based sketching.


## [0.4.0] - 2026-01-26
### Added - CAD-Style View Modes
- **3 Professional View Modes** for engineering CAD viewport conventions:
  - **Shaded with Edges** (Default) - Flat-shaded surfaces with black edge lines
  - **Wireframe** - Clean geometric edges only (NOT mesh tessellation)
  - **Shaded** - Smooth surfaces without edges
- **CAD Material System** (`materials.ts`):
  - MeshLambertMaterial (matte, no specular) instead of PBR
  - EdgeGeometry (15° threshold) for sharp geometric features
  - LineBasicMaterial for clean black edges
- **CAD Lighting System** (`lighting.ts`):
  - Headlight (0.7 intensity, follows camera)
  - Bright ambient (0.5 intensity, CAD principle: clarity over realism)
  - Rim light (0.3 intensity, for depth perception)
  - No shadows, no realistic fall-off
- **View Mode UI Controls**:
  - Toggle buttons in Header (Box/Grid/Circle icons)
  - Active state highlighting
  - Keyboard-accessible

### Changed
- **Replaced PBR Materials**: MeshStandardMaterial → MeshLambertMaterial for CAD clarity
- **Viewer Component**: Now supports 3 rendering modes with proper edge visualization
- **State Management**: Added `viewMode3D` to WorkbenchContext

### Fixed
- **Wireframe Rendering**: Now uses EdgesGeometry instead of WireframeGeometry
  - Shows geometric edges (box boundaries, cylinders, fillets)
  - NOT mesh triangulation/tessellation
  - Matches professional CAD software behavior

### Testing
- **+14 Unit Tests** for CAD materials and lighting modules
- **85 Tests Total** (all passing)
- **100% Browser Verified**: All 3 modes switching smoothly
- **Modules Isolated**: Easy to test, replace, and expand

### Technical Details
- **Code Added**: ~200 lines (materials.ts, lighting.ts, viewMode.ts, Viewer updates)
- **Architecture**: Fully modular with dependency injection ready
- **Performance**: 60fps in all modes, no memory leaks on mode switching
- **Edge Threshold**: 15° for sharp geometric features only

## [0.2.1] - 2026-01-26
### Fixed
- **Default Template Array Return**: Changed default template from `return filleted.cut(cyl);` to `return [filleted.cut(cyl)];` to enable AST auto-update of return statements.
- **Shape Visibility**: Box/Cylinder insertions now correctly appear in 3D view after insertion.

### Refactored
- **Feature Organization**: Extracted features into dedicated files (`box.feature.ts`, `cylinder.feature.ts`, `modifiers.feature.ts`) for better maintainability.
- **Code Cleanup**: Removed dead Regex code (~70 lines) replaced by AST implementation:
  - Deleted `findInsertionPoint()` - replaced by AST
  - Deleted `updateReturnStatement()` - replaced by AST
  - Kept `generateUniqueName()` and `extractVariables()` (still in use)
- **Simplified Insertion**: `useCodeInsertion.ts` now exclusively uses AST Command Pattern for shape insertions.

### Documentation
- **Updated Roadmap**: Added comprehensive ROADMAP 3.0 with industry-standard CAD workflows.
- **CAD Workflow Comparison**: New document comparing current state with professional CAD systems.
- **Phase Planning**: Detailed phases for Sketching (v0.3), View Modes (v0.4), and Advanced Features (v0.5).

### Technical
- **Code Reduction**: -160 lines (-62% reduction in modified files)
- **Test Suite**: 71 tests passing (removed 6 obsolete tests for deleted functions)
- **Browser Verified**: Full smoke test confirms Box/Cylinder insertions working perfectly

## [0.2.0] - 2026-01-26
### Added
- **AST-Based Code Manipulation**: Replaced fragile Regex patterns with robust Abstract Syntax Tree (AST) using `acorn` parser.
- **Syntax-Aware Insertion**: Shape insertion now uses AST traversal to find the correct `drawPart` function and return statement.
- **Auto-Return Updates**: Automatically appends inserted variables to return array (e.g., `return [box]` → `return [box, cylinder]`).
- **Command System**: Implemented Command pattern with Undo/Redo support for code changes.
- **Feature Registry**: Added pluggable feature system for Box, Cylinder, and Sphere primitives.
- **Comprehensive Testing**: Added 39 new tests (24 unit + 15 integration) covering edge cases and full workflow.

### Changed
- **Code Insertion Logic**: Migrated from Regex to AST-based manipulation in `ast.ts`.
- **Toolbar Integration**: Toolbar now uses feature registry and command system.
- **Package Dependencies**: Added `acorn`, `acorn-walk`, and `astring` for AST processing.

### Fixed
- **Comment Corruption**: AST prevents Regex bug where comments containing "return" were incorrectly modified.
- **String Literal Matching**: No longer matches patterns inside string literals.
- **Nested Functions**: Correctly identifies target function scope instead of matching any return statement.

### Technical Details
- **Incremental Implementation**: 6-phase rollout with browser verification at each step.
- **Browser Compatible**: All AST libraries work in browser without bundler issues.
- **Test Coverage**: 77 tests passing (39 new AST tests + 38 existing tests).
- **Backup Available**: Old Regex implementation preserved in `ast-regex.ts`.

## [0.1.0] - 2026-01-25
### Added
-   **Scene Browser**: feature tree listing all objects (`box1`, `cyl2`) with "Jump to Code" functionality.
-   **Workbench Architecture**: Complete refactor of `App.tsx` into a modular context-based system.
-   **GUI Mode**: Dedicated Design view with Toolbar and Browser sidebar.
-   **Smart Insert**: Context-aware code insertion that respects scopes and return statements.
-   **Structure**: New component library (`src/components/Layout`).

### Changed
-   **Web Worker**: Improved geometry execution stability.
-   **Performance**: Reduced main thread blocking during re-computation.


## [0.0.1] - 2026-01-25
### Added
-   **Initial MVP**: Editor, Viewer, and Geometry Engine.
-   **Advanced Features**: `fillet`, `chamfer`, `makeCompound`.
-   **Export**: STEP and STL export capabilities.
-   **Architecture**: Modular design with `geometryHelpers` and `geometryExports`.
-   **Testing**: Unit tests with Vitest.
-   **CI/CD**: GitHub Actions for automated deployment.
