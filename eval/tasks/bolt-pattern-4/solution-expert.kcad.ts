const boltDiam = param("Bolt Diameter", 5, { unit: 'mm', min: 3, max: 8 });

return box(80, 80, 6)
  .holes('top', {
    positions: [
      { u: -30, v: -30 },
      { u:  30, v: -30 },
      { u: -30, v:  30 },
      { u:  30, v:  30 },
    ],
    diameter: boltDiam,
    depth: 'through',
  })
  .fillet(0.2, { face: 'wall' });
