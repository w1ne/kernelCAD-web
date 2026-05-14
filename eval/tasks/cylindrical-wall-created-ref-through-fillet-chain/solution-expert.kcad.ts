const block = box(100, 60, 20)
  .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thruHole' });
return block
  .fillet(0.3, { face: 'thruHole.entry-rim' })
  .fillet(1.0, { face: 'top' })
  .fillet(0.2, { face: 'thruHole.wall' });
