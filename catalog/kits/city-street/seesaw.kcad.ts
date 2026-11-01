// Original kernelCAD low-poly seesaw: a long plank on a triangular pivot
// stand with T-handles and seat pads at both ends and rubber bumpers on the
// ground; it can rest level or tilted. Millimetres, Z up, plank along X.

meta({
  name: 'seesaw',
  license: 'CC0-1.0',
  title: 'Seesaw',
  description: 'Playground seesaw with a pivot stand, plank, handles, seat pads and ground bumpers, level or tilted. Knobs: pose, plank, stand and seat colours.',
  tags: ['seesaw', 'teeter totter', 'playground', 'play equipment', 'kids', 'park', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'park', 'playground'],
  triangleBudget: 260,
});

const pose = param('pose', 'tilted', { choices: ['level', 'tilted'], label: 'Pose' });
const plank = param('plank', '#2a7fc8', { label: 'Plank' });
const stand = param('stand', '#f2c418', { label: 'Stand and handles' });
const seat = param('seat', '#e8432e', { label: 'Seats and bumpers' });

presets({
  wooden: { plank: '#b07a45', stand: '#6b4a2e', seat: '#2a2c2e' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Elevation prism: points are (x, z), extruded w along Y centred on y = 0.
const elev = (pts: [number, number][], w: number) => extrudePolygon(pts, w).translate(0, 0, -w / 2).rotateX(90);

const pz = 480;
const tilt = pose.value === 'tilted' ? 15 : 0;
const sw = assembly('seesaw');
sw.part('stand', elev([[-320, 0], [320, 0], [60, pz], [-60, pz]], 340).color(stand));
sw.part('axle', blk(-40, -230, pz - 40, 40, 230, pz + 20).color(stand));
// Plank group authored level about the pivot, then tilted together.
const onPlank = (s: Shape) => s.rotateY(tilt).translate(0, 0, pz);
sw.part('plank', onPlank(blk(-1600, -140, 0, 1600, 140, 50)).color(plank));
for (const side of [-1, 1]) {
  const s = side < 0 ? 'l' : 'r';
  sw.part(`seat-${s}`, onPlank(blk(side * 1550 - 220, -150, 49, side * 1550 + 220, 150, 100)).color(seat));
  sw.part(`handle-post-${s}`, onPlank(blk(side * 1150 - 25, -25, 49, side * 1150 + 25, 25, 380)).color(stand));
  sw.part(`handle-bar-${s}`, onPlank(blk(side * 1150 - 30, -190, 340, side * 1150 + 30, 190, 390)).color(stand));
  sw.part(`bumper-${s}`, blk(side * 1450 - 150, -150, 0, side * 1450 + 150, 150, 60).color(seat));
}

return sw.model();
