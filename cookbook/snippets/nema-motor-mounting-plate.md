---
id: nema-motor-mounting-plate
title: NEMA stepper mounting plate with catalog motor and fastened bolt pattern
tags: [plate, hole, assembly, mate, connector, catalog, fasteners, motor, nema, parameter]
keywords:
  - NEMA 17 mounting plate
  - NEMA stepper motor mount
  - four-bolt motor face pattern
  - catalog nema17 fastened to plate
  - motor flange mounting holes 31 mm
  - production motor plate not hand-drawn bolt circle
when_to_use: >-
  Prompt asks for a NEMA mounting plate, stepper motor mount, or motor flange
  plate with the standard four-bolt pattern. Prefer catalog `lib.standard.nema17()`
  plus plate holes + explicit `bolt-holes-N` frames mated fastened. Note: `.holes()`
  auto-connectors attach to the holes feature id — declare matching frames on the
  part before `arm.mate(name, a, b, 'fastened')` (4-arg form).
---

```typescript
const arm = assembly('nema-mount');
const plateShape = box(80, 80, 5, true).holes('top', {
  positions: [
    { u: -15.5, v: -15.5 }, { u: 15.5, v: -15.5 },
    { u: -15.5, v: 15.5 },  { u: 15.5, v: 15.5 },
  ],
  diameter: 3.2,
  depth: 'through',
});
const plate = arm.part('plate', plateShape, { material: 'aluminum' });
// .holes() auto bolt-holes stay on the holes feature id — declare part frames.
const offs = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]] as const;
offs.forEach(([u, v], i) => {
  plate.connector(`bolt-holes-${i + 1}`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [u, v, 2.5] },
  });
});
const motor = await lib.standard.nema17();
arm.part('motor', motor);
arm.mate('b1', 'motor.bolt-holes-1', 'plate.bolt-holes-1', 'fastened');
arm.mate('b2', 'motor.bolt-holes-2', 'plate.bolt-holes-2', 'fastened');
arm.mate('b3', 'motor.bolt-holes-3', 'plate.bolt-holes-3', 'fastened');
arm.mate('b4', 'motor.bolt-holes-4', 'plate.bolt-holes-4', 'fastened');
return arm.model();
```
