# Trace-guided repair

Eight models in this directory are **deliberately broken**. The walkthrough
script runs the same MCP calls an agent makes after a failed evaluation, through
the same dispatcher (`callMcpTool`), and repairs each one:

1. `evaluate_script` shows the failure.
2. `why_did_this_fail` returns the **repair region** (the only lines a fix may
   touch) and ranked **candidates**, each with the geometry it was derived from.
3. `repair_script` with `strategy: 'dry-run'` previews every candidate as a diff.
4. `repair_script` with `strategy: 'apply-first'` applies the top candidate,
   re-evaluates, and accepts it only if the diagnostic cleared with no new errors.
5. `evaluate_script` runs on the repaired source to confirm it is clean.

The broken files are never rewritten, so you can run it as many times as you like.

| fixture | what is wrong | diagnostic | fix derived from |
|---|---|---|---|
| `oversized-fillet.kcad.ts` | 16 mm fillet on an 8 mm-thick block | `feature.edge-feature.short-edges-skipped` | shortest adjacent edge (8 mm → ceiling 4 mm) |
| `hole-misses-plate.kcad.ts` | hole anchored 70 mm from the centre of a 60 mm plate | `feature.subtractive-noop` | plate extent, less the bore radius, less one radius of wall |
| `cutter-misses-body.kcad.ts` | cutter translated 200 mm away from the body | `feature.subtractive-noop` | both bounding boxes; the fix lands on the cutter's line, which is an input to the failing boolean |
| `revolve-crosses-axis.kcad.ts` | washer profile with x = −1 mm | `feature.revolve.crosses-axis` | clamp every numeric path x-coordinate to 0 |
| `tangency-radius-too-small.kcad.ts` | tangent circle r=1 between circles r=10 and r=4, 30 mm apart | `sketch.tangency.no-solution` | (centre-distance − r1 − r2) / 2 = 8 mm |
| `draft-angle-degenerate.kcad.ts` | 90° draft on a box face | `feature.draft.failed` | mould-release ladder 8° / 5° / 3° |
| `shell-too-thick.kcad.ts` | 8 mm wall on a 10 mm cube | `feature.kernel-failed` | half the thinnest bbox dim (5 mm ceiling; 4 mm first) |
| `emboss-over-hole.kcad.ts` | engrave parked over a centred through-hole | `feature.emboss-text.boolean-noop` | slide UV anchor to (0.2, 0.2) |

## Run it

From the repository root:

```bash
npx tsx examples/repair/run-repair-example.ts
```

Pass file paths to repair only some fixtures:

```bash
npx tsx examples/repair/run-repair-example.ts examples/repair/oversized-fillet.kcad.ts
```

The exit code is `0` only when every fixture starts broken and ends clean.

## Output

Captured from a real run:

