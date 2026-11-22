# Theatre production catalog wave

[Watch the 30-second source-to-preview walkthrough](theatre-production-kit.mp4).

The video shows the actual modular stage deck source and generated preview, then representative renders across all seven contact sheets. The final frame reports local catalog validation. Captions distinguish local checks from deployed behavior, stage safety, and physical acceptance.

## Results

- Added 52 original theatre-production assets. The generated catalog contains 2,000 indexed assets in 43 kits.
- All 52 theatre sources load, expose `scale` and `color`, export one material, and fit their 1,800-triangle budgets. Indexed meshes range from 128 to 304 triangles.
- `npx --silent eslint catalog/` passed over 2,000 model sources with zero errors and warnings.
- `npx vitest run tests/integration/catalog/` passed 4 files and 15 tests.
- The preview audit found 2,000 previewed index rows and 2,000 PNGs; all 52 theatre assets have previews.
- Local static page generation wrote 2,000 asset pages; all 52 theatre pages contain their title, controls, and preview, and the hub lists the kit.
- `npm run build` passed with a bundled `vendor/verb-nurbs` warning about comparing a value with `NaN` using `==`. The dry-run npm audit found all 52 theatre sources and 52 previews, no product-specific paths, and only the `./package.json` export. It wrote no tarball and ran no lifecycle scripts.
- At 2026-11-03T10:22:43.447942+00:00, the live homepage and `/assets.json` returned HTTP 200 and 200 with 1,291 previewed rows and no theatre-production rows. This branch is not deployed.
- Corrected the Fresnel fixture spigot and shifted the intercom beltpack so their declared base origins meet the floor; regenerated their previews and rebuilt the index.

## Rebuild and evidence

Run from the repository root. This local audit used Node v22.23.4 and the retained preload in the recycling-facility bundle for the pinned Emscripten package. `npm ci` rejected the existing package-lock/package.json mismatch; `npm install --package-lock=false --allow-git=all` installed dependencies without changing the lockfile.

The bundle retains the generator, settings, full-catalog build/test/lint output, rendered preview audit, local page verification, live baseline, npm build and package audit, source frames, decoded video contact sheet, and MP4.

## License and scope

All assets are original kernelCAD geometry dedicated under CC0 1.0. They are visualization props. Catalog checks do not establish load capacity, overhead rigging safety, electrical ratings, fire-code compliance, venue suitability, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/theatre-production-wave-20261103/capture_theatre_demo.py`
- video review: `python3 artifacts/catalog-demos/theatre-production-wave-20261103/inspect_theatre_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
