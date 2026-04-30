const baseRadius = param('BaseRadius', 25, { unit: 'mm', min: 10, max: 50 });
const topRadius = param('TopRadius', 30, { unit: 'mm', min: 10, max: 60 });
const wallHeight = param('WallHeight', 90, { unit: 'mm', min: 30, max: 200 });
const flareStart = param('FlareStart', 70, { unit: 'mm', min: 10, max: 180 });

// Solid mug body (hollowing is a v0.5 shell exercise on this revolve).
// Profile in XZ plane: cylindrical wall flares outward via tangentArc near the top.
return path()
  .moveTo(0, 0)
  .lineTo(baseRadius, 0)
  .lineTo(baseRadius, flareStart)
  .tangentArc(topRadius, wallHeight)
  .lineTo(0, wallHeight)
  .close()
  .revolve();
