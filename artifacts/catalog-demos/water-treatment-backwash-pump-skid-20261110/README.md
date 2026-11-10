# Water-treatment backwash pump skid refinement

This handoff documents a visual and parametric refinement of the existing
`water-treatment/backwash-pump-skid` asset. Its ID and kit membership are
unchanged. The local default preview distinguishes the pump casings from their
finned motors and shows the inlet and discharge pipework, valves, gauges,
coupling guards, skid frame, and control panel.

## What changed

- `pumpArrangement` changes the actual layout between one and two pump/motor
  sets (`single` / `duplex`).
- Four material controls target coated pump and motor steel, structural skid
  steel, stainless pipework, and rubber couplings and seals.
- The `weathered` and `highVisibility` presets set those materials separately.
- Default preview: **2,648 triangles / 3,600 budget**.
- No assets or kits were added. The catalog remains **2,402/2,402 passing
  (100.00%)**; water-treatment remains **50/50 passing**.

The [before preview](before/backwash-pump-skid.png) and
[current preview](../../../catalog/kits/water-treatment/previews/backwash-pump-skid.png)
show the silhouette change. [Single](variants/backwash-pump-skid-single.png),
[duplex](variants/backwash-pump-skid-duplex.png), and
[high-visibility duplex](variants/backwash-pump-skid-duplex-high-visibility.png)
renders come from the source-defined choice and preset.

## Demo

- [15-second MP4](backwash-pump-skid-demo.mp4)
- [Poster](poster.png)
- [Decoded-frame contact sheet](video-review/contact-sheet.png)
- [Video inspection report](video-review/inspection.json)
- [Video source and settings](capture_demo.py), [settings](demo-settings.json)
- [Variant render source](render_backwash_variants.ts) and
  [variant evidence](variant-renders.json)
- [Source/index/page/check verification](verification.json)

The video shows local software renders of kernelCAD source variants and local
checks on this branch. It does not show deployed behavior, water-treatment
performance, a fabricated pump package, or physical acceptance.

## Verification and reproduction

The source evaluates without diagnostics. The saved integration run covers the
catalog tests; ESLint and the quality gate cover the full water-treatment kit
and full catalog. A generated local detail page was checked for the asset title,
choice, material controls and presets. The current live library was not changed.

Rebuild the source preview and generated index from the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts backwash-pump-skid
npx tsx scripts/buildAssetCatalog.ts
```

Run the saved local variants, lint, integration, quality, page and demo workflow:

```bash
bash artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/run_local_checks.sh
```

The dated comparison note is kept in the private `kernelCAD-private` workspace.
