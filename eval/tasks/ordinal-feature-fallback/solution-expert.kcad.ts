return box(60, 40, 12)
  .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through' })
  .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through' })
  .fillet(0.4, { face: 'hole1.wall' })
  .fillet(0.8, { face: 'hole2.wall' });
