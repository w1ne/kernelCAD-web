// Flat motor adapter: 100 × 80 × 4 mm, dimensions in millimetres.
// Four 5.5 mm mounting holes use an 80 × 60 mm rectangular pitch at the
// defaults. The central 22 mm pilot and
// 31 mm square of 3.4 mm holes are a NEMA 17 mounting interface.
// The motor drawing and actual mating hardware must be checked before cutting.
const length = param('length', 100, { min: 80, max: 160 });
const width = param('width', 80, { min: 70, max: 120 });
const thickness = param('thickness', 4, { min: 2, max: 8 });
const motorPitch = param('motorPitch', 31, { min: 28, max: 40 });
const pilotDiameter = param('pilotDiameter', 22, { min: 16, max: 26 });
const mountDiameter = param('mountDiameter', 5.5, { min: 3.4, max: 8 });
const mountX = length.divide(2).subtract(10);
const mountY = width.divide(2).subtract(10);
const halfPitch = motorPitch.divide(2);
let plate = box(length, width, thickness);
plate = plate.holes('top', {
  positions: [
    {u: mountX.negate(), v: mountY.negate()},
    {u: mountX, v: mountY.negate()},
    {u: mountX.negate(), v: mountY},
    {u: mountX, v: mountY},
  ],
  diameter: mountDiameter, depth: 'through', name: 'frameMounts',
});
plate = plate.holes('top', {
  positions: [
    {u: halfPitch.negate(), v: halfPitch.negate()}, {u: halfPitch, v: halfPitch.negate()},
    {u: halfPitch.negate(), v: halfPitch}, {u: halfPitch, v: halfPitch},
  ],
  diameter: 3.4, depth: 'through', name: 'motorMounts',
});
plate = plate.hole('top', { u: 0, v: 0, diameter: pilotDiameter, depth: 'through', name: 'motorPilot' });
return plate;
