# Space-exploration material refinement plan

## Intent

Keep the 52 existing asset IDs. Add one component-specific color control to the
36 two-color objects that have a real third material role; retain two controls
on the wheel assembly because its hub and tire already represent aluminum and
rubber. Keep the existing `lunarDust` and `highVisibility` variants and make
each new control change an assigned component. Rebuild the robotic arm as a
supported two-link assembly with shoulder, elbow and wrist pivots plus paired
gripper fingers. Add small brass valve fittings to the oxygen rack.

## Source and generated artifacts

- Source transformer: `promote_space_materials.py`
- Generated output: 52 kit-local preview PNGs and regenerated
  `catalog/index.json`
- Local page output: `/tmp/kernelcad-space-materials-pages`
- Demo: 1280×720 H.264, seven readable frames, no audio
- Verification: quality audit, kit ESLint, catalog integration tests, generated
  page/preview pairs, source SHA-256 values, index preview paths and inspected
  video frames

## Claim boundary

This round verifies local source authoring, software-rendered previews, the
generated index and local catalog pages. It does not verify deployment, mission
fit, thermal-vacuum performance, pressure safety, physical simulation, flight
readiness or hardware acceptance.
