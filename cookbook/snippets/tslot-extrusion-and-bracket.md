---
id: tslot-extrusion-and-bracket
title: 20x20 B-type T-slot extrusion with slot-6 opening and corner connector
tags: [extrusion, tslot, extrude, subtract, sketch, assembly, parameter]
keywords:
  - 20x20 B-type T-slot extrusion slot 6
  - six millimetre slot opening for a T-nut
  - aluminum profile trimmed to a length param
  - 90-degree corner connector for the extrusion
when_to_use: >-
  You need a 20×20 B-type T-slot extrusion (slot 6, 6 mm slot opening)
  trimmed to a length param, plus a matching 90-degree corner connector
  that fastens on the T-slots.
---

```typescript
const length = param('length', 120, { min: 20, max: 800 });
const profileSize = 20;
const slotOpening = 6;
const slotInner = 11;
const lip = 1.6;
const slotDepth = 6.2;
const coreR = 2.1; // Ø4.2 core

function slotCutter() {
  const halfOpen = slotOpening / 2;
  const halfWide = slotInner / 2;
  // Overshoot the length param range so the channel is always through.
  const h = 802;
  const stem = box(slotOpening, lip + 2, h)
    .translate(-halfOpen, profileSize / 2 - lip, -1);
  const pocket = box(slotInner, slotDepth - lip + 0.2, h)
    .translate(-halfWide, profileSize / 2 - slotDepth, -1);
  return stem.union(pocket);
}

let bar = box(profileSize, profileSize, length)
  .translate(-profileSize / 2, -profileSize / 2, 0);
for (const deg of [0, 90, 180, 270]) {
  bar = bar.subtract(slotCutter().rotateZ(deg));
}
// Core bore as a real hole feature (not a subtracted cylinder) so export,
// drawings and DFM read its diameter back. The four slot cuts split the top
// face, so name the central island by its normal and centre — `length` is a
// ParamRef, so atZ cannot be used here. u/v are mm from that face's centre
// and the bore is on the rail axis, so both are 0.
const extrusion = bar.hole({ byNormal: 'Z', atX: 0, atY: 0 }, {
  u: 0,
  v: 0,
  diameter: 2 * coreR,
  depth: 'through',
});

// Gauge sitting in the +Y face opening so inspect can read the 6 mm slot.
const gauge = box(slotOpening, 0.2, 20).translate(-slotOpening / 2, profileSize / 2 - 0.1, 50);

const plateT = 3;
const leg = 28;
// Base-plate clearance as a real hole: cut it on the bare plate, whose top
// face spans the full leg × profileSize, so u/v are mm from (leg/2,
// profileSize/2) — world (leg - 10, profileSize / 2) becomes (leg / 2 - 10, 0).
// The second bore has to stay a subtracted cylinder: it runs UP the 3 mm
// upright at x = plateT / 2 with a Ø5.5 tool, so it breaks out of both side
// walls. That is not a bore in a face and hole() cannot express it.
const connector = box(leg, profileSize, plateT)
  .hole('top', { u: leg / 2 - 10, v: 0, diameter: 5.5, depth: 'through' })
  .union(box(plateT, profileSize, leg).translate(0, 0, plateT))
  .subtract(cylinder(leg + 2, 2.75).translate(plateT / 2, profileSize / 2, -1));

const arm = assembly('tslot-extrusion-and-connector');
arm.part('extrusion', extrusion);
arm.part('slot-opening-gauge', gauge);
arm.part('corner-connector', connector, { at: [profileSize + 6, -profileSize / 2, 0] });
return arm.model();
```
