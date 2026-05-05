return box(60, 40, 12)
  .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through', name: 'mountFront' })
  .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through', name: 'mountBack' })
  .fillet(0.4, { face: 'mountFront.wall' })
  .fillet(0.8, { face: 'mountBack.wall' });
