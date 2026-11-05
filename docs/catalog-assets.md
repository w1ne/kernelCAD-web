# Catalog assets

Reusable catalog sources live in `catalog/kits/<kit>/`. Each `.kcad.ts` file
declares its metadata and parameter knobs; `catalog/index.json` is generated
from those sources and must be rebuilt in the same change.

## Catalog quality snapshot (2026-11-05)

The catalog quality gate reports **1,554/2,390 assets passing (65.02%)** and
836 thin assets (34.98%). This round promoted 50 existing veterinary clinic
assets; no IDs were added. The previous checkpoint was 1,504/2,390 (62.93%),
after promoting 52 space-exploration assets; the earlier 5 Nov checkpoint was
1,010/2,390 (42.26%). Thin assets remain in other kits. See the [veterinary
clinic quality handoff](../artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/README.md),
[space exploration handoff](../artifacts/catalog-demos/space-exploration-quality-promotion-20261105/README.md),
and [theatre production handoff](../artifacts/catalog-demos/theatre-production-quality-promotion-20261105/README.md)
for source, preview, index, and verification evidence. These are local catalog
checks and do not represent deployed behavior.

## Build and audit

```sh
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
```

The index builder evaluates and exports each source to collect its mesh stats,
then restarts the OpenCascade runtime between kits to bound native geometry
state during a full-catalog build. The integration suite rebuilds the index in
memory and checks source hashes, mesh budgets, one-material output, and the
Studio parameter list. Treat the committed total as verified only after that
suite passes.

Use the stale-index check during review without changing generated output:

```sh
npx tsx scripts/buildAssetCatalog.ts --check
```

The local static page builder is a separate check from deployed website
behavior. Do not infer deployment or physical acceptance from local catalog
builds.

## Alpine expedition assets

The [alpine expedition kit](../catalog/kits/alpine-expedition/README.md) adds
50 original low-poly scene props for shelters, climbing, snow travel, rescue,
and field equipment. Each source exposes overall scale and asset color, and
the catalog index carries the generated preview path. The [wave demo and
verification bundle](../artifacts/catalog-demos/alpine-expedition-wave-20261103/README.md)
shows the source-to-preview workflow and its local evidence; it does not claim
that this branch has been deployed.

## Archaeology fieldwork assets

The [archaeology fieldwork kit](../catalog/kits/archaeology-fieldwork/README.md)
adds 50 original low-poly scene props for survey layout, excavation, screening,
sample handling, field records, and site photography. Each asset exposes scale
and color controls and has a generated preview path in the catalog index. The
[wave demo and verification bundle](../artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/README.md)
records the source-to-preview workflow and local audit results. The kit is a set
of generic scene props; it does not assert archaeological method approval,
instrument calibration, historical fidelity, or field acceptance.

## Apiary assets

The [apiary kit](../catalog/kits/apiary/README.md) adds 50 original low-poly
scene props for hive structures, beekeeping tools, feeding, yard fixtures, and
honey handling. Every source exposes scale and color controls and has an
indexed preview path. The [wave demo and verification bundle](../artifacts/catalog-demos/apiary-wave-20261103/README.md)
records the source-to-preview workflow and local checks. These are generic
scene assets; mesh and catalog checks do not establish husbandry suitability,
food-contact suitability, equipment ratings, or physical acceptance.

## Hydroponics assets

The [hydroponics kit](../catalog/kits/hydroponics/README.md) adds 52 original
low-poly props for greenhouse structures, growing systems, nutrient delivery,
filtration, sensing, climate equipment, and crop support. Each source exposes
scale and color controls and has an indexed preview. The [wave demo and
verification bundle](../artifacts/catalog-demos/hydroponics-wave-20261103/README.md)
records the source-to-preview workflow, full-catalog integration checks, local
pages, package boundary audit, and inspected MP4. The kit is for visualization;
catalog checks do not establish crop performance, equipment ratings, chemical
compatibility, sensor calibration, or physical acceptance.

## Space exploration assets

The [space exploration kit](../catalog/kits/space-exploration/README.md) contains
52 original low-poly props for lunar habitats, rover mobility, spacecraft support
and field science. Each existing ID retains its scale control and now has two to
four material-named color controls, `lunarDust` / `highVisibility` presets and an
indexed preview. The rover has six oriented wheels, a raised equipment bay and
visible suspension; communication dishes use a distinct reflector surface and
support arm. The [quality promotion handoff](../artifacts/catalog-demos/space-exploration-quality-promotion-20261105/README.md)
records the sources, refreshed previews, index, local checks and inspected MP4.
These remain visualization props; checks do not establish flight readiness,
pressure-vessel or radiation performance, thermal-vacuum qualification, mission
fit, engineering suitability or hardware acceptance.

## Theatre production assets

The [theatre production kit](../catalog/kits/theatre-production/README.md) adds
52 original low-poly props for modular staging, scenery, curtains and rigging,
lighting, audio, backstage operations, and touring storage. Each existing ID
retains its scale control and now has two to four material-named color controls,
two named appearance presets, and an indexed rendered preview. The [quality
promotion handoff](../artifacts/catalog-demos/theatre-production-quality-promotion-20261105/README.md)
records the source changes, preview review, preset render, regenerated index,
lint, integration, local-page, and inspected-video evidence. The [original wave
bundle](../artifacts/catalog-demos/theatre-production-wave-20261103/README.md)
preserves initial kit creation evidence. These are visualization props; checks
do not establish load capacity, rigging safety, electrical ratings, code
compliance, or physical acceptance.

