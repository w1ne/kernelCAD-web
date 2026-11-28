# Vertical turbine pump terminal gland review — 28 November 2026

**Demo:** [12-second local MP4](review-demo.mp4) · before: [preview](before/vertical-turbine-pump.png), [front inspect](before/inspect-front.png) · after: [preview](after/vertical-turbine-pump.png), [front inspect](after/inspect-front.png)

## Finding

In `water-treatment/vertical-turbine-pump`, the `terminal-gland` part was
translated to x = 280..316 mm. The terminal cover face is at x = 214 mm, so the
gland floated 66 mm beside the terminal box. It showed as a loose grey cube in
the catalog preview.

## Change

One source line: the gland is now `c(180, 0, 1122, 36, 22, 8)`, which hangs from
the terminal box underside (top face on z = 1158 mm, inside the box footprint,
clear of the motor ribs at r = 151 mm). Material, controls, presets, triangle
count (2,276) and budget (2,800) are unchanged. See [before](before/vertical-turbine-pump.kcad.ts)
and [after](after/vertical-turbine-pump.kcad.ts) sources.

## Verification

- `tests/integration/catalog/verticalTurbinePumpTerminalGland.test.ts` reads
  exported-GLB bounds. On the original source it reports `not seated on the box
  underside` and `outside the box footprint`
  ([raw log](verification/test-before.txt)). On the fixed source it passes 3/3
  ([raw log](verification/test-after.txt)), including scale 0.7 and 1.3.
- `npx eslint catalog/kits/water-treatment/` and the new test: clean (exit 0).
- `python3 scripts/checkCatalogQuality.py --kit water-treatment`: 50/50 (100%);
  global 2,396/2,402 (99.75%), unchanged.
- Preview re-rendered; `catalog/index.json` regenerated. Only the pump row's
  `sourceSha256` changed; it matches the committed source.
- `npx vitest run tests/integration/catalog/`: 230/230 files, 387/387 tests
  ([summary](verification/catalog-integration-tests.txt)).

## Limits

`kernelcad render inspect` shows a `mechanism.interpenetration` badge on this
asset before and after the change (see the uncropped `inspect-*.png` files). It
is pre-existing and not addressed here; the demo slide 2 crop omits it. The test
checks that the gland itself is clear of the motor housing, first rib and
pedestal. These are local software renders and GLB bounds checks only; nothing
is deployed and no equipment performance or hardware acceptance is shown.

Regenerate the demo with `python3 make_demo.py` (reads `verification/checks.json`).
