# Five-preview ledger — 2026-11-15 (recycling-facility process machinery)

Lane PR #1406 was open and mergeable at round start. Its CI checks had passed, except `catalog-index` and `test-shard (3)`, which were still running. Selection: `recycling-facility` has 153 assets, and 122 of them are not named in any ledger under `artifacts/catalog-demos/`, in `docs/quality/`, or in any test under `tests/integration/catalog/`. The five assets below are five of those 122, chosen as process machines. A search of open issues found none that name them, and no open PR touches the kit.

All five checked-in default previews were opened (`samples/`, `previews/before/pelletizer-extruder.png`), and the colour assignment of each part in each source was read.

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `recycling-facility/pelletizer-extruder` | 1,664 / 2,200 | `34caec9237db064753675888d368fd6f1da92a94ee9e58a66b05f1490ed13d3b` | `37e400db2ef08007c0e919ab9841bf927ee68942540f3f7a282cba15a6ce76f7` | **Material defect, corrected.** `air-knife` is the blow-off bar at the bath outlet that strips water from the strands before the pelletizer. It is a stainless process part. It used `trim`, the control labelled "Guards and safety trim" (`#f0b429`), so it rendered in the same safety yellow as the pelletizer guard door and the hopper rim. With `cleanRoom` it turned green, and with `highVisibility` it turned signal yellow. The water bath it sits on uses `barrel` ("Barrel, die and bath (steel)"). |
| `recycling-facility/granulator` | 1,478 / 3,200 | `a3350e78d8a07f52e52beb323ac69bef0556a60c051f432f971a5806e8c8665a` | `172f599d91a1ab2671eeaec7a9fceea067738ba0016302fe0c5e7b3413892025` | No clear material defect. Blue machine paint on stand, chamber and hinged hopper; steel rotor, knives and bed knife; dark flywheel, belts and motor; orange belt guard; green regrind flakes. Minor: `regrind-bin` uses the `drive` control ("Flywheel, belts and motor"), so the `cream` preset turns the bin the motor green. |
| `recycling-facility/near-infrared-sorter` | 2,222 / 4,200 | `2283d801cad41a016e38ca436c8e70f006201467a03b81e93039618b6daeaf1b` | `6aea60a61d574dce743bef3c9c871bf5b0624e388aaccdc71911cf22fd7368cd` | No clear material defect. Powder-coated sensor and separation hoods and cabinet; painted belt frame; rubber belt; steel feeder tray; blue compressed-air receiver; mixed bottle stream. Minor: `drive-motor` uses the brand `accent` stripe control. A motor in the maker's colour is plausible. |
| `recycling-facility/vertical-baler` | 1,984 / 3,000 | `816b0dc324494a91f254ba751e2b03113738f3bf455d047127ae6607bd76f9f7` | `f01230f55cabaa21211557e0c9fab946f15ce4df2f5388eddfc0e6cfe07e657f` | No material defect. Blue press chamber, bale door and oil tank; yellow sliding mesh gate, sill and latch wheel; bright cylinder and platen; black hoses; wire-tied cardboard bale on a timber pallet. |
| `recycling-facility/hydraulic-power-pack` | 4,006 / 4,800 | `c7786bc31100eba7dfdccca7964d96fa2b05312671fc39207c9999c16f05edf9` | `a46be57787da58769d6c5681d0edd5fbb5677a117160d68afac03bc2d7cf7aad` | No material defect. Grey reservoir on a dark drip-tray skid; blue finned motor; zinc-yellow valve manifold and return filter; red bladder accumulator; black hoses; gauges and sight glass. |

## Correction

Only `pelletizer-extruder` is changed. `air-knife` now uses `barrel` (`#b8bfc2`), the same control as the water bath it sits on. The pelletizer guard door, the hopper rim, the coupling guard and the pellet bin keep `trim`. The four colour controls, their defaults, the `pellet` choice and the four presets are unchanged. Geometry, part names and triangle count (1,664) are unchanged. A source comment now says the air knife is stainless. `scripts/checkCatalogQuality.py --kit recycling-facility`: 153/153 pass.

Regression: `tests/integration/catalog/pelletizerAirKnifeMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`air-knife should be bath steel`, see `verification/test-before.txt`) and passes after the fix.

Source SHA-256 after: `b939fefc0f8a936e4314ba498c42daeb50f6fbd9c7aa685f793288d90901e839`. Preview SHA-256 after: `cd1d396f20b80ac0ffb55b69637758de624aaff1715946e84579711a10db9c39`.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/pelletizer-extruder.png`. 113 pixels differ (difference > 8 on any channel), all inside the air-knife region (bounding box x 359-372, y 293-303). Enlarged crops: `previews/{before,after}/air-knife-crop.png`. Before, a yellow bar crosses the bath outlet; after, the bar is steel grey over the strands.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-front.png`, `previews/{before,after}/inspect-right.png`, and `previews/{before,after}/inspect-focus-iso.png` (`--focus air-knife,water-bath,water,pelletizer-door,hopper-rim`). The before focus view shows the air knife in the same yellow as the guard door and hopper rim. The inspector reports `mechanism.interpenetration` both before and after; this change does not affect it.
- Review MP4 (28.2 s): `pelletizer-air-knife-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after focus view at 20 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Defects noted but not changed in this round

- `pelletizer-extruder`: `pellet-bin` uses `trim` ("Guards and safety trim"). A painted bin is plausible, so it is left.
- `granulator`: `regrind-bin` uses the `drive` control.
- `near-infrared-sorter`: `drive-motor` uses the brand `accent` control.
