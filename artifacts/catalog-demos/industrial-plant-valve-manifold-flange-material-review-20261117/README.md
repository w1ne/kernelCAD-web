# Industrial-plant valve manifold flange material review — 17 November 2026

## Five-preview audit

Reviewed five rendered previews in the industrial-plant kit: valve manifold
station, industrial stair tower, grating walkway module, pipe rack bay, and
vertical cage ladder. The [ledger](preview-review.md) records what each image
shows and the geometry follow-ups that were not part of this material change.
The current public valve-manifold page returned HTTP 200 and its preview SHA-256
matched the local baseline. PR #1258 was merged with successful checks and no
submitted review. The only open catalog PR at audit time was #1507; it targeted
eight other industrial-plant assets. No open issue targeted these five IDs.

## Finding and correction

The three branch flange rings on `industrial-plant/valve-manifold-station` used
the yellow `safetyPaint` control even though the connected branch pipes, header,
and valve bodies use `steel`. The three rings now use the existing `steel`
control. The support skid and handwheels retain their safety paint. This is a
generic low-poly scene asset, not a vendor-specific model or engineering
specification; the color correction does not change geometry or dimensions.

Product context checked on 17 November 2026 is listed in the
[review ledger](preview-review.md): Parker's three-valve manifold catalog and
Swagelok's manifold material options. Neither catalog is the design source for
this kernelCAD asset.

## Before and after

- [Before preview](previews/before/valve-manifold-station.png)
- [After preview](previews/after/valve-manifold-station.png)
- [Before source](sources/before/valve-manifold-station.kcad.ts)
- [After source](sources/after/valve-manifold-station.kcad.ts)
- [All five reviewed source snapshots](sources/reviewed/)
- [Five-preview contact sheet](preview-review-five-assets.png)

The after preview keeps the same 740 triangles under the 1,400-triangle budget.
The flange rings now read as part of the metallic outlet assemblies while the
yellow skid and handwheels remain distinct.

## Verification

- The exported-GLB regression failed before the change on `flange-0` using the
  yellow finish, then passed after the correction. Captured outputs are in
  `verification/test-before.txt` and `verification/test-after.txt`.
- `npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/valveManifoldFlangeFinish.test.ts`
  passed with no diagnostics.
- `checkCatalogQuality.py --kit industrial-plant` reports 60/60 assets passing
  (100.00%).
- `npx vitest run tests/integration/catalog/` passed: 134 files and 204 tests,
  including the full catalog index/source freshness check.
- The generated catalog index was rebuilt from source and preview inputs. Its
  diff changes only this asset row; its source hash and preview path are recorded
  in `verification/index-diff-summary.json` and `index-row-after.json`.
- The public detail page still serves the baseline image because this branch is
  not deployed. Public baseline checks are retained in `verification/`.
- `kernelcad render inspect` was attempted through the existing Chrome CDP
  session. The WebSocket handshake timed out; because CDP attachment was
  required, the command did not start a new browser. The recorded attempt is in
  `verification/render-inspect.txt`. The generated catalog preview and MP4 were
  visually inspected instead.

## Demo

[Watch the 14-second MP4](industrial-plant-valve-manifold-flange-material-review.mp4).
Run `python3 make_review_assets.py` and `./make_demo.sh` to rebuild the contact
sheet, result card, and video. The video settings are in `demo-settings.json`;
video decode, metadata, and frame inspection evidence are in `video-review/`.

The clip shows local preview renders and an exported-GLB software regression. It
does not show simulation, deployment verification, or hardware acceptance.
