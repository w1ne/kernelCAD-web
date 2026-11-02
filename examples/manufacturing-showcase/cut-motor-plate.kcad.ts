// Flat motor adapter: 100 × 80 × 4 mm, dimensions in millimetres.
// Four 5.5 mm corner holes attach the plate; the central 22 mm pilot and
// 31 mm square of 3.4 mm holes are a NEMA 17 mounting interface.
// The motor drawing and actual mating hardware must be checked before cutting.
const thickness = param('thickness', 4, { min: 2, max: 8 });
let plate = box(100, 80, thickness);
plate = plate.holes('top', {
  positions: [{u: -40, v: -30}, {u: 40, v: -30}, {u: -40, v: 30}, {u: 40, v: 30}],
  diameter: 5.5, depth: 'through', name: 'frameMounts',
});
plate = plate.holes('top', {
  positions: [{u: -15.5, v: -15.5}, {u: 15.5, v: -15.5}, {u: -15.5, v: 15.5}, {u: 15.5, v: 15.5}],
  diameter: 3.4, depth: 'through', name: 'motorMounts',
});
plate = plate.hole('top', { u: 0, v: 0, diameter: 22, depth: 'through', name: 'motorPilot' });
return plate;
