# Standard Components

Original parametric low-poly components for workshop, industrial, and mechanical scenes. Each asset is a standalone kernelCAD `.kcad.ts` model in millimetres, with its base on Z = 0 and centered X/Y bounds. These generic scene assets are not vendor part-number geometry.

Each model keeps its compact / standard / large size choice and exposes 2–4 independently editable, material-named visual color zones. Named appearance presets provide alternate palettes. Color labels identify visual zones; they do not certify physical material properties.

The Nov 10 useful-parameter pass refines two existing models in place. The
cable gland's nominal 4/6/8 mm cable choice changes the cable and seal opening
while staying fixed across housing sizes; the body bore keeps clearance around
that cable. Its polymer ribs, stainless cap, rubber seal and PVC cable have
separate controls. The square flange's 10/14/18 mm bore choice changes the
actual neck opening while staying fixed across housing sizes, with a rubber
neck seal and four installed zinc-plated socket heads. Both retain
compact/standard/large scaling and named palettes.
Each gains two material controls, raising the kit average from 2.58 to 2.66;
their default meshes are 812/900 and 764/860 triangles. No IDs or kit counts
changed.
The source-driven variants, refreshed kit previews, index evidence and
inspected MP4 are recorded in the [cable-gland and flange handoff](../../../artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/README.md).
These models remain generic scene geometry, not vendor dimensions or fit
verification.

The Nov 9 refinement added geometry choices to five existing assets without
adding IDs: the base plate and both flange models switch between four/eight
mounting holes and open/bolted layouts; the pipe coupling switches between a
bare bore and two visible elastomer seals; the rubber bumper switches between a
male stud and a recessed threaded insert. Each now exposes steel, hardware and
third material controls with a fourth named palette. The selectable hardware
and interfaces are stylized scene geometry, not vendor-standard dimensions.

The Nov 10 follow-up refines three existing models in place: the flange-bearing
housing now separates its cast base, steel race and rubber lip seal; the jaw
coupling has offset drive jaws, a three-lobe elastomer spider and visible set
screws; and the pipe union has a six-flat nut with a visible joint seal. Each
has three material controls and named appearance presets. Their size choices
continue to change the generated envelope. The [source-to-preview handoff](../../../artifacts/catalog-demos/standard-components-coupling-details-20261110/README.md)
records the source variants, refreshed previews, generated index and inspected
MP4. These remain generic low-poly scene models, not vendor-standard geometry.

A second Nov 10 detail pass refines the existing bulkhead adapter, linear guide
rail and shaft coupling. The adapter now shows a six-flat locknut and rubber
sealing washer around its through-bored brass barrel. The guide includes a
position-selectable carriage with four top mounting wells and orange polymer
end wipers. The coupling exposes radial set screws or a split-clamp layout
with crossing bolts. Each now has three material-named color controls; the
existing three named presets remain and now vary all material zones. No IDs or
kits were added. The [guide and retention handoff](../../../artifacts/catalog-demos/standard-components-guide-retention-details-20261110/README.md)
records the source variants, all 50 regenerated previews, rebuilt index,
verification and inspected MP4. These remain generic low-poly visualization
models, not vendor parts or manufacturing specifications.

The [flat joining plate follow-up](../../../artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/README.md)
adds a three/four/five-hole choice to the existing plate. The strap length,
native through-bores and zinc-plated fastener count change together; the 20 mm
pitch and 12 mm edge margin keep the layouts symmetric. Its blue painted-steel
default separates clearly from the silver hardware, while the `brass` palette
remains available. The five-hole variant measures 712 triangles under an
800-triangle budget. No IDs or kits were added.

The Nov 10 pipe-detail follow-up refines three existing parts in place. The pipe
reducer now has a continuous hollow taper, raised collars and a visible seal;
its outlet-ratio choice changes the small end. The retaining ring has pierced
plier ears and a selectable installation gap. The tubular spacer now has a
longer hollow sleeve, chamfered ends, a polymer bore liner, plated rims, and
short/standard/long choices. The reducer and spacer each expose three
material-named controls; all three assets gained an additional named palette.
Their default meshes are 474/620, 228/420, and 432/520 triangles respectively.
The [pipe geometry handoff](../../../artifacts/catalog-demos/standard-components-pipe-geometry-20261110/README.md)
records source-driven options, the regenerated 50 previews and index, checks,
and the inspected MP4. No IDs or kits were added; these generic scene models
are not vendor geometry or manufacturing specifications.

