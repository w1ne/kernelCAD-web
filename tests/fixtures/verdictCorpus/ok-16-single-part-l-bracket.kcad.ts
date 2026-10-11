// Correct: a single machined part (L-bracket with mounting holes) wrapped in
// a one-part assembly, as agents do to get BOM/material provenance.
const bracket = box(60, 40, 5).holes('top', {
  positions: [{ u: -20, v: -10 }, { u: 20, v: -10 }],
  diameter: 5.5,
  depth: 'through',
}).union(box(60, 5, 40).translate(0, 35, 0));
const asm = assembly('l-bracket');
asm.part('bracket', bracket, { material: 'aluminum-6061' });
return asm.model();
