const wireRadius = 1;
const coilRadius = 8;
const pitch = 4;
const turns = 4;

// Helical spring: small square wire profile swept along a helix rail with frenet.
const profile = path()
  .moveTo(-wireRadius, -wireRadius)
  .lineTo(wireRadius, -wireRadius)
  .lineTo(wireRadius, wireRadius)
  .lineTo(-wireRadius, wireRadius)
  .close();

const rail = helix({ radius: coilRadius, pitch, turns, pointsPerTurn: 24 });
return profile.sweep(rail, { frenet: true });
