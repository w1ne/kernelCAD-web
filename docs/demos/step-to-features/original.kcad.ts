// Original part authored for the demo; exported to source.step, then discarded by the rebuild.
return box(80, 50, 10)
  .fillet(5, { parallel: [0, 0, 1] })
  .holes('top', {
    positions: [{ u: -30, v: -17 }, { u: 30, v: -17 }, { u: -30, v: 17 }, { u: 30, v: 17 }],
    diameter: 6.6, depth: 'through', name: 'mountingHoles',
  });
