# Fire & Rescue quality promotion

This bundle documents a quality pass over the kit's 60 existing fire-rescue
assets. It adds no IDs. The promoted sources use 2–4 material-specific color
controls and `weathered` / `highVisibility` presets, then regenerate the kit's
previews and `catalog/index.json` records. Vehicle, PPE and tool components
receive separate visible finishes; two aerial apparatus assets now connect
their deployed outrigger feet to the beams with jack posts. The hose nozzle
has a round pistol grip and a distinct selector collar.

The video shows the original municipal fire engine preview beside the promoted
render, applies an indexed `highVisibility` preset to the same source, shows
turnout-coat and nozzle details, and reviews several catalog objects and local checks. The
preset comparison uses geometry rendered from source values in the catalog
index. The previews are local software renders.

## Evidence

- [Promotion source](promote_fire_rescue_assets.py) and [original-source replay](original-source-replay-output.txt).
- [Invocation settings](settings.json), [source transformation output](promotion-output.json), and [final audit](promotion-audit.json).
- [Rendered preview log](catalog-preview-render-output.txt), [index build log](catalog-index-build-output.txt), and [visual preview review](preview-review.md).
- [High visibility variant renderer](render_fire_rescue_variants.ts) and its [output log](variant-render-output.txt).
- [ESLint output and status](catalog-eslint-status.json), [catalog integration output and status](catalog-test-status.json), [quality gate output](catalog-quality-output.txt), and [local page check](catalog-pages-check.json).
- [Demo capture source](capture_fire_rescue_promotion_demo.py), [decoded-video inspection source](inspect_fire_rescue_demo.py), and [MP4 demo](fire-rescue-quality-promotion.mp4).
- [Live-site baseline check](live-website-check.json) recorded before this branch's promotion.

## Rebuild

From the repository root, use the commands in `settings.json`. They restore the
original generated sources, run the material and geometry promotion, render the
60 named asset previews, regenerate the catalog index, run the quality/lint/
integration checks, build and verify local catalog pages, render named palette
variants, and produce and inspect the MP4.

The live homepage and `/assets.json` were checked before this branch was
deployed. The branch's local catalog page build does not establish a production
deployment. These are stylized visualization assets; local rendering,
parameters, presets, mesh budgets, lint, catalog checks and pages do not
establish apparatus specifications, fireground simulation, PPE certification,
operator safety, regulatory compliance, physical fabrication or hardware
acceptance.
