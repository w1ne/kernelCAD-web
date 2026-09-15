---
name: kernelcad-repair
description: Turn a failed evaluation into a bounded, applied fix — why_did_this_fail for the repair region and candidates, then repair_script to apply and verify. Load when evaluate_script reports an error, a gate fails, or a feature shows up degraded in featureHealth.
---

# kernelCAD — trace-guided repair

`evaluate_script` tells you a feature broke. `why_did_this_fail` now also tells
you **which lines you may edit** and **what edits are on the table**, and
`repair_script` applies them and re-checks. Use this loop instead of re-reading
the whole script and hand-authoring a guess — the guess is what regresses
unrelated geometry.

## The loop

1. **Evaluate.** `evaluate_script({ file })` → `diagnostics` + `featureHealth`.
   A non-empty `featureHealth` matters even when `ok: true`: it names features
   that silently degraded to a passthrough.
2. **Explain.** `why_did_this_fail({ file, feature_id })` → the upstream
   `chain`, the full `trace`, a `repairRegion`, and ordered `candidates`.
3. **Preview.** `repair_script({ file, diagnostic: <targetDiagnosticId>, strategy: 'dry-run' })`
   → every candidate patch as a diff, nothing evaluated, nothing applied.
   Read the diffs. If none is the fix you want, edit the region yourself.
4. **Apply.** `repair_script({ file, diagnostic: <id>, strategy: 'try-all' })`
   → applies candidates in order, re-evaluates after each, and keeps the first
   that clears the diagnostic without new errors.
5. **Persist and report.** Write `new_code` back to the file, then state the
   change: the diagnostic, the candidate that cleared it, and the diff. Do not
   report "repaired" without naming what changed.

Repeat from step 1 while errors remain. Each pass targets ONE diagnostic.

**Worked example:** `examples/repair/` has three deliberately broken models (an
oversized fillet, a hole anchored off its plate, a cutter placed away from its
body) and a walkthrough that runs this exact loop on them:
`npx tsx examples/repair/run-repair-example.ts`. Its README includes the
captured output. `lookup_cookbook({ query: 'repair failing fillet' })` returns
the repaired fillet pattern.

## What the trace gives you

`why_did_this_fail().trace` is one entry per captured feature:

| field | meaning |
|---|---|
| `location` | `{ file, line, column }` of the call that authored the feature |
| `nodeRange` | AST line range of that call expression |
| `statementRange` | line range of the enclosing statement |
| `diagnostics` | the diagnostics attributed to this feature |
| `inputs` / `dependents` | upstream and downstream feature ids |
| `paramRefs` | named `param()` values the feature reads |

`kernelcad evaluate <file> --trace-out trace.json` writes the same structure to
disk — use it when a CI run failed and you are reading the artifact after the
fact.

## What the repair region means

`repairRegion.ranges` is the ONLY set of lines a repair may rewrite:

- `failing-feature` — the statement that authored the failing feature;
- `input-feature` — the statements that authored its DIRECT inputs (a boolean's
  cutter is a parameter source, not a bystander);
- `parameter-source` — the `param('<name>', …)` declarations it reads.

The region is deliberately **not transitive**. When the root cause is further
upstream, call `why_did_this_fail` again with that feature's id and act on its
own region. `repair_script` refuses any patch outside the region with
`tool.repair.out-of-region`.

## What a candidate is

Every candidate carries a real patch plus the geometry it was derived from:

```jsonc
{
  "id": "fillet_1:shrink-radius:4",
  "summary": "Reduce fillet radius from 9 mm to 4 mm.",
  "predictedEffect": "fillet applies to every target edge instead of being skipped; the blend reads 4 mm.",
  "patch": { "startLine": 2, "endLine": 2, "before": "return b.fillet(9);", "after": "return b.fillet(4);" },
  "evidence": { "shortestAdjacentEdgeMm": 10, "maxFeasibleValueMm": 5, "currentValueMm": 9 }
}
```

Read `evidence` before applying. It is the number the kernel measured, so you
can tell a fix that respects the design from one that merely silences a gate.

## Diagnostic kinds with automatic candidates

| diagnostic | derivation |
|---|---|
| `feature.edge-feature.short-edges-skipped` | radius ladder under half the shortest adjacent edge |
| `feature.subtractive-noop` (boolean) | translate the cutter onto the base bbox centre |
| `feature.subtractive-noop` (hole) | clamp `u` / `v` onto the entry face, one bore radius clear of its edge |
| `feature.intersection-empty` | translate one operand into overlap |
| `feature.selection.no-match` | retarget `atX` / `atY` / `atZ` to the nearest real edge coordinate |
| `feature.label.unknown-name` | substitute the closest declared label (`faceLabels` or `path().label(...)`) |
| `feature.emboss-text.depth-zero` | signed depth from the base body's thinnest dimension |
| `feature.face.invalid-uv-anchor` | clamp the anchor into `[0, 1]` |

Anything else returns `candidateStatus: 'no-automatic-candidate'` with a
`candidateReason` and the region. That is not a failure of the tool — it means
the fix is a design decision, and the region tells you where to make it.

## Rules

- **One diagnostic per pass.** Pass `targetDiagnosticId` explicitly rather than
  relying on `'first-error'` when you are iterating, so a shifting diagnostic
  order cannot silently retarget the repair.
- **Never widen the region.** If the fix needs a line outside it, the root cause
  is elsewhere — re-run `why_did_this_fail` against the feature that owns that
  line.
- **Verify, do not assume.** `repair_script` re-evaluates; `ok: true` means a
  candidate cleared the diagnostic with no new error codes. `ok: false` with
  `tool.repair.exhausted` means every candidate was tried and none worked —
  read `attempts[].newErrorCodes` before hand-authoring.
- **Repair is not a substitute for visual review.** A repaired model still has
  to be looked at; a cleared diagnostic is not a correct design.
- **`repair_script` never writes to disk.** It returns `new_code`; persisting it
  is your call, same as every other source-edit tool.

## Gates

| Gate | Check |
|---|---|
| G-region-bounded | Every applied patch lies inside `repairRegion.ranges`; an out-of-region patch returns `tool.repair.out-of-region` and changes nothing |
| G-reevaluated | `repaired.ok` is true only when a re-evaluation cleared the target diagnostic with no new error codes |
| G-no-silent-guess | A diagnostic kind with no derivation returns `no-automatic-candidate`, never an invented patch |
| G-source-anchored | A patch whose `before` text no longer matches the file is refused with `tool.repair.source-drift` |
| G-clean-after | The persisted `new_code` evaluates with zero error-severity diagnostics before the task is reported done |

## Related skills

- `kernelcad-mcp` — the full MCP surface, including `why_did_this_fail` and the source-edit tool family.
- `kernelcad-features` — fillet / chamfer / shell / hole semantics behind most repairable diagnostics.
- `kernelcad-params` — when the right fix is the `param()` default rather than the feature call.
- `kernelcad-authoring` — face labels, selectors, and the API the patches rewrite.
