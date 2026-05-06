const baseRadius = 25;
const topRadius = 30;
const wallHeight = 90;
const flareStart = 70;

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
