---
name: image-replicator
description: The render→score→iterate loop for reference-photo reconstruction. How to invoke kernelcad render, run scoreAgainstReference, interpret per-gate numbers, and decide which gate to chase next.
---

# image-replicator

## Purpose

After the blockout is plausible, this sub-skill drives the detail pass. Each
iteration produces a render, runs the scorer, and returns a concrete decision:
which gate is weakest, what model change closes it, whether to continue or stop.

## Inputs

- The `.kcad.ts` file with a clean blockout.
- The reference photo path.
- Current scorer output (or "not yet run" on the first pass).

## The iteration loop

### Step 1 — Render

Always render all four canonical views at the correct resolution:

```bash
kernelcad render build.kcad.ts \
  --width 1920 --height 1080 \
  --views front,right,top,iso \
  -o /tmp/render.png
```

Read the PNG back. Filenames are not evidence — you must observe the image.

### Step 2 — Score

```bash
kernelcad score build.kcad.ts \
  --reference ./reference.jpg \
  --view front \
  --json
```

The scorer returns a JSON object with per-gate values:

```json
{
  "silhouette": 0.71,
  "ssim": 0.28,
  "phash": 0.62,
  "overall": 0.54
}
```

Score all views that have a reference. If the task harness provides a
`harness.ts`, run it directly — it wraps `scoreAgainstReference` with the
correct thresholds:

```bash
npx ts-node eval/tasks/taskNN/harness.ts
```

### Step 3 — Diagnose which gate to chase next

Read the per-gate numbers and decide:

| Gate | Low score means |
|------|----------------|
| `silhouette` | The 2D silhouette outline does not match: wrong overall shape, missing brow bumps, wrong arm angles, wrong aspect ratio. Fix: adjust params, fix the path outline. |
| `ssim` | The rendered image is structurally different from the reference: wrong depth, wrong material (flat vs. glossy), missing lens geometry, wrong body proportion. Fix: apply PBR material (Rule 6), add depth (Rule 3), fix booleans. |
| `phash` | Perceptual hash mismatch: high-level appearance differs. Usually a proxy for "the object reads as a different product category." Fix: re-read the brief, re-check primary mass arrangement. |

**Chase the lowest gate first.** A 0.20 silhouette score means the silhouette
is wrong — fixing the SSIM first will not help because the silhouette mismatch
dominates overall score.

**If silhouette is ≥ 0.45 but SSIM is < 0.25**, the outline is correct but the
internal structure, depth, or material is wrong. The most common causes:

1. Material is flat color instead of PBR gloss → apply Rule 6.
2. Body depth is too thin (looks like a card) → increase `bodyDepth` param.
3. Missing internal structure (lens recess, bezel step) → add booleans.

### Step 4 — Make one targeted change per iteration

Each iteration makes ONE primary change and re-renders. Do not make multiple
changes and then wonder which one moved the score. Candidates in priority order:

1. Correct a failing silhouette gate → fix path outline or primary mass.
2. Apply PBR material if not yet done → Rule 6.
3. Correct body depth from a slab to a real solid → Rule 3.
4. Apply variable fillet where visible corners differ → Rule 1.
5. Apply mirror if one side is authored twice → Rule 2.
6. Add missing sub-component (lens, hinge, crown, etc.).
7. Refine a sub-component position or scale.

### Step 5 — Decide: continue or stop

Continue iterating if:
- Any required score gate is below threshold (task-specific; default silhouette
  ≥ 0.45, SSIM ≥ 0.25).
- A visible defect in the render maps to a fix that has not been applied.

Stop and report when:
- All required gates are at or above threshold.
- Or the hard iteration cap (8 passes) is reached — report which gates remain
  below threshold and stop; do not restart the counter silently.

## Iteration discipline

- **Never edit a gate to loosen the threshold.** If the threshold seems wrong,
  stop and surface the evidence to the user.
- **Commit per score, not per change.** Evaluate and score after every geometry
  change; never accumulate multiple changes and score once.
- **Read PNGs back.** The render command writes a file; the file is not evidence
  until you read it. Run the read tool on the output path.
- **Do not mark a gate passing based on prose.** The number from the scorer is
  the gate value. "It looks roughly right" is not a passing gate.

## Done

The iteration loop is done when all required gates are above threshold AND
`kernelcad evaluate` exits clean AND `kernelcad interference` reports zero pairs.

Proceed to `render-inspect/SKILL.md` if any iteration produces diagnostic
hints that need interpretation.
