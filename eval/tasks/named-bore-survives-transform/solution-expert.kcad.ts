return box(40, 40, 10)
  .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'centerBolt' })
  .translate(5, 0, 0)
  .rotate([0, 0, 1], 30)
  .fillet(0.4, { face: 'centerBolt.wall' });
