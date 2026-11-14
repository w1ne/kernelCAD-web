// Correct: a ring flange bolted onto a manifold block. The flange has a
// Ø60 through-bore; the block has a Ø6 port 20 mm off that axis, so the
// port opens entirely inside the flange bore (20 + 3 < 30). The port is
// not a screw hole and needs no partner: an axis through it passes through
// the bore. The four M3 screws are coaxial with their tap holes. (The
// turbojet combustor liner and its fuel-port cans meet the same way.)
const screws = [{ u: -35, v: -35 }, { u: 35, v: -35 }, { u: -35, v: 35 }, { u: 35, v: 35 }];
const block = box(100, 100, 20)
  .holes('top', { positions: screws, diameter: 2.5, depth: 8 })
  .holes('top', { positions: [{ u: 20, v: 0 }], diameter: 6, depth: 12 });
const flange = box(90, 90, 5)
  .holes('top', { positions: screws, diameter: 3.4, depth: 'through' })
  .holes('top', { positions: [{ u: 0, v: 0 }], diameter: 60, depth: 'through' })
  .translate(5, 5, 20);

const asm = assembly('flange-on-manifold');
const b = asm.part('manifold', block, { material: 'aluminum-6061' });
const f = asm.part('flange', flange, { material: 'aluminum-6061' });
b.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [50, 50, 20] } });
f.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [50, 50, 20] } });
asm.mate('bolted', 'manifold.bolt1', 'flange.bolt1', 'fastened');
return asm.solvedModel({});
