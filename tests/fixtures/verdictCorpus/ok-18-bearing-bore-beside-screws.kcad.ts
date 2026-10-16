// Correct: bearing plate bolted to a base. The plate carries a Ø16 blind
// bearing seat (the base closes it) with an M3 screw 12 mm from its centre;
// the base is tapped coaxially under every clearance hole and has an
// unrelated Ø7 drain hole 14 mm from the seat axis (closer than the two
// diameters, farther than the two radii). Neither the seat nor the drain is
// a screw hole, so neither needs a partner.
const screws = [{ u: -15, v: -10 }, { u: 15, v: -10 }, { u: -15, v: 10 }, { u: 12, v: 0 }];
const base = box(80, 60, 6)
  .holes('top', { positions: screws, diameter: 2.5, depth: 5 })
  .holes('top', { positions: [{ u: 0, v: 14 }], diameter: 7, depth: 'through' });
const plate = box(50, 40, 4)
  .holes('top', { positions: screws, diameter: 3.4, depth: 'through' })
  .holes('top', { positions: [{ u: 0, v: 0 }], diameter: 16, depth: 'through' })
  .translate(15, 10, 6);

const asm = assembly('bearing-plate-on-base');
const b = asm.part('base', base, { material: 'aluminum-6061' });
const p = asm.part('bearing-plate', plate, { material: 'aluminum-6061' });
b.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
p.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
asm.mate('bolted', 'base.bolt1', 'bearing-plate.bolt1', 'fastened');
return asm.solvedModel({});