The Nov 10 silhouette pass updates three existing assets in place. The V-belt
pulley now has two V-shaped belt valleys, a keyed bore and a visible locking
screw; the 90-degree elbow uses a hollow swept turn with a bronze compression
nut and an elastomer seal; the shaft collar switches between split-clamp and
radial set-screw retention. The pulley and elbow each gained one material
control, bringing the kit average from **2.54 to 2.58**. Their default meshes
are **518/700**, **1,528/2,000**, and **416/560** triangles. The
[pulley, elbow and collar handoff](../../../artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/README.md)
records source-driven variants, regenerated previews and index, checks, and
the inspected MP4. No IDs or kits were added; these remain generic visualization
models, not vendor specifications or manufacturing evidence.

## Assets

| ID | Component | Description | Color controls | Default triangles | Preview |
| --- | --- | --- | --- | ---: | --- |
| [`angle-bracket`](angle-bracket.kcad.ts) | Angle bracket | Low-poly right-angle mounting bracket with two drilled legs and a reinforcing web. | Steel, Stainless steel | 232 | [PNG](previews/angle-bracket.png) |
| [`base-mounting-plate`](base-mounting-plate.kcad.ts) | Base mounting plate | Square equipment foot plate with a raised locating boss, four- or eight-hole layout and optional socket-head bolts. | Plate steel, Brass boss, Zinc-plated bolts | 264 | [PNG](previews/base-mounting-plate.png) |
| [`beam-coupling`](beam-coupling.kcad.ts) | Beam coupling | Slender beam-style flexible shaft coupling with two end hubs and a slotted center sleeve. | Steel, Aluminum | 428 | [PNG](previews/beam-coupling.png) |
| [`blind-flange`](blind-flange.kcad.ts) | Blind flange | Solid pipe-end closure with raised sealing face, four/eight-hole bolt circle and optional installed bolts. | Cast iron, Bronze face, Zinc-plated bolts | 296 | [PNG](previews/blind-flange.png) |
| [`bulkhead-adapter`](bulkhead-adapter.kcad.ts) | Bulkhead adapter | Hollow through-wall brass barrel with paired stainless flanges, rubber sealing washer and six-flat locknut. | Stainless steel, Brass, Sealing rubber | 456 | [PNG](previews/bulkhead-adapter.png) |
| [`cable-clamp`](cable-clamp.kcad.ts) | Cable clamp | Low-profile cable saddle with two fixing ears and a rounded cable guide. | Steel, Rubber | 132 | [PNG](previews/cable-clamp.png) |
| [`cable-gland`](cable-gland.kcad.ts) | Cable gland | Ribbed polymer gland with selectable cable diameter, stainless compression cap, rubber seal and cable stub. | Polymer, Stainless steel, Rubber, PVC cable | 812 | [PNG](previews/cable-gland.png) |
| [`caster-wheel`](caster-wheel.kcad.ts) | Caster wheel | Single low-poly swivel caster with a fork, mounting plate and centered wheel. | Steel, Zinc-plated steel, Rubber | 200 | [PNG](previews/caster-wheel.png) |
| [`clevis-pin`](clevis-pin.kcad.ts) | Clevis pin | Round headed clevis pin with a straight shank and cross-hole collar. | Steel, Stainless steel | 156 | [PNG](previews/clevis-pin.png) |
| [`din-rail`](din-rail.kcad.ts) | DIN rail | Short symmetric top-hat rail profile with a flat web and raised edge lips. | Steel, Stainless steel, Aluminum | 48 | [PNG](previews/din-rail.png) |
| [`din-rail-end-stop`](din-rail-end-stop.kcad.ts) | DIN rail end stop | Small rail-end stop with a raised clamp block and front-facing tightening boss. | Steel, Zinc-plated steel | 80 | [PNG](previews/din-rail-end-stop.png) |
| [`din-rail-terminal-block`](din-rail-terminal-block.kcad.ts) | DIN rail terminal block | Insulated housing with slotted clamp screws, visible copper cages and an undercut rail clip. | Engineering polymer, Steel, Copper | 444 | [PNG](previews/din-rail-terminal-block.png) |
| [`door-hinge`](door-hinge.kcad.ts) | Door hinge | Upright two-leaf butt hinge with alternating barrel knuckles, a brass pin and visible fasteners. | Steel, Brass, Fasteners | 1440 | [PNG](previews/door-hinge.png) |
| [`drawer-slide-channel`](drawer-slide-channel.kcad.ts) | Drawer slide channel | Nested low-poly slide rails with C-channel lips for a telescoping drawer track. | Steel, Stainless steel | 60 | [PNG](previews/drawer-slide-channel.png) |
| [`flange-bearing-housing`](flange-bearing-housing.kcad.ts) | Flange bearing housing | Two-hole cast-iron flange base with a raised boss, steel race, rubber lip seal and through-bore. | Cast iron, Bearing steel, Seal rubber | 456 | [PNG](previews/flange-bearing-housing.png) |
| [`flat-joining-plate`](flat-joining-plate.kcad.ts) | Flat joining plate | Selectable three/four/five-hole strap with matching through-bores and installed fasteners. | Painted steel, Zinc-plated fasteners | 572 | [PNG](previews/flat-joining-plate.png) |
| [`gusset-bracket`](gusset-bracket.kcad.ts) | Gusset bracket | Triangular shelf-support bracket with a broad wall plate, horizontal toe and solid diagonal web. | Steel, Stainless steel | 32 | [PNG](previews/gusset-bracket.png) |
| [`handle-pull`](handle-pull.kcad.ts) | Handle pull | Raised U-shaped cabinet pull with two mounting feet and a straight grip bar. | Steel, Engineering polymer | 220 | [PNG](previews/handle-pull.png) |
| [`handwheel`](handwheel.kcad.ts) | Handwheel | Three-spoke handwheel with a raised center hub and a clear circular rim. | Steel, Cast iron, Brass | 176 | [PNG](previews/handwheel.png) |
| [`hose-barb-adapter`](hose-barb-adapter.kcad.ts) | Hose barb adapter | Stepped hose-barb adapter with a hollow center and three grip ribs. | Steel, Stainless steel, Brass | 448 | [PNG](previews/hose-barb-adapter.png) |
| [`jaw-coupling`](jaw-coupling.kcad.ts) | Jaw coupling | Offset driving jaws interleave around a three-lobe elastomer spider; front-facing set screws are visible. | Hub steel, Engineering polymer, Set-screw steel | 574 | [PNG](previews/jaw-coupling.png) |
| [`knurled-knob`](knurled-knob.kcad.ts) | Knurled knob | Compact control knob with a broad grip body, raised crown and center stem. | Steel, Aluminum, Engineering polymer | 228 | [PNG](previews/knurled-knob.png) |
| [`leveling-foot`](leveling-foot.kcad.ts) | Leveling foot | Adjustable leveling foot with a wide circular pad and centered support stem. | Steel, Zinc-plated steel, Rubber | 132 | [PNG](previews/leveling-foot.png) |
| [`linear-guide-carriage`](linear-guide-carriage.kcad.ts) | Linear guide carriage | Steel guide carriage with an open underside channel, polymer wiper end plates, four recessed top mounting wells, and a brass grease fitting. | Steel, Engineering polymer, Brass | 408 | [PNG](previews/linear-guide-carriage.png) |
| [`linear-guide-rail`](linear-guide-rail.kcad.ts) | Linear guide rail | Drilled aluminum rail with a steel raceway and position-selectable carriage, top mounting wells and polymer end wipers. | Steel, Aluminum, Polymer end wipers | 540 | [PNG](previews/linear-guide-rail.png) |
| [`panel-clamp`](panel-clamp.kcad.ts) | Panel clamp | Small edge clamp with a broad base, upright jaw and adjustable pressure pad. | Steel, Zinc-plated steel, Rubber | 80 | [PNG](previews/panel-clamp.png) |
| [`piano-hinge`](piano-hinge.kcad.ts) | Piano hinge | Long continuous hinge with two flat leaves, alternating knuckles, and a visible stainless hinge pin. | Steel, Stainless steel | 332 | [PNG](previews/piano-hinge.png) |
| [`pillow-block-housing`](pillow-block-housing.kcad.ts) | Pillow block housing | Raised pillow-block support with a broad base, round bearing boss and two bolt feet. | Zinc-plated steel, Cast iron, Bronze | 132 | [PNG](previews/pillow-block-housing.png) |
| [`pipe-coupling`](pipe-coupling.kcad.ts) | Pipe coupling sleeve | Hollow sleeve with raised end collars and optional elastomer rings at both pipe entries. | Sleeve steel, Stainless collars, Elastomer seals | 480 | [PNG](previews/pipe-coupling.png) |
| [`pipe-elbow-45`](pipe-elbow-45.kcad.ts) | 45 degree pipe elbow | Angled 45 degree pipe connector with open ends and a thicker low-poly center bend. | Steel, Bronze | 236 | [PNG](previews/pipe-elbow-45.png) |
| [`pipe-elbow-90`](pipe-elbow-90.kcad.ts) | 90 degree pipe elbow | Hollow swept 90 degree bend with a bronze compression nut and elastomer end seal. | Steel, Bronze, Elastomer | 1528 | [PNG](previews/pipe-elbow-90.png) |
| [`pipe-flange`](pipe-flange.kcad.ts) | Pipe flange | Slip-on flange with a hollow raised neck, four/eight-hole bolt circle and optional installed bolts. | Stainless neck, Cast-iron flange, Zinc-plated bolts | 400 | [PNG](previews/pipe-flange.png) |
| [`pipe-reducer`](pipe-reducer.kcad.ts) | Pipe reducer | Concentric hollow reducer with a tapered barrel, raised end collars, a visible seal, and selectable outlet ratio. | Painted steel, Zinc-plated steel, Elastomer | 474 | [PNG](previews/pipe-reducer.png) |
| [`pipe-saddle-clamp`](pipe-saddle-clamp.kcad.ts) | Pipe saddle clamp | Two-piece saddle clamp with a curved seat, twin side lugs and a mounting foot. | Steel, Rubber | 132 | [PNG](previews/pipe-saddle-clamp.png) |
| [`pipe-tee`](pipe-tee.kcad.ts) | Pipe tee fitting | Three-way T pipe fitting with a vertical run and perpendicular side branch. | Steel, Bronze | 192 | [PNG](previews/pipe-tee.png) |
| [`pipe-union`](pipe-union.kcad.ts) | Pipe union | Straight-through fitting with hollow steel sockets, six-flat brass nut and visible rubber joint seal. | Steel, Brass, Seal rubber | 360 | [PNG](previews/pipe-union.png) |
| [`retaining-ring`](retaining-ring.kcad.ts) | Retaining ring | Open circlip with pierced plier ears and a selectable installation gap. | Spring steel, Stainless ear finish | 228 | [PNG](previews/retaining-ring.png) |
| [`rubber-bumper`](rubber-bumper.kcad.ts) | Rubber bumper | Stepped vibration isolator with a broad foot and selectable male stud or recessed threaded insert. | Rubber, Stud steel, Zinc-plated hardware | 332 | [PNG](previews/rubber-bumper.png) |
| [`shaft-collar`](shaft-collar.kcad.ts) | Shaft collar | Bored collar with selectable split-clamp/cross-bolt or radial set-screw retention. | Steel, Zinc-plated fasteners | 416 | [PNG](previews/shaft-collar.png) |
| [`shaft-coupling`](shaft-coupling.kcad.ts) | Shaft coupling sleeve | Two through-bored steel hubs around a bronze center band, with selectable set-screw or split-clamp retention. | Steel, Bronze, Zinc-plated set screws | 536 | [PNG](previews/shaft-coupling.png) |
| [`shim-pack`](shim-pack.kcad.ts) | Shim pack | Stack of thin rectangular alignment shims with small offset pull tabs. | Steel, Stainless steel, Brass | 60 | [PNG](previews/shim-pack.png) |
| [`split-shaft-collar`](split-shaft-collar.kcad.ts) | Split shaft collar | Split clamp collar with a through bore and a raised clamp lug. | Steel, Zinc-plated steel | 112 | [PNG](previews/split-shaft-collar.png) |
| [`square-mounting-flange`](square-mounting-flange.kcad.ts) | Square mounting flange | Four-hole cast flange with selectable through-bore, stainless neck, rubber seal and installed socket heads. | Cast iron, Stainless steel, Rubber, Zinc-plated steel | 764 | [PNG](previews/square-mounting-flange.png) |
| [`t-slot-angle-bracket`](t-slot-angle-bracket.kcad.ts) | T-slot angle bracket | Compact external corner bracket for joining two perpendicular framing profiles. | Steel, Aluminum | 40 | [PNG](previews/t-slot-angle-bracket.png) |
| [`t-slot-end-cap`](t-slot-end-cap.kcad.ts) | T-slot end cap | Polymer end cap with locating ribs seated in a short grooved aluminum extrusion profile. | Aluminum, Engineering polymer | 156 | [PNG](previews/t-slot-end-cap.png) |
| [`timing-belt-pulley`](timing-belt-pulley.kcad.ts) | Timing belt pulley | Twenty-tooth crown with paired bolted retaining flanges and a keyed shaft bore. | Aluminum, Steel, Flange hardware | 1236 | [PNG](previews/timing-belt-pulley.png) |
| [`tube-clamp`](tube-clamp.kcad.ts) | Tube clamp | Two-hole clamp with a semicircular lined saddle, paired side cheeks, and a raised retainer bridge. | Steel, Zinc-plated steel, Rubber | 164 | [PNG](previews/tube-clamp.png) |
| [`tubular-spacer`](tubular-spacer.kcad.ts) | Tubular spacer | Hollow sleeve with polymer bore liner, chamfered ends, plated rims, and selectable length. | Steel, Engineering polymer, Zinc-plated steel | 432 | [PNG](previews/tubular-spacer.png) |
| [`u-bracket`](u-bracket.kcad.ts) | U bracket | Open-top channel mounting bracket with a flat back and two parallel side ears. | Steel, Stainless steel | 80 | [PNG](previews/u-bracket.png) |
| [`v-belt-pulley`](v-belt-pulley.kcad.ts) | V-belt pulley | Two V-shaped belt valleys, paired retaining flanges, keyed bore and locking screw. | Cast iron, Steel key, Zinc-plated hardware | 518 | [PNG](previews/v-belt-pulley.png) |

