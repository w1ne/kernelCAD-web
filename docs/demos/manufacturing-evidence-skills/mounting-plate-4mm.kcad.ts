// Manufacturing-evidence skills demo: one connected mounting plate.
// Nominal dimensions are illustrative, not a released drawing.
const width = param('width', 100, { min: 80, max: 140, unit: 'mm' });
const depth = param('depth', 70, { min: 50, max: 100, unit: 'mm' });
const thickness = param('thickness', 4, { min: 4, max: 16, unit: 'mm' });
const mountHoleDiameter = param('mountHoleDiameter', 4.5, { min: 3.4, max: 6.6, unit: 'mm' });
const boreDiameter = param('boreDiameter', 24, { min: 16, max: 36, unit: 'mm' });
const x = width.divide(2).subtract(10);
const y = depth.divide(2).subtract(10);

return box(width, depth, thickness)
  .holes('top', {
    positions: [
      { u: x.negate(), v: y.negate() }, { u: x, v: y.negate() },
      { u: x.negate(), v: y }, { u: x, v: y },
    ],
    diameter: mountHoleDiameter,
    depth: 'through',
    name: 'mountingHoles',
  })
  .hole('top', {
    u: 0,
    v: 0,
    diameter: boreDiameter,
    depth: 'through',
    name: 'centreBore',
  })
  .finish('aluminium');
