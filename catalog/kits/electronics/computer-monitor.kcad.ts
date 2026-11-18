// Original kernelCAD low-poly flat-panel computer monitor: a thin bezelled
// panel with a bottom chin and power light, a rear housing and a neck on a
// splayed foot. Millimetres, Z up, base on z = 0 centred on x = y = 0. Screen faces -Y.

meta({
  name: 'computer-monitor',
  license: 'CC0-1.0',
  title: 'Computer monitor',
  description: 'Flat-screen desktop computer monitor with a thin bezel, power light, rear housing and a neck on a pedestal foot. Knobs: screen size, aspect, frame, screen, stand and light colours.',
  tags: ['monitor', 'computer monitor', 'display', 'screen', 'computer', 'pc', 'office', 'desk'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'bedroom', 'study'],
  triangleBudget: 90,
});

const size = param('sizeIn', '24', { choices: ['22', '24', '27', '32'], label: 'Screen (in)' });
const aspect = param('aspect', '16:9', { choices: ['16:9', '21:9'], label: 'Aspect' });
const frame = param('frame', '#232427', { label: 'Frame' });
const screen = param('screen', '#2b5a86', { label: 'Screen' });
const standC = param('stand', '#3a3c40', { label: 'Stand' });
const light = param('light', '#5fd4ff', { label: 'Power light' });

presets({
  white: { frame: '#e6e6e3', stand: '#cfd0cc', light: '#5fd38a' },
  gamer: { frame: '#141416', stand: '#b8232c', light: '#ff3b3b', screen: '#3a2a6a' },
  off: { screen: '#15181c' },
});

const diag = Number(size.value) * 25.4;
const ar = aspect.value === '21:9' ? 21 : 16;
const sw = (diag * ar) / Math.hypot(ar, 9);
const sh = (diag * 9) / Math.hypot(ar, 9);
const W = sw + 20;
const H = sh + 34;
const zp = 120; // panel bottom
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const m = assembly('computer-monitor');
// Splayed foot: a trapezoid plate, wider at the front.
const fw = 100 + sw * 0.06; // half width
m.part('foot', extrudePolygon([[-fw, -90], [fw, -90], [fw * 0.65, 100], [-fw * 0.65, 100]], 14).translate(0, 15, 0).color(standC));
m.part('neck', blk(-38, 30, 10, 38, 56, zp + sh * 0.55).color(standC));
m.part('housing', blk(-W * 0.3, 8, zp + H * 0.2, W * 0.3, 40, zp + H * 0.8).color(frame));
m.part('panel', blk(-W / 2, -12, zp, W / 2, 10, zp + H).color(frame));
m.part('screen', blk(-sw / 2, -16, zp + 24, sw / 2, -11, zp + 24 + sh).color(screen));
m.part('light', blk(W / 2 - 40, -15, zp + 8, W / 2 - 26, -11, zp + 14).color(light));

return m.model();
