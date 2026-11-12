---
name: manufacturing-readiness
description: >-
  Review one exact kernelCAD revision for fabrication readiness. Use when the user asks whether a part or assembly is ready to print, machine, fabricate, quote, or release. Produces revision-bound evidence with PASS, FAIL, WARN, NOT_RUN, UNSUPPORTED, and ASSUMPTION states; it never converts missing checks into a pass and never sends a quote or order without explicit approval.
---

# Manufacturing readiness

A useful readiness report answers one narrow question:

> What is supported for this exact design revision, for these named processes,
> and what still blocks a manufacturing handoff?

It is not a visual opinion and it is not a supplier approval.

Read `references/evidence-contract.md` before running the workflow.

## Workflow

1. **Freeze the subject.** Prefer a saved project and call `get_project_revision`
   with the exact `slug` and `version`. Otherwise use the exact inline `.kcad.ts`
   source. Record the project slug/version or a SHA-256 of the source. Never mix
   results from two revisions.
2. **Read the request.** Record the requested process, material, quantity,
   tolerance targets, load cases, machine envelope, and any supplier-specific
   limits. Missing inputs stay missing. Do not infer them from appearance.
3. **Build the geometry.** Run a full `evaluate_script`. A dry run is not
   evidence that the solid builds. Record `buildOk`, `ok`, bounding box,
   volume, diagnostics, requirement results, and tool limitations.
4. **Inspect the model.** Use `inspect` for the facts needed by the request:
   part statistics, body/part count, BOM, holes, wall/section metrics, or STEP
   verification. Do not run unrelated readers merely to make the report longer.
5. **Review assemblies only when present.** Use `review_cad` or `design_loop`
   for mechanisms and multi-part products. Record skipped stages separately.
   A time-budget skip is `NOT_RUN`, not a clean result.
6. **Run process checks.** Call `dfm_review` once for every requested supported
   process. Preserve each returned row and its native verdict. A process that
   cannot be checked is `UNSUPPORTED`, never PASS.
7. **Run tolerance checks only from declared ranges.** Use `sweep_tolerance`
   when the user or source supplies actual parameter ranges. Report the sampled
   points, boundary estimates, binding requirements, and any combination cap.
   Do not call sampled coverage a proof of all values.
8. **Run structural analysis only with a complete study.** Use `run_fea` only
   when material, fixed faces, loads, and an acceptance threshold are known.
   An in-process voxel solve is an estimate and must carry its mesh-trust flag;
   it is not a verified structural pass. Use `fea_summary` to report solver and
   material context.
9. **Render and look.** Use `render_preview` or `open_in_studio` for visual
   review. Record concrete visual findings, but never use appearance to replace
   geometry, DFM, tolerance, interference, or FEA evidence.
10. **Issue the report.** Print the revision identity, requested scope, evidence
    matrix, blocking findings, assumptions, limitations, and the next smallest
    action that removes each blocker.

## Release and external-action gate

The readiness report may prepare exports with `export` or `fab_pack` after the
model checks. It must not request a supplier quote, submit files externally,
order a part, start a print, or spend money unless the user explicitly approves
that exact action after seeing the report and all warnings.

A source, parameter, material, process, tolerance, load, or export change makes
prior evidence stale. Re-run the affected checks against the new revision.

## Required output

Use this order:

1. **Decision:** `READY FOR <named scope>` or `BLOCKED`.
2. **Subject:** project/revision or source digest; units.
3. **Scope:** processes, material, quantity, tolerances, load cases.
4. **Evidence matrix:** check, state, measured result, requirement, evidence
   reference, limitation.
5. **Blockers:** each with owner-independent next action.
6. **Assumptions and untested items.**
7. **Approval required:** name any proposed export, quote, order, or external
   transfer that has not occurred.

Do not write “manufacturable” without naming the process and evidence scope.
