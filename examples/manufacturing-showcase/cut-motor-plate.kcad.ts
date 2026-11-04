// Flat motor adapter: 100 × 80 × 4 mm, dimensions in millimetres.
// Four 5.5 mm mounting holes use an 80 × 60 mm rectangular pitch at the
// defaults. The central 22 mm pilot and
// 31 mm square of 3.4 mm holes are a NEMA 17 mounting interface.
// The motor drawing and actual mating hardware must be checked before cutting.
const length = param('length', 100, { min: 100, max: 130 });
const width = param('width', 80, { min: 80, max: 110 });
const holeSpacing = param('holeSpacing', 60, { min: 50, max: 60 });
const thickness = param('thickness', 4, { min: 2, max: 8 });
const xSpacing = holeSpacing.add(20);
let plate = box(length, width, thickness);
plate = plate.holes('top', {
  positions: [
    {u: xSpacing.divide(2).negate(), v: holeSpacing.divide(2).negate()},
    {u: xSpacing.divide(2), v: holeSpacing.divide(2).negate()},
    {u: xSpacing.divide(2).negate(), v: holeSpacing.divide(2)},
    {u: xSpacing.divide(2), v: holeSpacing.divide(2)},
  ],
  diameter: 5.5, depth: 'through', name: 'frameMounts',
});
plate = plate.holes('top', {
  positions: [{u: -15.5, v: -15.5}, {u: 15.5, v: -15.5}, {u: -15.5, v: 15.5}, {u: 15.5, v: 15.5}],
  diameter: 3.4, depth: 'through', name: 'motorMounts',
});
plate = plate.hole('top', { u: 0, v: 0, diameter: 22, depth: 'through', name: 'motorPilot' });
return plate;
