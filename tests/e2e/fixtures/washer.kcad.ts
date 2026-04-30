const innerRadius = param('InnerRadius', 10, { unit: 'mm', min: 1, max: 50 });
const outerRadius = param('OuterRadius', 20, { unit: 'mm', min: 5, max: 100 });
const thickness = param('Thickness', 5, { unit: 'mm', min: 1, max: 20 });

return path()
  .moveTo(innerRadius, 0)
  .lineTo(outerRadius, 0)
  .lineTo(outerRadius, thickness)
  .lineTo(innerRadius, thickness)
  .close()
  .revolve();