## Validate and preview

From the repository root:

```sh
bash catalog/kits/standard-components/demo/validate-assets.sh
python3 scripts/checkCatalogQuality.py --kit standard-components
npx eslint catalog/kits/standard-components/
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
```

To render just this kit, pass the `previewAssetIDs` list from [`demo/settings.json`](demo/settings.json) to `npx tsx scripts/renderCatalogPreviews.ts`, then rebuild the index so each row records its preview path.

## Quality promotion handoff

The [quality promotion handoff](QUALITY-PROMOTION.md) links the original kit promotion, the [2026-11-06 carriage detail follow-up](../../../artifacts/catalog-demos/standard-components-carriage-quality-20261106/README.md), the [2026-11-06 pulley, hinge and terminal-block detail follow-up](../../../artifacts/catalog-demos/standard-components-visible-details-20261106/README.md), the [2026-11-09 installation-variant follow-up](../../../artifacts/catalog-demos/standard-components-installation-quality-20261109/README.md), the [2026-11-10 coupling and bearing detail follow-up](../../../artifacts/catalog-demos/standard-components-coupling-details-20261110/README.md), the [2026-11-10 guide and retention detail follow-up](../../../artifacts/catalog-demos/standard-components-guide-retention-details-20261110/README.md), the [2026-11-10 selectable hole-pattern follow-up](../../../artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/README.md), and the [2026-11-10 pulley, elbow and collar silhouette follow-up](../../../artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/README.md). The original kit demo source and settings are in [`demo/`](demo/).

## Licence

Every source in this kit is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/). The catalog metadata sets `license: "CC0-1.0"` on each asset.

## Provenance

All geometry is original kernelCAD source. No downloaded, traced, converted, or decimated meshes, textures, or palettes are used.
