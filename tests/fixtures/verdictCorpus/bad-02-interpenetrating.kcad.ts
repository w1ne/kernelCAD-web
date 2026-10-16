// BROKEN (interpenetration): the bracket is sunk 3 mm into the plate.
const plate = box(80, 60, 6).holes('top', {
  positions: [{ u: -15, v: -10 }, { u: 15, v: -10 }, { u: -15, v: 10 }, { u: 15, v: 10 }],
  diameter: 2.5,
  depth: 5,
});
const flange = box(50, 40, 4).holes('top', {
  positions: [{ u: -15, v: -10 }, { u: 15, v: -10 }, { u: -15, v: 10 }, { u: 15, v: 10 }],
  diameter: 3.4,
  depth: 'through',
});
const bracket = flange.union(box(50, 4, 40).translate(0, 36, 0)).translate(15, 10, 3);

const asm = assembly('bracket-on-plate');
const p = asm.part('plate', plate, { material: 'aluminum-6061' });
const b = asm.part('bracket', bracket, { material: 'aluminum-6061' });
p.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
b.connector('bolt1', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
asm.mate('bolted', 'plate.bolt1', 'bracket.bolt1', 'fastened');
return asm.solvedModel({});