```text

==============================================================================
examples/repair/oversized-fillet.kcad.ts
==============================================================================

--- 1. evaluate_script — before
  ok: false
  featureHealth: [{"featureId":"fillet_1","status":"error"}]
  ERROR feature.edge-feature.short-edges-skipped [fillet_1]
    fillet skipped: all 12 target edges are shorter than 2 × radius = 32.00 mm

--- 2. why_did_this_fail — repair region and candidates
  targetDiagnosticId: feature.edge-feature.short-edges-skipped@fillet_1#0
  repairRegion:
    lines 18-18  input-feature  box_1
    lines 20-20  failing-feature  fillet_1
  candidateStatus: candidates
    - fillet_1:shrink-radius:3.2: Reduce fillet radius from 16 mm to 3.2 mm.
      evidence {"shortestAdjacentEdgeMm":8,"maxFeasibleValueMm":4,"currentValueMm":16}
    - fillet_1:shrink-radius:2: Reduce fillet radius from 16 mm to 2 mm.
      evidence {"shortestAdjacentEdgeMm":8,"maxFeasibleValueMm":4,"currentValueMm":16}
    - fillet_1:shrink-radius:0.8: Reduce fillet radius from 16 mm to 0.8 mm.
      evidence {"shortestAdjacentEdgeMm":8,"maxFeasibleValueMm":4,"currentValueMm":16}

--- 3. repair_script strategy: dry-run — preview every patch
  @@ -20,1 +20,1 @@
  -return block.fillet(16);
  +return block.fillet(3.2);
  @@ -20,1 +20,1 @@
  -return block.fillet(16);
  +return block.fillet(2);
  @@ -20,1 +20,1 @@
  -return block.fillet(16);
  +return block.fillet(0.8);

--- 4. repair_script strategy: apply-first — apply the top candidate and re-evaluate
  ok: true
  applied: fillet_1:shrink-radius:3.2
  attempt fillet_1:shrink-radius:3.2: cleared=true newErrors=[] accepted=true
  applied patch:
  @@ -20,1 +20,1 @@
  -return block.fillet(16);
  +return block.fillet(3.2);

--- 5. evaluate_script — after, on the repaired source
  ok: true
  featureHealth: []
  (no error-severity diagnostics)

==============================================================================
examples/repair/hole-misses-plate.kcad.ts
==============================================================================

--- 1. evaluate_script — before
  ok: false
  featureHealth: [{"featureId":"hole_1","status":"error"}]
  ERROR feature.subtractive-noop [hole_1]
    hole removed no material: result volume equals the input volume (14400.000 mm³). The tool did not intersect the body.

--- 2. why_did_this_fail — repair region and candidates
  targetDiagnosticId: feature.subtractive-noop@hole_1#0
  repairRegion:
    lines 14-14  input-feature  box_1
    lines 16-16  failing-feature  hole_1
  candidateStatus: candidates
    - hole_1:clamp-uv: Clamp the hole anchor onto the 'top' face, one bore radius clear of its edge (u=25, v=0).
      evidence {"faceName":"top","maxAnchorUmm":25,"maxAnchorVmm":15,"wallAroundBoreMm":2.5,"requestedU":70,"requestedV":0}
    - hole_1:centre-uv: Move the hole to the centre of the 'top' face (u=0, v=0).
      evidence {"faceName":"top","requestedU":70,"requestedV":0}

--- 3. repair_script strategy: dry-run — preview every patch
  @@ -16,1 +16,1 @@
  -return plate.hole('top', { u: 70, v: 0, diameter: 5, depth: 10 });
  +return plate.hole('top', { u: 25, v: 0, diameter: 5, depth: 10 });
  @@ -16,1 +16,1 @@
  -return plate.hole('top', { u: 70, v: 0, diameter: 5, depth: 10 });
  +return plate.hole('top', { u: 0, v: 0, diameter: 5, depth: 10 });

--- 4. repair_script strategy: apply-first — apply the top candidate and re-evaluate
  ok: true
  applied: hole_1:clamp-uv
  attempt hole_1:clamp-uv: cleared=true newErrors=[] accepted=true
  applied patch:
  @@ -16,1 +16,1 @@
  -return plate.hole('top', { u: 70, v: 0, diameter: 5, depth: 10 });
  +return plate.hole('top', { u: 25, v: 0, diameter: 5, depth: 10 });

--- 5. evaluate_script — after, on the repaired source
  ok: true
  featureHealth: []
  (no error-severity diagnostics)

==============================================================================
examples/repair/cutter-misses-body.kcad.ts
==============================================================================

--- 1. evaluate_script — before
  ok: false
  featureHealth: [{"featureId":"boolean_1","status":"error"}]
  ERROR feature.subtractive-noop [boolean_1]
    boolean difference removed no material: result volume equals the input volume (64000.000 mm³). The tool did not intersect the body.

--- 2. why_did_this_fail — repair region and candidates
  targetDiagnosticId: feature.subtractive-noop@boolean_1#0
  repairRegion:
    lines 15-15  input-feature  box_1
    lines 16-16  input-feature  box_2
    lines 18-18  failing-feature  boolean_1
  candidateStatus: candidates
    - boolean_1:retarget-translate: Move the cutter by (-185, -185, -210) mm so it overlaps the base.
      evidence {"baseBboxMm":"(0, 0, 0) .. (40, 40, 40)","operandBboxMm":"(200, 200, 200) .. (210, 210, 260)","centreAlignDeltaMm":"(-185, -185, -210)"}

--- 3. repair_script strategy: dry-run — preview every patch
  @@ -16,1 +16,1 @@
  -const cutter = box(10, 10, 60).translate(200, 200, 200);
  +const cutter = box(10, 10, 60).translate(15, 15, -10);

--- 4. repair_script strategy: apply-first — apply the top candidate and re-evaluate
  ok: true
  applied: boolean_1:retarget-translate
  attempt boolean_1:retarget-translate: cleared=true newErrors=[] accepted=true
  applied patch:
  @@ -16,1 +16,1 @@
  -const cutter = box(10, 10, 60).translate(200, 200, 200);
  +const cutter = box(10, 10, 60).translate(15, 15, -10);

--- 5. evaluate_script — after, on the repaired source
  ok: true
  featureHealth: []
  (no error-severity diagnostics)

==============================================================================
summary
==============================================================================
  REPAIRED  examples/repair/oversized-fillet.kcad.ts
  REPAIRED  examples/repair/hole-misses-plate.kcad.ts
  REPAIRED  examples/repair/cutter-misses-body.kcad.ts
  REPAIRED  examples/repair/revolve-crosses-axis.kcad.ts
  REPAIRED  examples/repair/tangency-radius-too-small.kcad.ts
  REPAIRED  examples/repair/draft-angle-degenerate.kcad.ts
  REPAIRED  examples/repair/shell-too-thick.kcad.ts
  REPAIRED  examples/repair/emboss-over-hole.kcad.ts
```

