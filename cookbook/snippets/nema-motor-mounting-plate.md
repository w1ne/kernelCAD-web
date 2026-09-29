---
id: nema-motor-mounting-plate
title: NEMA-17 style mounting plate with four-bolt pattern and fastened motor
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
  plate with the standard four-bolt pattern (±15.5 mm, Ø3.2 clearance). Prefer
  catalog `lib.standard.nema17()` when the parts catalog is available; this
  snippet uses a BREP stand-in motor so evaluate stays offline/CI-green. Declare
  matching `bolt-holes-N` frames on the plate (`.holes()` auto-connectors stay
  on the holes feature id) and mate with the 4-arg form.
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
const offs = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]] as const;
offs.forEach(([u, v], i) => {
  plate.connector(`bolt-holes-${i + 1}`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [u, v, 2.5] },
  });
});

// Offline stand-in for lib.standard.nema17() — swap to catalog motor when
// assets/parts (or remote catalog) is available in the agent runtime.
const motorBody = box(42, 42, 40, true)
  .union(cylinder(22, 2.5).translate(0, 0, 20));
const motor = arm.part('motor', motorBody.translate(0, 0, 25).color('actuator'));
offs.forEach(([u, v], i) => {
  motor.connector(`bolt-holes-${i + 1}`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [u, v, 5] },
  });
});
arm.mate('b1', 'motor.bolt-holes-1', 'plate.bolt-holes-1', 'fastened');
arm.mate('b2', 'motor.bolt-holes-2', 'plate.bolt-holes-2', 'fastened');
arm.mate('b3', 'motor.bolt-holes-3', 'plate.bolt-holes-3', 'fastened');
arm.mate('b4', 'motor.bolt-holes-4', 'plate.bolt-holes-4', 'fastened');
return arm.model();
```
