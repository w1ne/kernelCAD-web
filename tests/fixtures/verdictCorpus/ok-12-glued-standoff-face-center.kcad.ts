// Correct: a standoff block bonded (adhesive) to a plate. Face-center bound
// fastened mate between two faces that carry no holes — a rigid attachment.
const plate = box(60, 40, 5);
const standoff = box(20, 20, 15).translate(20, 10, 5);

const asm = assembly('bonded-standoff');
const p = asm.part('plate', plate, { material: 'aluminum-6061' });
const s = asm.part('standoff', standoff, { material: 'aluminum-6061' });
p.connector('bond', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
s.connector('bond', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
asm.mate('glued', 'plate.bond', 'standoff.bond', 'fastened');
return asm.solvedModel({});
