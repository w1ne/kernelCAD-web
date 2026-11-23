# Case taper tape-head material review — 18 November 2026

This round reviewed five beverage-line manufacturing previews and corrected one material-role mismatch in `beverage-bottling-line/case-taper`. The metal tape-application head now uses the existing `stainlessSteel` color control; the tan polypropylene roll remains on `packingTape`.

The change preserves the asset ID, geometry, envelope, knobs, presets and triangle budget. The model remains at **176 triangles / 2,200 budget**. No catalog assets were added or removed.

## Review and demo

- [Five-preview audit ledger](preview-review.md)
- [Rendered five-preview contact sheet](slides/01-five-preview-audit.png)
- [Before preview](previews/before/case-taper.png) and [after preview](previews/after/case-taper.png)
- Before/after `.kcad.ts` sources in `sources/before/` and `sources/after/`; the other four reviewed sources and previews are retained in `sources/reviewed/` and `samples/`.
- [Exported-GLB regression test](../../../tests/integration/catalog/caseTaperTapeRollMaterial.test.ts)
- [18-second MP4 demo](beverage-case-taper-tape-head-material-review.mp4)
- Demo source: [make_demo.py](make_demo.py), [settings](demo-settings.json), and [recorded invocation](verification/commands.txt)
- The encoded video was inspected at five sampled timecodes; see [frame review](video-review/inspection.md) and [probe metadata](verification/video-probe.json).
- The [public baseline check](live-baseline/public-check.json) records the detail page, source and preview before this branch change.

The video shows the five local previews, the original color mapping, the single source assignment, the corrected preview, and the local verification. It depicts software preview rendering and exported-GLB testing only.

## Verification

- The focused exported-GLB regression **failed on the baseline source** because the tape head was `#3999a1` (`foodPolymer`), then **passed 1/1** after the assignment to `#aebdc1` (`stainlessSteel`). It still asserts that the roll remains `#c39058` (`packingTape`).
- ESLint is clean for the beverage-bottling-line kit and the regression test.
- Structural quality gate: `beverage-bottling-line` **50/50 (100%)**. The current global gate reports **2,398/2,402 (99.83%)**; its four thin assets are in `standard-components`. This structural gate does not establish semantic realism.
- `npx vitest run tests/integration/catalog/` passed **148/148 files and 218/218 tests** in 702.53 seconds. `catalogIndex.test.ts` rebuilt/exported all 2,402 catalog assets and confirmed the committed index is fresh.
- `catalog/index.json` was regenerated. Only the `beverage-bottling-line/case-taper` row changed; its `sourceSha256` matches the updated source, and its preview path exists. The [index row check](verification/index-row-check.json) records **2,402 assets / 50 kits**, 176 triangles, and the distinct head/roll palette roles.

The live detail page and public preview were checked before editing in the existing Chrome session. Both matched the saved pre-fix branch source and render. This feature branch is not deployed, so the public page continues to show that baseline. No deployment, process simulation or hardware acceptance is claimed.
