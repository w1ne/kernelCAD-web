---
title: Routing bent tubes between ports
summary: How to route rigid lines between ports with tube() and tubeSpec(), and read the bend table and clearances the kernel reports.
date: 2026-10-11
kind: guide
status: draft
model: examples/tube-routing-engine/engine-lines.kcad.ts
note: Draft for Andrii to rewrite and approve before it is published. Every number in it is checked against kernelcad evaluate --json of the example and its broken twin; preview and check it with npm run site:build-blog -- --drafts. The Studio link opens the example only for a signed-in user; swap it for a public link before publishing.
---

The fluid lines on an engine are rigid tubes that a shop bends from straight stock. Each one needs a bend table and has to stay clear of the parts and the other lines. You route each line with `tube()` and set the rules it must meet with `tubeSpec()`. The example `examples/tube-routing-engine/engine-lines.kcad.ts` routes 5 tubes in 3 fluid systems around a case and a gearbox.
<!-- check: tubes.lines.length = 5 -->
<!-- check: tubes.systems.length = 3 -->

## Ports

A tube ends on ports. A port is an axis connector with `port` data: the fluid system and the tube OD it takes. The fuel pump in the example has two outlets on top. Its shape is cut down here; the ports are the example's:

```kcad
const pumpX = param('PumpX', 60, { unit: 'mm', description: 'fuel pump station along the case axis' });

const asm = assembly('pump');
const pumpShape = cylinder(90, 38).rotateX(-90).translate(0, -90, 0)
  .union(cylinder(50, 11).translate(0, -42, 0), cylinder(50, 11).translate(0, -67, 0));
asm.part('pump', pumpShape, { at: [pumpX, -130, -282] })
  .connector('out-a', { type: 'axis', origin: { kind: 'vec3', value: [0, -42, 50] }, axis: [0, 0, 1], port: { system: 'fuel', od: 12.7 } })
  .connector('out-b', { type: 'axis', origin: { kind: 'vec3', value: [0, -67, 50] }, axis: [0, 0, 1], port: { system: 'fuel', od: 12.7 } });

return asm.model();
```

The connector `origin` is in the part's own frame and `at` moves the part, so a port sits at `at` plus `origin`. `kernelcad evaluate --json` lists every port in `ports`, in assembly space: `out-a` is at [60, -172, -232] and `out-b` at [60, -197, -232], both pointing up. A tube that ends on a port takes its OD and its system from it.
<!-- check: ports[part=pump,name=out-a].origin = [60, -172, -232] -->
<!-- check: ports[part=pump,name=out-b].origin = [60, -197, -232] -->

## One tube

`tube()` takes two ends and the corner points between them. The kernel runs straight legs from end to corner to end and rounds each corner with `bendRadius`, the centreline radius. It adds no corners of its own, so the first corner must lie on the axis of the `from` port and the last one on the axis of the `to` port. Here both corners are at the height of the fuel run, straight above the pump outlet and straight below the inlet of the fuel block:

```kcad
const pumpX = param('PumpX', 60, { unit: 'mm' });
const fuelBlockX = param('FuelBlockX', 235, { unit: 'mm' });
const fuelRunZ = param('FuelRunZ', -140, { unit: 'mm' });

const asm = assembly('fuel-line');
const pump = asm.part('pump', cylinder(90, 38).rotateX(-90).translate(0, -90, 0).union(cylinder(50, 11).translate(0, -42, 0)), { at: [pumpX, -130, -282] })
  .connector('out-a', { type: 'axis', origin: { kind: 'vec3', value: [0, -42, 50] }, axis: [0, 0, 1], port: { system: 'fuel', od: 12.7 } });
const block = asm.part('fuel-block', box(60, 50, 38).translate(-30, -210, -50).union(cylinder(15, 11).translate(0, -172, -65)), { at: [fuelBlockX, 0, 0] })
  .connector('in-a', { type: 'axis', origin: { kind: 'vec3', value: [0, -172, -65] }, axis: [0, 0, -1], port: { system: 'fuel', od: 12.7 } });

tubeSpec({ clearance: { default: 6 } });
const line = tube('fuel-a', {
  from: pump.port('out-a'),
  to: block.port('in-a'),
  via: [[pumpX, -172, fuelRunZ], [fuelBlockX, -172, fuelRunZ]],
  wall: 0.89,
  bendRadius: 38.1,
});
asm.part('fuel-a', line);

return asm.model();
```

The tube goes into the assembly with `asm.part(name, tube)` and no `at`, because its points are already in assembly space. In the example this line is `fuel-a`, with 2 bends and 309.29 mm along the centreline.
<!-- check: tubes.lines[name=fuel-a].bends = 2 -->
<!-- check: tubes.lines[name=fuel-a].cutLength = 309.29 -->

## The rules

`tubeSpec()` declares the rules every tube in the script must meet. Its defaults set the smallest bend radius and the shortest straights as multiples of the tube OD, and the largest bend angle. The example keeps those and sets the clearance:

```ts
tubeSpec({ clearance: { default: 6, pairs: [{ a: 'fuel', b: 'hydraulic', min: 12 }] } });
```
<!-- check: source contains block -->

