# CAD agent harness comparison — 15 November 2026

## Decision

Reuse the measurable behavior of the strongest systems, not their architecture or
proprietary claims. Keep KernelCAD's OCCT kernel, parametric source and existing
MCP/CLI tools. Do not introduce a second CAD stack, extra public tools, or
multiple permanent agent roles solely to imitate another benchmark entry.

## Evidence and comparability

CADGenBench v0.1.0, dataset revision f76f96558581. It contains 49 generation
and 32 editing cases. Its private ground truth prevents direct local CAD Score
calculation. The published score measures geometry/validity on single parts;
it is not certification of manufacturing tolerances or assemblies.

Source of the following rows: the official submission dataset, results.jsonl,
retrieved 2026-11-15:
https://huggingface.co/datasets/HuggingAI4Engineering/cadgenbench-submissions

| System | Overall | Generation | Editing | Valid | Review |
| --- | ---: | ---: | ---: | ---: | --- |
| SMC Harness v1.2 + Fable 5.2 Max | 0.8662 | 0.9165 | 0.7892 | 81/81 | manually validated |
| Godela - Modernized Agentic | 0.8512 | 0.9024 | 0.7728 | 81/81 | manually validated |
| build123d-mcp 0.3.85 + Opus 5.5 | 0.8298 | 0.8690 | 0.7697 | 81/81 | manually validated |
| KernelCAD refresh, 2026-10-26 | 0.4842 | 0.4354 | 0.5589 | 75/81 | unvalidated |

The KernelCAD row carried forward 79 old outputs and is NOT a fresh run
of the current KernelCAD code. Do not present the score gap as a current,
same-model head-to-head measurement.

**SMC source availability:** The submission's agent_url is null. The notes
say "In-house Generative CAD model from the Standard Manufacturing
Corporation." The public X announcement claims a predictor-corrector
architecture. No implementation, prompts, controller algorithm, token budget,
ablation or reproduction manifest is linked by the official record. Therefore
we cannot inspect or copy their implementation. The similar score of Godela
also has no linked agent repository. Do not infer either system's internals
from submitted STEP files.

## Public harnesses inspected

1. Hugging Face reference CADGenBench baseline (Apache-2.0):
   https://github.com/huggingface/cadgenbench
   It writes CAD code, renders intermediate geometry, gives visual feedback,
   validates candidates, and submits exported STEP. Scoring source is public;
   private ground truth is not.

2. Reproducible build123d-mcp harness (Apache-2.0):
   https://github.com/pzfreo/cadgenbench-build123d
   Exposes exact pinned agent/model/tool revisions, independent per-fixture work
   directories, generic prompts, development/test split, artifact digests,
   tool logs and reproducible packaging. Its documented comparison treats
   local checks as proxies and the official grader as authoritative.

3. build123d-mcp engine and tool recipes:
   https://github.com/pzfreo/build123d-mcp
   Strong features include exact final STEP re-import validation, seam-aware
   manifold diagnostics, local defect localization, bounded native-OCC
   subprocesses, non-local edit-delta feedback, and documented recovery
   recipes. One release temporarily disabled its spec-confidence tools after
   benchmark sweeps showed false-positive "done" behavior. More tools or
   confident-looking labels are not automatically better.

4. AI-CAD open agent harness (Apache-2.0):
   https://github.com/ai-cad-labs/ai-cad
   Uses measured dimensions, eight engineering views, independent DFM
   checks, proposal rejection on DFM regressions, durable file-based
   checkpoints and run reflections. Its nine-agent organizational structure
   is not necessary for KernelCAD.

## Gap decisions

| Proven mechanism | KernelCAD baseline | Action |
| --- | --- | --- |
| Execute/validate/revise loop | Existing closedLoop, repair_script and typed errors | Keep; no duplicate engine |
| Validate the exported STEP, not just memory geometry | Existing STEP export validity and official benchmark gate | Keep; continue differential gate tests |
| Exact seam/mesh defect detection and recovery hints | Existing CADGenBench validity precheck; other OCCT checks | Audit checker parity by real failures; only fix measured mismatches |
| Visual comparison before promoting a valid revision | One opt-in matched-view correction | Extend existing path to bounded 1–3 rounds; preserve best valid checkpoint |
| Preserve unrelated edit geometry | Request-aware editPromotion tests exist, but no general guaranteed non-local delta gate | Follow-up: benchmark a read-only localized shape-difference check; avoid false rejection |
| DFM proposal regression guard | DFM tools and manufacturing checks already exist | Follow-up: compare before/after verified findings for *proposed* repairs; no false certification |
| Multi-view feedback | Existing renderCandidateViews and matched comparison | Reuse, no new renderer or browser |
| Resume/provenance and isolated work | Existing task state, hashes, run identity, retries and checkpoints | Keep; pin model/version/seed |
| Engineering source, named params, editable assemblies | Core KernelCAD advantage | Keep; benchmark edits and manufacturing separately |
| Nine permanent agent roles or a second CAD kernel | Adds orchestration and dependency cost without proof | Reject |

## Implementation in this branch

A single optional extension to the existing CADGenBench harness:
`--visual-review` still means one visual correction. New
`--visual-review-rounds 2` or `3` repeats the same checked
propose/validate/matched-view-compare step. Each accepted correction becomes
the next checkpoint. A failed, unchanged, uncertain or visually worse
candidate stops the sequence and leaves the last accepted STEP untouched.
A distinct round file preserves every correction's outcome and model output.
No new MCP tool, kernel, model dependency or provider is added.
Default remains zero visual corrections until measured.

## Release experiment (not yet executed)

Run an A/B/C comparison of 0, 1 and 2 rounds on a frozen, held-out set with
identical model, effort, seed, budget and official CADGenBench version. Keep
training/development cases out of reported test results. Record all 81
outcomes, both task-type scores, validity, per-case deltas, tool failures,
wall time, tokens and estimated USD. Use the official scorer; do not report
locally predicted CAD Score. Require a positive quality/cost result before
enabling more reviews by default. Follow with generation and editing regression
cases outside CADGenBench (enclosures, shafts, mounting interfaces, assemblies).

A clean visual review establishes only that the candidate looks closer to the
drawing, not that it satisfies fit, tolerances, assembly motion or DFM.
