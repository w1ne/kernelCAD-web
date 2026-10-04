---
id: nema-shaft-spur-drive-stack
title: NEMA plate, motor, shaft, bearing, and spur pair as one drive stack
tags: [plate, hole, assembly, mate, connector, motor, nema, shaft, bearing, gear, involute, material, manufacturing, datum]
keywords:
  - NEMA shaft spur drive stack
  - motor plate bearing pinion manufacturable
  - stepper stand-in involute pair under plate
  - cylindrical shaft bearing no USD Isaac
  - geometric mesh not tooth contact dynamics
  - BOM aluminum steel nylon drive stack
  - do not animate spur pair
when_to_use: >-
  Prompt asks for one manufacturable drive stack: a NEMA-style mounting
  plate, a motor stand-in, two shafts in bearing seats, and an involute spur
  pair under the plate. Prefer catalog nema17 and bearing608 when those
  parts are available; this script uses BREP stand-ins so evaluate stays
  offline. Spur flanks are a static geometric mesh at m(z1+z2)/2 — not
  tooth-contact dynamics, not coupleMates, not a gear-pair transmission.
  Do not animate the pair. Do not export USD Isaac: the cylindrical
  drive-shaft mate fails with export.usd.joint-unsupported. The idler
  shaft is fastened. Only one of the four bolt-hole frames is mated —
  four fastened mates on that pair plus the cylindrical mate are a loop
  the solver refuses. After a full
  evaluate_script, inspect BOM and export a PDF or SVG drawing. Datums are
  annotation, not a certification. Report FEA UNVERIFIED unless CalculiX
  and gmsh are present. Prefer design_loop until green.
---

Plate, motor, two bearing seats, and a phased spur pair. The motor shaft
is the protruding drive shaft only — it is not fused into the motor body.

