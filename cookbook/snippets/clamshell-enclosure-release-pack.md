---
id: clamshell-enclosure-release-pack
title: Clamshell enclosure release pack — clevis spine, lid swing, materials
tags: [assembly, connector, mate, revolute, hinge, joint, parameter, material, bom, manufacturing, datum]
keywords:
  - clamshell enclosure release pack
  - instrument case clevis spine shells
  - lidDeg animationView beside param
  - gasket seal not modeled
  - BOM drawing USD explicit hinge drive
  - mechanism real open shells
  - no latch mate no closed-loop FK
when_to_use: >-
  Prompt asks for a clamshell enclosure release pack: two walled shells on a
  clevis spine, a lidDeg swing with animationView, named materials, and a
  drawing/BOM/USD checklist. Declare lidDeg with param() in the same block as
  animationView — tracks must name that live param. The lid is modeled open,
  side by side with the base; limits stop it before the shells fold onto each
  other. A gasket-sealed close is not modeled. No latch mate, no
  joint.scissorLift, no closed-loop FK. After evaluate_script reports
  mechanism=real, export BOM and a PDF or SVG drawing, and usd-isaac with an
  explicit drive on the hinge only. Report FEA UNVERIFIED unless CalculiX and
  gmsh are present. Prefer design_loop until green.
---

Walled base and lid on a clearance-fit clevis. The swing is one revolute.
The closed, gasketed pose is outside the limits on purpose.

