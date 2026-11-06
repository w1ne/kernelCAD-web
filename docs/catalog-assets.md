# Catalog assets

Reusable catalog sources live in `catalog/kits/<kit>/`. Each `.kcad.ts` file
declares its metadata and parameter knobs; `catalog/index.json` is generated
from those sources and must be rebuilt in the same change.

## Catalog quality snapshot (2026-11-06)

The catalog quality gate reports **2,371/2,390 assets passing (99.2%)** with
19 thin assets remaining. The latest round promoted all 40 existing office
assets, increasing the workspace result from 2,331/2,390 (97.5%); no IDs or
kits were added. The [office quality handoff](../artifacts/catalog-demos/office-quality-20261106/README.md)
records its source, preview, index, local-page, lint and integration evidence.
The [solar-energy quality handoff](../artifacts/catalog-demos/solar-energy-quality-20261106/README.md)
records the previous round.
The [photo/video studio quality handoff](../artifacts/catalog-demos/photo-video-studio-quality-20261106/README.md)
records the previous round.
The [music quality handoff](../artifacts/catalog-demos/music-quality-20261106/README.md)
records the preceding round.
See the [Apiary quality handoff](../artifacts/catalog-demos/apiary-quality-promotion-20261105/README.md),
[Alpine expedition quality handoff](../artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/README.md),
[archaeology fieldwork quality handoff](../artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/README.md),
[EV charging infrastructure handoff](../artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/README.md),
[beverage bottling line handoff](../artifacts/catalog-demos/beverage-bottling-line-quality-promotion-20261105/README.md),
[data center infrastructure handoff](../artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/README.md),
[wind energy handoff](../artifacts/catalog-demos/wind-energy-quality-promotion-20261105/README.md),
[veterinary clinic handoff](../artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/README.md),
[space exploration handoff](../artifacts/catalog-demos/space-exploration-quality-promotion-20261105/README.md),
and [airfield handoff](../artifacts/catalog-demos/airfield-quality-promotion-20261105/README.md)
for source, preview, index, and verification evidence. These are local catalog
checks and do not represent deployed behavior.

## Office assets

The [office kit](../catalog/kits/office/README.md) retains all 40 existing
stationery, desk accessory, and workstation IDs. Their 120 generic body/accent/
detail controls now name actual materials such as paperboard, polymer, steel,
glass, rubber, timber, cork, and fabric. The 80 appearance entries now expose
`professional` and `classroom` palettes. Feed openings, output lips, shredder
casters, laminator rollers, stepped supports, and the scissors' tapered blades
help the models read as their intended desk objects. All 40 previews were
refreshed and indexed. The [quality handoff](../artifacts/catalog-demos/office-quality-20261106/README.md)
contains the mappings, before/after images, actual preset renders, local checks,
and inspected MP4. These are visualization assets; the local workflow does not
establish deployed behavior, product specifications, or physical acceptance.

## Solar energy assets

The [solar-energy kit](../catalog/kits/solar-energy/README.md) retains 40
existing CC0 props for PV modules, mounting and tracking, power conversion,
storage, and service. The round added 130 material-named controls and 80 named
preset entries, and refreshed all 40 indexed previews. The tilted tracker now
shows eight framed modules with cell divisions; the cleaner robot has visible
idler wheels; the battery container separates paired access panels, vents,
corrugation, and end-mounted cooling housings. The [quality handoff](../artifacts/catalog-demos/solar-energy-quality-20261106/README.md)
contains the per-part material map, source hashes, preview and index checks,
local page evidence, lint and integration results, and the inspected MP4. These
are visualization assets; no electrical performance, installation suitability,
manufacturing suitability, deployed behavior, or hardware acceptance is
claimed.

## Music assets

The [music kit](../catalog/kits/music/README.md) keeps its 40 orchestra, band,
rehearsal and stage props. Each source retains its scale control and has two to
four material-named color controls plus `concert` and `vintage` presets. The
round adds 125 material controls and 80 preset entries; all 40 rendered previews
were refreshed and indexed. Path-extruded bodies clarify the guitar and bowed
string silhouettes, while flared bells, instrument skins, fingerboards, strings
and contrasting keywork separate the main materials. The [quality promotion
handoff](../artifacts/catalog-demos/music-quality-20261106/README.md) includes
before/after previews, actual preset renders, source hashes, local checks and an
inspected MP4. These are visualization assets; no acoustic performance,
instrument certification, manufacturing suitability, deployed behavior or
physical acceptance is claimed.

## Photo/video studio assets

The [photo/video studio kit](../catalog/kits/photo-video-studio/README.md)
retains its 40 existing cameras, lenses, lights, supports and production props.
Each source keeps its scale control and now exposes two to four material-named
color controls with `studioBlack` and `fieldRental` presets. The round adds 125
material controls and 80 named preset entries, and re-renders all 40 previews
before rebuilding the catalog index. Camera bodies separate polymer shells,
rubber grips, metal hardware and optical glass; softboxes, lanterns and
reflectors distinguish fabric or reflective surfaces from their frames and
mounts. The [quality promotion handoff](../artifacts/catalog-demos/photo-video-studio-quality-20261106/README.md)
contains the material map, before/after previews, source-driven preset renders,
local checks and an inspected MP4. The assets are visualization props; checks
do not establish optical performance, lighting output, manufacturing
suitability, deployed behavior or hardware acceptance.

## Airfield assets

