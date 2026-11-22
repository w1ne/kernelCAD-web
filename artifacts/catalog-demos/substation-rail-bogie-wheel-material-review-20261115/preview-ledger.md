# Preview ledger — 2026-11-15 (shipyard yard machines, substation rail bogie)

Lane PR #1406 was open and mergeable at round start. All its CI checks had passed, except `catalog-index` and `test-shard (3)`, which were still running. No open PR touches `catalog/kits/shipyard/` or `substation-transformer-rail-bogie`, and a search of open issues found none that name these assets. None of the six assets is named in any ledger or note under `artifacts/catalog-demos/`, in `docs/quality/`, or in any test under `tests/integration/catalog/`.

## Shipyard: five previews, no clear material defect

`shipyard` has 70 assets; 56 were not named in any earlier review. The five below were chosen as machines. Each checked-in default preview (`samples/`) was opened, and the colour assignment of each part was read.

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `shipyard/pipe-pressure-test-skid` | 412 / 1,800 | `d04d2934e908439f1bd2ece029c0c093e6d09ae31cbe7a33b0854f2f8491ccc7` | `78a481fffb76081cd2f5a5695167fb799e1a1d09574e6ed6456be8e2c9323678` | No clear material defect. The three valve handwheels use the `elastomer` control (`#30383b`); handwheels are usually cast iron, but black-painted handwheels are common, and the swap would leave `elastomer` unused. Geometry defects: the "manifold header" is a rectangular box, not a pipe; the "handwheels" are solid discs; there are no pipe sections, although the description names them. |
| `shipyard/paint-curing-air-heater` | 296 / 1,800 | `3ea0667d42b1fbd46905d350ab5a4bfb71143887ef168360fddbca809d6971d5` | `c546904aea85191dbbe4f7b450ae9b9055426185b6d89291c6aa278700efc37f` | No material defect. Painted fan cabinet and duct collar, steel skid, outlet plenum and fan grille. Geometry: the fan grille is a solid disc, and the "hose connection" is a short box. |
| `shipyard/portable-weld-fume-extractor` | 340 / 1,800 | `33eed255827804ad1f72f5e95bbd19d5213268e86157195d17561edd9da9335b` | `18873baf64c87abfb02578f2014aeb0fdee4df502e97ff9b520b977e34141acd` | No material defect. Painted cabinet, filter cover, door and hood; steel arm; elastomer wheels. Geometry: the "flexible arm" is a straight vertical mast 3.27 m tall with the hood on top, so it does not read as an articulated extraction arm. |
| `shipyard/dock-gate-winch-base` | 272 / 1,800 | `5a3b7846f266f916629325855223ab1b183cc912be6805fa7c529612a883dd35` | `704dbc1411aa4588de5297e8471a6ffab14290a3ef688ecd22b1670da0ed1578` | No material defect. Painted skid, motor, cable drums, brake lever and guard; steel drum bearings. Geometry: the drums carry no hauling cable, and the drum barrels are plain prisms with no flanges. |
| `shipyard/vessel-shore-power-pedestal` | 284 / 1,800 | `0503a4a4348d87b679e7ed15bf0fcab3db9b85548cd59776cc13388ce36878c8` | `51bfe1673eedc1da2f95d1959a1e3b61e05b6ad51ab6c81ac5e5505f7ee4ba80` | No clear material defect. Painted plinth, cabinet and door; steel socket outlets and cable hooks (marine sockets are often moulded polymer, but the asset has no polymer control). Geometry: the cable hooks (x = ±420 mm, 90 mm wide) stand 15 mm clear of the 720 mm cabinet sides, so they float. |

## Substation rail bogie: material defect, corrected

None of the five shipyard previews gave a clear material defect. A source scan of unreviewed industrial assets for part names that conflict with their colour control then found this one.

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `grid-substation/substation-transformer-rail-bogie` | 268 / 1,800 | `665acf5093d70e9ab24611c8e2e558d8918c27eb572a90eb533e2914853c771f` | `b459378838fe51c026edfbec2c65af2622a305865251c034bdae5f7840264ebe` | **Material defect, corrected.** The four `rail-wheel` parts used the `rubber` control (`#293034`). A transformer rail bogie carries a tank of 100 t or more on flanged forged-steel wheels that run on rails; a rubber tyre cannot carry that load on a rail head. `rubber` was used on no other part. |

### Correction

The `rubber` control is replaced by `wheelSteel` ("Rail wheel steel", `#4f565a`), and the four rail wheels use it. The `weathered` preset sets `wheelSteel` to a rust-brown `#5d5048` (it set `rubber` to `#3b3f3e`). The meta description now lists "wheel steel". `galvanizedSteel`, `stainlessSteel`, the `maintenance` preset, geometry, part names and triangle count (268) are unchanged. A source comment says why the wheels are steel. `scripts/checkCatalogQuality.py --kit grid-substation`: 80/80 pass.

Compatibility: the parameter key changes from `rubber` to `wheelSteel`. A saved override of `rubber` on this asset no longer applies; the wheels then take the new default.

Regression: `tests/integration/catalog/railBogieWheelMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls are `galvanizedSteel, rubber, stainlessSteel`; see `verification/test-before.txt`) and passes after the fix. It also checks that the frame and crossmembers keep `galvanizedSteel`.

Source SHA-256 after: `01e648dd6e13033c9432fe9805d5ee42b52054e812c2e05bc32523fa705998e6`. Preview SHA-256 after: `e40c72f9dbfdfca7e93ef4f209ee5682bd46cdca40d9fa530ae6f121ee53f39c`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/substation-transformer-rail-bogie.png`. Only 71 pixels differ (difference > 8 on any channel), all inside the box x 170-189, y 290-301. The crossmembers hide the wheels from the catalog camera, so the default preview shows almost no change.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-front.png`, `previews/{before,after}/inspect-right.png`, and `previews/{before,after}/inspect-focus-iso.png` (`--focus rail-wheel,rail-wheel-2,rail-wheel-3,rail-wheel-4,rail-shoe,rail-shoe-2`). Before, the focus view shows four black rubber-tyre discs on the rail shoes; after, they are dark steel grey. The inspector reports `mechanism.interpenetration` both before and after; this change does not affect it.
- Review MP4 (21.1 s): `rail-bogie-wheel-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before front view at 4.5 s, after focus view at 12 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Defects noted but not changed in this round

- `substation-transformer-rail-bogie` geometry: the two crossmembers are 1,620 mm deep plates that overhang the 972 mm frame on both sides and hide the wheels; the wheels sink into the rail shoes (`mechanism.interpenetration`); the "rail shoes" use `stainlessSteel`, although bogie rail shoes are normally carbon steel. The asset reads as stacked slabs, not as a bogie.
- The shipyard geometry defects listed in the table above.