New-kind excerpts from the same run:

```text
==============================================================================
examples/repair/revolve-crosses-axis.kcad.ts
==============================================================================
--- 2. why_did_this_fail — repair region and candidates
  candidateStatus: candidates
    - revolve_1:clamp-revolve-x: Clamp 2 path x-coordinate(s) from -1, -1 to 0 so the profile stays on one side of the revolve axis.
      evidence {"requestedXmm":"-1, -1","clampedXmm":0,"clampedCount":2}
--- 4. repair_script strategy: apply-first
  applied: revolve_1:clamp-revolve-x
  @@ -11,4 +11,4 @@
  -  .moveTo(-1, 0)
  -  .lineTo(-1, 5)
  +  .moveTo(0, 0)
  +  .lineTo(0, 5)

==============================================================================
examples/repair/tangency-radius-too-small.kcad.ts
==============================================================================
--- 2. why_did_this_fail
    - sketch_1:enlarge-tangency-radius:8: Increase the tangent-circle radius from 1 mm to 8 mm so it can sit outside both circles.
      evidence {"requestedRadiusMm":1,"centreDistanceMm":30,"minRadiusMm":8}
--- 4. apply-first
  applied: sketch_1:enlarge-tangency-radius:8
  -  { radius: 1 },
  +  { radius: 8 },

==============================================================================
examples/repair/draft-angle-degenerate.kcad.ts
==============================================================================
--- 2. why_did_this_fail
    - draft_1:shrink-draft:8: Reduce the draft angle from 90° to 8°.
      evidence {"requestedAngleDeg":90,"chosenAngleDeg":8}
--- 4. apply-first
  applied: draft_1:shrink-draft:8
  -return box(10, 10, 10).draft(90, { face: 'front' });
  +return box(10, 10, 10).draft(8, { face: 'front' });

==============================================================================
examples/repair/shell-too-thick.kcad.ts
==============================================================================
--- 2. why_did_this_fail
    - shell_1:shrink-thickness:4: Reduce shell thickness from 8 mm to 4 mm.
      evidence {"thinnestDimensionMm":10,"maxFeasibleThicknessMm":5,"currentThicknessMm":8}
--- 4. apply-first
  applied: shell_1:shrink-thickness:4
  -return box(10, 10, 10).shell(8, { face: 'top' });
  +return box(10, 10, 10).shell(4, { face: 'top' });

==============================================================================
examples/repair/emboss-over-hole.kcad.ts
==============================================================================
--- 2. why_did_this_fail
    - embossText_1:emboss-anchor-corner: Move the emboss anchor from (0.5, 0.5) to (0.2, 0.2) so the glyphs land on solid material.
      evidence {"requestedAnchorU":0.5,"requestedAnchorV":0.5,"chosenAnchorU":0.2,"chosenAnchorV":0.2}
--- 4. apply-first
  applied: embossText_1:emboss-anchor-corner
  -  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.5, anchorV: 0.5 });
  +  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.2, anchorV: 0.2 });
```

## Things worth noticing

- **The region is narrow.** For the cutter fixture the boolean on line 18 is
  what failed, but the candidate edits line 16, where the cutter was placed.
  That works because line 16 authored a direct input of the boolean. A line
  that feeds nothing into the failing feature is never in the region, and
  `repair_script` refuses any patch outside it (`tool.repair.out-of-region`).
- **Candidates show their numbers.** The fillet candidates carry
  `shortestAdjacentEdgeMm: 8` and `maxFeasibleValueMm: 4`, so you can check a
  fix makes sense before you apply it.
- **Candidates are ordered.** The fillet ladder is 3.2 → 2 → 0.8 mm, largest
  first, so the repair keeps as much of the intended rounding as the geometry
  allows. `strategy: 'try-all'` would move on to the next one if the first
  failed to evaluate clean.
- **The hole stays a hole.** Clamping only to "inside the face" would park the
  bore tangent to the plate end and cut a notch. The candidate leaves one bore
  radius of wall (`u: 25` on a plate whose half-length is 30).

The pattern for the fillet case is also a cookbook entry. `lookup_cookbook`
with the query `"repair failing fillet"` returns `repair-oversized-fillet`.
Load the `kernelcad-repair` skill for the full loop and rules.
