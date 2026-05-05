const boltDiam = param("Bolt Diameter", 6, { unit: 'mm', min: 3, max: 12 });

return box(60, 60, 12).hole('top', {
  u: 0, v: 0,
  diameter: boltDiam,
  depth: 'through',
  counterbore: { diameter: boltDiam + 5, depth: 4 },
});