A tube keeps `default` mm from every part and from the other tubes. A pair replaces that distance for two systems, so a fuel line and a hydraulic line keep `min` mm apart. A tube that breaks a rule fails the evaluation with an error that names the tube and the measured value.

## Reading the report

Evaluate the example with the CLI:

```bash
kernelcad evaluate examples/tube-routing-engine/engine-lines.kcad.ts --json
```

It prints `"ok": true` and a `tubes` object. `tubes.lines` has an entry for each tube. Next to the bend table and the cut length it holds `minClearance`, the distance to the nearest part or tube. `hyd-b` is 306.45 mm long, and its nearest neighbour is `fuel-b`, 17.75 mm away. The rule for a fuel line next to a hydraulic line needs 12.00 mm.
<!-- check: ok = true -->
<!-- check examples/tube-routing-engine/engine-lines-broken.kcad.ts: diagnostics[code=tube.clearance.violated].message contains needs 12.00 mm -->
<!-- check: tubes.lines[name=hyd-b].cutLength = 306.45 -->
<!-- check: tubes.lines[name=hyd-b].minClearance.to = fuel-b -->
<!-- check: tubes.lines[name=hyd-b].minClearance.mm = 17.75 -->

`tubes.systems` adds up the lines of each system: the 2 hydraulic lines come to 522.90 mm.
<!-- check: tubes.systems[system=hydraulic].lines = 2 -->
<!-- check: tubes.systems[system=hydraulic].cutLength = 522.90 -->

## A clearance failure

`examples/tube-routing-engine/engine-lines-broken.kcad.ts` is the same script with the second corner of `hyd-b` moved down, toward the fuel lines that run under it:

```ts
via: [[manifoldX.add(20), -190, hydRunZ], [act2X, -190, hydRunZ.add(-8)]],
```
<!-- check examples/tube-routing-engine/engine-lines-broken.kcad.ts: source contains block -->

Evaluating it prints `"ok": false` and 1 diagnostic:
<!-- check examples/tube-routing-engine/engine-lines-broken.kcad.ts: ok = false -->
<!-- check examples/tube-routing-engine/engine-lines-broken.kcad.ts: diagnostics.length = 1 -->

```text
tube.clearance.violated: tube 'fuel-b' is 11.24 mm from 'hyd-b'; the rule needs 12.00 mm. Closest point on the tube: [101.40, -195.01, -133.97]; on 'hyd-b': [101.40, -191.49, -123.29].
```
<!-- check examples/tube-routing-engine/engine-lines-broken.kcad.ts: diagnostics[code=tube.clearance.violated].message = block -->

A pair of tubes is reported once, on the tube declared first, so the message names `fuel-b` although the corner that moved belongs to `hyd-b`. The hint that comes with it reads: Move the nearest corner away from the named part or tube by at least the stated shortfall.
<!-- check examples/tube-routing-engine/engine-lines-broken.kcad.ts: diagnostics[code=tube.clearance.violated].hint = "Move the nearest corner away from the named part or tube by at least the stated shortfall." -->

The fix is to put the corner back at the height of the run, as `engine-lines.kcad.ts` has it:

```ts
via: [[manifoldX.add(20), -190, hydRunZ], [act2X, -190, hydRunZ]],
```
<!-- check: source contains block -->

## Bend tables and STEP

`kernelcad export bend-table` writes one CSV per tube, named after the tube:

```bash
kernelcad export bend-table examples/tube-routing-engine/engine-lines.kcad.ts -o out/bend-tables
```

This is `hyd-b.csv`. The points are in the tube's own frame, with the first point at the origin and the first leg along +X. A bend row gives the straight before the bend, the rotation of the bend plane from the previous bend, and the bend angle:

```text
name,hyd-b
od_mm,9.525
wall_mm,0.89
bend_radius_mm,28.6
cut_length_mm,306.450

point,x_mm,y_mm,z_mm
1,0.000,0.000,0.000
2,66.000,0.000,0.000
3,66.000,190.000,0.000
4,141.000,190.000,0.000

bend,l_mm,r_deg,a_deg
1,37.400,0.000,90.000
2,132.800,180.000,90.000
last_straight_mm,46.400
```
<!-- check: tubes.lines[name=hyd-b].bendTableCsv = block -->

The export refuses a script that fails a tube rule, so the broken twin gives no tables. `kernelcad export step` writes the whole assembly as one STEP file, with each tube as its own solid:

```bash
kernelcad export step examples/tube-routing-engine/engine-lines.kcad.ts -o out/engine-lines.step
```

## Limits

- You place the corners. There is no automatic path search.
- A tube is straight legs joined by bends of one radius, so a hose is outside what `tube()` builds.
- A branch joins its trunk at a right angle only.

## Open the example

[Open the example in Studio](https://app.kernelcad.com/studio?script=examples/tube-routing-engine/engine-lines.kcad.ts), or read [the source on GitHub](https://github.com/w1ne/kernelCAD-web/blob/develop/examples/tube-routing-engine/engine-lines.kcad.ts). The `kernelcad-tubes` skill lists every rule and diagnostic.
