const plate = box(100, 60, 5)
  .hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilotHole' });
return plate.fillet(0.2, { face: 'pilotHole.floor' });
