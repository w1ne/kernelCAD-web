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
const boreD = 8.2;
// Hero camera is on -Y, 26° above the plate. A pair under the deck is
// invisible in that shot, so the mesh, races, and shafts stand on the
// plate in front of the motor.
const gearY = -36;
const gearZ = 12.8;
const bearingZ = 6.2;

let plate = extrudeRoundedRect(108, 96, 8, 7).translate(10, -14, 0);
plate = plate.subtract(extrudeRoundedRect(44, 44, 3, 0.7).translate(0, 0, 6.35));
for (const x of [0, cd]) {
  // Seat opens upward. Race OD is 14 mm; 0.25 mm radial air, no volume overlap.
  plate = plate.subtract(cylinder(2.6, 7.25).translate(x, gearY, 5.0));
  plate = plate.subtract(cylinder(12, 4.7).translate(x, gearY, -1));
}
const offs = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]] as const;
for (const [u, v] of offs) {
  plate = plate
    .subtract(cylinder(12, 1.8).translate(u, v, -2))
    .subtract(cylinder(2.8, 3.2).translate(u, v, 4.4));
}
plate = plate
  .datum('A', { atZ: 0 })
  .datum('B', { atX: -44 })
  .datum('C', { atY: -62 })
  .finish('anodized', { color: '#c5d0d8' });

function bearingAt(x: number) {
  // OD 14 mm so the two races clear a 16 mm center distance (r=11 would intersect).
  const outer = path()
    .moveTo(5.55, 0).lineTo(7, 0).lineTo(7, 5.5).lineTo(5.55, 5.5)
    .lineTo(5.55, 3.7).lineTo(6.2, 2.75).lineTo(5.55, 1.8).lineTo(5.55, 0)
    .close().revolve();
  const inner = path()
    .moveTo(4.2, 0).lineTo(5.15, 0).lineTo(5.15, 1.8).lineTo(4.55, 2.75)
    .lineTo(5.15, 3.7).lineTo(5.15, 5.5).lineTo(4.2, 5.5).lineTo(4.2, 0)
    .close().revolve();
  let balls = sphere(0.75).translate(5.35, 0, 2.75);
  for (let i = 1; i < 6; i += 1) {
    const a = (2 * Math.PI * i) / 6;
    balls = balls.union(sphere(0.75).translate(5.35 * Math.cos(a), 5.35 * Math.sin(a), 2.75));
  }
  return outer.union(inner, balls).translate(x, gearY, bearingZ).finish('steel');
}
function shaftAt(x: number) {
  // Journal through the plate and the race, shoulder in the air gap,
  // nose through the gear, collar above the mesh.
  return path()
    .moveTo(0, 1.5).lineTo(3.35, 1.5).lineTo(3.35, 11.85)
    .lineTo(4.5, 11.85).lineTo(4.5, 12.65)
    .lineTo(3.45, 12.65).lineTo(3.45, 18.1)
    .lineTo(5.15, 18.1).lineTo(5.15, 20)
    .lineTo(3.05, 20).lineTo(3.05, 23.5)
    .lineTo(0, 23.5)
    .close().revolve().translate(x, gearY, 0).finish('stainless');
}
function gearAt(x: number, phase: number, color: string) {
  return spurGear({ module: moduleMm, teeth: z1, faceWidth: face, bore: boreD, backlash })
    .rotateZ(phase)
    .translate(x, gearY, gearZ)
    .finish('abs', { color });
}

const flangeZ = 7.3;
let motorBody = extrudeRoundedRect(42.3, 42.3, 2, 5).translate(0, 0, flangeZ);
motorBody = motorBody
  .union(extrudeRoundedRect(36, 36, 2.4, 28).translate(0, 0, flangeZ + 4.6))
  .union(extrudeRoundedRect(22, 2.2, 0.6, 24).translate(0, 19.4, flangeZ + 6))
  .union(extrudeRoundedRect(22, 2.2, 0.6, 24).translate(0, -19.4, flangeZ + 6))
  .union(extrudeRoundedRect(2.2, 22, 0.6, 24).translate(19.4, 0, flangeZ + 6))
  .union(extrudeRoundedRect(2.2, 22, 0.6, 24).translate(-19.4, 0, flangeZ + 6))
  .union(cylinder(2.6, 15).translate(0, 0, flangeZ + 32.4))
  .union(cylinder(2.2, 8).translate(0, 0, flangeZ + 34.8))
  .finish('anodized-black');

const arm = assembly('nema-spur-stack');
const pl = arm.part('plate', plate, { material: 'aluminum-6061' });
const mo = arm.part('motor', motorBody, { material: 'aluminum' });
const db = arm.part('drive-bearing', bearingAt(0), { material: 'mild-steel' });
const ib = arm.part('idler-bearing', bearingAt(cd), { material: 'mild-steel' });
const ds = arm.part('drive-shaft', shaftAt(0), { material: 'mild-steel' });
const idler = arm.part('idler-shaft', shaftAt(cd), { material: 'mild-steel' });
const pinion = arm.part('pinion', gearAt(0, 0, '#f3efe4'), { material: 'nylon' });
const gear = arm.part('gear', gearAt(cd, z2 % 2 === 0 ? 180 / z2 : 0, '#d5e2ea'), { material: 'nylon' });

function axisConn(part, name, x, z, clearance) {
  part.connector(name, {
    type: 'axis',
    origin: { kind: 'vec3', value: [x, gearY, z] },
    axis: [0, 0, 1],
    ...(clearance ? { jointClearanceRadius: clearance } : {}),
  });
}
axisConn(db, 'bore', 0, 9, 4.3);
axisConn(ds, 'axis', 0, 9);

const gearMidZ = gearZ + face / 2;
pinion.connector('bore', {
  type: 'frame', origin: { kind: 'vec3', value: [0, gearY, gearMidZ] }, jointClearanceRadius: 4.3,
});
ds.connector('pinion', { type: 'frame', origin: { kind: 'vec3', value: [0, gearY, gearMidZ] } });
gear.connector('bore', {
  type: 'frame', origin: { kind: 'vec3', value: [cd, gearY, gearMidZ] }, jointClearanceRadius: 4.3,
});
idler.connector('gear', { type: 'frame', origin: { kind: 'vec3', value: [cd, gearY, gearMidZ] } });
db.connector('seat', {
  type: 'frame', origin: { kind: 'vec3', value: [0, gearY, 9] }, jointClearanceRadius: 4.3,
});
pl.connector('drive-seat', {
  type: 'frame', origin: { kind: 'vec3', value: [0, gearY, 9] }, jointClearanceRadius: 7.3,
});
ib.connector('seat', {
  type: 'frame', origin: { kind: 'vec3', value: [cd, gearY, 9] }, jointClearanceRadius: 4.3,
});
pl.connector('idler-seat', {
  type: 'frame', origin: { kind: 'vec3', value: [cd, gearY, 9] }, jointClearanceRadius: 7.3,
});

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
idler.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [cd, gearY, 9] } });
ib.connector('shaft-seat', {
  type: 'frame', origin: { kind: 'vec3', value: [cd, gearY, 9] }, jointClearanceRadius: 4.3,
});
arm.mate('idler-seat-shaft', 'idler-shaft.seat', 'idler-bearing.shaft-seat', 'fastened');
arm.mate('pinion-hub', 'pinion.bore', 'drive-shaft.pinion', 'fastened');
arm.mate('gear-hub', 'gear.bore', 'idler-shaft.gear', 'fastened');

return arm.solvedModel({});
```
