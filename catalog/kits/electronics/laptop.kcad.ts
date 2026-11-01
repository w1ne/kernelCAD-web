// Original kernelCAD low-poly open laptop: a thin wedge base with key rows
// and a touchpad, and a bezelled lid hinged at the back at a chosen opening
// angle. Millimetres, Z up, base on z = 0 centred on x = y = 0. Screen faces -Y.

meta({
  name: 'laptop',
  license: 'CC0-1.0',
  title: 'Laptop',
  description: 'Open laptop computer with a thin base, key rows, touchpad and a hinged bezelled screen lid at an adjustable angle. Knobs: screen size, lid angle, body, keys, bezel and screen colours.',
  tags: ['laptop', 'notebook', 'computer', 'pc', 'screen', 'keyboard', 'portable', 'office'],
  kit: 'electronics',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'bedroom', 'study', 'cafe'],
  triangleBudget: 160,
});

const size = param('sizeIn', '15', { choices: ['13', '15', '17'], label: 'Screen (in)' });
const angle = param('lidAngle', '110', { choices: ['90', '110', '130'], label: 'Lid angle (deg)' });
const body = param('body', '#b9bcc1', { label: 'Body' });
const keys = param('keys', '#2a2b2f', { label: 'Keys' });
const bezel = param('bezel', '#1b1c1f', { label: 'Bezel' });
const screen = param('screen', '#2f6aa0', { label: 'Screen' });

presets({
  black: { body: '#2c2d31', keys: '#151618', bezel: '#151618' },
  rose: { body: '#d9b3a6', keys: '#f1ede8', bezel: '#2a2526', screen: '#7a5ea8' },
  off: { screen: '#141619' },
});

const diag = Number(size.value) * 25.4;
const sw = (diag * 16) / Math.hypot(16, 10);
const sh = (diag * 10) / Math.hypot(16, 10);
const W = sw + 24;
const D = sh + 36;
const T = 16; // base thickness at the back
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const l = assembly('laptop');
const yc = -12; // shift the base forward so lid and base centre on y = 0
l.part('base', extrudePolygon([[-D / 2, 0], [D / 2, 0], [D / 2, T], [-D / 2, T - 5]], W)
  .rotateX(90).rotateZ(90).translate(-W / 2, yc, 0).color(body));
const topAt = (y: number) => T - 5 + ((y - yc + D / 2) * 5) / D;
// Five key rows in the back half and a touchpad at the front.
const kw = W * 0.86;
const ky0 = yc - D / 2 + D * 0.42;
const kr = (D * 0.5) / 5;
for (let r = 0; r < 5; r++) {
  const y = ky0 + r * kr;
  l.part(`keys-${r}`, blk(-kw / 2, y, topAt(y) - 1, kw / 2, y + kr * 0.78, topAt(y + kr) + 1.5).color(keys));
}
const ty = yc - D / 2 + 12;
l.part('touchpad', blk(-W * 0.18, ty, topAt(ty) - 1, W * 0.18, ty + D * 0.28, topAt(ty + D * 0.28) + 0.8).color(keys));

// Lid built standing on its hinge edge, then tilted back about it.
const H = sh + 30;
const tilt = Number(angle.value) - 90;
const lid = (s: ReturnType<typeof box>) => s.rotateX(-tilt).translate(0, yc + D / 2 - 6, T - 2);
l.part('lid', lid(blk(-W / 2, -1, 0, W / 2, 6, H)).color(body));
l.part('bezel', lid(blk(-W / 2 + 2, -4, 2, W / 2 - 2, 0, H - 2)).color(bezel));
l.part('screen', lid(blk(-sw / 2, -6, 16, sw / 2, -3, 16 + sh)).color(screen));
l.part('hinge', blk(-W * 0.35, yc + D / 2 - 14, T - 6, W * 0.35, yc + D / 2 + 2, T + 6).color(bezel));

return l.model();
