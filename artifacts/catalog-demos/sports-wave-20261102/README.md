# Sports catalog wave demo bundle

**Video:** [sports-kit.mp4](sports-kit.mp4) — 24 seconds, 1280×720, H.264 / yuv420p. The video shows authored kernelCAD source and controls, generated mesh previews for all 40 assets, and the local audit result.

## Reproduce

From the repository root, run the commands in [settings.json](settings.json). They regenerate the `.kcad.ts` sources and kit metadata, rebuild `catalog/index.json`, render the sports previews, run lint and the catalog integration suite, build the static catalog pages in `/tmp`, and capture and inspect the MP4. The generator, preview, evidence, capture and inspection source files are retained in this bundle.

## Verification evidence

- [asset-check-results.json](asset-check-results.json): 40/40 sports sources pass. The full integration suite audited all 583 indexed assets; each builds and exports inside its triangle budget on one material. Sports meshes range from 12 to 386 triangles against a budget of 1,800, have `minUpM = 0`, and expose `scale` and `color`.
- [catalog-eslint.json](catalog-eslint.json): `npx eslint catalog/` passed with no diagnostics.
- [catalog-integration-test.log](catalog-integration-test.log): 4 catalog integration files and 15 tests passed. This includes the Studio link contract for all assets and the exact knobs in each index row.
- [catalog-pages-check.json](catalog-pages-check.json): the local static build contains all 583 catalog pages and previews, including 40 Sports pages. Each Sports page lists both knobs. The pages were generated locally from the committed index; this does not establish deployed behavior.
- [video-inspection.json](video-review/video-inspection.json) records the MP4 probe, eight decoded frames and manual visual review. [decoded-contact-sheet.png](video-review/decoded-contact-sheet.png) shows every frame.

## Deployment status and limits

The branch is not deployed. On 2026-11-02, the live `/catalog/` route returned HTTP 404 and the homepage's `/assets.json` contained 373 assets in 11 kits; the live homepage does not yet show this Sports kit. Its display must be verified after the website is rebuilt and deployed.

The demo records local source generation, mesh export, index and static-page generation. It does not claim simulation, sporting specification or certification, hardware acceptance, or deployed behavior. All assets are original kernelCAD geometry dedicated to the public domain under CC0 1.0.
