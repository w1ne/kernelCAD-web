// BROKEN (misaligned bolt holes): the bracket hole pattern is 32 x 22 mm
// but the plate is tapped on 30 x 20 mm, so no screw can pass.
const plate = box(80, 60, 6).holes('top', {
  positions: [{ u: -15, v: -10 }, { u: 15, v: -10 }, { u: -15, v: 10 }, { u: 15, v: 10 }],
  diameter: 2.5,
  depth: 5,
});
const flange = box(50, 40, 4).holes('top', {
  positions: [{ u: -16, v: -11 }, { u: 16, v: -11 }, { u: -16, v: 11 }, { u: 16, v: 11 }],
  diameter: 3.4,
  depth: 'through',
});
const bracket = flange.union(box(50, 4, 40).translate(0, 36, 0)).translate(15, 10, 6);

const asm = assembly('bracket-on-plate');
const p = asm.part('plate', plate, { material: 'aluminum-6061' });
const b = asm.part('bracket', bracket, { material: 'aluminum-6061' });
p.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
b.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
asm.mate('bolted', 'plate.bolt1', 'bracket.bolt1', 'fastened');
return asm.solvedModel({});
