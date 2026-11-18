// Original kernelCAD low-poly sit-stand desk: a worktop on two telescoping
// legs with T feet and a crossbar, an up/down control paddle, and an
// optional monitor, keyboard and mouse. Millimetres, Z up, standing on
// z = 0 centred on x = y = 0. The user side faces -Y.

meta({
  name: 'standing-desk',
  license: 'CC0-1.0',
  title: 'Standing desk',
  description: 'Height-adjustable sit-stand desk on telescoping legs with an optional monitor, keyboard and mouse. Knobs: height, width, setup, top, frame and device colours.',
  tags: ['standing desk', 'sit stand desk', 'desk', 'adjustable desk', 'workstation', 'office', 'computer'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'office', 'study', 'bedroom'],
  triangleBudget: 300,
});

const height = param('height', 'standing', { choices: ['sitting', 'standing'], label: 'Height' });
const width = param('width', '1400', { choices: ['1200', '1400', '1600'], label: 'Width (mm)' });
const setup = param('setup', 'monitor', { choices: ['none', 'monitor'], label: 'Setup' });
const top = param('top', '#c69c6d', { label: 'Top' });
const frame = param('frame', '#2b2d30', { label: 'Frame' });
const device = param('device', '#1d1f22', { label: 'Devices' });
const screen = param('screen', '#3a6a8f', { label: 'Screen' });

presets({
  white: { top: '#f2f1ec', frame: '#efeee9' },
  walnut: { top: '#5a3a27', frame: '#2b2d30' },
});

const W = Number(width.value);
const D = 700;
const H = height.value === 'standing' ? 1100 : 730;
const tt = 25;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const d = assembly('standing-desk');
d.part('top', blk(-W / 2, -D / 2, H - tt, W / 2, D / 2, H).color(top));
const lx = W / 2 - 120;
for (const sx of [-1, 1]) {
  const s = sx < 0 ? 'left' : 'right';
  const x = sx * lx;
  d.part(`foot-${s}`, blk(x - 35, -D / 2 + 30, 0, x + 35, D / 2 - 30, 35).color(frame));
  // Telescoping column: a wide outer stage and a narrower inner stage.
  d.part(`column-lower-${s}`, blk(x - 40, -40, 34, x + 40, 40, 34 + (H - tt) * 0.5).color(frame));
  d.part(`column-upper-${s}`, blk(x - 32, -32, 34 + (H - tt) * 0.5 - 5, x + 32, 32, H - tt - 30).color(frame));
  d.part(`bracket-${s}`, blk(x - 35, -D / 2 + 60, H - tt - 31, x + 35, D / 2 - 60, H - tt + 1).color(frame));
}
d.part('crossbar', blk(-lx + 30, -20, H - tt - 70, lx - 30, 20, H - tt - 30).color(frame));
d.part('paddle', blk(W / 2 - 260, -D / 2 - 15, H - tt - 30, W / 2 - 160, -D / 2 + 60, H - tt + 1).color(frame));
if (setup.value === 'monitor') {
  const zt = H - 1;
  d.part('monitor-foot', blk(-130, 80, zt, 130, 260, zt + 15).color(device));
  d.part('monitor-arm', blk(-30, 200, zt + 14, 30, 240, zt + 260).color(device));
  d.part('monitor', blk(-310, 150, zt + 160, 310, 200, zt + 520).color(device));
  d.part('screen', blk(-295, 145, zt + 175, 295, 151, zt + 505).color(screen));
  d.part('keyboard', blk(-220, -230, zt, 220, -90, zt + 22).color(device));
  d.part('mouse', blk(280, -190, zt, 340, -100, zt + 30).color(device));
}

return d.model();
