---
id: gt2-shop-release-actuator
title: Compact GT2 belt-driven rotary actuator — housing, shaft, 608 bearing, cover
tags: [assembly, connector, mate, belt, pulley, drive, bearing, shaft, material, manufacturing, fillet, hole, plate]
keywords:
  - shop-release GT2 rotary actuator
  - compact manufacturable belt-driven actuator
  - machined housing cavity walls bearing seat
  - four-hole mounting pattern removable cover
  - 608-style bearing separate shaft
  - two 20-tooth GT2 pulleys
  - rounded nubs clearance cord not tooth meshing
  - BOM-ready aluminum nylon abs materials
  - no USD cylindrical mate
when_to_use: >-
  Prompt asks for a compact manufacturable GT2 belt-driven rotary actuator,
  not a stack of boxes: a machined housing with cavity walls, a bearing-seat
  bore, floor bosses, filleted edges, and a four-hole mounting pattern; two
  separate 20-tooth 2 mm-pitch pulleys; a closed belt; a shaft and 608-style
  bearing as separate bodies; a removable cover; named materials. The belt
  is a geometric cord and the pulley teeth are rounded nubs — not tooth
  meshing, pretension, or power transmission. Do not export USD Isaac: the
  cylindrical shaft/bearing mate fails with export.usd.joint-unsupported.
  After a full evaluate_script (not dry-run), inspect BOM and export a
  PDF or SVG drawing. Auto-GD&T in the script is generated annotation, not
  a manufacturing certification. Prefer design_loop until green.
---

Shop-release actuator composed from a machined housing, a GT2 cord loop,
and a shaft/bearing pair. Pulley nubs and the belt cord are geometry only.
BOM and drawing files are follow-up MCP calls on this same script — they
are not a second model.

