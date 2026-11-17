# Preview ledger — 2026-11-15 (welding curtain screen and four yard/service machines)

Lane PR #1406 was open and mergeable at round start (head `ed27752de`). All completed CI checks had passed; `catalog-index` was still running. The only open PR that touches `catalog/kits/` (#1253) changes `city-street/mailbox`. No open issue names the assets below. None of the five is named in a ledger under `artifacts/catalog-demos/`, in `docs/quality/`, or in a test under `tests/integration/catalog/`.

Selection: a source scan matched part names that imply a non-steel material (tyre, hose, cable, belt, screen, curtain, display, lamp, seat, grip, pallet and similar) against a steel or paint colour control, after removing the 220 assets already named in an earlier ledger. It returned 108 part hits. Most are correct (clamps, lamp brackets, cable-entry plinths and lens barrels are metal). The five assets below are the industrial/service ones where the material word names a large, visible part. The checked-in default preview of each one was opened (`samples/`, `previews/before/`).

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `shipyard/welding-curtain-screen` | 308 / 1,800 | `1594485f39a6a7ad6068d6785083c2830721dcbe6f9a97938d68004474726ffb` | `46cdbeb489f3e67b2b290f21e25e831f5b9755e3266538e3bf87aa96a250a829` | **Material defect, corrected (see below).** Both `curtain-panel-*` parts use `yardPaint` ("Yard finish", `#7e7060`). In the preview the two panels are flat brown boards and read as plywood or painted sheet, not as a welding curtain. `yardPaint` colours no other part. |
| `shipyard/yard-cable-reel-cart` | 344 / 1,800 | `4a59db340b879964269417727bff87d2742ea114ff4a20d721c3a060909455a8` | `041c940552c00bd4deb8f37b444078aa8ea1feabbf6a4902ca523fae9a99b253` | Defect noted, not changed: `cable-drum` is one plain 16-sided cylinder in `yardPaint` (`#b27046`, brown) with no flanges and no wound cable. It reads as a wooden log on a cart. A fix needs new geometry (flanges, cable layer), not only a colour. |
| `shipyard/ultrasonic-test-cart` | 420 / 1,800 | `6a6fd2af996d567f2c4564b4c85a1e8551059bd4f49a8567718ef43814626884` | `6dec01258947dda3382ae24ac47d9c41d86b816c99a6c4a61f74fda01bca6944` | Minor: `cable-spool` uses `yardPaint`, the same green as the instrument case, so it merges with the case side. A probe cable spool shows black cable. Not changed. |
| `water-treatment/reverse-osmosis-skid` | 2,660 / 3,300 | `be04d7237e0df2c1cd0ce473ef7e779fe0ef37f372d6d10e39864ea24629e695` | `61b26b17b6aead69db1df27ccfc3f0ad2b909bc8e1aa80c2f76582807f4d1876` | Source mismatch: `status-lamp-green` uses `stainlessSteel` and `status-lamp-red` uses `coatedSteel` (teal); `operator-display` uses `structuralSteel`. The lamps are about 6 px in the 512 px preview, so the visible effect is small. Membrane vessels, manifolds and pump read correctly. Not changed. |
| `airfield/aircraft-fuel-truck` | 310 / 1,800 | `3f06851a6f51a5347531308dbc6bc4d168ef626174f7059e2973910fe3baf0db` | `e399a713edc2ca2cdde3c879081596944be868d8f96872b60cb7022ca0f43b10` | Geometry defect noted: the `hose-reel` (stainless, plausible for a reel drum) floats in the air behind the tank with no support, and the tank is a faceted ellipsoid. Same class as the lavatory truck noted earlier. Not changed. |

## Correction: welding curtain screen

A portable welding screen holds tinted PVC welding-curtain film (usually transparent orange, red, yellow or green, to EN ISO 25980) in a steel frame. The film blocks arc flash and spatter. It is not a painted steel panel. In this asset `yardPaint` colours only the two curtain panels, so the control itself is the mismatch. The fix replaces it.

- `yardPaint` ("Yard finish", `#7e7060`) is replaced by `curtainVinyl` ("Welding curtain vinyl", `#f07a1a`). Both `curtain-panel-*` parts use it.
- `structuralSteel` (`#b6c1c4`) stays on the three `panel-frame-*` posts and both `base-foot-*` parts. `elastomer` (`#30383b`) stays on the four casters.
- `fresh-coat` preset: `curtainVinyl: '#ff8a24'`. `weathered-yard` preset: `curtainVinyl: '#c06a32'` (faded, soot-stained film). The steel and elastomer preset values are unchanged.
- The meta description and the header comment now say what the panels are. A source comment says why.
- Default first tried `#d4651f`; the shaded front face rendered rust-brown (`/tmp` check only), so the default was raised to `#f07a1a`.
- Geometry, part names and the triangle count (308) are unchanged. `python3 scripts/checkCatalogQuality.py --kit shipyard`: 70/70 pass. `scripts/checkCatalogAsset.ts`: minUpM 0, 308 / 1,800 triangles, size 2.0 × 1.5 × 0.55 m.

Compatibility: the parameter key `yardPaint` is removed from this asset. A saved `yardPaint` override for this asset no longer applies; it previously coloured only the curtains. Six other shipyard assets already have no `yardPaint` control, and no test or tool reads it for this asset.

Regression: `tests/integration/catalog/weldingCurtainVinylMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls are `yardPaint, structuralSteel, elastomer`; see `verification/test-before.txt`) and passes after the fix. It also checks that both presets set `curtainVinyl` and not `yardPaint`, that the posts and base feet keep `structuralSteel`, and that a caster keeps `elastomer`.

Source SHA-256 after: `8a28538216ab92609ea0efdc60682cbfa46a418d20b48a2cd6cc9a1108caa1a3`. Preview SHA-256 after: `c3094ccd16d41b4d758890d5c286e8bbe4d5e6337a3f0aa43fc8410ceb2c0fb8`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/welding-curtain-screen.png`. 43,804 pixels differ (difference > 8 on any channel), all inside the box x 162-357, y 68-357, which is the two curtain panels. Before, the panels are flat brown boards; after, they are orange curtain film between grey steel posts.
- Inspection views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-{iso,front,right}.png`. Both before and after views carry a `MECHANISM BROKEN · mechanism.interpenetration` badge. It comes from the existing geometry (the panels run into the posts), not from this change.
- Review MP4 (21 s): `welding-curtain-review.mp4`, built by `make_demo.sh`. Two decoded frames (before preview at 2 s, after preview at 19 s) were opened and read correctly.
- The other four default previews: `samples/`.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview.

## Defects noted but not changed in this round

- `welding-curtain-screen`: the curtain is a 55 mm thick slab (real film is under 1 mm, hung from the top rail); the centre post stands on the floor with no foot; the "casters" stand on top of the base feet instead of under them.
- `yard-cable-reel-cart`: cable drum reads as a wooden log (no flanges, no cable).
- `ultrasonic-test-cart`: cable spool in case green.
- `reverse-osmosis-skid`: status lamps and display in steel colours.
- `aircraft-fuel-truck`: floating hose reel.
- Carried over from earlier 2026-11-15 ledgers: `barcode-tunnel-scanner` belt in `paintedSteel` (hidden inside the tunnel); `tray-induction-loader` display in `paintedSteel`; `lavatory-service-truck` stainless floating hose; `postal-label-printer` stainless floating label roll; `scba-cylinder-fill-bank` has no cylinders.
