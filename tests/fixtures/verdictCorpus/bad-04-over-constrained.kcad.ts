// BROKEN (over-constrained mates): the bracket is fastened to the plate
// twice with frames that disagree by 5 mm, so no placement satisfies both.
const plate = box(80, 60, 6);
const bracket = box(50, 40, 4).union(box(50, 4, 40).translate(0, 36, 0)).translate(15, 10, 6);

const asm = assembly('over-constrained');
const p = asm.part('plate', plate, { material: 'aluminum-6061' });
const b = asm.part('bracket', bracket, { material: 'aluminum-6061' });
p.connector('a', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
b.connector('a', { type: 'frame', origin: { kind: 'vec3', value: [25, 20, 6] } });
p.connector('b', { type: 'frame', origin: { kind: 'vec3', value: [55, 40, 6] } });
b.connector('b', { type: 'frame', origin: { kind: 'vec3', value: [60, 40, 6] } });
asm.mate('bolt-a', 'plate.a', 'bracket.a', 'fastened');
asm.mate('bolt-b', 'plate.b', 'bracket.b', 'fastened');
return asm.solvedModel({});
