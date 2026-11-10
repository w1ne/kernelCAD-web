# Catalog assets

Reusable catalog sources live in `catalog/kits/<kit>/`. Each `.kcad.ts` file
declares its metadata and parameter knobs; `catalog/index.json` is generated
from those sources and must be rebuilt in the same change.

## Catalog quality snapshot (2026-11-09)

The current catalog quality gate reports **2,402/2,402 assets passing
(100.00%) across 50 rich kits**, with no failing assets. The recycling-facility
kit contains 153 assets, all passing; all 153 have kit-local rendered previews
and matching source hashes in the generated index. This is a local branch
snapshot, not a deployment or hardware-acceptance claim.

The Nov 10 water-treatment follow-up refines the existing `backwash-pump-skid`
in place. Its preview now shows end-suction pump casings, finned motors,
separate suction and discharge headers, isolation valves, gauges, coupling
guards, and a local control panel. The `pumpArrangement` choice changes between
single and duplex layouts; coated pump steel, structural steel, stainless
pipework, and rubber details have separate controls with `weathered` and
`highVisibility` palettes. The default export is 2,648 triangles under its
3,600-triangle budget. No IDs or kits were added: water-treatment remains
50/50 passing and the catalog remains 2,402/2,402 passing (100%). The
[backwash pump skid handoff](../artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/README.md)
contains the single/duplex renders, regenerated index evidence, local page
review, lint and integration output, and inspected MP4. This branch is not
deployed; these are generic visualization models and make no treatment or
physical-acceptance claim.

The Nov 9 space-exploration refinement keeps all 52 existing IDs and deepens
the component materials on 36 assets. Every asset retains two to four
material-specific controls and the `lunarDust` / `highVisibility` presets; the
wheel assembly stays at two controls because its aluminum hub and rubber tire
are its distinct materials. The instrument arm now connects its rotating base,
links, pivots and gripper, and the oxygen rack has separate brass valve
fittings. The global quality gate remains **2,402/2,402 passing (100.00%)**.
This branch is not deployed; the [local space-exploration handoff](../artifacts/catalog-demos/space-exploration-materials-20261109/README.md)
records generated previews, source hashes, checks and the inspected MP4.

The Nov 9 standard-components follow-up refined five existing models: the base
mounting plate, blind flange, pipe coupling, pipe flange and rubber bumper. It
added five material-named color controls and five named palette variants, plus
real choices for mounting-hole count, installed hardware, bore seals and bumper
mounting interface. The kit remains **50/50 passing**; its average material
controls rose from 2.28 to 2.38 per asset. The global quality result remains
**2,402/2,402 passing (100.00%; 50 rich kits, 0 thin kits)**. No IDs or kits
were added. The [local source, preview, index and demo handoff](../artifacts/catalog-demos/standard-components-installation-quality-20261109/README.md)
records the regenerated previews, variants, checks and inspected MP4. This
branch has not been deployed; no manufacturing or physical acceptance is
claimed.

The Nov 9 construction-equipment silhouette follow-up rebuilt four existing
machine assets in place: walk-behind power trowel, vibrating concrete screed,
rebar bending machine, and portable material hoist. Their material controls and
named presets now describe the component finishes, and selectable sizes or
layouts change the actual geometry. The kit still has 60 assets; the global
quality gate remains **2,402/2,402 (100.00%; 50 rich kits, 0 thin kits)**. The
[construction-equipment handoff](../artifacts/catalog-demos/construction-equipment-machines-20261109/README.md)
records the source variants, rebuilt previews and index, checks and inspected
MP4. This remains local branch evidence and is not a deployment or physical
acceptance claim.

The Nov 9 garden follow-up refined the existing `compost-bin` in place. Its
`frontAccess` choice now builds open, lower-access, and closed removable-slat
fronts; the exposed compost is a rounded, independently colored mound, with
treated-timber and compost controls plus three named palettes. The default
preview is 296 triangles under its unchanged 420-triangle budget. The garden
kit remains **40/40 passing**, and the global gate remains **2,402/2,402
(100.00%) across 50 rich kits**. The [compost-bin handoff](../artifacts/catalog-demos/garden-compost-bin-quality-20261109/README.md)
records source-driven variants, preview/index hashes, local checks and an
inspected MP4. This is local branch evidence; the change is not deployed and
does not establish product fit or physical acceptance.

The Nov 9 industrial-plant follow-up refines three existing machine assets:
the generator now has a louver-count choice and visible radiator/service
details; the conveyor has separate rubber belt and roller materials, connected
support legs, a drive motor and a support-station choice; and the transformer
has adjustable fin banks with ribbed porcelain bushings and copper terminals.
The kit remains **60/60 passing** and the global gate remains
**2,402/2,402 passing (100.00%; 50 rich kits, 0 thin kits)**. The
[machine-detail handoff](../artifacts/catalog-demos/industrial-plant-machine-quality-20261109/README.md)
contains before/after previews, source-driven variants, local checks and the
inspected MP4. The branch is not deployed; this visual work does not verify
equipment ratings, safety, process performance or physical acceptance.

