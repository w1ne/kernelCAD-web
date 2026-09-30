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

let plate = extrudeRoundedRect(96, 72, 6, 8).translate(18, 0, 0);
for (const x of [0, cd]) {
  // Seat opens downward so the race can stand proud of the plate, above the gears.
  plate = plate.subtract(cylinder(8, 7.35).translate(x, 0, -1.6));
  plate = plate.subtract(cylinder(14, 4.7).translate(x, 0, -2));
}
const offs = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]] as const;
for (const [u, v] of offs) {
  plate = plate
    .subtract(cylinder(12, 1.7).translate(u, v, -2))
    .subtract(cylinder(2.4, 3.1).translate(u, v, 5.6));
}
plate = plate
  .datum('A', { atZ: 0 })
  .datum('B', { atX: -30 })
  .datum('C', { atY: -32 })
  .finish('aluminium-brushed');

function bearingAt(x: number) {
  // OD 14 mm so the two races clear a 16 mm center distance (r=11 would intersect).
  const outer = path()
    .moveTo(5.55, 0).lineTo(7, 0).lineTo(7, 7).lineTo(5.55, 7)
    .lineTo(5.55, 4.7).lineTo(6.15, 3.5).lineTo(5.55, 2.3).lineTo(5.55, 0)
    .close().revolve();
  const inner = path()
    .moveTo(4.2, 0).lineTo(5.15, 0).lineTo(5.15, 2.3).lineTo(4.6, 3.5)
    .lineTo(5.15, 4.7).lineTo(5.15, 7).lineTo(4.2, 7).lineTo(4.2, 0)
    .close().revolve();
  let balls = sphere(0.85).translate(5.35, 0, 3.5);
  for (let i = 1; i < 6; i += 1) {
    const a = (2 * Math.PI * i) / 6;
    balls = balls.union(sphere(0.85).translate(5.35 * Math.cos(a), 5.35 * Math.sin(a), 3.5));
  }
  return outer.union(inner, balls).translate(x, 0, -1.15).finish('steel');
}
function shaftAt(x: number) {
  return path()
    .moveTo(0, -14).lineTo(shaftR, -14).lineTo(shaftR, -4.75)
    .lineTo(4.5, -4.75).lineTo(4.5, -1.45)
    .lineTo(3.5, -1.45).lineTo(3.5, 8).lineTo(0, 8)
    .close().revolve().translate(x, 0, 0).finish('stainless');
}
function gearAt(x: number, phase: number) {
  return spurGear({ module: moduleMm, teeth: z1, faceWidth: face, bore: boreD, backlash })
    .rotateZ(phase)
    .translate(x, 0, -10)
    .finish('abs', { color: '#f3efe4' });
}

const motorBody = extrudeRoundedRect(42.3, 42.3, 3, 33).translate(0, 0, 8.2)
  .union(cylinder(2.4, 16.5).translate(0, 0, 39.4))
  .union(cylinder(2.2, 11).translate(0, 0, 41.6))
  .finish('anodized-black');

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
