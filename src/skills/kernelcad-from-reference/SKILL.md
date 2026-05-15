---
name: kernelcad-from-reference
description: Author a kernelCAD model from a reference photo or visual brief — Real Object Brief, scale picks, hidden-side inference, validation focus. Use when given an image and asked to reconstruct the object as CAD.
---

# kernelCAD — author from reference

## When to load this skill

You are given a reference photo, sketch, or visual brief and asked to author a `.kcad.ts` model that recognizably reconstructs the target. Also useful when matching an existing physical object by photo.

## The Real Object Brief pattern

Every `.kcad.ts` script authored from a reference opens with a `// Real Object Brief` comment block at the top, before any `param()` or geometry. Required elements:
- Artifact name + reference image path
- Scale (mm; key dimensions of the object)
- Visible facts (numbered or bulleted; everything the photo shows)
- Hidden-side inference (what must exist that the photo doesn't show — case backs, fasteners, internal walls)
- Validation focus (the visual cues you'll check against each rendered view)

Example from `examples/portfolio/pocket-watch/build.kcad.ts` lines 1–28:

```typescript
// Real Object Brief
// Artifact: a pop-art octagonal pocket watch reconstructed from the reference
//   /home/andrii/Pictures/Screenshots/Screenshot_2026-05-15_11-46-42.png.
// Scale: millimetres. Outer pink octagonal frame ~50 mm corner-to-corner,
//   inner yellow octagonal case ~36 mm flat-to-flat, teal dial ~24 mm,
//   total body Y-depth ~10 mm; lanyard loop reaches ~30 mm above the frame.
// Visible facts (from reference photo):
//   - Outer pink octagonal frame with rounded outer corners, tapering up to
//     a pink lanyard loop with a pink ribbon strap.
//   - Inner yellow octagonal case with 8 hexagonal screws at each vertex.
//   - Teal dial with a waffle "tapisserie" raised grid texture.
//   - Small pink-ringed subdial at 3 o'clock with white face and red hand.
//   - Eight yellow stick hour markers + three numerals (12, 6, 9).
//   - Yellow hour and minute hands at different angles.
//   - Small yellow crown at the very top of the case.
//   - Domed sapphire crystal covering the dial (built as a NURBS surface).
// Hidden-side inference: real case-band depth, dial recess, screw counterbores,
//   subdial pocket cut into the dial, crown bore through case top, distinct
//   Y layers for crystal / numerals / hands / dial / case / frame so nothing
//   floats or interferes.
// Validation focus: front legibility (frame + case + dial concentric and
//   centred), iso-view shows the NURBS dome and the lanyard loop above,
//   right/top views show real body depth, zero BREP interferences.
//
// Coordinate convention: Z-up, right-handed. The render's "front" view looks
// from -Y toward +Y, so the **smallest Y = closest to the camera**. The dial
// faces -Y; any element drawn "on" the dial sits at Y SMALLER than the dial's
// front face.
```

## Author-then-verify loop

For every authoring task with a visual target:
1. Render the four canonical views (front, right, top, iso) after each authoring pass. **Always pass `--width 1920 --height 1080`** to `kernelcad render` — the demo-player page layout is fixed at 1920×1080 (terminal 640 + viewer 1280); the CLI's 1024×1024 default clips the viewer and the rendered model appears cropped on the right.
2. **Read the PNGs back** — filenames are not evidence.
3. Compare each render to the reference.
4. Fill in a binary gate table at `<artifact-dir>/visual-checks.md`. Every gate is **yes** or **no** — never "mostly", "kind of", or a paragraph of caveats.
5. If ANY gate is `no`, fix the source and loop.
6. Hard cap: **8 iteration passes**. If hit, report which gates remain `no` and stop — do not lie about completion, and do not silently start over with a fresh counter.

## Forbidden rationalizations

If a defect is visible in a render, fix it or mark the gate `no`. These are NOT valid reasons to leave a gate at `no`:
- "It looks flat in this view because the camera angle is straight-on" — pick a different camera, or fix the geometry.
- "The float is only 1 mm" — fix the offset.
- "The numerals are partially behind the crystal because the crystal is on top" — re-order Y-layers so the numerals win.
- "The renderer's framing crops the part" — recenter the model, or pass `--width 1920 --height 1080` if you have not.
- "But the render is mostly identifiable / does not prevent identification" — split that judgement into separate gates with binary answers; never write a passage of qualifications.

## Do not tamper with verification gates

If a render gate, an ffmpeg black-frame check, an interference check, or any other automated verification reports a failure, **fix the underlying model or capture pipeline**. Do not edit the gate's source to loosen the threshold so your work passes. If you genuinely believe the gate is wrong, stop authoring and surface the gate change to the user with the evidence; the gate exists because a real failure was shipped before. Loosening it to ship today is the same failure twice.

## Verification gates

After authoring from a reference, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-real-object-brief | Source file opens with a `// Real Object Brief` comment block containing artifact name, scale, visible facts, hidden-side inference, validation focus |
| G-evaluate | `kernelcad evaluate <script>` exits 0; zero diagnostics (`code: recompute.failed`, `code: recompute.input.missing` — fix before reporting done) |
| G-no-overlap | `kernelcad interference <script>` reports zero pairs |
| G-reference-parity | Every visually distinct feature in the reference photo has a corresponding part in the render at the right relative position and scale |
| G-no-floaters | No part hovers in empty space in any render; every part is supported by an adjacent part |
| G-no-protrusions | Sub-components meant to be contained (case inside frame, dial inside bezel, screws inside counterbores) are fully contained on every visible axis |
| G-hero-feature-central | If the build is a v0.X.0 hero, the new tool (NURBS, sketch-text, mate type, etc.) is visibly central in the renders — not shrunk to a corner, not hidden, not displaced |
| G-front-read | The front view reads as the target object on first glance — a stranger shown only this render names the object correctly |
| G-visual-checks-md | A `visual-checks.md` table sits next to the model with every gate at **yes** before reporting done |

## Worked example: helix sweep

A coil spring reconstructed from a physical-object mental model. The geometry is fully described by three parameters (coil radius, wire radius, turn count) that you would read off a real spring.

```typescript
// Swept circular profile along a helix — basic coil.
const coilRadius = 15;
const wireRadius = 1.5;
const turns = 4;

const rail = helix({ radius: coilRadius, pitch: wireRadius * 3, turns });
const profile = path()
  .moveTo(wireRadius, 0)
  .sagittaArc(-wireRadius, 0, wireRadius)
  .sagittaArc(wireRadius, 0, wireRadius)
  .close();

return profile.sweep(rail, { frenet: true });
```

This snippet is standalone — `kernelcad evaluate` runs it as-is and exits 0 (2 features).

## Related skills

- `kernelcad-authoring` — primitives and sketches that this workflow builds with.
- `kernelcad-features` — face-ref queries and hole vocabulary; carries its own short gate list for feature-heavy models.
- `kernelcad-nurbs` — NURBS dome surfaces; carries its own short gate list for surface work.
- `kernelcad-assemblies` — when the reference object is a multi-part mechanism; carries its own short gate list.
