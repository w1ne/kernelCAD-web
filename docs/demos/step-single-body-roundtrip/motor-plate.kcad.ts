// Flat NEMA 17 motor adapter plate, 100 x 80 x 4 mm, dimensions in millimetres.
// One part, no assembly: the script returns a bare coloured shape.
// Four 5.5 mm frame holes on an 80 x 60 mm pitch; a 22 mm motor pilot and
// four 3.4 mm holes on the 31 mm NEMA 17 square.
// Check the motor drawing and the mating hardware before cutting.
const length = 100;
const width = 80;
const thickness = 4;
const motorPitch = 31;
const frameX = length / 2 - 10;
const frameY = width / 2 - 10;
const half = motorPitch / 2;

let plate = box(length, width, thickness).color('#3366cc');
plate = plate.holes('top', {
  positions: [{ u: -frameX, v: -frameY }, { u: frameX, v: -frameY }, { u: -frameX, v: frameY }, { u: frameX, v: frameY }],
  diameter: 5.5, depth: 'through', name: 'frameMounts',
});
plate = plate.holes('top', {
  positions: [{ u: -half, v: -half }, { u: half, v: -half }, { u: -half, v: half }, { u: half, v: half }],
  diameter: 3.4, depth: 'through', name: 'motorMounts',
});
plate = plate.hole('top', { u: 0, v: 0, diameter: 22, depth: 'through', name: 'motorPilot' });
return plate;
