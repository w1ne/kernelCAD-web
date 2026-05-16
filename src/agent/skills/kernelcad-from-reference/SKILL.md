---
name: kernelcad-from-reference
description: Reproduce a real-world artifact from one or more reference photographs using kernelCAD primitives. Orchestrator skill — names sub-skills and their order. Load this first; it points at the right sub-skill for each stage.
---

# kernelCAD — from reference (orchestrator)

Reproduce a real-world artifact from one or more reference photographs using
kernelCAD primitives. This is an orchestrator skill that names sub-skills and
their order. Read this first; then load each sub-skill in sequence as you
work through the stages.

## Required reading order

1. `prepare-prompt/SKILL.md` — turn the user's ask into a Real Object Brief.
2. `blockout-model/SKILL.md` — coarse parametric blockout in canonical views.
3. `use-the-available-kernel/SKILL.md` — hard rules for which kernelCAD primitives to reach for. **The most important sub-skill.**
4. `image-replicator/SKILL.md` — the render→score→iterate loop.
5. `render-inspect/SKILL.md` — interpret diagnostic hints from `kernelcad evaluate`.

## Hard rules across all sub-skills

- **Infer the real object before matching the camera.** Build a physically
  coherent 3D hypothesis first. Do not start by chasing pixel similarity.
- **If improving one view makes another view worse, the object hypothesis is
  wrong.** Fix the model, not the camera illusion.
- **Use the available kernel.** Variable fillet, mirror, nurbsSurface,
  surfaceFromCurves, PBR material, and referenceImage are all available today.
  Authoring with path+extrude+booleans alone is leaving 80% of the kernel on
  the table. See `use-the-available-kernel/SKILL.md` for prescribed rules.
- **Score against the reference photo, not against a self-graded markdown.**
  The eval task's `harness.ts` runs `scoreAgainstReference` and produces honest
  numbers. Trust those numbers, not your prose summary of "does it look right."
- **Do not tamper with verification gates.** If a render gate, a black-frame
  check, an interference check, or any other automated verification reports a
  failure, fix the underlying model or capture pipeline. Do not edit the gate's
  source to loosen the threshold. If the gate is genuinely wrong, surface the
  evidence to the user and halt — the gate exists because a real failure was
  shipped before.

## Verification gates (summary — see sub-skills for gate detail)

| Gate | Pass criterion |
|------|----------------|
| G-real-object-brief | Source opens with `// Real Object Brief` containing artifact name, scale, visible facts, hidden-side inference, validation focus |
| G-evaluate | `kernelcad evaluate <script>` exits 0; zero error diagnostics |
| G-no-overlap | `kernelcad interference <script>` reports zero pairs |
| G-reference-parity | Every visually distinct feature in the reference has a corresponding part at the right relative position and scale |
| G-no-floaters | No part hovers in empty space in any render |
| G-no-protrusions | Sub-components meant to be contained are fully contained on every visible axis |
| G-front-read | The front view reads as the target object on first glance |
| G-score-gate | `scoreAgainstReference` silhouette ≥ 0.45, SSIM ≥ 0.25 (task-specific thresholds may be higher) |

## Forbidden rationalizations

If a defect is visible in a render, fix it or mark the gate `no`. These are
NOT valid reasons to leave a gate failing:

- "It looks flat because the camera angle is straight-on" — pick a different
  camera, or fix the geometry.
- "The float is only 1 mm" — fix the offset.
- "The renderer's framing crops the part" — recenter the model, or pass
  `--width 1920 --height 1080` if you have not.
- "But the render is mostly identifiable" — split that judgement into separate
  gates with binary answers; never write a passage of qualifications.

## Companion skills

- `kernelcad` — base API surface and decision tree.
- `kernelcad-authoring` — parametric authoring fundamentals.
- `kernelcad-features` — feature catalog (fillet, chamfer, shell, holes).
- `kernelcad-mcp` — MCP tool reference.
- `kernelcad-nurbs` — freeform NURBS surfaces for organic sections.
