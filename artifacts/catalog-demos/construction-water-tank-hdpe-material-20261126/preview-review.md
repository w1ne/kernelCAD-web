# Five-asset preview ledger — construction-equipment (26 November 2026)

Scope: industrial/manufacturing preview audit. Five assets were selected that
are not targeted by an open issue, an open PR or an existing
`artifacts/catalog-demos` review. Each preview was opened at the audit base
`origin/develop` and compared with the source part list.

| Asset | Rendered preview | Source material mapping | Verdict |
|---|---|---|---|
| `mobile-fuel-tank` | Yellow bunded pod with top filler, side pump box and a visible road wheel; the tow frame is partly hidden in this view | `equipmentPaintColor` on tank and pump box, `tireRubberColor` on tyres, `structuralSteelColor` on hubs and frame | Cleared for this material review. The visible pod and tyre colors match their source assignments; occluded frame details are not treated as preview evidence. |
| `portable-site-water-tank` | Before: yellow rectangular tank and skids with a yellow fill neck, matching the fuel pod; after: white shell, dark cap and steel skids | Before: shell, base and both skids use `equipmentPaintColor`; the outlet already uses steel. After: polyethylene shell/neck, polypropylene cap, structural-steel skids/outlet | **Defect.** The equipment-enamel palette made the water tank read as a second fuel pod. The shell now has its own polyethylene color control, and the separate cap is visible above the seated neck. Fixed in this round. |
| `towable-light-tower` | Tall mast and four-head lamp bank above a generator enclosure, trailer wheel, frame and outriggers | Enamel enclosure/housings; structural steel mast/frame/jacks; rubber tyres; light-lens color | Cleared for this material review. The four default material groups are distinct in the preview. |
| `adjustable-formwork-prop` | Vertical inner/outer tubes, center adjustment collar and broad top/base plates | Enamel on the tubes and top plate; structural steel on the base plate | Cleared for this material review. The prop silhouette and its visible paint/steel split agree with the source. |
| `portable-air-compressor` | Yellow vented enclosure on a wheeled skid; the hose-reel part is not separately legible in this default view | Enamel enclosure/skid, rubber tyres and hose reel, structural-steel hubs/frame | Cleared for visible material mismatch only. The enclosure and tyre palette match the source; the hidden reel is not counted as visible preview evidence. |

## The chosen defect

`portable-site-water-tank` used the same `equipmentPaintColor` for the tank
body, fill neck, skid base and both longitudinal skids. The old source had no
separate cap part; the outlet already used the structural-steel control. This
yellow equipment palette made the water tank read as a second fuel pod. The
shell and neck now use a polyethylene control, a visible polypropylene cap has
its own control, and the skids and outlet use the steel control. The two
material presets are `potableBlue` and `weatheredHdpe`. The regression test
asserts every part-to-material mapping and the exported GLB colours.

## Checked and cleared

The other four assets were not edited. Their visible silhouettes and material
zones showed no comparable mismatch in this five-preview pass. Parts hidden by
the default camera are called out above instead of being claimed as visible
evidence. No filler edit was made for them.