The Nov 6 construction-equipment visual follow-up refined three existing
assets whose previews still read as stacked primitives. The towable tower now
has a wheeled generator trailer, four screw jacks, a telescoping mast and a
selectable lamp bank; the ride-on trowel separates its two open blade guards,
engine, seat and paired controls; the batch plant shows its aggregate hoppers,
feed conveyor, mixer and framed silo. Each asset retains two named palettes,
adds four material controls and has two real shape choices beyond scale. The
[construction-equipment silhouette handoff](../artifacts/catalog-demos/construction-equipment-silhouette-20261106/README.md)
records source-driven variants, regenerated previews and index, local checks
and the inspected MP4. It added no asset IDs. This branch is not deployed, so
no live-site or equipment-acceptance claim is made.
repaired the existing `office/scissors` default view by adding two polymer
handle tangs between the finger loops and brass pivot. Its stainless-steel,
polymer, and brass controls and `professional` / `classroom` presets remain;
the model is 316 triangles under its 360-triangle budget. The [scissors
detail handoff](../artifacts/catalog-demos/office-scissors-detail-20261106/README.md)
records the before/after preview, preset variants, rebuilt index, generated
local page checks and inspected MP4. The branch is not deployed; no live-site or
physical acceptance is claimed. The preceding `standard-components` visual
follow-up refined three existing defaults whose previews still read
as primitives: the timing pulley now has a radial tooth crown, flange bolts
and a keyed bore; the hinge now has upright leaves with alternating knuckles
and visible mounting hardware; and the terminal block now shows copper cages,
slotted screws and an undercut clip foot. Their three new material controls
extend the existing named presets. No asset IDs or kits were added. The
[pulley, hinge and terminal-block handoff](../artifacts/catalog-demos/standard-components-visible-details-20261106/README.md)
records the source-driven previews, presets, local checks and inspected MP4.
The preceding round refined the existing recycling-facility `horizontal-baler`:
its open press mouth now exposes
the ram, hydraulic drive, rubber discharge belt and strapped cardboard bale,
with four material controls and the existing two named palettes. Its refreshed
preview shows 676 triangles under the unchanged 1,800-triangle budget. The
[baler refinement handoff](../artifacts/catalog-demos/recycling-facility-baler-quality-20261106/README.md)
contains the source-driven before/after demo, preview, index, local checks and
inspected MP4. The kit and asset counts remain unchanged. The preceding round
refined the
existing 40-asset `medical` kit: generic shell/accent controls now name actual
materials, the palette grew from 80 generic controls to 132 material controls
(3.30 per asset), and five existing forms gained visible object details. The
[medical material handoff](../artifacts/catalog-demos/medical-materials-quality-20261106/README.md)
contains the per-asset map, before/after previews, exact preset renders, source
hashes, local checks and inspected MP4. The pass count remains 2,390/2,390
(100.00%); this round adds no assets. The preceding round brought `props` from
44/45 to 45/45 by exposing woven canvas, alternate canvas and stitching thread
as material controls on the sandbags and adding visible closure seams. The
[sandbags quality handoff](../artifacts/catalog-demos/props-sandbags-quality-20261106/README.md)
records the source controls, refreshed previews, regenerated index, local page,
checks and inspected MP4. The preceding round brought `nature` from 63/66 to
66/66 by making the cairn and pebble cluster's existing stone-color controls
explicit to the gate and adding contrasting heartwood to the dead tree's broken
branch ends. The [nature
quality handoff](../artifacts/catalog-demos/nature-quality-20261106/README.md)
records the source controls, refreshed previews, regenerated index, local
pages, checks, and inspected MP4. The previous [city-street quality
handoff](../artifacts/catalog-demos/city-street-quality-20261106/README.md)
records its material controls, named looks, rendered previews, regenerated
index, local pages, checks, and inspected MP4. The previous [office quality
handoff](../artifacts/catalog-demos/office-quality-20261106/README.md)
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

## Props assets

The [props kit](../catalog/kits/props/README.md) retains all 45 existing
scene assets. The sandbag wall now exposes independent woven-canvas,
alternate-canvas and stitching-thread colors; the existing `military` and
`white` presets remain, and a `floodControl` palette was added. Two closure
seams per bag clarify its pillowed silhouette without changing the staggered
courses or straight/curved layout choice. Its default export is 748 triangles
under a 900-triangle budget. All 45 props previews were refreshed and indexed.
The [sandbags quality handoff](../artifacts/catalog-demos/props-sandbags-quality-20261106/README.md)
contains source-driven preset renders, source hashes, local page checks, lint,
integration results and an inspected MP4. These are low-poly visualization
assets; local checks do not establish flood performance, deployment or physical
acceptance.

