# Catalog assets

Reusable catalog sources live in `catalog/kits/<kit>/`. Each `.kcad.ts` file
declares its metadata and parameter knobs; `catalog/index.json` is generated
from those sources and must be rebuilt in the same change.

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

## Theatre production assets

The [theatre production kit](../catalog/kits/theatre-production/README.md) adds
52 original low-poly props for modular staging, scenery, curtains and rigging,
lighting, audio, backstage operations, and touring storage. Each source exposes
scale and color controls and has an indexed preview. The [wave demo and
verification bundle](../artifacts/catalog-demos/theatre-production-wave-20261103/README.md)
records the source-to-preview workflow, full-catalog integration checks, local
pages, package boundary audit, and inspected MP4. These are visualization props;
catalog checks do not establish load capacity, rigging safety, electrical
ratings, code compliance, or physical acceptance.

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
Each source exposes scale and color controls and has an indexed preview. The
[wave demo and verification bundle](../artifacts/catalog-demos/vet-clinic-wave-20261103/README.md)
records the source-to-preview workflow, catalog audit, generated pages, and
inspected MP4. These are visualization props; checks do not establish clinical
suitability, safety, ratings, hygiene, calibration, regulatory compliance, or
physical acceptance.

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
midway games, concessions, rest areas, and operations. Each source exposes
scale and color controls and has an indexed preview. The [wave demo and
verification bundle](../artifacts/catalog-demos/amusement-park-wave-20261103/README.md)
records the generated sources, rendered previews, local catalog checks, and
inspected MP4. These are visualization props; checks do not establish ride
structure, restraints, barrier design, accessibility compliance, equipment
ratings, operating procedures, or attraction safety.

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
yard maintenance. Each source exposes scale and color controls and has an
indexed preview. The [wave demo and verification bundle](../artifacts/catalog-demos/grid-substation-wave-20261103/README.md)
records the source-to-preview workflow, local catalog checks, and inspected
MP4. These are visualization props; checks do not establish equipment ratings,
electrical safety, grid compliance, operating procedures, or field acceptance.
