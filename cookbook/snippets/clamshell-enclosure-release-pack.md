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
// Floor rib so the cavity is not an empty tub. Metal hardware is
// separate parts below — a finish on this union would paint screws the
// same ABS as the shell.
const ribs = extrudeRoundedRect(32, 2.6, 1, 5).translate(-62, 8, -14)
  .union(extrudeRoundedRect(2.6, 20, 1, 5).translate(-70, 0, -14));
function screwBoss(x: number, y: number) {
  return cylinder(9, 4).translate(x, y, -14)
    .subtract(cylinder(6, 1.45).translate(x, y, -8));
}
let bosses = screwBoss(-78, -18);
for (const [x, y] of [[-42, -18], [-78, 18], [-42, 18]] as const) {
  bosses = bosses.union(screwBoss(x, y));
}

const baseBody = union(cheeks, bridge, baseShell, baseLip, baseLand, ribs, bosses)
  .datum('A', { atZ: -18 })
  .datum('B', { atX: -98 })
  .datum('C', { atY: -36 })
  .tolerance({
    type: 'position', value: 0.3, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [-60, 0, -18] },
  })
  .finish('abs', { color: '#5a6e7c' });

// Tongue is bored. The steel pin is its own part and must not share volume.
const tongue = yCyl(R - 0.4, -4.8, 4.8).subtract(yCyl(2.95, -6.2, 6.2));
const neck = cylinder(18, 4.6).alongAxis([1, 0, 0]).translate(3.2, 0, 0);
let lidShell = extrudeRoundedRect(64, 68, 11, 20).translate(50, 0, -8);
lidShell = lidShell.subtract(extrudeRoundedRect(50, 54, 7, 16).translate(52, 0, -6));
lidShell = lidShell.subtract(extrudeRoundedRect(36, 28, 4, 2.2).translate(50, 0, 9.0));
const screwXY = [[26, 24], [74, 24], [26, -24], [74, -24]] as const;
// Lid screw clearances as real hole features, counterbored from the top face.
// The lid is centred on (50, 0), so u = x - 50 and v = y.
lidShell = lidShell.holes({ byNormal: 'Z', atX: 50, atY: 0, atZ: 12 }, {
  positions: screwXY.map(([x, y]) => ({ u: x - 50, v: y })),
  diameter: 3.9,
  depth: 8,
  counterbore: { diameter: 7.8, depth: 1.8 },
});
const lidLip = extrudeRoundedRect(64, 68, 11, 2.8).translate(50, 0, 11.5)
  .subtract(extrudeRoundedRect(54, 58, 8, 3.6).translate(50, 0, 11.1));
const lidBody = union(tongue, neck, lidShell, lidLip).finish('abs', { color: '#f3f6f8' });

// Steel pin with socket heads past the fork. Washers are separate rings.
let pinShape = yCyl(2.3, -18.4, 18.4)
  .union(yCyl(4.5, 14.55, 18.4))
  .union(yCyl(4.5, -18.4, -14.55))
  .subtract(yCyl(1.65, 16.3, 18.8))
  .subtract(yCyl(1.65, -18.8, -16.3))
  .finish('stainless');
function washerRing(y0: number) {
  return yCyl(5.8, y0, y0 + 0.7).subtract(yCyl(2.55, y0 - 0.3, y0 + 1.0)).finish('steel');
}
function lidScrew(x: number, y: number) {
  return cylinder(2.7, 3.45).translate(x, y, 10.55)
    .union(cylinder(5.2, 1.5).translate(x, y, 6.2))
    .subtract(cylinder(1.6, 1.4).translate(x, y, 12.2))
    .finish('steel');
}
// Pads sit under the floor and break the front edge so the hero elevation
// still sees the standoffs.
function footPad(x: number, y: number) {
  return cylinder(7.6, 6.2).translate(x, y, -25.7);
}
// Four separate pads, one part each (like the lid screws): fused into one
// "feet" body they were four solids 45-74 mm apart (union.disconnected).
const FOOT_XY = [[-90, -32], [-32, -32], [-90, 32], [-32, 32]] as const;
// Seal land on the mating rim. Not a compressed close — the shells still
// stop before they meet.
const gasketShape = extrudeRoundedRect(64, 58, 8, 1.45).translate(-59, 0, 10.1)
  .subtract(extrudeRoundedRect(54, 48, 5, 2.2).translate(-59, 0, 9.7))
  .finish('abs', { color: '#c6a15a' });
