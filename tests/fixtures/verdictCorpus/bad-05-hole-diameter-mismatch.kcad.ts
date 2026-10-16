// BROKEN (hole diameter mismatch): M3 clearance holes in the block over
// M8 tap-drill (6.8 mm) holes in the plate — no single screw fits both.
const plate = box(60, 40, 8).holes('top', {
  positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }],
  diameter: 6.8,
  depth: 6,
});
const block = box(40, 20, 12).holes('top', {
  positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }],
  diameter: 3.4,
  depth: 'through',
}).translate(10, 10, 8);

const asm = assembly('sensor-block');
const p = asm.part('plate', plate, { material: 'aluminum-6061' });
const b = asm.part('block', block, { material: 'pla' });
p.connector('mount', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
b.connector('mount', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
asm.mate('screwed', 'plate.mount', 'block.mount', 'fastened');
return asm.solvedModel({});
