# Standard-components guide and retention detail refinement — 2026-11-10

This handoff records an in-place refinement of the existing `bulkhead-adapter`,
`linear-guide-rail`, and `shaft-coupling` assets. No kit or asset ID was added.

## What changed

- **Bulkhead adapter:** extended the hollow brass barrel through a stainless
  six-flat locknut, with a separate dark rubber sealing washer. Stainless
  flanges, brass barrel, and sealing rubber have independent controls.
- **Linear guide:** added a relieved carriage, four top mounting wells, two
  orange polymer wipers, and a `carriagePosition` choice (`left`, `center`, or
  `right`). The aluminum base, steel raceway/carriage, and polymer wipers have
  independent controls.
- **Shaft coupling:** added radial set-screw bores and heads plus a selectable
  split-clamp version with a visible split and crossing bolts. Steel hubs,
  bronze center band, and zinc-plated hardware have independent controls.
- Each asset now has three material-named color controls. Existing `dark`,
  `brass` or `highVisibility`, and `weathered` preset names were retained and
  updated to include all material zones; no preset names were added.
- Triangle budgets are **620**, **760**, and **620**. Default variant exports
  measured **456**, **540**, and **536** triangles.

The kit's source and preview table is in
[`catalog/kits/standard-components/README.md`](../../../catalog/kits/standard-components/README.md).
The generated catalog index was rebuilt after refreshing all 50 previews. The
asset count is unchanged. The catalog quality checker is the source of the
reported pass rate in [`verification.json`](verification.json).

## Reproduce and review

`demo-settings.json` records the source IDs, named parameter and preset
variants, full 50-preview invocation, render settings, verification commands,
and truthful claim limits. `render_variants.ts` renders nine variants from the
checked-in `.kcad.ts` sources and verifies that the size, carriage position,
retention style, and named palettes produce different output. `variant-manifest.json`
records triangle counts and source/render hashes.

The short MP4 shows the prior and updated previews, material palettes and
geometry choices:

- [15-second workflow demo](standard-components-guide-retention-details.mp4)
- [Video contact sheet](video-review/contact-sheet.png)
- [Decoded video samples](video-review/decoded-samples.png)
- [Video inspection record](video-inspection.json)
- [Source, index, preview, and check evidence](verification.json)

`kernelcad render inspect` was attempted with the invocation recorded in
`demo-settings.json`, attached to the already-running Chrome at
`127.0.0.1:9223`, and timed out during the CDP connection. Because attachment
was required, it did not launch a replacement browser. The result is retained
in [`render-inspect-attempt.json`](render-inspect-attempt.json). The three
source-generated catalog previews and nine parameter/preset renders are
retained and visually inspected; their exact hashes are in the verification
manifest.

## Comparison and claim limits

Official component and asset-authoring workflows were checked on 2026-11-10.
The dated comparison is kept privately in
`kernelCAD-private/docs/competitors/2026-11-10-standard-components-quality.md`.
This is refinement of kernelCAD's existing asset library, described on the
[kernelCAD homepage](https://kernelcad.com/); it does not add another library
surface or copy supplier geometry.

The video and rendered previews show local source geometry and software renders
only. The feature branch has not been deployed. The models are generic
low-poly visualizations, not supplier specifications, manufacturing evidence,
or physical hardware acceptance.
