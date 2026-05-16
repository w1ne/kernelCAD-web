---
name: prepare-prompt
description: Turn a vague user ask into a Real Object Brief before writing any geometry. The brief is the contract that all downstream sub-skills work from.
---

# prepare-prompt

## Purpose

A vague ask — "a wayfarer-style frame", "that bottle", "make the same one" —
produces vague geometry. This sub-skill produces a **Real Object Brief**: a
structured, numbered record of everything the reference communicates before any
tool call touches the kernel.

The brief is written as a `// Real Object Brief` block at the top of the
`.kcad.ts` file, before any `param()` or geometry. It is the source of truth
for the entire build. Every downstream sub-skill reads from it.

## Inputs

- The user's ask (text, photo path, or both).
- The reference photo(s) — can be one image showing one view, or several showing
  different angles. More views = fewer hidden-side guesses.

## Output

A filled-in `// Real Object Brief` comment block, plus a list of open
questions if any critical fact (scale, material, hidden side) cannot be inferred.

## The Real Object Brief format

Required sections, in this order:

```ts
// Real Object Brief
// Artifact: <human name> — <one-line description of what it is>.
//   Reference: <relative path to the photo>.
// Scale: millimetres. <key dimension 1: name ~N mm>, <key dimension 2: name ~N mm>,
//   <overall bounding box estimate>.
// Visible facts (from reference photo):
//   - <Numbered or bulleted. Each item is a distinct visual element.>
//   - <Separate form (silhouette) from surface (color, texture, gloss).>
//   - <Include relative positions: "A is above B", "C spans the full width".>
// Hidden-side inference:
//   - <What must exist that the photo does not show: case back, internal walls,
//     fastener counterbores, mounting tabs, wire paths.>
//   - <Infer from category: a pocket watch has a case-band, a mug has a handle
//     undercut, a USB dongle has a PCB pocket.>
// Validation focus:
//   - <The 3–5 visual cues you will check against each rendered view.>
//   - <Name the view (front, top, right, iso) + what to check in it.>
```

## Scale discipline

If the reference photo has a known scale object (a hand, a coin, packaging
dimensions), record it:

```
// Scale: millimetres. Outer frame ~130 mm wide (credit-card width for scale),
//   bridge gap ~18 mm, arm length ~135 mm, total body depth ~5 mm.
```

If no scale cue exists, estimate from category norms (eyewear: 130–140 mm wide;
bottle: 70–90 mm diameter × 200–280 mm tall; USB dongle: 20 × 10 × 6 mm).
Record the norm and the uncertainty:

```
// Scale: millimetres. No scale cue in photo; estimated from category norms.
//   Assumed 130 mm wide × 48 mm tall × 5 mm deep (typical eyewear silhouette).
```

## Visible facts discipline

Each bullet describes ONE observable thing. Bad examples (do not write these):

> "Frame is black and glossy with rounded edges and also has lenses."

Good examples:

> "Outer frame: black, high-gloss acetate. Silhouette is rounded-rectangular
>   with a pronounced brow bump at the top."
> "Lenses: flat, grey-tinted. Set flush with the frame; no raised rim."

Separate form (shape, silhouette, relative position) from surface (color,
gloss, texture). The model is built from form facts; material is applied
separately.

## Hidden-side inference discipline

Every real object has a back. Enumerate what the back of the reference object
must contain:

- Continuous enclosures need a case-band (thickness, material).
- Optical lenses need a lens-seat recess or groove.
- Mounted objects need a flat mating face, adhesive pad, or threaded boss.
- Electronic housings need a PCB pocket and a battery compartment on the reverse.

If the back is visible in a second reference image, record what it shows, not
what you infer.

## Validation focus

Write 3–5 explicit checks. Each check names a view and states what correct looks
like:

```
// Validation focus:
//   - Front view: frame outline matches reference silhouette; brow bump above
//     lens on both sides; bridge gap centered.
//   - Top view: body has real depth (not a flat slab); arms extend laterally.
//   - Iso view: gloss material reads as specular; no floating elements.
//   - Score gate: silhouette ≥ 0.45, SSIM ≥ 0.30 (task-specific thresholds).
```

## Open questions

If any of the following cannot be inferred from the reference, list them at the
end of the brief before starting geometry. Do not assume — record the uncertainty
and pick the most defensible default:

- Body depth (side view unavailable → use category norm and note it)
- Internal construction (solid vs. hollow → default solid unless packaging says hollow)
- Exact hinge type (fixed-wire vs. barrel → infer from silhouette; note uncertainty)
- Material finish (matte vs. satin vs. gloss → read from the reference photo's
  specular highlights; gloss = strong highlight visible, matte = none)

## Done

The brief is done when:

1. All required sections are present and non-empty.
2. Every visible form element is listed as a separate visible fact.
3. Scale is numeric (even if estimated).
4. Validation focus includes at least one score-gate check.

Only then proceed to `blockout-model/SKILL.md`.
