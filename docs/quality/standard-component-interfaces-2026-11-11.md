# Standard-component interface review — 2026-11-11

Continuation of the 66-asset ledger and existing PR #1279. These are CC0 illustrative low-poly props, not vendor-qualified manufacturing models. Passing export, material-knob and thumbnail checks did not establish component identity or connected interfaces.

| Asset | Confirmed defect in previous proposed source | Source repair and exported-geometry proof |
|---|---|---|
| pipe-tee | Two full crossing tubes form FOUR flow ports, not a tee | Half-length branch and bore stopped inside run; rays prove three open ports plus closed back wall at default/compact/large sizes |
| caster-wheel | Fork cheeks do not reach axle center and have no connecting crown/axle | One connected fork/ stem casting, clear axle bores, separate bored hub and axle; true 32 mm tire diameter and four plate holes |
| pillow-block-housing | Solid riser blocks lower shaft bore behind visible hollow ring | Fuse housing/riser/base and bore the complete casting; lower/central/upper shaft rays clear, two mounting holes clear |
| piano-hinge | Ten loose knuckles float beside disconnected leaves | Five alternating barrels and connecting lugs fused to each leaf, separate pin, 0.2 mm axial gaps; three connected mesh bodies and clear pin/mounting bores |
| t-slot-angle-bracket | Triangular plates lie parallel to upright, extend beyond bracket width | Two YZ webs span toe to wall, within 48 mm nominal width and clear of all four mounting bores |

## Evidence

`standardComponentInterfaces.test.ts` and `pipeTeeFidelity.test.ts` test actual native-exported mesh positions, connected components and ray intersections, including both supported size extremes. Together with the existing jaw-coupling collision regression: **9/9 PASS**. Restoring the previous geometry, while retaining corrected descriptions, makes all six new regression tests fail. The prior jaw layout remains covered by its own six-overlap negative control.

Exact-source PNGs regenerated and before/after images visually reviewed. The five corrected defaults use 354 / 660 / 404 / 1,776 / 248 triangles respectively. Caster budget increased from 520 to 800 for real bores and connected fork; hinge from 1,550 to 1,900 for connected lug/barrel topology. These are geometry additions, not cosmetic checker changes.

All **50 standard-component sources** pass native load, knob and mesh checks. That count is not an engineering-certification claim. Targeted ESLint and diff checks pass. Full catalog freshness and required repository CI remain separate merge gates.

Work-1 evidence: `/home/andrii/ventures/state/kernelcad-asset-review-20261111/standard-review/`. Original proposed sources and PNGs are retained, alongside repaired sources, five-image comparison, positive tests and negative-control logs. Production status must be recorded separately after deployment.