// Static latch hardware. Not a latch mate and not animated: the hook rides
// the lid, the strike stays on the base, and the open swing never catches.
const latchShape = cylinder(11, 4.2).alongAxis([1, 0, 0]).translate(82.2, 0, 1)
  .union(cylinder(7, 2.6).translate(91.5, 0, -6))
  .union(cylinder(5, 2.6).alongAxis([1, 0, 0]).translate(88.5, 0, -6))
  .finish('steel');
const strikeShape = cylinder(20, 3.4).translate(-101.8, -26, -4)
  .union(cylinder(6, 2.2).alongAxis([1, 0, 0]).translate(-107.2, -26, 12))
  .finish('steel');

const arm = assembly('clamshell-enclosure-release');
const base = arm.part('base-shell', baseBody, { material: 'abs' });
const lid = arm.part('lid-shell', lidBody, { material: 'abs' });
const pin = arm.part('hinge-pin', pinShape, { material: 'mild-steel' });
const washerA = arm.part('washer-1', washerRing(13.45), { material: 'mild-steel' });
const washerB = arm.part('washer-2', washerRing(-14.15), { material: 'mild-steel' });
const screws = screwXY.map(([x, y], i) => arm.part(`lid-screw-${i + 1}`, lidScrew(x, y), { material: 'mild-steel' }));
const feet = FOOT_XY.map(([x, y], i) =>
  arm.part(`foot-${i + 1}`, footPad(x, y).finish('rubber'), { material: 'abs' }));
const gasket = arm.part('gasket', gasketShape, { material: 'abs' });
const latch = arm.part('latch-hook', latchShape, { material: 'mild-steel' });
const strike = arm.part('strike', strikeShape, { material: 'mild-steel' });

// The revolute child is the steel pin, not the plastic lid. The exposure
// gate measures stick-out on the two revolute bodies; a pin fused into the
// lid was the only way the old script passed, and that painted the pin white.
base.connector('hinge', {
  type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0],
});
pin.connector('hinge', {
  type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0],
});
arm.mate('hinge', 'base-shell.hinge', 'hinge-pin.hinge', 'revolute', {
  pose: lidDeg,
  limitsDeg: [-65, 65],
});

function frameAt(part, name, at, clearance) {
  part.connector(name, {
    type: 'frame',
    origin: { kind: 'vec3', value: at },
    ...(clearance ? { jointClearanceRadius: clearance } : {}),
  });
}
frameAt(pin, 'lid', [0, 0, 0], 0);
frameAt(lid, 'pin', [0, 0, 0], 3.1);
arm.mate('lid-spine', 'hinge-pin.lid', 'lid-shell.pin', 'fastened');
frameAt(pin, 'washer-a', [0, 13.8, 0], 2.6);
frameAt(washerA, 'bore', [0, 13.8, 0], 2.6);
arm.mate('washer-1', 'hinge-pin.washer-a', 'washer-1.bore', 'fastened');
frameAt(pin, 'washer-b', [0, -13.8, 0], 2.6);
frameAt(washerB, 'bore', [0, -13.8, 0], 2.6);
arm.mate('washer-2', 'hinge-pin.washer-b', 'washer-2.bore', 'fastened');
screwXY.forEach(([x, y], i) => {
  const at = [x, y, 11.2] as [number, number, number];
  frameAt(lid, `screw-${i + 1}`, at, 2.1);
  frameAt(screws[i], 'head', at, 0);
  arm.mate(`lid-screw-${i + 1}`, `lid-shell.screw-${i + 1}`, `lid-screw-${i + 1}.head`, 'fastened');
});
FOOT_XY.forEach(([x, y], i) => {
  frameAt(base, `foot-${i + 1}`, [x, y, -19], 2);
  frameAt(feet[i], 'pad', [x, y, -19], 2);
  arm.mate(`foot-${i + 1}`, `base-shell.foot-${i + 1}`, `foot-${i + 1}.pad`, 'fastened');
});
frameAt(base, 'gasket', [-59, -26.5, 10.2], 1.2);
frameAt(gasket, 'land', [-59, -26.5, 10.2], 1.2);
arm.mate('gasket', 'base-shell.gasket', 'gasket.land', 'fastened');
frameAt(lid, 'latch', [86, 0, 1], 2);
frameAt(latch, 'root', [86, 0, 1], 2);
arm.mate('latch', 'lid-shell.latch', 'latch-hook.root', 'fastened');
frameAt(base, 'strike', [-101.8, -26, 6], 2);
frameAt(strike, 'root', [-101.8, -26, 6], 2);
arm.mate('strike', 'base-shell.strike', 'strike.root', 'fastened');

return arm.solvedModel({});
```
