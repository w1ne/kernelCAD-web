// Original kernelCAD low-poly rocking chair: two curved rockers cut from
// polygon arcs, turned legs, a padded seat, armrests and a reclined spindle
// back. Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'rocking-chair',
  license: 'CC0-1.0',
  title: 'Rocking chair',
  description: 'Wooden rocking chair on curved rockers with armrests, a seat cushion and a reclined spindle back. Knobs: spindle count, cushion, wood and cushion colours.',
  tags: ['rocking chair', 'rocker', 'chair', 'armchair', 'porch', 'nursery', 'seat'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'porch'],
  triangleBudget: 500,
});

const spindles = param('spindles', '5', { choices: ['3', '5', '7'], label: 'Back spindles' });
const cushion = param('cushion', 'yes', { choices: ['yes', 'no'], label: 'Seat cushion' });
const wood = param('wood', '#9a6a3e', { label: 'Wood' });
const pad = param('pad', '#a8483a', { label: 'Cushion' });

presets({
  white: { wood: '#efeee9', pad: '#7d8fa3' },
  walnut: { wood: '#5a3a27', pad: '#d9cfbd' },
  green: { wood: '#3f5e45', pad: '#e3c27a' },
});

const n = Number(spindles.value);
const W = 560;
const seatZ = 430;
const lw = 40;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

// Rocker: a shallow arc band in the YZ plane, extruded across X.
const R = 1500;
const half = 470;
const rk = 50;
const arcZ = (y: number) => R - Math.sqrt(R * R - y * y);
const lift = arcZ(half);
const rockerPts: [number, number][] = [];
const segs = 8;
for (let k = 0; k <= segs; k++) {
  const y = -half + (2 * half * k) / segs;
  rockerPts.push([y, arcZ(y)]);
}
for (let k = segs; k >= 0; k--) {
  const y = -half + (2 * half * k) / segs;
  rockerPts.push([y, arcZ(y) + rk]);
}
const side = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const topAt = (y: number) => arcZ(y) + rk;

const ch = assembly('rocking-chair');
const fy = -210;
const by = 190;
for (const sx of [-1, 1]) {
  const s = sx < 0 ? 'left' : 'right';
  const x0 = sx < 0 ? -W / 2 : W / 2 - lw;
  ch.part(`rocker-${s}`, side(rockerPts, x0, lw).color(wood));
  // Front legs run up to the armrest; rear legs stop under the seat.
  ch.part(`front-leg-${s}`, blk(x0, fy - lw / 2, topAt(fy) - 10, x0 + lw, fy + lw / 2, seatZ + 220).color(wood));
  ch.part(`rear-leg-${s}`, blk(x0, by - lw / 2, topAt(by) - 10, x0 + lw, by + lw / 2, seatZ - 10).color(wood));
  ch.part(`arm-${s}`, blk(x0 - 15, fy - 60, seatZ + 220, x0 + lw + 15, by + 40, seatZ + 250).color(wood));
  ch.part(`stretcher-${s}`, blk(x0 + 5, fy, topAt(0) + 60, x0 + lw - 5, by, topAt(0) + 90).color(wood));
}
ch.part('seat', blk(-W / 2 + 1, fy - lw / 2, seatZ - 40, W / 2 - 1, by + lw / 2, seatZ).color(wood));
if (cushion.value === 'yes') {
  ch.part('cushion', blk(-W / 2 + lw + 10, fy - 10, seatZ - 1, W / 2 - lw - 10, by - 10, seatZ + 60).color(pad));
}

// Back: built upright from the seat's rear edge, then reclined about X.
const backH = 720;
const back = (shape: Shape) => shape.rotateX(-16).translate(0, by + 10, seatZ - 20);
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -W / 2 : W / 2 - lw;
  ch.part(`back-post-${sx < 0 ? 'left' : 'right'}`, back(blk(x0, -lw / 2, -20, x0 + lw, lw / 2, backH)).color(wood));
}
ch.part('back-top-rail', back(blk(-W / 2 - 10, -25, backH - 90, W / 2 + 10, 25, backH + 10)).color(wood));
ch.part('back-low-rail', back(blk(-W / 2 + lw - 1, -15, 90, W / 2 - lw + 1, 15, 130)).color(wood));
const inner = W - 2 * lw;
for (let i = 0; i < n; i++) {
  const x = -inner / 2 + (inner * (i + 1)) / (n + 1);
  ch.part(`spindle-${i + 1}`, back(blk(x - 11, -11, 120, x + 11, 11, backH - 80)).color(wood));
}

return ch.model();
