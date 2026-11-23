// Ø6 through hole in a 16 × 16 × 8 block: 1.5 mm chamfer on the entry rim only.
const block = box(16, 16, 8)
  .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thru' });
return block.chamfer(1.5, { face: 'thru.entry-rim' });