```typescript
// Compact GT2 belt-driven rotary actuator. Cord + rounded nubs are a
// clearance loop, NOT tooth mesh, belt tension, or power transmission.
// No animationView. Do NOT export usd-isaac: the cylindrical shaft/bearing
// mate is export.usd.joint-unsupported.
// After full evaluate_script: inspect({ of: 'bom' }) or export bom-csv /
// bom-json, then pdf-drawing / svg-drawing (balloons, parts list, title
// block). Datums below are annotation intent, not a GD&T certification.
// Catalog/vendor metadata may be missing — these are fabricated stand-ins.

const pitch = 2, teeth = 20, C = 60, face = 7, cordR = 0.7, nubR = 0.85, gap = 0.45;
const pd = (teeth * pitch) / Math.PI;
const pitchR = pd / 2;
const beltR = pitchR + nubR + cordR + gap;
const beltTeeth = Math.round((2 * C + Math.PI * pd) / pitch);
const beltLen = beltTeeth * pitch;
const ax = 36, ay = 40, bx = ax + C, zPul = 18, zBelt = zPul + face / 2;
const boreR = 4.25;

function pulley() {
  let body = cylinder(face, pitchR - 0.55);
  for (let i = 0; i < teeth; i++) {
    const a = (2 * Math.PI * i) / teeth;
    body = body.union(cylinder(face, nubR).translate(pitchR * Math.cos(a), pitchR * Math.sin(a), 0));
  }
  return body.subtract(cylinder(face + 2, boreR).translate(0, 0, -1));
}

function outerWrap(cx: number, keepLeft: boolean) {
  const span = (beltR + cordR) * 2 + 6;
  const cutX = keepLeft ? cx + 0.25 : cx - span - 0.25;
  return torus(beltR, cordR).translate(cx, ay, zBelt)
    .subtract(box(span, span, 8).translate(cutX, ay - span / 2, zBelt - 4));
}

const belt = outerWrap(ax, true).union(outerWrap(bx, false))
  .union(cylinder(C, cordR).alongAxis([1, 0, 0]).translate(ax, ay + beltR, zBelt))
  .union(cylinder(C, cordR).alongAxis([1, 0, 0]).translate(ax, ay - beltR, zBelt));

let housing = box(120, 80, 50).subtract(box(112, 72, 46).translate(4, 4, 4));
for (const [x, y] of [[16, 16], [104, 16], [16, 64], [104, 64]] as const) {
  housing = housing.union(cylinder(8, 6).translate(x, y, 4));
}
housing = housing.subtract(cylinder(60, 2.55).translate(16, 16, -1).patternGrid({
  x: { count: 2, direction: [1, 0, 0], spacing: 88 },
  y: { count: 2, direction: [0, 1, 0], spacing: 48 },
}));
housing = housing
  .union(cylinder(12, 12.2).translate(ax, ay, 4))
  .subtract(cylinder(7.4, 11.08).translate(ax, ay, 4))
  .subtract(cylinder(22, 4.6).translate(ax, ay, -1))
  .union(cylinder(zPul + face - 4, 3.8).translate(bx, ay, 4))
  .fillet(1.2, { parallel: [0, 0, 1] })
  .datum('A', { atZ: 0 })
  .datum('B', { atX: 0 })
  .datum('C', { atY: 0 })
  .tolerance({
    type: 'position', value: 0.2, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [16, 16, 0] },
  });

const cover = box(120, 80, 3).translate(0, 0, 50);
const bearing = cylinder(7, 11).subtract(cylinder(9, 4.2).translate(0, 0, -1)).translate(ax, ay, 4.2);
const shaft = cylinder(40, 3.9).translate(ax, ay, -4);
const drive = pulley().translate(ax, ay, zPul);
const idler = pulley().translate(bx, ay, zPul);

const arm = assembly(`gt2-actuator-${beltTeeth}t-${beltLen}mm`);
const h = arm.part('housing', housing, { material: 'aluminum-6061' });
const c = arm.part('cover', cover, { material: 'aluminum-6061' });
const br = arm.part('bearing-608', bearing, { material: 'mild-steel' });
const sh = arm.part('shaft', shaft, { material: 'mild-steel' });
const pa = arm.part('pulley-drive', drive, { material: 'nylon' });
const pb = arm.part('pulley-idler', idler, { material: 'nylon' });
const bl = arm.part('gt2-belt', belt, { material: 'abs' });

const seat = [ax + 11, ay, 7.7] as [number, number, number];
const spin = [ax, ay, 8] as [number, number, number];
const hubA = [ax, ay, zBelt] as [number, number, number];
const hubB = [bx, ay, zBelt] as [number, number, number];
const cord = [ax - beltR, ay, zBelt] as [number, number, number];
const lid = [60, 40, 50] as [number, number, number];

h.connector('lid', { type: 'frame', origin: { kind: 'vec3', value: lid } });
c.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: lid } });
h.connector('bearing-seat', { type: 'frame', origin: { kind: 'vec3', value: seat }, jointClearanceRadius: 0.4 });
br.connector('outer', { type: 'frame', origin: { kind: 'vec3', value: seat } });
br.connector('bore', { type: 'axis', origin: { kind: 'vec3', value: spin }, axis: [0, 0, 1], jointClearanceRadius: 4.3 });
sh.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: spin }, axis: [0, 0, 1] });
sh.connector('hub', { type: 'frame', origin: { kind: 'vec3', value: hubA } });
pa.connector('bore', { type: 'frame', origin: { kind: 'vec3', value: hubA }, jointClearanceRadius: boreR });
h.connector('stud', { type: 'frame', origin: { kind: 'vec3', value: hubB } });
pb.connector('bore', { type: 'frame', origin: { kind: 'vec3', value: hubB }, jointClearanceRadius: boreR });
bl.connector('cord', { type: 'frame', origin: { kind: 'vec3', value: cord } });
pa.connector('belt-near', { type: 'frame', origin: { kind: 'vec3', value: cord }, jointClearanceRadius: cordR + gap + 0.3 });

arm.mate('cover', 'cover.seat', 'housing.lid', 'fastened');
arm.mate('bearing-seat', 'bearing-608.outer', 'housing.bearing-seat', 'fastened');
arm.mate('shaft-spin', 'shaft.axis', 'bearing-608.bore', 'cylindrical');
arm.mate('drive-hub', 'pulley-drive.bore', 'shaft.hub', 'fastened');
arm.mate('idler-stud', 'pulley-idler.bore', 'housing.stud', 'fastened');
arm.mate('belt-loop', 'gt2-belt.cord', 'pulley-drive.belt-near', 'fastened');

return arm.solvedModel({});
```
