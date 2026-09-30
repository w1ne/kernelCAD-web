---
id: planetary-gearbox-shop-release
title: Shop-release planetary gearbox — ring, carrier, machined housing, cover
tags: [gear, involute, planetary, assembly, connector, mate, material, manufacturing, fillet, hole, bom, datum]
keywords:
  - shop-release planetary gearbox stage
  - machined gearbox case carrier cover
  - sun planets ring fastened assembled pose
  - BOM aluminum nylon steel planetary
  - involute flanks not tooth contact dynamics
  - no coupleMates no gear-pair transmission
  - do not animate planetary rotation
  - usd-isaac stays fastened only
when_to_use: >-
  Prompt asks for a shop-release planetary gearbox, not a bare gear set: a
  machined housing with a ring pocket, floor, mounting holes and a fillet; a
  carrier with planet pins; a sun shaft; a cover; named materials. Teeth stay
  true involutes placed so the pitch circles meet. That is a static assembled
  pose — not tooth-contact dynamics, backlash simulation, or torque through
  the flanks. Do not coupleMates, do not declare a gear-pair transmission, and
  do not animate rotation; the kernel will not keep teeth in mesh. Every mate
  in this script is fastened so usd-isaac is not blocked by a cylindrical
  joint. After a full evaluate_script, inspect BOM and export a PDF or SVG
  drawing. Datums are annotation, not a certification. Report FEA UNVERIFIED
  unless CalculiX and gmsh are present. Prefer design_loop until green.
---

Shop-release planetary stage. The ring, sun, and planets are separate
bodies at pitch compatibility. Pins are clearance fits in the planet
bores. Nothing in this script spins.