## Medical assets

The [medical kit](../catalog/kits/medical/README.md) retains its 40 clinic,
hospital, first-aid and laboratory props. Generic `shell` and `accent`
controls were replaced with two to four material-named controls per asset;
the 132 controls now describe real model zones such as stainless steel,
polymer, glass, upholstery, rubber, paper and cotton gauze. The clinic and
emergency presets now set those materials independently. Existing choice
controls remain available on the hospital bed, medical cart and specimen rack.
The Erlenmeyer flask now has a tapered loft, visible liquid-level panel and
graduation marks; the Petri dish and specimen cup gain sample details, the
pulse oximeter has interior finger pads, and the syringe has a separate
plunger seal. All 40 previews were rerendered and indexed. The [quality
handoff](../artifacts/catalog-demos/medical-materials-quality-20261106/README.md)
contains source-driven preset renders, before/after previews, local page checks,
lint and integration output, and the inspected MP4. These remain stylized
visualization props; local checks do not establish clinical device accuracy,
manufacturing suitability, deployed behavior or physical acceptance.

## City-street assets

The [city-street kit](../catalog/kits/city-street/README.md) keeps its 65
existing road, sidewalk, street-furniture, vehicle, and playground assets. The
four audited pavement and playground sources now expose 13 explicit
material-named controls across asphalt, road-marking paint, concrete, paving
stone, brick, galvanized steel, HDPE, stainless steel, and roof polyethylene;
their eight named appearance presets remain available as distinct looks. The
crosswalk and road tiles expose their flush markings, the sidewalk keeps its
raised road-side kerb and paving grid, and the slide retains its guarded tower,
ladder, roof, and trough chute. All four previews were regenerated and indexed.
The [quality handoff](../artifacts/catalog-demos/city-street-quality-20261106/README.md)
contains source-to-preset renders, source hashes, preview and index evidence,
local page checks, lint and integration results, and an inspected MP4. These
are visualization assets; local checks do not establish deployed behavior,
traffic compliance, manufacturing suitability, or physical acceptance.

## Nature assets

The [nature kit](../catalog/kits/nature/README.md) retains all 66 existing
environmental assets. The cairn and pebble cluster already assigned distinct
stone and accent colors across their faceted lofts; this round renamed those
two parameter keys to `stoneColor` and `accentColor` so the material knobs are
clear in Studio and the quality audit. The dead tree adds a `heartwood` control
on the cut ends of its forked trunk and primary limbs, with charred and bleached
presets updated for both bark and exposed wood. The 66 nature previews were
refreshed and the index regenerated. The [quality handoff](../artifacts/catalog-demos/nature-quality-20261106/README.md)
contains exact preset exports, source hashes, local-page checks, lint and
integration results, and the inspected MP4. These are visualization assets;
the local workflow does not establish deployed behavior or physical acceptance.

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

The 2026-11-09 detail refinement updates two existing models in place: the
greenhouse tunnel now exposes hoop steel, film, timber and crop colors plus
rolled/closed side curtains; the wall CO2 transmitter exposes housing, trim,
display and cable colors plus LCD/blind variants. The [detail-refinement
handoff](../artifacts/catalog-demos/hydroponics-detail-refinement-20261109/README.md)
records the refreshed kit previews, rebuilt index, preset/choice renders, local
checks and inspected MP4. No new catalog IDs were added.

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
[horizontal baler refinement handoff](../artifacts/catalog-demos/recycling-facility-baler-quality-20261106/README.md)
records a clearer open-mouth press silhouette, ram, hydraulic drive, rubber
discharge belt, strapped bale, refreshed preview, and regenerated index. The
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

## Water-treatment pump silhouettes

The existing `high-lift-pump-skid`, `horizontal-split-case-pump` and
`reverse-osmosis-skid` now show their machine-specific forms: scroll casings,
flanged pump ports, finned motors, horizontal membrane vessels, end manifolds,
support saddles and a control cabinet. Pump capacity and casing size, or the
membrane vessel count, change the model geometry. Existing material-named
controls and weathered/high-visibility presets remain available. The three
previews were regenerated and the catalog index rebuilt. The water-treatment
kit passes **50/50** the material-and-preset quality gate; the full catalog
passes **2,390/2,390 (100.00%)**. The [geometry follow-up bundle](../artifacts/catalog-demos/water-treatment-pump-geometry-20261106/README.md)
contains source snapshots, before/after and parameter-variant renders, local
page checks, lint/integration output and the inspected MP4. These remain
stylized visualization props; they do not establish process performance,
pressure ratings, installation suitability, deployment or physical acceptance.
