// Close-up tile: 16 × 16 × 8 mm block, Ø6 through hole. A 1.5 mm chamfer on
// the entry rim, then a later 1 mm chamfer on the exit rim picked by label.
const block = box(16, 16, 8).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thru' });
return block.chamfer(1.5, { face: 'thru.entry-rim' }).chamfer(1, { face: 'thru.exit-rim' });
