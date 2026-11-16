# KernelCAD live CADGenBench pilot — 15 November 2026

**Conclusion:** Two actual CADGenBench cases produced valid STEP models with the current KernelCAD CLI. The official CAD Score remains unknown because the benchmark ground-truth shapes are private. Validity is not geometry fidelity.

## Reproduction

- Source: `w1ne/kernelCAD-web`, branch `feat/cadgenbench-bounded-corrector-20261115`, base commit `d10167e48`, rebuilt local CLI.
- Inputs: HuggingAI4Engineering/cadgenbench-data revision `f76f965585817c621d6ea0d150d745adf670e66e`.
- Generator: Codex CLI `gpt-6-luna`, reasoning effort high, original benchmark input drawing/renders attached. One candidate per task, no corrective retry.
- Workflow: extracted `.kcad.ts` script → local `run.ts --scripts-from` → current KernelCAD CLI STEP export → KernelCAD validity precheck → actual `cadgenbench.common.validity.analyze_step`.
- These tests do **not** exercise PR #1401's new visual-correction path. The official private grader was not invoked and no public submission was made.

## Results

| ID | Task | Codex generation | Reported model tokens | KernelCAD pipeline wall | Local validity | Official STEP validity | BREP faces |
| --- | --- | ---: | ---: | ---: | --- | --- | ---: |
| 101 | Drawing → STEP | 81.0 s | 57,742 | 10.9 s | pass | pass | 82 |
| 201 | STEP editing | 69.5 s | 54,814 | 74.8 s | pass | pass | 453 |

Each candidate was one solid. Pipeline time excludes Codex model time but includes STEP export, local validity and relevant edit-promotion checks. The host was under concurrent hardware-verification load; no throughput estimate is justified. Codex usage total was 112,556 reported tokens. Account cost was not measured. The `--scripts-from` harness records 0 LLM tokens because it did not make model calls.

### Task 101

- STEP SHA-256 `97054755725363ef3d20e5f14484ed937395828bf3c6cd7e9b9711809cc9f256`.
- Measured BREP volume `884,500.3608 mm³`; bbox min `(-200,-150,-22.5)`, max `(0,0,22.5)` mm. Overall extents `200×150×45 mm`.
- The source says the bbox is centred on the origin, but its measured XY centre is `(-100,-75)`. Extents-only ledger checks do not detect this. **This is a prompt-contract discrepancy, not proof of reduced CADGenBench score:** the benchmark's `cadgenbench.eval.alignment` performs rigid alignment to private ground truth.
- One valid output cannot establish feature completeness or similarity to the original private target.

### Task 201

- Request: move walls of four non-circular pockets on the +X side of a central bore inward by 6 mm.
- STEP SHA-256 `be3a2be5b35ce1d2f3855437763e2479ed1c58c9f3ca9798ef1d06be2e38c7e5`.
- Normalized before/after: face count `435→453`; hole count `28→28`; outer bbox unchanged.
- BREP volume before `2,544,478.1527 mm³`, after `2,597,484.5516 mm³`; delta `+53,006.3988 mm³` (about +2.08%).
- Existing edit promotion returned `status:accepted`, `classification:edited`, reason `real change: volume +53006.40 mm³, faces +18`.
- Candidate used `base.offsetFaces` with +X and −X planar-face selectors covering a broad bounding box. This does **not** prove exactly four designated pocket walls moved 6 mm or that unrelated material was untouched.
- `parseEditIntent` classified a contextual reference to the central bore as `mentionsHoles:true`, and did not recognize `bring ... walls inward` as `moveOnly`; the semantic gate permits a real but possibly mislocalized edit.
- An additional OCP Boolean shape-difference probe was inconclusive: one cut returned a nonsensical `2,602,971 mm³` rather than the measured net change, and the reverse cut timed out at 60 s. Do not rely on it as a locality proof.

## Hosted natural-language generator (independent test)

Prompt: one 80×60×6 mm plate, four Ø4.5 mm through-holes at (±30, ±20), one Ø20 mm centre through-bore, named editable dimensions.

- Tool: `generate_kcad_from_prompt`, server build `0.1.0+d04033b4f91f@2026-11-14T22:21:00.598Z`.
- Returned `done_partial`, with `evaluationOk:true`, 11 features. `evaluate`, `step-validity` and `interference` passed.
- The `requirements` gate returned `requirements.unknown` for *all* clauses, including measurable dimensions and holes. Natural-language requirements were not verified.
- Source built five bores through Boolean cylinder subtraction rather than native `holes(...)`; the tool emitted advisory `authoring.prefer-api.hole-by-cylinder`, but did not correct it.
- Independent `inspect({of:'shape'})`: bbox `(-40,-30,-3)` to `(40,30,3)` mm and volume `26,533.3409 mm³`. Both are compatible with the requested exterior and holes, but are not a complete requirements/DFM certificate.

## Actions

1. Keep PR #1401 visual correction opt-in; its score benefit has **not** been measured. Evaluate 0/1/2 correction rounds with fixed model and task set before enabling by default.
2. Use issue #1402 to add localized edit verification against unintended changes. Include task 201 as a regression but do not overfit the benchmark.
3. Investigate the hosted requirements verifier on exact numeric clauses and the generated use of cylinders instead of native hole features.
4. Compare against a frozen manufacturing corpus (editable params, named interfaces, fit, DFM) in addition to CADGenBench single-part geometry.

References: https://github.com/huggingface/cadgenbench ; https://huggingface.co/datasets/HuggingAI4Engineering/cadgenbench-data
