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
//
// The cover is a bolted frame with a viewing aperture (and the housing has
// side windows) so the flanged pulleys, belt, and 608 stay visible. A solid
// lid would hide the drive and read as an empty box.

const pitch = 2, teeth = 20, C = 60, face = 7, cordR = 0.9, nubR = 0.82, gap = 0.5;
const pd = (teeth * pitch) / Math.PI;
const pitchR = pd / 2;
const beltR = pitchR + nubR + cordR + gap;
const beltTeeth = Math.round((2 * C + Math.PI * pd) / pitch);
const beltLen = beltTeeth * pitch;

const W = 112, D = 52, wall = 4.5, baseT = 5.5, wallH = 24, flange = 14;
const cx = (W + 2 * flange) / 2;
const cy = (D + 2 * flange) / 2;
const ax = 38, ay = cy, bx = ax + C;
const zPul = 15.2;
const zBelt = zPul + face / 2;
const boreR = 4.25;
const topZ = baseT + wallH;
const flangeR = beltR + cordR + 0.5;

function rounded(w: number, d: number, r: number, t: number, x: number, y: number, z: number) {
  return extrudeRoundedRect(w, d, r, t).translate(x, y, z);
}

function pulley() {
  const flangeT = 1.15;
  const hubR = pitchR - 1.55;
  const nubH = face - 2 * flangeT;
  let body = cylinder(face, hubR)
    .union(cylinder(flangeT, flangeR))
    .union(cylinder(flangeT, flangeR).translate(0, 0, face - flangeT));
  for (let i = 0; i < teeth; i += 1) {
    const a = (2 * Math.PI * i) / teeth;
    body = body.union(
      cylinder(nubH, nubR).translate(pitchR * Math.cos(a), pitchR * Math.sin(a), flangeT),
    );
  }
  // Collar above the top flange so the bore reads as a turned hub.
  body = body.union(cylinder(1.5, 5.05).translate(0, 0, face));
  return body.subtract(cylinder(face + 4, boreR).translate(0, 0, -1));
}

function sideWindow(y0: number) {
  const rad = 5.2;
  const zc = 20.2;
  const x0 = 40;
  const x1 = 100;
  const depth = 18;
  const bar = box(x1 - x0, depth, rad * 2).translate(x0, y0, zc - rad);
  const cap0 = cylinder(depth, rad).alongAxis([0, 1, 0]).translate(x0, y0, zc);
  const cap1 = cylinder(depth, rad).alongAxis([0, 1, 0]).translate(x1, y0, zc);
  return bar.union(cap0, cap1);
}

function outerWrap(ox: number, keepLeft: boolean) {
  const span = (beltR + cordR) * 2 + 6;
  const cutX = keepLeft ? ox + 0.25 : ox - span - 0.25;
  return torus(beltR, cordR).translate(ox, ay, zBelt)
    .subtract(box(span, span, 8).translate(cutX, ay - span / 2, zBelt - 4));
}

// 608-style open bearing: outer race, inner race, seven balls in the groove.
// One solid. Not a plain bushing washer.
function bearing608() {
  const outer = path()
    .moveTo(8.85, 0).lineTo(11, 0).lineTo(11, 7).lineTo(8.85, 7)
    .lineTo(8.85, 5.05).lineTo(9.65, 3.5).lineTo(8.85, 1.95).lineTo(8.85, 0)
    .close().revolve();
  const inner = path()
    .moveTo(4.05, 0).lineTo(6.35, 0).lineTo(6.35, 1.95).lineTo(5.55, 3.5)
    .lineTo(6.35, 5.05).lineTo(6.35, 7).lineTo(4.05, 7).lineTo(4.05, 0)
    .close().revolve();
  let balls = sphere(1.35).translate(7.6, 0, 3.5);
  for (let i = 1; i < 7; i += 1) {
    const a = (2 * Math.PI * i) / 7;
    balls = balls.union(sphere(1.35).translate(7.6 * Math.cos(a), 7.6 * Math.sin(a), 3.5));
  }
  return outer.union(inner, balls);
}

const belt = outerWrap(ax, true).union(outerWrap(bx, false))
  .union(cylinder(C, cordR).alongAxis([1, 0, 0]).translate(ax, ay + beltR, zBelt))
  .union(cylinder(C, cordR).alongAxis([1, 0, 0]).translate(ax, ay - beltR, zBelt))
  .finish('rubber');

