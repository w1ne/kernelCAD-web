# Water-treatment pump geometry follow-up

This bundle documents three existing water-treatment assets promoted in
`08a1543e1`: `high-lift-pump-skid`, `horizontal-split-case-pump`, and
`reverse-osmosis-skid`. The follow-up fixed the reverse-osmosis triangle budget
after the four-vessel option rendered at 3,216 triangles, then regenerated its
preview and `catalog/index.json` entry. No asset IDs were added.

## What changed

| Asset | Material controls | Presets | Geometry choice | Default triangles / budget |
| --- | --- | --- | --- | ---: |
| High-lift pump skid | coated steel, structural steel, stainless steel | `weathered`, `highVisibility` | `pumpCapacity`: compact / standard / highFlow | 1,628 / 3,200 |
| Horizontal split-case pump | coated steel, structural steel, stainless steel, elastomer | `weathered`, `highVisibility` | `casingSize`: compact / standard / heavyDuty | 1,548 / 3,200 |
| Reverse-osmosis skid | coated steel, structural steel, stainless steel | `weathered`, `highVisibility` | `membraneVessels`: 2 / 3 / 4 | 2,660 / 3,300 |

This promotion added three geometry choices, zero color controls, and zero
preset entries; it retains ten material controls and six preset entries across
the three assets. The models now include pump casings, horizontal motors and
cooling ribs, vessel
manifolds, supports, and controls that give the previews a recognizable
equipment silhouette. The four-vessel RO option uses 3,216 / 3,300 triangles;
the two-vessel option uses 2,104 / 3,300.

## Verification

- Catalog quality gate: **water-treatment 50/50**, full catalog **2,390/2,390
  (100%)**.
- All three source hashes match the regenerated index, and all three catalog
  rows point to rendered previews.
- `npx eslint catalog/kits/water-treatment/` passed.
- `npx vitest run tests/integration/catalog/` passed: 4 files, 15 tests.
- Local handoff verification passed **54/54** checks, including all four
  parametric variant renders under their indexed triangle budgets and three
  locally built asset detail pages.
- Hosted OpenCascade evaluation of the final RO source returned valid static
  geometry with no error diagnostics. These are geometry checks only.

The current follow-up regenerated the RO preview after its budget metadata
change. The geometry promotion regenerated all three previews; those renders,
before/after sources, and prior check output are retained in this bundle and in
the kit's `previews/` folder.

## Demo

- [15-second MP4](water-treatment-pump-geometry.mp4)
- [Poster](poster.png)
- [Inspected contact sheet](video-review/contact-sheet.png)
- [Written preview review](preview-review.md)
- [Video settings and invocation](demo-settings.json)
- [Source/index/page/variant verification report](verification.json)
- [Hosted kernel evaluation evidence](hosted-kernel-evaluations.json)

The video shows checked-in source, local software renders, parameter variants,
and local checks on this branch. It does not show deployed behavior, pump or
treatment performance, pressure capacity, or physical acceptance.

## Reproduction

From the repository root, regenerate the three previews and the index:

```bash
npx tsx scripts/renderCatalogPreviews.ts high-lift-pump-skid horizontal-split-case-pump reverse-osmosis-skid
npx tsx scripts/buildAssetCatalog.ts
```

Run the saved local verification and demo workflow:

```bash
bash artifacts/catalog-demos/water-treatment-pump-geometry-20261106/run_local_checks.sh
```

`run_local_checks.sh` runs ESLint, the catalog integration suite, quality gates,
asset renders, local catalog-page checks, parametric variants, MP4 capture, and
video decoding/inspection. Dated comparisons of comparable workflows are kept
in the private `kernelCAD-private` workspace.
