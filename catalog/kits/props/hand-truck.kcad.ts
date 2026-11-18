// Original kernelCAD low-poly hand truck (sack truck / dolly): two upright
// rails with a looped handle, cross bars, a flat toe plate and two wheels on
// an axle, empty or carrying boxes. Stands upright on its toe and wheels.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, toe towards -Y.

meta({
  name: 'hand-truck',
  license: 'CC0-1.0',
  title: 'Hand truck',
  description: 'Two-wheeled hand truck dolly with a looped handle, cross bars and toe plate, empty or loaded with cardboard boxes. Knobs: load, frame, tyre, plate and box colours.',
  tags: ['hand truck', 'dolly', 'sack truck', 'trolley', 'moving', 'warehouse', 'delivery', 'cart'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'warehouse', 'street', 'shop', 'industrial'],
  triangleBudget: 440,
});

const load = param('load', 'boxes', { choices: ['empty', 'boxes'], label: 'Load' });
const frame = param('frame', '#c8302a', { label: 'Frame' });
const tyre = param('tyre', '#1f1f21', { label: 'Tyres' });
const plate = param('plate', '#9aa0a6', { label: 'Toe plate and hubs' });
const boxes = param('boxes', '#c49563', { label: 'Boxes' });

presets({
  yellow: { frame: '#e3b41f' },
  steel: { frame: '#7d848b', plate: '#55595e' },
});

const H = 1250;
const W = 480;
const R = 130;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const t = assembly('hand-truck');
// Rails stand just behind the toe plate; handle loop at the top.
const ry = 40;
for (const sx of [-1, 1]) {
  t.part(`rail-${sx < 0 ? 'left' : 'right'}`, blk(sx * W / 2 - 18, ry - 18, 10, sx * W / 2 + 18, ry + 18, H).color(frame));
}
t.part('handle', blk(-W / 2 - 18, ry - 18, H - 1, W / 2 + 18, ry + 18, H + 36).color(frame));
for (const [i, z] of [300, 650, 1000].entries()) {
  t.part(`cross-bar-${i + 1}`, blk(-W / 2 + 17, ry - 10, z, W / 2 - 17, ry + 10, z + 30).color(frame));
}
t.part('toe-plate', blk(-W / 2 + 20, -260, 0, W / 2 - 20, ry + 19, 14).color(plate));
// Axle and wheels behind the rails.
const wy = ry + R * 0.85;
t.part('axle', blk(-W / 2 - 60, wy - 15, R - 15, W / 2 + 60, wy + 15, R + 15)
  .union(blk(-W / 2 + 10, ry + 17, R - 20, -W / 2 + 40, wy, R + 60))
  .union(blk(W / 2 - 40, ry + 17, R - 20, W / 2 - 10, wy, R + 60))
  .color(frame));
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -W / 2 - 130 : W / 2 + 40;
  t.part(`tyre-${sx < 0 ? 'left' : 'right'}`, cylinder(90, R, 10).rotateY(90).translate(x0, wy, R).color(tyre));
  t.part(`hub-${sx < 0 ? 'left' : 'right'}`, cylinder(100, R * 0.45, 6).rotateY(90).translate(x0 - 5, wy, R).color(plate));
}
if (load.value === 'boxes') {
  t.part('box-1', blk(-210, -250, 14, 210, ry - 19, 400).color(boxes));
  t.part('box-2', blk(-180, -235, 399, 190, ry - 19, 700).color(boxes));
  t.part('box-3', blk(-150, -215, 699, 140, ry - 19, 900).color(boxes));
}

return t.model();
