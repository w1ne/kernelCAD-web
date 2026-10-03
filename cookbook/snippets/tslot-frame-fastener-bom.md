---
id: tslot-frame-fastener-bom
title: T-slot frame corner — two rails, gusset, cap screws, named materials
tags: [extrusion, tslot, assembly, connector, mate, material, bom, fastener, manufacturing, hole]
keywords:
  - T-slot frame corner fastener BOM
  - two 2020 rails gusset plate
  - cap screws clearance shank not V-thread
  - aluminum rails steel screws materials
  - frame joint shop stack
  - T-nuts not modeled
when_to_use: >-
  Prompt asks for a T-slot frame corner as a manufacturable stack: two
  rails, a gusset on the slot faces, and cap screws with named materials so
  a BOM has mass. Screws are cylinder-head stand-ins with clearance shanks,
  not a swept ISO V-thread — use the metric bolt snippet when the prompt
  needs that thread. T-nuts are not modeled; each shank stops in the slot
  void. After a full evaluate_script, inspect BOM and export a PDF or SVG
  drawing. Report FEA UNVERIFIED unless CalculiX and gmsh are present.
---

Two rails meet at a corner. A gusset and two clearance cap screws are
separate BOM lines. The shanks sit in the existing slot voids.

```typescript
// T-slot frame corner. Two rails, a gusset, two cap screws, named
// materials. Screws are cylinder heads + clearance shanks — NOT a swept
// 60° V-thread (lookup the ISO metric bolt snippet for that). T-nuts are
// NOT modeled; the shank ends in the slot void.
// After full evaluate_script: inspect({ of: 'bom' }) or export bom-csv /
// bom-json, then pdf-drawing / svg-drawing. FEA only when CalculiX + gmsh
// are present — otherwise report UNVERIFIED. No run_fea in this script.

// Authored at 80 mm. A length slider is omitted: the gusset and screw
// stations are placed on that default, and a lone param() would move the
// rails without the joint.
const length = 80;
const profileSize = 20;
const slotOpening = 6;
const slotInner = 11;
const lip = 1.6;
const slotDepth = 6.2;
const coreR = 2.1;

function slotCutter() {
  const halfOpen = slotOpening / 2;
  const halfWide = slotInner / 2;
  const h = 802;
  const stem = box(slotOpening, lip + 2, h).translate(-halfOpen, profileSize / 2 - lip, -1);
  const pocket = box(slotInner, slotDepth - lip + 0.2, h)
    .translate(-halfWide, profileSize / 2 - slotDepth, -1);
  return stem.union(pocket);
}

function extrusion() {
  let bar = box(profileSize, profileSize, length)
    .translate(-profileSize / 2, -profileSize / 2, 0);
  for (const deg of [0, 90, 180, 270]) {
    bar = bar.subtract(slotCutter().rotateZ(deg));
  }
  // Core bore as a real hole feature (not a subtracted cylinder) so BOM,
  // drawings and DFM read its diameter back. The four slot cuts split the
  // top face, so name the central island by its normal and centre rather
  // than the bare canonical 'top'. u/v are mm from that face's centre, and
  // the bore is on the rail axis, so both are 0.
  return bar.hole({ byNormal: 'Z', atX: 0, atY: 0, atZ: length }, {
    u: 0,
    v: 0,
    diameter: 2 * coreR,
    depth: 'through',
  });
}

const upright = extrusion();
const rail = extrusion().rotateY(90).translate(10, 0, 70);

function yCyl(r, y0, len, x, z) {
  return cylinder(len, r).rotateX(-90).translate(x, y0, z);
}

// Gusset screw clearances as real holes. The entry face is the gusset's -Y
// face; on front/back faces u = +X and v = +Z, measured from the face centre
// (12, 71), so world x = 0 and 22 become u = -12 and 10, and world z = 72
// becomes v = 1.
const gusset = box(40, 3, 18)
  .translate(-8, 10, 62)
  .holes('front', {
    positions: [{ u: -12, v: 1 }, { u: 10, v: 1 }],
    diameter: 5.6,
    depth: 'through',
  });

function capScrew(x, z) {
  const head = yCyl(4, 13, 3.2, x, z);
  const shank = yCyl(2.25, 6, 7, x, z);
  return head.union(shank);
}

const arm = assembly('tslot-frame-corner');
const up = arm.part('upright', upright, { material: 'aluminum-6061' });
const rl = arm.part('rail', rail, { material: 'aluminum-6061' });
const gu = arm.part('gusset', gusset, { material: 'aluminum-6061' });
const s1 = arm.part('screw-1', capScrew(0, 72), { material: 'mild-steel' });
const s2 = arm.part('screw-2', capScrew(22, 72), { material: 'mild-steel' });

const corner = [10, 0, 70] as [number, number, number];
up.connector('end', { type: 'frame', origin: { kind: 'vec3', value: corner } });
rl.connector('end', { type: 'frame', origin: { kind: 'vec3', value: corner } });
gu.connector('face', { type: 'frame', origin: { kind: 'vec3', value: [0, 10, 72] } });
up.connector('gusset', { type: 'frame', origin: { kind: 'vec3', value: [0, 10, 72] } });
s1.connector('head', { type: 'frame', origin: { kind: 'vec3', value: [0, 13, 72] } });
s2.connector('head', { type: 'frame', origin: { kind: 'vec3', value: [22, 13, 72] } });
gu.connector('screw-1', { type: 'frame', origin: { kind: 'vec3', value: [0, 13, 72] } });
gu.connector('screw-2', { type: 'frame', origin: { kind: 'vec3', value: [22, 13, 72] } });

arm.mate('corner', 'rail.end', 'upright.end', 'fastened');
arm.mate('gusset', 'gusset.face', 'upright.gusset', 'fastened');
arm.mate('screw-1', 'screw-1.head', 'gusset.screw-1', 'fastened');
arm.mate('screw-2', 'screw-2.head', 'gusset.screw-2', 'fastened');

return arm.solvedModel({});
```
