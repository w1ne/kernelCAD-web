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

const R = 8;
const pinR = 2.4;
const boreR = 2.75;
const yCyl = (r, y0, y1, x = 0, z = 0) =>
  cylinder(y1 - y0, r).rotateX(-90).translate(x, y0, z);

const cheeks = union(
  yCyl(R, 6, 12),
  yCyl(R, -12, -6),
).subtract(yCyl(boreR, -13, 13));
const bridge = box(12, 16, 10).translate(-22, -8, -5);

let baseShell = box(78, 72, 28).translate(-98, -36, -18);
baseShell = baseShell.subtract(box(70, 64, 26).translate(-94, -32, -14));
baseShell = baseShell.subtract(cylinder(12, 2.1).translate(-60, 0, -20));

const baseBody = union(cheeks, bridge, baseShell)
  .datum('A', { atZ: -18 })
  .datum('B', { atX: -98 })
  .datum('C', { atY: -36 })
  .tolerance({
    type: 'position', value: 0.3, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [-60, 0, -18] },
  });

const tongue = yCyl(R - 0.4, -4.6, 4.6);
const pin = yCyl(pinR, -12.4, 12.4);
const neck = box(22, 8, 8).translate(0, -4, -4);
let lidShell = box(64, 68, 22).translate(18, -34, -10);
lidShell = lidShell.subtract(box(56, 60, 20).translate(22, -30, -8));
const lidBody = union(tongue, pin, neck, lidShell);

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
