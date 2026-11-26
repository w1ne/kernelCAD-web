# Portable site water tank — material review (26 November 2026)

## Conclusion

One material mismatch was found in a five-asset audit of
`construction-equipment`. The portable site water tank rendered its shell,
fill neck and support skids in the same yellow equipment enamel as the mobile
fuel tank, so the preview read as a second fuel pod. The original outlet valve
already used the structural-steel control. The shell uses polyethylene, a
separate polypropylene screw cap was added, and the skids and valve use
galvanised steel. The fill neck now seats on the tank shell, and the
14 mm cap is exposed above it. The 2,200 triangle budget is unchanged; the
model grows from 136 to 180 triangles.

## What changed

`catalog/kits/construction-equipment/portable-site-water-tank.kcad.ts`

- Replaced `equipmentPaintColor` with the separate shell and cap controls,
  `tankPolyethyleneColor` (#e7ecee) and `polypropyleneCapColor` (#20262a), and retained
  `structuralSteelColor` (#89969a) for the skid and outlet.
- Replaced the `weathered`/`highVisibility` machine presets with two tank
  schemes: `siteBlue` (#3f7fb5 shell) and `weatheredPolyethylene` (#cfd6d2 shell).
- Split the former combined filler neck into a polyethylene neck and a
  polypropylene screw cap.
- Moved the skid base and both tank skids from painted enamel to galvanised
  steel.
- Rewrote the header and meta description to name the vessel materials without
  implying potable-water certification.

The regression test is
`tests/integration/catalog/portableSiteWaterTankMaterials.test.ts`. It
checks the colour-knob list, both presets, palette zones for all seven parts,
the shell/neck/cap connections and visible cap dimensions, selected exported
GLB colours, and that no shell part retains the former #e1a31b enamel.

## Evidence

| File | Content |
|---|---|
| `preview-review.md` | Ledger of the five assets inspected and the four cleared cases |
| `samples/source-change.patch` | Exact source diff |
| `samples/previews/before-portable-site-water-tank.png` | Render at `origin/develop` before the fix |
| `samples/previews/after-portable-site-water-tank.png` | Render after the fix |
| `verification/vitest-after.txt` | Focused regression passes on the fixed source |
| `verification/vitest-before-fails.txt` | Same test fails on the pre-fix source |
| `verification/eslint.txt` | ESLint on the kit and the new test |
| `verification/catalog-quality-construction.txt` | Quality gate, 60/60 for the kit |
| `verification/catalog-suite.txt` | Full catalog integration suite |
| `review-demo.mp4` | Before, after and the regression result |

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts portable-site-water-tank
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/portableSiteWaterTankMaterials.test.ts
npx vitest run tests/integration/catalog/
python3 scripts/checkCatalogQuality.py --kit construction-equipment
npx eslint catalog/kits/construction-equipment/ tests/integration/catalog/portableSiteWaterTankMaterials.test.ts
python3 artifacts/catalog-demos/construction-water-tank-polyethylene-material-20261126/make_demo.py
```

## Claims

The previews are local software renders of the exported low-poly GLB at
default knobs. The video shows local sources, those renders and the GLB
colour regression. It makes no claim about deployment, simulation, potable
water compliance, structural adequacy or hardware acceptance.
