// Original kernelCAD low-poly desk: worktop on panel legs or with a drawer
// pedestal, plus a modesty panel. User side faces -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'desk',
  title: 'Desk',
  description: 'Office or home desk with a modesty panel, on panel legs or with a three-drawer pedestal. Knobs: width, style, top, frame and handle colours.',
  tags: ['desk', 'writing desk', 'office desk', 'workstation', 'table', 'study'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'office', 'bedroom'],
  triangleBudget: 250,
});

const widthM = param('widthM', '1.4', { choices: ['1.2', '1.4', '1.6'], label: 'Width (m)' });
const style = param('style', 'pedestal', { choices: ['legs', 'pedestal'], label: 'Style' });
const top = param('top', '#c49a6c', { label: 'Top' });
const frame = param('frame', '#e8e7e2', { label: 'Frame' });
const handle = param('handle', '#3a3a3a', { label: 'Handles' });

presets({
  walnut: { top: '#6b4630', frame: '#2b2927', handle: '#b0b0aa' },
  white: { top: '#f3f2ee', frame: '#d7d5cf', handle: '#8f8f8b' },
});

const W = Number(widthM.value) * 1000;
const D = 700;
const H = 740;
const t = 25;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const desk = assembly('desk');
desk.part('top', blk(-W / 2, -D / 2, H - t, W / 2, D / 2, H).color(top));
desk.part('leg-left', blk(-W / 2 + 20, -D / 2 + 40, 0, -W / 2 + 45, D / 2 - 40, H - t + 1).color(frame));
desk.part('modesty', blk(-W / 2 + 44, D / 2 - 70, 300, W / 2 - 44, D / 2 - 52, H - t + 1).color(frame));
if (style.value === 'pedestal') {
  const pw = 420;
  const px1 = W / 2 - 20;
  const px0 = px1 - pw;
  // Open-front pedestal (sides, back, kick plate): the drawer fronts are its only front faces.
  desk.part('pedestal-left', blk(px0, -D / 2 + 40, 0, px0 + 18, D / 2 - 40, H - t + 1).color(frame));
  desk.part('pedestal-right', blk(px1 - 18, -D / 2 + 40, 0, px1, D / 2 - 40, H - t + 1).color(frame));
  desk.part('pedestal-back', blk(px0 + 17, D / 2 - 58, 0, px1 - 17, D / 2 - 40, H - t + 1).color(frame));
  desk.part('pedestal-kick', blk(px0 + 17, -D / 2 + 40, 0, px1 - 17, D / 2 - 57, 38).color(frame));
  const fh = (H - t - 60 - 2 * 6) / 3;
  for (let i = 0; i < 3; i++) {
    const z = 40 + i * (fh + 6);
    desk.part(`drawer-${i + 1}`, blk(px0 + 8, -D / 2 + 26, z, px1 - 8, -D / 2 + 41, z + fh).color(top));
    desk.part(`handle-${i + 1}`, blk(px0 + pw / 2 - 60, -D / 2 + 12, z + fh - 40, px0 + pw / 2 + 60, -D / 2 + 27, z + fh - 25).color(handle));
  }
} else {
  desk.part('leg-right', blk(W / 2 - 45, -D / 2 + 40, 0, W / 2 - 20, D / 2 - 40, H - t + 1).color(frame));
}

return desk.model();