## Recycling facility assets

The [recycling facility kit](../catalog/kits/recycling-facility/README.md) adds
153 original low-poly props for inbound reception, material sorting, baling,
glass and plastics recovery, organics processing, and residual management.
Each source exposes scale and color controls and has an indexed preview. The
[wave demo and verification bundle](../artifacts/catalog-demos/recycling-facility-wave-20261103/README.md)
records the source-to-preview workflow, full-catalog integration checks, local
pages, and inspected MP4. These are visualization props; catalog checks do not
establish equipment specifications, process performance, operator safety,
environmental compliance, or physical acceptance.

## Veterinary clinic assets

The [veterinary clinic kit](../catalog/kits/vet-clinic/README.md) adds 50
original low-poly props for reception and examination, treatment and imaging,
surgery and instrument processing, diagnostics, inpatient housing, and grooming.
Each existing ID keeps its scale control and now exposes two to four
material-named color controls, `clinicClean` / `softTeal` presets, and an
indexed preview. The [quality promotion handoff](../artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/README.md)
records the 146 material controls, 100 preset entries, refreshed preview review,
regenerated index, lint, integration, local-page checks, and inspected MP4. The
[original wave bundle](../artifacts/catalog-demos/vet-clinic-wave-20261103/README.md)
preserves initial kit evidence. These are visualization props; checks do not
establish clinical suitability, safety, ratings, hygiene, calibration,
regulatory compliance, or physical acceptance.

## Fire station assets

The [fire station kit](../catalog/kits/fire-station/README.md) adds 70 original
low-poly fixtures for apparatus-bay readiness, equipment washing,
decontamination, protective-gear processing, clean storage and station
alerting. The [wave demo and verification bundle](../artifacts/catalog-demos/fire-station-wave-20261103/README.md)
records the native sources, rendered previews, local page checks and inspected
MP4. These are generic visualization props; checks do not establish
building-code compliance, fire-protection performance, ventilation,
contamination control, PPE performance, or operational acceptance.

## Amusement park assets

The [amusement park kit](../catalog/kits/amusement-park/README.md) adds 70
original low-poly props for park entry, guest services, family attractions,
midway games, concessions, rest areas, and operations. Every asset now exposes
three or four material-named controls and `festival` / `twilight` presets, with
refreshed preview paths in the generated index. The [quality promotion handoff](../artifacts/catalog-demos/amusement-park-quality-promotion-20261104/README.md)
records the source changes, preview review, index, lint, integration and local
page evidence, plus an inspected MP4. The [original wave bundle](../artifacts/catalog-demos/amusement-park-wave-20261103/README.md)
retains the kit creation workflow. These are visualization props; checks do
not establish ride structure, restraints, barrier design, accessibility
compliance, equipment ratings, operating procedures, or attraction safety.

## Shipyard assets

The [shipyard kit](../catalog/kits/shipyard/README.md) adds 70 original
low-poly props for yard and drydock operations, hull-block fabrication,
outfitting, surface preparation, coating, and refit support. Each source
exposes scale and color controls and has an indexed preview. The [wave demo and
verification bundle](../artifacts/catalog-demos/shipyard-wave-20261103/README.md)
records the native sources, rendered previews, local catalog checks, and
inspected MP4. These are visualization props; checks do not establish vessel
design approval, lift capacity, welding qualification, drydock certification,
workplace safety, or operational acceptance.

## Grid substation assets

The [grid substation kit](../catalog/kits/grid-substation/README.md) adds 80
original low-poly props for line structures, primary switching equipment,
transformer auxiliaries, protection and control, cable routes, grounding, and
yard maintenance. Every source now exposes scale plus two to four
material-named color controls and `weathered` / `maintenance` finish presets;
the indexed previews show the separated materials and object-specific forms.
The [quality promotion handoff](../artifacts/catalog-demos/grid-substation-quality-promotion-20261104/README.md)
records the full-kit source, preview, index, lint, integration, local-page, and
inspected-video evidence. The [original wave bundle](../artifacts/catalog-demos/grid-substation-wave-20261103/README.md)
retains the source-to-preview workflow. These are visualization props; checks
do not establish equipment ratings, electrical safety, grid compliance,
operating procedures, or field acceptance.

## Telecom infrastructure assets

The [telecom infrastructure kit](../catalog/kits/telecom-infrastructure/README.md)
contains 56 original props for radio sites, rooftop equipment, cable routes and
fiber distribution. The existing asset IDs now expose overall scale, two to
four material-named color controls, and `fieldSite` / `highVisibility` presets.
Masts, antennas, cabinets, cable hardware and fiber terminals use distinct
materials and visible component shapes. Each of the 56 sources has a generated,
indexed preview. The [quality promotion bundle](../artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/README.md)
records the source changes, local preview review, preset render, page generation,
lint and integration evidence. These are stylized scene props; the catalog does
not establish RF performance, environmental ratings, installation suitability,
regulatory compliance or hardware acceptance.
