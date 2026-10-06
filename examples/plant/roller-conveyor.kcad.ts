// Gravity roller conveyor line: 20 straight 3 m segments. Each segment has
// two C-channel side frames with punched hex axle holes, 39 rollers of
// 50 mm diameter on a 75 mm pitch, and two H-frame stands (two legs with
// foot plates, a head cross-member, a low tie and a diagonal brace) tied
// together by a longitudinal knee brace on each side. 1,060 parts from 7
// unique shapes: rollers, frames and braces are modelled once along a
// convenient axis and laid into place with `rotate`, so all 780 rollers
// share one geometry.
//
// Segment frame (local, mm): x 0..3000 along the line, rollers centred
// 75 mm in from each end, side frames at
// y 0..40 and 540..580, roller tops at z 760, floor at z 0. Every part's
// bounding box keeps >= 1 mm from its neighbours.

const SEGMENTS = 20;
const SEG_LEN = 3000;
const SEG_GAP = 2;
const ROLLER_PITCH = 75;
const ROLLERS = 39;
const STANDS = [300, 2660]; // stand positions along the segment
const arm = assembly('roller-conveyor');

const FRAME = '#e0a92a';
const STEEL = '#c9ced3';

// C-channel side frame (web toward the rollers, flanges outward), hex axle
// holes on the roller pitch. Built for the y = 0 side; the far side is the
// same shape turned 180 deg about Z.
const sideFrame = () => union(
  box(SEG_LEN, 4, 100).translate(0, 36, 0),
  box(SEG_LEN, 40, 4),
  box(SEG_LEN, 40, 4).translate(0, 0, 96),
).subtract(
  cylinder(20, 6.5, 6).rotate([1, 0, 0], 90).translate(75, 46, 85)
    .patternLinear({ count: ROLLERS, direction: [1, 0, 0], spacing: ROLLER_PITCH }),
).color(FRAME);
// Roller along +Z: hex axle stubs, 50 mm tube with chamfered ends, 498 long.
const roller = () => path()
  .moveTo(0, 0).lineTo(5.5, 0).lineTo(5.5, 8).lineTo(23, 8).lineTo(25, 10)
  .lineTo(25, 488).lineTo(23, 490).lineTo(5.5, 490).lineTo(5.5, 498).lineTo(0, 498)
  .close()
  .revolve()
  .color(STEEL);
// Square-tube leg with a welded foot plate that overhangs outwards only;
// the far-side leg is the same shape turned 180 deg about Z.
const leg = () => union(box(80, 60, 6).translate(-20, -20, 0), box(40, 40, 594).translate(0, 0, 6)).color(FRAME);
const header = () => box(60, 580, 48).color(FRAME);
const tie = () => box(40, 498, 40).color(FRAME);
// Flat bar diagonals, drawn as parallelograms in their own XY plane and
// rotated into the stand plane (YZ) or the side plane (XZ) per part.
const standBrace = () => extrudePolygon([[42, 192], [42, 232], [538, 598], [538, 558]], 30).color(FRAME);
const kneeBrace = () => extrudePolygon([[362, 192], [362, 232], [2638, 598], [2638, 558]], 30).color(FRAME);

function addSegment(s: number): void {
  const x0 = s * (SEG_LEN + SEG_GAP);
  const name = (part: string) => `seg-${s}-${part}`;
  arm.part(name('frame-a'), sideFrame(), { at: [x0, 0, 650], material: 'mild-steel' });
  arm.part(name('frame-b'), sideFrame(), { at: [x0 + SEG_LEN, 580, 650], rotate: [0, 0, 180], material: 'mild-steel' });
  STANDS.forEach((x, k) => {
    arm.part(name(`stand-${k}-leg-a`), leg(), { at: [x0 + x, 0, 0], material: 'mild-steel' });
    arm.part(name(`stand-${k}-leg-b`), leg(), { at: [x0 + x + 40, 580, 0], rotate: [0, 0, 180], material: 'mild-steel' });
    arm.part(name(`stand-${k}-header`), header(), { at: [x0 + x - 10, 0, 601], material: 'mild-steel' });
    arm.part(name(`stand-${k}-tie`), tie(), { at: [x0 + x, 41, 150], material: 'mild-steel' });
    // 120 deg about (1,1,1) maps local x -> y, y -> z, z -> x.
    arm.part(name(`stand-${k}-brace`), standBrace(), {
      at: [x0 + x + 5, 0, 0], rotate: { axis: [1, 1, 1], degrees: 120 }, material: 'mild-steel',
    });
  });
  // +90 deg about X maps local y -> z and z -> -y: the knee brace lies in
  // the side plane, 30 mm thick, inside the leg line.
  arm.part(name('knee-brace-a'), kneeBrace(), { at: [x0, 35, 0], rotate: [90, 0, 0], material: 'mild-steel' });
  arm.part(name('knee-brace-b'), kneeBrace(), { at: [x0, 575, 0], rotate: [90, 0, 0], material: 'mild-steel' });
  for (let k = 0; k < ROLLERS; k++) {
    // +90 deg about X maps the roller's +Z axis to -Y: it spans
    // y = 539 - 498 .. 539 between the frame webs, axis at z 735.
    arm.part(name(`roller-${k}`), roller(), {
      at: [x0 + 75 + ROLLER_PITCH * k, 539, 735],
      rotate: [90, 0, 0],
      material: 'mild-steel',
    });
  }
}

for (let s = 0; s < SEGMENTS; s++) addSegment(s);

return arm.model();
