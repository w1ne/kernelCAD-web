---
id: heat-set-insert-pilot
title: Heat-set threaded insert pilot holes for FDM prints (M2.5/M3/M4)
tags: [hole, fastener, thread, manufacturing, printer, choice-param, plate]
keywords:
  - heat set insert hole for M3 M2.5 M4 brass threaded insert
  - heat-set insert pilot diameter and depth for 3D printing
  - melt-in insert boss in PLA PETG enclosure
  - insert pilot 4.0 to 4.2 mm for M3, print a test coupon first
  - lead-in chamfer countersink on the insert hole
when_to_use: >-
  A printed part takes brass heat-set (melt-in) threaded inserts. Cut the pilot
  with `hole()` / `holes()` (blind, insert length + 1 mm deep, with a small
  countersink lead-in), sized from the insert maker's table — not the screw's
  tap drill and not a subtracted cylinder. Keep >= 1.6 mm of wall around the pilot.
---

```typescript
// Typical short brass heat-set inserts (CNC-Kitchen / Ruthex style). The pilot
// is the insert's recommended hole; check your insert's datasheet and print a
// coupon: PLA often wants +0.1-0.2 mm over the table.
//   size   pilot Ø   insert length   min wall around the pilot
//   M2.5   3.6       4.0             1.6
//   M3     4.0       5.7             1.6   (users with 4.2 mm pilots: shorter, knurled inserts)
//   M4     5.6       8.1             2.0
const INSERT: Record<string, { pilot: number; length: number; wall: number }> = {
  'M2.5': { pilot: 3.6, length: 4.0, wall: 1.6 },
  M3: { pilot: 4.0, length: 5.7, wall: 1.6 },
  M4: { pilot: 5.6, length: 8.1, wall: 2.0 },
};
const size = param('Insert', 'M3', { choices: ['M2.5', 'M3', 'M4'] });
const ins = INSERT[size.value];
const spacing = 40;

// Mounting bar: tall enough for the insert plus 1 mm of melt room under it,
// wide enough for the minimum wall on each side of the pilot.
const depth = ins.length + 1;
const barH = depth + 2;
const barW = ins.pilot + 2 * ins.wall + 4;
const bar = box(spacing + barW, barW, barH).translate(-(spacing + barW) / 2, -barW / 2, 0);

const withInserts = bar.holes('top', {
  positions: [{ u: -spacing / 2, v: 0 }, { u: spacing / 2, v: 0 }],
  diameter: ins.pilot,
  depth,                                                  // blind
  countersink: { diameter: ins.pilot + 0.8, angleDeg: 90 }, // lead-in for the hot insert
  name: 'insertPilot',
});

return withInserts;
```
