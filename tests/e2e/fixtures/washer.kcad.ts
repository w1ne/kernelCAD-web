const innerRadius = 10;
const outerRadius = 20;
const thickness = 5;

return path()
  .moveTo(innerRadius, 0)
  .lineTo(outerRadius, 0)
  .lineTo(outerRadius, thickness)
  .lineTo(innerRadius, thickness)
  .close()
  .revolve();