// Mounting flange + walled tub. Side windows and an open top keep the drive visible.
let housing = rounded(W + 2 * flange, D + 2 * flange, 6, baseT, cx, cy, 0)
  .union(rounded(W, D, 6, wallH + 0.4, cx, cy, baseT - 0.4));
housing = housing.subtract(rounded(W - 2 * wall, D - 2 * wall, 3, wallH + 1, cx, cy, baseT));
// Bearing boss and idler shoulder fuse into the floor after the cavity is cut.
housing = housing
  .union(cylinder(3.6, 13.4).translate(ax, ay, baseT - 0.3))
  .union(cylinder(4.2, 8.2).translate(bx, ay, baseT - 0.3))
  .union(cylinder(6.0, 5.4).translate(bx, ay, baseT + 3.5))
  .union(cylinder(face + 0.6, 3.7).translate(bx, ay, zPul - 0.2));
housing = housing
  .subtract(cylinder(4.2, 11.35).translate(ax, ay, baseT))
  .subtract(cylinder(baseT + 2, 5.2).translate(ax, ay, -1))
  .subtract(sideWindow(8))
  .subtract(sideWindow(54));
// Mounting holes through the flange as real hole features. The flange ring's
// top face is centred on (cx, cy), so u = x - cx and v = y - cy.
housing = housing.holes({ byNormal: 'Z', atX: cx, atY: cy, atZ: baseT }, {
  positions: [[10, 10], [130, 10], [10, 70], [130, 70]].map(([x, y]) => ({ u: x - cx, v: y - cy })),
  diameter: 3.1,
  depth: 'through',
  counterbore: { diameter: 5.4, depth: 2.2 },
});
housing = housing
  .fillet(0.6, { parallel: [0, 0, 1] })
  .datum('A', { atZ: 0 })
  .datum('B', { atX: 0 })
  .datum('C', { atY: 0 })
  .tolerance({
    type: 'position', value: 0.2, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [10, 10, 0] },
  })
  .finish('aluminium-brushed');

let cover = rounded(W, D, 6, 3.2, cx, cy, topZ + 0.08)
  .subtract(rounded(W - 18, D - 16, 4, 6, cx, cy, topZ - 1));
for (const [x, y] of [[40, 18], [100, 18], [40, 62], [100, 62]] as const) {
  cover = cover.union(cylinder(2.2, 2.35).translate(x, y, topZ + 2.2));
}
cover = cover.finish('anodized-black');

const bearing = bearing608().translate(ax, ay, 5.75).finish('steel');
// Stepped output: nose below the flange, journal through the 608, shoulder, pulley nose.
const shaft = path()
  .moveTo(0, -8).lineTo(4.15, -8).lineTo(4.15, 4.7)
  .lineTo(3.8, 4.7).lineTo(3.8, 12.9)
  .lineTo(5.3, 12.9).lineTo(5.3, 15.0)
  .lineTo(3.8, 15.05).lineTo(3.8, 24.2)
  .lineTo(0, 24.2).close()
  .revolve()
  .translate(ax, ay, 0)
  .finish('stainless');
const drive = pulley().translate(ax, ay, zPul).finish('abs', { color: '#f3efe4' });
const idler = pulley().translate(bx, ay, zPul).finish('abs', { color: '#f3efe4' });

const arm = assembly(`gt2-actuator-${beltTeeth}t-${beltLen}mm`);
const h = arm.part('housing', housing, { material: 'aluminum-6061' });
const c = arm.part('cover', cover, { material: 'aluminum-6061' });
const br = arm.part('bearing-608', bearing, { material: 'mild-steel' });
const sh = arm.part('shaft', shaft, { material: 'mild-steel' });
const pa = arm.part('pulley-drive', drive, { material: 'nylon' });
const pb = arm.part('pulley-idler', idler, { material: 'nylon' });
const bl = arm.part('gt2-belt', belt, { material: 'abs' });

const seat = [ax + 11, ay, 9.1] as [number, number, number];
const spin = [ax, ay, 9.1] as [number, number, number];
const hubA = [ax, ay, zBelt] as [number, number, number];
const hubB = [bx, ay, zBelt] as [number, number, number];
const cord = [ax - beltR, ay, zBelt] as [number, number, number];
const lid = [cx, cy, topZ + 0.08] as [number, number, number];

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