```typescript
// NEMA plate + motor stand-in + shaft/bearing + involute spur pair.
// Geometric mesh at center distance m(z1+z2)/2 with a half-pitch phase
// on the even gear. NOT tooth-contact dynamics, NOT a coupled-mate ratio,
// NOT a gear-pair transmission. Do NOT animate — rotation will not keep mesh.
// Motor is a BREP stand-in, not lib.standard.nema17(). Bearings are BREP
// stand-ins, not lib.standard.bearing608().
// The drive shaft uses one cylindrical mate (USD Isaac refuses it:
// export.usd.joint-unsupported). The idler shaft is fastened. A second
// cylindrical mate is still a tree, but four bolt mates plus any
// cylindrical mate is a loop the solver refuses at 0 iterations.
// Bearing OD is 14 mm so the races clear a 16 mm gear center distance.
// After full evaluate_script: inspect({ of: 'bom' }) or export bom-csv /
// bom-json, then pdf-drawing / svg-drawing. Datums are annotation intent,
// not a GD&T certification. FEA only when CalculiX + gmsh are present.

const moduleMm = 1;
const z1 = 16;
const z2 = 16;
const face = 5;
const backlash = 0.12;
const cd = (moduleMm * (z1 + z2)) / 2;
const shaftR = 3.7;
const boreD = 8.2;

let plate = box(90, 64, 8).translate(-30, -32, 0);
for (const x of [0, cd]) {
  plate = plate.subtract(cylinder(7.6, 7.25).translate(x, 0, 0.6));
  plate = plate.subtract(cylinder(12, 5.1).translate(x, 0, -2));
}
const offs = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]] as const;
// NEMA 17 bolt holes as real hole features. The plate's top face centre is at
// (15, 0), so u = x - 15 and v = y.
plate = plate.holes('top', {
  positions: offs.map(([x, y]) => ({ u: x - 15, v: y })),
  diameter: 3.4,
  depth: 'through',
});
plate = plate
  .datum('A', { atZ: 0 })
  .datum('B', { atX: -30 })
  .datum('C', { atY: -32 });

function bearingAt(x) {
  // OD 14 mm so the two races clear a 16 mm center distance (r=11 would intersect).
  return cylinder(7, 7).subtract(cylinder(9, 4.15).translate(0, 0, -1)).translate(x, 0, 0.8);
}
function shaftAt(x) {
  return cylinder(18, shaftR).translate(x, 0, -11);
}
function gearAt(x, phase) {
  return spurGear({ module: moduleMm, teeth: z1, faceWidth: face, bore: boreD, backlash })
    .rotateZ(phase)
    .translate(x, 0, -10);
}

const motorBody = box(42, 42, 34, true)
  .translate(0, 0, 25)
  .union(cylinder(2, 11).translate(0, 0, 42))
  .color('actuator');

const arm = assembly('nema-spur-stack');
const pl = arm.part('plate', plate, { material: 'aluminum-6061' });
const mo = arm.part('motor', motorBody, { material: 'aluminum' });
const db = arm.part('drive-bearing', bearingAt(0), { material: 'mild-steel' });
const ib = arm.part('idler-bearing', bearingAt(cd), { material: 'mild-steel' });
const ds = arm.part('drive-shaft', shaftAt(0), { material: 'mild-steel' });
const idler = arm.part('idler-shaft', shaftAt(cd), { material: 'mild-steel' });
const pinion = arm.part('pinion', gearAt(0, 0), { material: 'nylon' });
const gear = arm.part('gear', gearAt(cd, z2 % 2 === 0 ? 180 / z2 : 0), { material: 'nylon' });

function axisConn(part, name, x, z, clearance) {
  part.connector(name, {
    type: 'axis',
    origin: { kind: 'vec3', value: [x, 0, z] },
    axis: [0, 0, 1],
    ...(clearance ? { jointClearanceRadius: clearance } : {}),
  });
}
axisConn(db, 'bore', 0, 4, 4.3);
axisConn(ds, 'axis', 0, 4);

pinion.connector('bore', {
  type: 'frame', origin: { kind: 'vec3', value: [0, 0, -7.5] }, jointClearanceRadius: 4.3,
});
ds.connector('pinion', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -7.5] } });
gear.connector('bore', {
  type: 'frame', origin: { kind: 'vec3', value: [cd, 0, -7.5] }, jointClearanceRadius: 4.3,
});
idler.connector('gear', { type: 'frame', origin: { kind: 'vec3', value: [cd, 0, -7.5] } });
db.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 4] } });
pl.connector('drive-seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 4] } });
ib.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [cd, 0, 4] } });
pl.connector('idler-seat', { type: 'frame', origin: { kind: 'vec3', value: [cd, 0, 4] } });

offs.forEach(([u, v], i) => {
  const at = [u, v, 8] as [number, number, number];
  pl.connector(`bolt-holes-${i + 1}`, { type: 'frame', origin: { kind: 'vec3', value: at } });
  mo.connector(`bolt-holes-${i + 1}`, { type: 'frame', origin: { kind: 'vec3', value: at } });
});
// One fastened mate, not four. Four mates between the same pair are a
// loop; a loop that also contains the cylindrical shaft mate is refused
// up front (assembly.solver.did-not-converge, 0 iterations).
arm.mate('motor-face', 'motor.bolt-holes-1', 'plate.bolt-holes-1', 'fastened');

arm.mate('drive-seat', 'drive-bearing.seat', 'plate.drive-seat', 'fastened');
arm.mate('idler-seat', 'idler-bearing.seat', 'plate.idler-seat', 'fastened');
arm.mate('drive-spin', 'drive-shaft.axis', 'drive-bearing.bore', 'cylindrical');
idler.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [cd, 0, 4] } });
ib.connector('shaft-seat', {
  type: 'frame', origin: { kind: 'vec3', value: [cd, 0, 4] }, jointClearanceRadius: 4.3,
});
arm.mate('idler-seat-shaft', 'idler-shaft.seat', 'idler-bearing.shaft-seat', 'fastened');
arm.mate('pinion-hub', 'pinion.bore', 'drive-shaft.pinion', 'fastened');
arm.mate('gear-hub', 'gear.bore', 'idler-shaft.gear', 'fastened');

return arm.solvedModel({});
```
