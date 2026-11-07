# Alpine Expedition quality promotion — 2026-11-05

Promoted the 50 existing `alpine-expedition` assets in place. Added no asset
IDs or kits. Every source retains its overall scale control, now exposes two to
four material-named color controls, and has `stormWorn` and `highVisibility`
presets. The kit has 143 material controls and 100 preset entries.

The helmet, avalanche transceiver, basecamp dome tent, four-season tent,
glacier goggles, and ice axe receive focused silhouette work. Material controls
are applied to their named components. The existing geometry in the remaining
assets is retained with separately assigned material roles.

## Results

- Kit quality gate: **50/50 assets pass**.
- Catalog quality: **1,954/2,390 pass (81.76%)**; **436 thin assets remain
  (18.24%)** across nine thin kits. The catalog count did not change.
- Previews: all 50 regenerated and included by the index. The source SHA-256
  values and rendered preview files match for all 50 rows.
- Triangle counts: 72–580, below the existing per-asset budgets.
- Alpine ESLint: clean, with zero errors and warnings.
- Catalog integration: **4 files / 15 tests passed**.
- Local static catalog build: all 2,390 pages and the hub generated; all 50
  Alpine pages include their parameters and presets and copy the matching PNG.
- The indexed `highVisibility` preset for `alpine-dry-bag` was applied to the
  source and software-rendered for comparison with the default preview.

The [preview review](preview-review.md) records the individually opened
helmet, tent, and axe previews plus the 50-asset [contact sheet](preview-review/contact-sheet.png).
The [video review](video-review.md) records inspection of the 20-second MP4
and its decoded frames. The first integration attempt caught a grounding issue
in the helmet straps and tent vestibule; the final corrected run passes. The
initial failure and component-level inspection are retained in this bundle.

## Replay and evidence

The retained authoring source is [`promote_alpine.py`](promote_alpine.py), with
palette and workflow settings in [`settings.json`](settings.json). Its base
sources were the 50 assets at commit `fbe301651`; on the promoted sources the
script exits without rewriting them. A replay from the base sources generated
byte-for-byte matches for all 50 committed sources; see
[`source-replay-audit.json`](source-replay-audit.json). The exact full-kit
preview invocation and final index build invocation are recorded in their
respective text files. Index integrity, local pages, quality output, lint,
tests, grounding inspection, preset render and public-site check are also
retained in this folder.

From the repository root, replay the promoted workflow with:

```sh
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/promote_alpine.py
npx tsx scripts/renderCatalogPreviews.ts alpine-dry-bag alpine-helmet alpine-pack-cover alpine-rescue-stretcher avalanche-probe avalanche-shovel avalanche-transceiver basecamp-dome-tent bear-canister belay-device camp-cot climbing-cam climbing-chalk-bag climbing-harness climbing-quickdraw climbing-rope-coil crampons expedition-duffel expedition-headlamp expedition-power-bank expedition-radio expedition-solar-panel expedition-tarp expedition-water-filter four-season-tent glacier-goggles glacier-picket handheld-gps hydration-reservoir ice-axe ice-screw insulated-flask insulated-sleeping-pad locking-carabiner mountain-weather-meter mountaineering-bivy nut-tool rescue-bivy rescue-pulley rope-haul-bag satellite-messenger ski-touring-skins snow-anchor snow-saw snow-wall-shovel snowshoes summit-marker-post tent-footprint tent-pole-bundle trail-gaiters
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/update_alpine_readme.py
python3 scripts/checkCatalogQuality.py --kit alpine-expedition
npx eslint catalog/kits/alpine-expedition/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-alpine-expedition-pages-20261105
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/verify_local_pages.py /tmp/kernelcad-alpine-expedition-pages-20261105
npx tsx artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/render_preset_variant.ts
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/audit_promotion.py
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/review_previews.py
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/capture_alpine_demo.py
python3 artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/inspect_demo_video.py
```

The 20-second [MP4](alpine-expedition-quality-promotion.mp4) shows source
material roles, before/after previews, the indexed preset render and local
verification. It is a replay of local software renders. It does not show a
simulation or deployed behavior and does not establish physical or field
acceptance.

The live-site snapshot in [`live-website-check.json`](live-website-check.json)
records the existing homepage and asset manifest responding with HTTP 200 and
the `/catalog/` and Alpine catalog routes responding with HTTP 404 on
2026-11-05. This branch has not been deployed. The dated comparison of official
alpine equipment workflows is stored privately in
`kernelCAD-private/catalog-alpine-expedition-quality-compare-20261105/COMPARISON.md`;
public materials describe native kernelCAD assets only.
