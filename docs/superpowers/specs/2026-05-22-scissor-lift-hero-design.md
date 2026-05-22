# Scissor Lift Hero Design

## Goal

Replace the current marketing hero artifact with a compact animated scissor-lift mechanism that visibly opens and closes on the landing page.

## Reference Pattern

Use an industrial scissor-lift layout: crossed arms pinned at their centers, fixed pivots on one side, rollers or sliding pivots on the opposite side, base rails, a top platform, and visible pin hardware. Multi-stage lifts cascade the same parallelogram unit upward; the first pass will use two stages so the motion is legible without overloading the hero.

## Scope

- Add a kernelCAD source model for a two-stage scissor lift with physical parts: base rails, top deck, crossed arms, pins, rollers, washers/spacers, and a simple handle/guard detail.
- Add a release hero demo under `docs/demos/v0.11/scissor-lift/`.
- Generate a short looping MP4 where the linkage opens and closes. This must animate linkage movement, not only orbit the camera.
- Make the existing `site/scripts/build-demo.ts` path pick the new v0.11 hero automatically.

## Constraints

- Keep the hero video small enough for `kernelcad.com`.
- Avoid closed-loop kinematic promises that the current assembly solver cannot represent as exact cyclic constraints. The source model will show the mechanism in a mechanically plausible open pose; the hero MP4 will animate the same linkage geometry with deterministic frame math.
- Do not remove existing gallery content.

## Verification

- Unit test that the v0.11 hero selector picks `scissor-lift`.
- Unit/static test that the landing hero uses the generated demo pipeline unchanged.
- Run the scissor source through the kernelCAD script loader/export path.
- Run `npm run site:build` and verify `site/public/demo.json` points to `docs/demos/v0.11/scissor-lift/demo.mp4`.