The [airfield kit](../catalog/kits/airfield/README.md) keeps its 40 existing
aircraft, apron vehicles and airport fixtures. Each source retains scale and
adds two to four material-named color controls plus `weathered` and
`highVisibility` presets. The promotion adds 142 material controls and 80 named
preset entries; all 40 previews were refreshed and indexed. The airport fire
engine has a red rescue body, a pale crew cab, dark rubber tyres and a stainless
roof ladder; the control tower, hangar and terminal now have clearer color and
silhouette details. The [quality promotion handoff](../artifacts/catalog-demos/airfield-quality-promotion-20261105/README.md)
records the source changes, reviewed previews, regenerated index, local checks
and inspected MP4. These are visualization assets; local checks do not
establish deployed behavior, aviation performance, airworthiness or physical
acceptance.

## Retail store assets

The [retail-store kit](../catalog/kits/retail-store/README.md) retains its 48
checkout, shopping, display, chilled-food and stock-handling fixtures. This
round adds 144 material-named color controls and 96 named preset entries while
keeping all existing IDs. Every asset now passes the material-and-preset gate;
the kit passes 48/48 (100%). All 48 previews were refreshed and indexed. The [quality promotion
handoff](../artifacts/catalog-demos/retail-store-quality-promotion-20261105/README.md)
contains before/after views, source-driven preset renders, local checks and an
inspected MP4. The public asset-library page was checked before this branch's
update; no deployed behavior is claimed.

## Beverage bottling line assets

The [beverage bottling line kit](../catalog/kits/beverage-bottling-line/README.md)
contains 50 original CC0 assets for beverage preparation, bottle handling,
filling, closure, labelling, inspection and case packing. Every existing ID
retains its scale control and now has two to four material-named color controls
plus `sanitaryLine` and `legacyPlant` presets. The 50 sources now expose 137
material-named color controls and 100 preset entries; all 50 rendered previews
are indexed.
The [quality promotion handoff](../artifacts/catalog-demos/beverage-bottling-line-quality-promotion-20261105/README.md)
records the actual source-to-preview workflow, inspected MP4 and local checks.
The models are visualization props and do not assert equipment performance,
food-contact suitability, pressure ratings or physical acceptance.

## EV charging infrastructure assets

The [EV charging infrastructure kit](../catalog/kits/ev-charging-infrastructure/README.md)
keeps its 50 existing IDs for chargers, connectors, cables, cabinets, parking
fixtures, and canopies. Every source retains its scale control and exposes two
to four material-named color controls with `fleetReady` and `nightService`
presets. The kit has 159 material controls, 100 named preset entries (318
material values), and 50 refreshed indexed previews; its exports range from 92
to 492 triangles. The [quality
promotion handoff](../artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/README.md)
contains the source transformation, before/after preview evidence, actual
preset renders, local quality and integration results, and an inspected MP4.
These remain generic visualization assets; the source and catalog checks do
not establish electrical compatibility, charging performance, installation
safety, code compliance, certification, or physical acceptance.

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

The [alpine expedition kit](../catalog/kits/alpine-expedition/README.md) keeps
50 existing scene props for shelters, climbing, snow travel, rescue, and field
equipment. Each retains its scale control and now has two to four
material-named color controls, `stormWorn` / `highVisibility` presets, and a
rendered indexed preview. The promotion adds 143 material controls and 100
preset entries without changing the catalog count. The [quality promotion
handoff](../artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/README.md)
records the source changes, preview review, regenerated index, local checks and
inspected MP4. These are visualization assets; local checks do not establish
deployed behavior or physical acceptance. The [original wave bundle](../artifacts/catalog-demos/alpine-expedition-wave-20261103/README.md)
records the initial source workflow.

## Archaeology fieldwork assets

The [archaeology fieldwork kit](../catalog/kits/archaeology-fieldwork/README.md)
adds 50 original low-poly scene props for survey layout, excavation, screening,
sample handling, field records, and site photography. Each existing ID retains
scale, has two to four material-named color controls, and includes `fieldReady`
and `weathered` presets. The 50 assets use 124 material controls and 100 preset
entries, with a regenerated indexed preview for every ID. The [quality promotion
handoff](../artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/README.md)
records the material mapping, silhouette updates, local checks, and inspected
MP4. The original
[wave demo and verification bundle](../artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/README.md)
records the initial source-to-preview workflow. These are generic scene props;
they do not assert archaeological method approval, instrument calibration,
historical fidelity, deployed behavior, or field acceptance.

## Apiary assets

The [apiary kit](../catalog/kits/apiary/README.md) contains 50 original low-poly
scene props for hive structures, beekeeping tools, feeding, yard fixtures, and
honey handling. All 50 existing IDs now pass the material and preset quality
gate. The 49 promoted sources add 121 material-named controls and 98 named
preset entries; the existing apiary gate retains its three material controls
and two presets. Each ID has two coordinated looks and an indexed preview. The
shade canopy now has a fabric roof and steel corner brackets, hive frames show
a separate wax foundation, and honey handling props distinguish tinted glass,
honey, stainless steel, brass, paper, and polymer. The [quality promotion
handoff](../artifacts/catalog-demos/apiary-quality-promotion-20261105/README.md)
records the material mapping, source changes, preview review, regenerated
index, lint, integration, local-page and package-boundary checks, and inspected
MP4. The [original wave demo and verification bundle](../artifacts/catalog-demos/apiary-wave-20261103/README.md)
preserves initial kit evidence. These are generic visualization props, not
manufacturing drawings or beekeeping guidance. The branch has not been
deployed, so promoted previews are not yet live on the public site.

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