```typescript
// Shop-release planetary gearbox. Involute flanks meet at the pitch
// circles (Zring = Zsun + 2·Zplanet). Static assembled pose ONLY — not
// tooth-contact dynamics, not a torque path, not a coupled-mate ratio,
// not a gear-pair transmission. Do NOT animate rotation; teeth will not stay
// in mesh. All mates are fastened (a cylindrical sun shaft would fail
// usd-isaac with export.usd.joint-unsupported).
// After full evaluate_script: inspect({ of: 'bom' }) or export bom-csv /
// bom-json, then pdf-drawing / svg-drawing. Datums are annotation intent,
// not a GD&T certification. FEA only when CalculiX + gmsh are present —
// otherwise report UNVERIFIED. No run_fea in this script.
// Catalog metadata is absent — these are fabricated stand-ins.

const moduleMm = 1;
const zSun = 12;
const zPlanet = 12;
const zRing = zSun + 2 * zPlanet; // 36
const face = 5;
const backlash = 0.08;
const planetCount = 3;
const rim = 3;

planetaryToothCompatibility({ sunTeeth: zSun, planetTeeth: zPlanet, ringTeeth: zRing });

const carrierR = (moduleMm * (zSun + zPlanet)) / 2; // m(Zsun+Zplanet)/2
// internalSpurGear outer radius = pitch + 1.25·module + rimThickness.
const ringOuterR = (moduleMm * zRing) / 2 + 1.25 * moduleMm + rim;
const seatR = ringOuterR + 0.4;

const wallR = seatR + 4.4;
const flangeR = wallR + 8;
// Turned cup: mounting flange, bore for the ring, shaft clearance through the floor.
let housing = path()
  .moveTo(3.4, -12)
  .lineTo(flangeR, -12)
  .lineTo(flangeR, -8)
  .lineTo(wallR, -8)
  .lineTo(wallR, 8)
  .lineTo(seatR, 8)
  .lineTo(seatR, -7.5)
  .lineTo(3.4, -7.5)
  .close()
  .revolve();
const boltR = flangeR - 4;
for (let i = 0; i < 6; i += 1) {
  const a = (Math.PI / 6) + (2 * Math.PI * i) / 6;
  housing = housing.subtract(cylinder(6, 1.55).translate(boltR * Math.cos(a), boltR * Math.sin(a), -13));
}
housing = housing
  .datum('A', { atZ: -12 })
  .datum('B', { atX: -flangeR })
  .datum('C', { atY: 0 })
  .tolerance({
    type: 'position', value: 0.2, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [boltR * Math.cos(Math.PI / 6), boltR * Math.sin(Math.PI / 6), -12] },
  })
  .finish('anodized', { color: '#3e6f86' });

let cover = path()
  .moveTo(17.5, 8.15)
  .lineTo(flangeR - 0.4, 8.15)
  .lineTo(flangeR - 0.4, 11.2)
  .lineTo(17.5, 11.2)
  .close()
  .revolve();
for (let i = 0; i < 6; i += 1) {
  const a = (Math.PI / 6) + (2 * Math.PI * i) / 6;
  cover = cover.union(
    cylinder(1.8, 2.5).translate(boltR * Math.cos(a), boltR * Math.sin(a), 11.2),
  );
}
cover = cover.finish('anodized-black');
const ring = internalSpurGear({
  module: moduleMm, teeth: zRing, faceWidth: face, backlash, rimThickness: rim,
}).finish('steel');
const sun = spurGear({ module: moduleMm, teeth: zSun, faceWidth: face, bore: 5, backlash })
  .finish('abs', { color: '#f3efe4' });
const sunShaft = path()
  .moveTo(0, -8).lineTo(2.15, -8).lineTo(2.15, -1.5)
  .lineTo(2.65, -1.5).lineTo(2.65, -0.25).lineTo(2.05, -0.25).lineTo(2.05, 3.1).lineTo(0, 3.1)
  .close().revolve().finish('stainless');

let carrier = cylinder(4.2, carrierR - 0.4).translate(0, 0, -7.1);
carrier = carrier.union(cylinder(3.2, 5.2).translate(0, 0, -7.4));
for (let i = 0; i < planetCount; i += 1) {
  const a = (2 * Math.PI * i) / planetCount;
  const px = carrierR * Math.cos(a);
  const py = carrierR * Math.sin(a);
  carrier = carrier
    .union(cylinder(3.4, 3.3).translate(px, py, -7.1))
    .union(cylinder(11, 1.55).translate(px, py, -7));
}
carrier = carrier.subtract(cylinder(8, 2.65).translate(0, 0, -9)).finish('aluminium-brushed');

const arm = assembly('planetary-gearbox-shop');
const h = arm.part('housing', housing, { material: 'aluminum-6061' });
const c = arm.part('cover', cover, { material: 'aluminum-6061' });
const rg = arm.part('ring', ring, { material: 'mild-steel' });
const su = arm.part('sun', sun, { material: 'nylon' });
const sh = arm.part('sun-shaft', sunShaft, { material: 'mild-steel' });
const ca = arm.part('carrier', carrier, { material: 'aluminum-6061' });

const planets = [];
for (let i = 0; i < planetCount; i += 1) {
  const ang = (360 / planetCount) * i;
  const rad = (ang * Math.PI) / 180;
  const planet = spurGear({ module: moduleMm, teeth: zPlanet, faceWidth: face, bore: 4, backlash })
    .rotateZ((zPlanet % 2 === 0 ? 180 / zPlanet : 0) + ang)
    .translate(carrierR * Math.cos(rad), carrierR * Math.sin(rad), 0)
    .finish('abs', { color: '#f6f1e4' });
  planets.push(arm.part(`planet-${i + 1}`, planet, { material: 'nylon' }));
}

h.connector('lid', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 8] } });
c.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 8] } });
h.connector('ring-seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
rg.connector('rim', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });
h.connector('carrier-seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -5] } });
ca.connector('hub', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -5] } });
// Frames, not axes: a fastened mate rejects an axis/axis pair.
sh.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -2] } });
ca.connector('shaft-bore', {
  type: 'frame', origin: { kind: 'vec3', value: [0, 0, -2] }, jointClearanceRadius: 2.7,
});
su.connector('bore', {
  type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] }, jointClearanceRadius: 2.6,
});
sh.connector('sun-hub', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 2] } });

arm.mate('cover', 'cover.seat', 'housing.lid', 'fastened');
arm.mate('ring-seat', 'ring.rim', 'housing.ring-seat', 'fastened');
arm.mate('carrier-seat', 'carrier.hub', 'housing.carrier-seat', 'fastened');
arm.mate('shaft-seat', 'sun-shaft.seat', 'carrier.shaft-bore', 'fastened');
arm.mate('sun-hub', 'sun.bore', 'sun-shaft.sun-hub', 'fastened');

for (let i = 0; i < planetCount; i += 1) {
  const a = (2 * Math.PI * i) / planetCount;
  const at = [carrierR * Math.cos(a), carrierR * Math.sin(a), 2] as [number, number, number];
  ca.connector(`pin-${i + 1}`, { type: 'frame', origin: { kind: 'vec3', value: at } });
  planets[i].connector('bore', {
    type: 'frame', origin: { kind: 'vec3', value: at }, jointClearanceRadius: 2.15,
  });
  arm.mate(`planet-${i + 1}`, `planet-${i + 1}.bore`, `carrier.pin-${i + 1}`, 'fastened');
}

return arm.solvedModel({});
```
