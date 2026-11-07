// Machined bearing block, mm. The nominal 22 × 7 seat matches the overall
// envelope of a 608 bearing; specify the fit/tolerances with the actual bearing
// and shop. The 8.5 mm through bore leaves clearance for an 8 mm shaft.
// A retaining plate or other axial retention is a separate design decision.
const length = param('length', 80, { min: 70, max: 120 });
const width = param('width', 50, { min: 45, max: 90 });
const thickness = param('thickness', 18, { min: 14, max: 30 });
const bearingSeat = param('seatDiameter', 22, { min: 21.8, max: 22.2 });
const mountInset = param('mountInset', 10, { min: 8, max: 14 });
const mountX = length.divide(2).subtract(mountInset);
const mountY = width.divide(2).subtract(mountInset);
let block = box(length, width, thickness);
block = block.holes('top', {
  positions: [
    {u: mountX.negate(), v: mountY.negate()},
    {u: mountX, v: mountY.negate()},
    {u: mountX.negate(), v: mountY},
    {u: mountX, v: mountY},
  ],
  diameter: 5.5, depth: 'through', name: 'frameMounts',
});
block = block.hole('top', {
  u: 0, v: 0, diameter: 8.5, depth: 'through',
  counterbore: { diameter: bearingSeat, depth: 7 }, name: 'bearingSeat',
});
return block;
