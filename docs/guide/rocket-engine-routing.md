---
title: Routing 23 lines on a rocket-engine example
summary: Follow named ports, authored bends and service clearances through a full assembly, then reproduce an igniter-line collision and repair it.
date: 2026-10-12
kind: use-case
status: published
model: examples/rocket-engine-lines/engine-routed.kcad.ts
video: docs/demos/rocket-engine-routing/demo.mp4
modelCompression: meshopt
---

An engine assembly makes the routing problem visible: large propellant feeds share space with a hot-gas duct, actuator circuits, two igniter feeds and small pneumatic services. This generic gas-generator engine example connects those services with 23 hollow rigid tubes. Each route is authored in the source; the kernel builds the bends, reports the cut lengths and checks the declared clearances.
<!-- check: tubes.lines.length = 23 -->

[Open the full editable example in public Studio](https://app.kernelcad.com/studio?gallery=rocket-engine-routing), [download the working source](/blog/rocket-engine-routing/engine-routed.kcad.ts), or start with [the smaller five-line tube guide](/blog/tubes-how-to/). The silent 45-second video above follows the fluid services in close-up, then orbits the complete native model. [Download the film separately](/blog/rocket-engine-routing/video.mp4).

## What is connected

The 5 systems contain 4 LOX lines, 9 fuel lines, 2 hot-gas lines, 2 igniter lines and 6 pneumatic lines. Fuel includes four actuator supply/return runs as well as the main and gas-generator feeds. Pneumatic services include the helium feed, three valve pilots and two purges.
<!-- check: tubes.systems.length = 5 -->
<!-- check: tubes.systems[system=lox].lines = 4 -->
<!-- check: tubes.systems[system=fuel].lines = 9 -->
<!-- check: tubes.systems[system=hot-gas].lines = 2 -->
<!-- check: tubes.systems[system=igniter].lines = 2 -->
<!-- check: tubes.systems[system=pneumatic].lines = 6 -->

There are 46 named ports. Of these, 45 are used once; the turbine outlet directly meets the exhaust collar as a bolted interface, so the model has no zero-length tube there. The collar's outlet starts the exhaust duct, which ends at an explicitly authored free aft outlet beside the bell. The downloadable STEP keeps 19 hardware parts and 23 tubes as 42 separate connected B-rep solids. The complete source records 441 features.
<!-- check: ports.length = 46 -->
<!-- check: featureCount = 441 -->

The hardware is generic authored display geometry. The bell, valve bodies, bosses and supports make the route interfaces visible; they are not catalog components or certified engine hardware.

## Name the port and keep its frame explicit

The engine axis is Z. Forward, toward the vehicle, is +Z; aft, toward the nozzle exit, is -Z. The throat plane is Z = 0 and the turbopump side is +X. Tube OD and fluid system live on each named axis connector. Its origin is in the part's own frame, while the part's `at` places it in assembly space.

The cartridge has separate outlets for the chamber and the gas generator. The full source's connector declarations are:

```ts
const cartridge = asm.part('igniter-cartridge', cartridgeShape(), { at: [CARTRIDGE_XY[0], CARTRIDGE_XY[1], cartridgeStation] })
  .connector('out-chamber', axisPort([-16, 0, 178], [0, 0, 1], 'igniter', OD_IGNITER))
  .connector('out-gg', axisPort([16, 0, 178], [0, 0, 1], 'igniter', OD_IGNITER));
```
<!-- check: source contains block -->

At the default cartridge station, `out-chamber` is [159, -330, 368] and `out-gg` is [191, -330, 368]. Both point along [0, 0, 1], so each route starts along +Z. The report lists these positions in assembly space; the tube resolves the named port rather than copying a coordinate into its end.
<!-- check: ports[part=igniter-cartridge,name=out-chamber].origin = [159, -330, 368] -->
<!-- check: ports[part=igniter-cartridge,name=out-gg].origin = [191, -330, 368] -->
<!-- check: ports[part=igniter-cartridge,name=out-chamber].axis = [0, 0, 1] -->
<!-- check: ports[part=igniter-cartridge,name=out-gg].axis = [0, 0, 1] -->

## Author the route points and bend radius

`tube()` connects its resolved ends through the supplied `via` points. It rounds the corners at the selected centreline radius. It does not search for a route or add corners. The first and last legs must follow the port axes. The local `line()` helper calls `tube()` and adds the resulting hollow shape to the assembly without another placement transform; its route already uses assembly coordinates.

This is the complete routing call for the generator igniter line. Its intermediate points follow cartridge elevation and pump station through explicit expressions:

```ts
line('igniter-generator', 'igniter', cartridge.port('out-gg'), gasGenerator.port('igniter'), [
  [191, -330, cartridgeStation.add(igniterRunRise)], [191, -590, cartridgeStation.add(igniterRunRise)],
  [pumpOffset.add(150), -590, cartridgeStation.add(igniterRunRise)],
  [pumpOffset.add(150), -590, pumpStation.subtract(215)],
], 0.71, 20);
```
<!-- check: source contains block -->

The wall is 0.71 mm, the centreline bend radius is 20 mm, and the report contains 4 bends with a cut length of 1195.66 mm. A cut length follows the rounded centreline, including its arc lengths; it is not the sum of the unrounded corner-to-corner distances.
<!-- check: tubes.lines[name=igniter-generator].wall = 0.71 -->
<!-- check: tubes.lines[name=igniter-generator].bendRadius = 20 -->
<!-- check: tubes.lines[name=igniter-generator].bends = 4 -->
<!-- check: tubes.lines[name=igniter-generator].cutLength = 1195.66 -->

## Set service rules, then evaluate

The example sets 6 mm default surface clearance, including same-system lines and ordinary housings. LOX and fuel lines require 12 mm separation. Hot-gas lines require 25 mm separation from the other four fluid systems. That pair rule does not impose 25 mm on every housing. The source declares:

```ts
tubeSpec({
  minBendRadiusFactor: 3, minStraightBetweenBends: 2, minStraightAtEnd: 2.5,
  systems: {
    lox: { minBendRadiusFactor: 3 }, fuel: { minBendRadiusFactor: 3 },
    'hot-gas': { minBendRadiusFactor: 1.5, minStraightAtEnd: 1 },
    igniter: { minBendRadiusFactor: 3 }, pneumatic: { minBendRadiusFactor: 3 },
  },
  clearance: { default: 6, pairs: [
    { a: 'lox', b: 'fuel', min: 12 },
    { a: 'hot-gas', b: 'lox', min: 25 },
    { a: 'hot-gas', b: 'fuel', min: 25 },
    { a: 'hot-gas', b: 'igniter', min: 25 },
    { a: 'hot-gas', b: 'pneumatic', min: 25 },
  ] },
});
```
<!-- check: source contains block -->

For cold lines, the minimum bend radius is 3 OD, the straight between bends is 2 OD, and each end straight is 2.5 OD. Hot-gas ducts use 1.5 OD radius and 1 OD end straights; the between-bend rule remains 2 OD. A direct unbent straight has no bend tangencies to accommodate and is exempt from these bend-related straight minima. Several short aligned main feeds therefore remain legitimate straight links in this illustrative rule set.

The working native report says `ok: true`. It has no error or warning diagnostics, and retains one informational `authoring.prefer-api.hole-by-cylinder` diagnostic about the hardware's hole authoring. The separate assembly structural review retains 42 `assembly.part.floating` warnings: every part is placed by authored `at` values, with no mates. Passing tube rules does not remove that structural limitation.
<!-- check: ok = true -->
<!-- check: diagnostics[severity=info].code = authoring.prefer-api.hole-by-cylinder -->

## Make one crossing, then repair it

[The broken twin](/blog/rocket-engine-routing/engine-routed-twin.kcad.ts) changes only `IgniterRunRise` from 268 to 308 mm. This raises the generator igniter run into the pneumatic valve pilot line. Its parameter declaration is:

```ts
const igniterRunRise = param('IgniterRunRise', 308, { unit: 'mm', description: 'igniter generator run elevation above cartridge base; 308 deliberately crosses a pilot line' });
```
<!-- check examples/rocket-engine-lines/engine-routed-twin.kcad.ts: source contains block -->

The broken report says `ok: false`. It contains one error, `tube.clearance.overlap`, plus the same informational hole-authoring diagnostic. The actual error is:
<!-- check examples/rocket-engine-lines/engine-routed-twin.kcad.ts: ok = false -->
<!-- check examples/rocket-engine-lines/engine-routed-twin.kcad.ts: diagnostics[severity=error].code = tube.clearance.overlap -->

```text
tube.clearance.overlap: tube 'igniter-generator' passes through 'pneumatic-gg-valve' (14.09 mm^3 shared).
```
<!-- check examples/rocket-engine-lines/engine-routed-twin.kcad.ts: diagnostics[code=tube.clearance.overlap].message = block -->

Restore `IgniterRunRise` to 268 mm, as in the working download, and evaluate again. This is the repaired declaration:

```ts
const igniterRunRise = param('IgniterRunRise', 268, { unit: 'mm', description: 'igniter generator run elevation above cartridge base; 308 deliberately crosses a pilot line' });
```
<!-- check: source contains block -->

You can also change `CartridgeStation` from 190 to 180 mm in the working source. Both cartridge outlets and the dependent route points follow that parameter. The verified moved-case report gives outlet positions [159, -330, 358] and [191, -330, 358], still along +Z, and the tube check remains passing. [Download that evaluation report](/blog/rocket-engine-routing/cartridge-180.report.json). This demonstrates the authored parameter dependency; it does not promise that arbitrary parameter edits will stay clear.

## Full line inventory

All dimensions below are mm. OD is the outer diameter, wall is the nominal wall thickness, radius is the centreline bend radius, and cut is the rounded centreline length. Zero bends means a direct straight; the configured radius still appears in its report. Each row has a matching CSV below.

```text
Line                       System      OD      Wall  Radius Bends Cut mm
lox-pump-main              lox         114.3   1.65  343    0     65.00
lox-main-dome              lox         114.3   1.65  343    0     80.00
lox-pump-gg                lox         25.4    1.24  80     0     80.00
lox-gg-generator           lox         25.4    1.24  80     0     345.00
fuel-pump-main             fuel        88.9    1.65  270    0     70.00
fuel-main-manifold         fuel        88.9    1.65  270    0     1170.00
fuel-coolant-dome          fuel        88.9    1.65  270    0     72.00
fuel-pump-gg               fuel        19.05   1.24  60     0     80.00
fuel-gg-generator          fuel        19.05   1.24  60     0     85.00
fuel-act1-supply           fuel        12.7    0.89  40     3     860.35
fuel-act1-return           fuel        12.7    0.89  40     3     740.73
fuel-act2-supply           fuel        12.7    0.89  40     3     2104.35
fuel-act2-return           fuel        12.7    0.89  40     3     1864.73
hotgas-generator-turbine   hot-gas     101.6   1.65  155    0     65.00
hotgas-exhaust             hot-gas     203.2   2     305    1     1227.83
igniter-chamber            igniter     6.35    0.71  20     3     318.43
igniter-generator          igniter     6.35    0.71  20     4     1195.66
pneumatic-helium-block     pneumatic   9.525   0.89  30     4     861.50
pneumatic-main-lox         pneumatic   6.35    0.71  20     4     1178.66
pneumatic-main-fuel        pneumatic   6.35    0.71  20     5     3224.08
pneumatic-gg-valve         pneumatic   6.35    0.71  20     5     1570.08
pneumatic-purge-dome       pneumatic   6.35    0.71  20     5     715.97
pneumatic-purge-generator  pneumatic   6.35    0.71  20     5     2220.08
```
<!-- check: tubes.lines[name=lox-pump-main].od = 114.3 -->
<!-- check: tubes.lines[name=lox-pump-main].wall = 1.65 -->
<!-- check: tubes.lines[name=lox-pump-main].bendRadius = 343 -->
<!-- check: tubes.lines[name=lox-pump-main].bends = 0 -->
<!-- check: tubes.lines[name=lox-pump-main].cutLength = 65.00 -->
<!-- check: tubes.lines[name=lox-main-dome].od = 114.3 -->
<!-- check: tubes.lines[name=lox-main-dome].wall = 1.65 -->
<!-- check: tubes.lines[name=lox-main-dome].bendRadius = 343 -->
<!-- check: tubes.lines[name=lox-main-dome].bends = 0 -->
<!-- check: tubes.lines[name=lox-main-dome].cutLength = 80.00 -->
<!-- check: tubes.lines[name=lox-pump-gg].od = 25.4 -->
<!-- check: tubes.lines[name=lox-pump-gg].wall = 1.24 -->
<!-- check: tubes.lines[name=lox-pump-gg].bendRadius = 80 -->
<!-- check: tubes.lines[name=lox-pump-gg].bends = 0 -->
<!-- check: tubes.lines[name=lox-pump-gg].cutLength = 80.00 -->
<!-- check: tubes.lines[name=lox-gg-generator].od = 25.4 -->
<!-- check: tubes.lines[name=lox-gg-generator].wall = 1.24 -->
<!-- check: tubes.lines[name=lox-gg-generator].bendRadius = 80 -->
<!-- check: tubes.lines[name=lox-gg-generator].bends = 0 -->
<!-- check: tubes.lines[name=lox-gg-generator].cutLength = 345.00 -->
<!-- check: tubes.lines[name=fuel-pump-main].od = 88.9 -->
<!-- check: tubes.lines[name=fuel-pump-main].wall = 1.65 -->
<!-- check: tubes.lines[name=fuel-pump-main].bendRadius = 270 -->
<!-- check: tubes.lines[name=fuel-pump-main].bends = 0 -->
<!-- check: tubes.lines[name=fuel-pump-main].cutLength = 70.00 -->
<!-- check: tubes.lines[name=fuel-main-manifold].od = 88.9 -->
<!-- check: tubes.lines[name=fuel-main-manifold].wall = 1.65 -->
<!-- check: tubes.lines[name=fuel-main-manifold].bendRadius = 270 -->
<!-- check: tubes.lines[name=fuel-main-manifold].bends = 0 -->
<!-- check: tubes.lines[name=fuel-main-manifold].cutLength = 1170.00 -->
<!-- check: tubes.lines[name=fuel-coolant-dome].od = 88.9 -->
<!-- check: tubes.lines[name=fuel-coolant-dome].wall = 1.65 -->
<!-- check: tubes.lines[name=fuel-coolant-dome].bendRadius = 270 -->
<!-- check: tubes.lines[name=fuel-coolant-dome].bends = 0 -->
<!-- check: tubes.lines[name=fuel-coolant-dome].cutLength = 72.00 -->
<!-- check: tubes.lines[name=fuel-pump-gg].od = 19.05 -->
<!-- check: tubes.lines[name=fuel-pump-gg].wall = 1.24 -->
<!-- check: tubes.lines[name=fuel-pump-gg].bendRadius = 60 -->
<!-- check: tubes.lines[name=fuel-pump-gg].bends = 0 -->
<!-- check: tubes.lines[name=fuel-pump-gg].cutLength = 80.00 -->
<!-- check: tubes.lines[name=fuel-gg-generator].od = 19.05 -->
<!-- check: tubes.lines[name=fuel-gg-generator].wall = 1.24 -->
<!-- check: tubes.lines[name=fuel-gg-generator].bendRadius = 60 -->
<!-- check: tubes.lines[name=fuel-gg-generator].bends = 0 -->
<!-- check: tubes.lines[name=fuel-gg-generator].cutLength = 85.00 -->
<!-- check: tubes.lines[name=fuel-act1-supply].od = 12.7 -->
<!-- check: tubes.lines[name=fuel-act1-supply].wall = 0.89 -->
<!-- check: tubes.lines[name=fuel-act1-supply].bendRadius = 40 -->
<!-- check: tubes.lines[name=fuel-act1-supply].bends = 3 -->
<!-- check: tubes.lines[name=fuel-act1-supply].cutLength = 860.35 -->
<!-- check: tubes.lines[name=fuel-act1-return].od = 12.7 -->
<!-- check: tubes.lines[name=fuel-act1-return].wall = 0.89 -->
<!-- check: tubes.lines[name=fuel-act1-return].bendRadius = 40 -->
<!-- check: tubes.lines[name=fuel-act1-return].bends = 3 -->
<!-- check: tubes.lines[name=fuel-act1-return].cutLength = 740.73 -->
<!-- check: tubes.lines[name=fuel-act2-supply].od = 12.7 -->
<!-- check: tubes.lines[name=fuel-act2-supply].wall = 0.89 -->
<!-- check: tubes.lines[name=fuel-act2-supply].bendRadius = 40 -->
<!-- check: tubes.lines[name=fuel-act2-supply].bends = 3 -->
<!-- check: tubes.lines[name=fuel-act2-supply].cutLength = 2104.35 -->
<!-- check: tubes.lines[name=fuel-act2-return].od = 12.7 -->
<!-- check: tubes.lines[name=fuel-act2-return].wall = 0.89 -->
<!-- check: tubes.lines[name=fuel-act2-return].bendRadius = 40 -->
<!-- check: tubes.lines[name=fuel-act2-return].bends = 3 -->
<!-- check: tubes.lines[name=fuel-act2-return].cutLength = 1864.73 -->
<!-- check: tubes.lines[name=hotgas-generator-turbine].od = 101.6 -->
<!-- check: tubes.lines[name=hotgas-generator-turbine].wall = 1.65 -->
<!-- check: tubes.lines[name=hotgas-generator-turbine].bendRadius = 155 -->
<!-- check: tubes.lines[name=hotgas-generator-turbine].bends = 0 -->
<!-- check: tubes.lines[name=hotgas-generator-turbine].cutLength = 65.00 -->
<!-- check: tubes.lines[name=hotgas-exhaust].od = 203.2 -->
<!-- check: tubes.lines[name=hotgas-exhaust].wall = 2 -->
<!-- check: tubes.lines[name=hotgas-exhaust].bendRadius = 305 -->
<!-- check: tubes.lines[name=hotgas-exhaust].bends = 1 -->
<!-- check: tubes.lines[name=hotgas-exhaust].cutLength = 1227.83 -->
<!-- check: tubes.lines[name=igniter-chamber].od = 6.35 -->
<!-- check: tubes.lines[name=igniter-chamber].wall = 0.71 -->
<!-- check: tubes.lines[name=igniter-chamber].bendRadius = 20 -->
<!-- check: tubes.lines[name=igniter-chamber].bends = 3 -->
<!-- check: tubes.lines[name=igniter-chamber].cutLength = 318.43 -->
<!-- check: tubes.lines[name=igniter-generator].od = 6.35 -->
<!-- check: tubes.lines[name=igniter-generator].wall = 0.71 -->
<!-- check: tubes.lines[name=igniter-generator].bendRadius = 20 -->
<!-- check: tubes.lines[name=igniter-generator].bends = 4 -->
<!-- check: tubes.lines[name=igniter-generator].cutLength = 1195.66 -->
<!-- check: tubes.lines[name=pneumatic-helium-block].od = 9.525 -->
<!-- check: tubes.lines[name=pneumatic-helium-block].wall = 0.89 -->
<!-- check: tubes.lines[name=pneumatic-helium-block].bendRadius = 30 -->
<!-- check: tubes.lines[name=pneumatic-helium-block].bends = 4 -->
<!-- check: tubes.lines[name=pneumatic-helium-block].cutLength = 861.50 -->
<!-- check: tubes.lines[name=pneumatic-main-lox].od = 6.35 -->
<!-- check: tubes.lines[name=pneumatic-main-lox].wall = 0.71 -->
<!-- check: tubes.lines[name=pneumatic-main-lox].bendRadius = 20 -->
<!-- check: tubes.lines[name=pneumatic-main-lox].bends = 4 -->
<!-- check: tubes.lines[name=pneumatic-main-lox].cutLength = 1178.66 -->
<!-- check: tubes.lines[name=pneumatic-main-fuel].od = 6.35 -->
<!-- check: tubes.lines[name=pneumatic-main-fuel].wall = 0.71 -->
<!-- check: tubes.lines[name=pneumatic-main-fuel].bendRadius = 20 -->
<!-- check: tubes.lines[name=pneumatic-main-fuel].bends = 5 -->
<!-- check: tubes.lines[name=pneumatic-main-fuel].cutLength = 3224.08 -->
<!-- check: tubes.lines[name=pneumatic-gg-valve].od = 6.35 -->
<!-- check: tubes.lines[name=pneumatic-gg-valve].wall = 0.71 -->
<!-- check: tubes.lines[name=pneumatic-gg-valve].bendRadius = 20 -->
<!-- check: tubes.lines[name=pneumatic-gg-valve].bends = 5 -->
<!-- check: tubes.lines[name=pneumatic-gg-valve].cutLength = 1570.08 -->
<!-- check: tubes.lines[name=pneumatic-purge-dome].od = 6.35 -->
<!-- check: tubes.lines[name=pneumatic-purge-dome].wall = 0.71 -->
<!-- check: tubes.lines[name=pneumatic-purge-dome].bendRadius = 20 -->
<!-- check: tubes.lines[name=pneumatic-purge-dome].bends = 5 -->
<!-- check: tubes.lines[name=pneumatic-purge-dome].cutLength = 715.97 -->
<!-- check: tubes.lines[name=pneumatic-purge-generator].od = 6.35 -->
<!-- check: tubes.lines[name=pneumatic-purge-generator].wall = 0.71 -->
<!-- check: tubes.lines[name=pneumatic-purge-generator].bendRadius = 20 -->
<!-- check: tubes.lines[name=pneumatic-purge-generator].bends = 5 -->
<!-- check: tubes.lines[name=pneumatic-purge-generator].cutLength = 2220.08 -->

- [lox-pump-main.csv](/blog/rocket-engine-routing/bend-tables/lox-pump-main.csv)
- [lox-main-dome.csv](/blog/rocket-engine-routing/bend-tables/lox-main-dome.csv)
- [lox-pump-gg.csv](/blog/rocket-engine-routing/bend-tables/lox-pump-gg.csv)
- [lox-gg-generator.csv](/blog/rocket-engine-routing/bend-tables/lox-gg-generator.csv)
- [fuel-pump-main.csv](/blog/rocket-engine-routing/bend-tables/fuel-pump-main.csv)
- [fuel-main-manifold.csv](/blog/rocket-engine-routing/bend-tables/fuel-main-manifold.csv)
- [fuel-coolant-dome.csv](/blog/rocket-engine-routing/bend-tables/fuel-coolant-dome.csv)
- [fuel-pump-gg.csv](/blog/rocket-engine-routing/bend-tables/fuel-pump-gg.csv)
- [fuel-gg-generator.csv](/blog/rocket-engine-routing/bend-tables/fuel-gg-generator.csv)
- [fuel-act1-supply.csv](/blog/rocket-engine-routing/bend-tables/fuel-act1-supply.csv)
- [fuel-act1-return.csv](/blog/rocket-engine-routing/bend-tables/fuel-act1-return.csv)
- [fuel-act2-supply.csv](/blog/rocket-engine-routing/bend-tables/fuel-act2-supply.csv)
- [fuel-act2-return.csv](/blog/rocket-engine-routing/bend-tables/fuel-act2-return.csv)
- [hotgas-generator-turbine.csv](/blog/rocket-engine-routing/bend-tables/hotgas-generator-turbine.csv)
- [hotgas-exhaust.csv](/blog/rocket-engine-routing/bend-tables/hotgas-exhaust.csv)
- [igniter-chamber.csv](/blog/rocket-engine-routing/bend-tables/igniter-chamber.csv)
- [igniter-generator.csv](/blog/rocket-engine-routing/bend-tables/igniter-generator.csv)
- [pneumatic-helium-block.csv](/blog/rocket-engine-routing/bend-tables/pneumatic-helium-block.csv)
- [pneumatic-main-lox.csv](/blog/rocket-engine-routing/bend-tables/pneumatic-main-lox.csv)
- [pneumatic-main-fuel.csv](/blog/rocket-engine-routing/bend-tables/pneumatic-main-fuel.csv)
- [pneumatic-gg-valve.csv](/blog/rocket-engine-routing/bend-tables/pneumatic-gg-valve.csv)
- [pneumatic-purge-dome.csv](/blog/rocket-engine-routing/bend-tables/pneumatic-purge-dome.csv)
- [pneumatic-purge-generator.csv](/blog/rocket-engine-routing/bend-tables/pneumatic-purge-generator.csv)

The CSVs contain tube-local XYZ points, with the first point at the origin and first leg along +X, plus L/R/A bend rows: straight length before a bend, bend-plane rotation and bend angle. These downloads use the existing kernel `formatBendTableCsv` formatter on the verified native evaluation JSON. [CSV provenance and hashes](/blog/rocket-engine-routing/bend-tables/manifest.json).

## Reproduce the checks and exports

Use Node 22 and a source checkout of `develop`, then run from the repository root. These commands use the current `develop` source checkout; an older package installation may behave differently.

```bash
git clone --branch develop https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
npm ci --ignore-scripts
npm run build:cli
node dist/cli/index.js evaluate examples/rocket-engine-lines/engine-routed.kcad.ts --json
node dist/cli/index.js evaluate examples/rocket-engine-lines/engine-routed-twin.kcad.ts --json
node dist/cli/index.js export bend-table examples/rocket-engine-lines/engine-routed.kcad.ts -o out/rocket-bends
node dist/cli/index.js export step examples/rocket-engine-lines/engine-routed.kcad.ts -o out/rocket.step
```

The broken evaluation exits unsuccessfully by design; continue with the working source for exports. If using the ZIP instead of the repository example files, extract it into `site/blog/rocket-engine-routing/` in that checkout and replace `examples/rocket-engine-lines/` in these commands with that directory.

Bend-table export refuses a tube-rule error. The newer guard also refuses STEP, STL, per-part STL, DXF, 3MF and G-code fabrication exports before writing bytes, leaving an existing output untouched. Tube warnings still allow export. GLB and rendering remain available to inspect a failing route. Use the source checkout built above to reproduce these export checks.

[Working native JSON](/blog/rocket-engine-routing/engine-routed.report.json) · [Broken native JSON](/blog/rocket-engine-routing/engine-routed-twin.report.json) · [Verified 42-solid STEP](/blog/rocket-engine-routing/engine-routed.step) · [Native verification summary](/blog/rocket-engine-routing/native-verification.json)

[Working source](/blog/rocket-engine-routing/engine-routed.kcad.ts) · [Broken source](/blog/rocket-engine-routing/engine-routed-twin.kcad.ts) · [Original port-bearing hardware source](/blog/rocket-engine-routing/engine-bare.kcad.ts) · [Full source on GitHub](https://github.com/w1ne/kernelCAD-web/blob/develop/examples/rocket-engine-lines/engine-routed.kcad.ts)

[Download the source, reports, 23 CSVs and STEP together](/blog/rocket-engine-routing/rocket-engine-routing.zip) · [Bundle instructions](/blog/rocket-engine-routing/README.txt) · [SHA-256 manifest](/blog/rocket-engine-routing/manifest.json). The bounded ZIP excludes the movie and viewer caches. The manifest binds the downloads to their exact input source and STEP bytes:

```text
source SHA-256: b992ce2bc4068d422e3a652487a665514643ff72caf8a8891da5d5a8a7747bc4
STEP SHA-256:   fc4b51683bb7a7db227742a217692d4fd10c9fdd824d46c114abb548220006ee
```

## What this example establishes

The model establishes named endpoints, hollow routed geometry, the declared bend/clearance checks, a reproducible crossing and repair, moved endpoint dependencies and separate STEP solids. Broad native assembly interference checked 42 parts with 181 candidate comparisons and found no overlapping pairs at its 0.01 mm³ threshold. That interference check and the tube rules are geometric checks with defined scope.

Reported masses use nominal `mild-steel` geometry. `pressureDropKPa` is null for these lines; no hydraulic pressure-drop result is claimed. The long control runs are unclamped. Display supports show contact but have no fastening or load proof. The assembly has no mates and retains its floating-part warnings.

Pressure containment, combustion, thrust, thermal expansion, flow, loads, physical fit, tolerances, tooling access and manufacturing acceptance remain unverified. The routes are authored rigid tubes, with no automatic path search, flexible-hose solution, catalog fitting selection or automatic route growth. Change the source, rerun its checks, and review the actual interfaces before treating the geometry as a physical design.