```typescript
// Clamshell enclosure release pack. KEEP param() beside animationView —
// tracks must name lidDeg (animation.param.unknown if you drop it).
// Clevis cheeks and the lid tongue occupy disjoint ranges along Y, with a
// clearance pin, so the revolute does not collide inside limitsDeg.
// The shells are modeled side by side (lidDeg 0 = open flat). Limits stop
// the lid BEFORE it folds onto the base. A gasket-sealed close is NOT
// modeled — those shells would interpenetrate. No latch mate, no
// joint.scissorLift, no closed-loop FK.
//
// Follow-up AFTER evaluate_script ok + mechanism=real (do not fake results):
// 1. inspect({ of: 'bom' }) or export bom-csv|bom-json. Materials are set.
// 2. pdf-drawing / svg-drawing (exploded isometric, balloons, parts list,
//    title block). Datums below are annotation intent, not a certification.
// 3. usd-isaac with an explicit drive on 'hinge' only. This graph is
//    revolute-only — do not add cylindrical / pin_slot / ball.
// 4. FEA: fea_summary({}). If CalculiX+gmsh are absent, report UNVERIFIED.
// 5. open_in_studio and capture_animation({ file }) with pose verification.

const lidDeg = param('lidDeg', 35, { min: -65, max: 65 });
animationView({
  name: 'lid swing',
  tracks: [
    { param: 'lidDeg', keys: [{ atMs: 0, value: -40 }, { atMs: 1200, value: 50, ease: 'easeInOut' }, { atMs: 2400, value: -40, ease: 'easeInOut' }] },
  ],
  fps: 24,
});

const R = 9;
const pinR = 2.4;
const boreR = 2.75;
const yCyl = (r, y0, y1, x = 0, z = 0) =>
  cylinder(y1 - y0, r).rotateX(-90).translate(x, y0, z);

// Fork knuckles. The tongue sits in the open center so the pin stays a
// clearance fit instead of a volume overlap.
const cheeks = union(
  yCyl(R, 6.4, 13.2),
  yCyl(R, -13.2, -6.4),
).subtract(yCyl(boreR, -14, 14));
const web = (y: number) => cylinder(15.2, 3.4).alongAxis([1, 0, 0]).translate(-22, y, 0);
const bridge = web(9.6).union(web(-9.6));

let baseShell = extrudeRoundedRect(78, 72, 12, 28).translate(-59, 0, -18);
baseShell = baseShell.subtract(extrudeRoundedRect(62, 56, 8, 24).translate(-57, 0, -14));
baseShell = baseShell.subtract(extrudeRoundedRect(40, 32, 5, 1.3).translate(-59, 0, -18.1));
baseShell = baseShell.subtract(cylinder(12, 2.1).translate(-60, 0, -20));
// Outer lip plus a lower land: mating face and wall thickness both read from above.
const baseLip = extrudeRoundedRect(78, 72, 12, 3.4).translate(-59, 0, 9.7)
  .subtract(extrudeRoundedRect(68, 62, 9, 4.2).translate(-59, 0, 9.3));
const baseLand = extrudeRoundedRect(68, 62, 9, 1.8).translate(-59, 0, 8.15)
  .subtract(extrudeRoundedRect(58, 52, 6, 2.6).translate(-59, 0, 7.8));
// Standoffs break the planform toward the camera. Pads under the floor
// stay hidden at the hero elevation.
function footPad(x: number, y: number) {
  return cylinder(5.2, 7.2).translate(x, y, -22.4)
    .union(cylinder(8, 3.6).translate(x, y, -17.6));
}
let feet = footPad(-88, -42);
for (const [x, y] of [[-30, -42], [-88, 42], [-30, 42]] as const) {
  feet = feet.union(footPad(x, y));
}
function screwBoss(x: number, y: number) {
  return cylinder(9, 4).translate(x, y, -14)
    .subtract(cylinder(6, 1.45).translate(x, y, -8));
}
let bosses = screwBoss(-78, -18);
for (const [x, y] of [[-42, -18], [-78, 18], [-42, 18]] as const) {
  bosses = bosses.union(screwBoss(x, y));
}
const latch = extrudeRoundedRect(14, 16, 3, 14).translate(-100, 0, -8)
  .subtract(cylinder(16, 1.7).alongAxis([1, 0, 0]).translate(-110, 0, -1));

const baseBody = union(cheeks, bridge, baseShell, baseLip, baseLand, feet, bosses, latch)
  .datum('A', { atZ: -18 })
  .datum('B', { atX: -98 })
  .datum('C', { atY: -36 })
  .tolerance({
    type: 'position', value: 0.3, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [-60, 0, -18] },
  })
  .finish('abs', { color: '#5a6e7c' });

const tongue = yCyl(R - 0.4, -4.8, 4.8);
// Pin runs out through both caps so the ends read as socket heads past the fork.
const pin = yCyl(pinR, -17.6, 17.6);
function hingeCap(yOuter: number, inward: number) {
  const len = 3.5;
  const y0 = inward > 0 ? yOuter - len : yOuter;
  const y1 = y0 + len;
  const head = yCyl(4.5, y0, y1);
  const sock0 = inward > 0 ? yOuter - 2.2 : yOuter - 0.2;
  return head.subtract(yCyl(1.7, sock0, sock0 + 2.4));
}
const washer = yCyl(5.7, 13.55, 14.15).union(yCyl(5.7, -14.15, -13.55));
const caps = hingeCap(17.6, 1).union(hingeCap(-17.6, -1));
const neck = cylinder(20, 4.6).alongAxis([1, 0, 0]).translate(2, 0, 0);
let lidShell = extrudeRoundedRect(64, 68, 11, 20).translate(50, 0, -8);
lidShell = lidShell.subtract(extrudeRoundedRect(50, 54, 7, 16).translate(52, 0, -6));
lidShell = lidShell.subtract(extrudeRoundedRect(36, 28, 4, 2.2).translate(50, 0, 9.0));
const lidLip = extrudeRoundedRect(64, 68, 11, 2.8).translate(50, 0, 11.5)
  .subtract(extrudeRoundedRect(54, 58, 8, 3.6).translate(50, 0, 11.1));
function lidScrew(x: number, y: number) {
  return cylinder(2.8, 3.3).translate(x, y, 11.7)
    .union(cylinder(5, 1.55).translate(x, y, 8))
    .subtract(cylinder(1.7, 1.4).translate(x, y, 13.2));
}
let lidScrews = lidScrew(30, 20);
for (const [x, y] of [[70, 20], [30, -20], [70, -20]] as const) {
  lidScrews = lidScrews.union(lidScrew(x, y));
}
const strike = extrudeRoundedRect(12, 14, 3, 10).translate(84, 0, -2)
  .subtract(cylinder(10, 1.5).alongAxis([1, 0, 0]).translate(80, 0, 2));
const lidBody = union(tongue, pin, washer, caps, neck, lidShell, lidLip, lidScrews, strike)
  .finish('abs', { color: '#f3f6f8' });

const arm = assembly('clamshell-enclosure-release');
const base = arm.part('base-shell', baseBody, { material: 'abs' });
const lid = arm.part('lid-shell', lidBody, { material: 'abs' });

base.connector('hinge', {
  type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0],
});
lid.connector('hinge', {
  type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0],
});
arm.mate('hinge', 'base-shell.hinge', 'lid-shell.hinge', 'revolute', {
  pose: lidDeg,
  limitsDeg: [-65, 65],
});

return arm.solvedModel({});
```
