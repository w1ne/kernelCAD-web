const wireRadius = param('WireRadius', 1, { unit: 'mm', min: 0.3, max: 3 });
const coilRadius = param('CoilRadius', 8, { unit: 'mm', min: 3, max: 30 });
const pitch = param('Pitch', 4, { unit: 'mm', min: 1, max: 20 });
const turns = param('Turns', 4, { unit: 'unitless', min: 1, max: 20 });

// Helical spring: small square wire profile swept along a helix rail with frenet.
const profile = path()
  .moveTo(-wireRadius, -wireRadius)
  .lineTo(wireRadius, -wireRadius)
  .lineTo(wireRadius, wireRadius)
  .lineTo(-wireRadius, wireRadius)
  .close();

const rail = helix({ radius: coilRadius, pitch, turns, pointsPerTurn: 24 });
return profile.sweep(rail, { frenet: true });
