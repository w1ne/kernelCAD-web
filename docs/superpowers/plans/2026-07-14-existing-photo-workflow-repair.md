# Existing Photo Workflow Repair Plan

## Goal

Make the active kernelCAD Studio generation path accept a sourced, scaled photo
reference for simple consumer-device CAD, then prove the result through the
current runtime and physical checks.

## Tasks

1. Repair the e-reader acceptance artifact: verified scale anchor, valid image
   dimensions, and parametric static-assembly metadata. Add regressions first.
2. Add an explicit photo-reference request contract to the active Studio UI:
   file, MIME/name/hash, and known dimension. Write client tests before UI code.
3. Add a matching hosted API/server contract that validates and materializes
   the reference, then supplies a concise photo-device brief to the existing
   authoring-and-gate loop. Write route/orchestrator tests before implementation.
4. Make trace confidence fail closed for the light-device/internal-screen case;
   tracing is evidence, not a device generator.
5. Run focused client/server/runtime tests plus e-reader evaluate, interference,
   and hidden-reference render inspection. Review every changed boundary before
   handoff.

## Out of scope

- No client-side direct vision-chat bypass or legacy HeadlessKernel repair.
- No public Meshy/Tripo integration.
- No claim that a single image yields an exact branded, manufacturable, or
  electronically functional device.
