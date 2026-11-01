// Original kernelCAD low-poly desktop PC tower: a case on four feet with a
// front panel carrying drive bays, vents and a power button (office) or a
// mesh intake with light strips and a side window (gamer).
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Front faces -Y, window on -X.

meta({
  name: 'desktop-tower',
  license: 'CC0-1.0',
  title: 'Desktop PC tower',
  description: 'Desktop computer tower case on feet with a front panel, drive bays, vent slots and power button, or a gamer mesh front with light strips and a glass side window. Knobs: style, size, case, front, accent light and vent or window colours.',
  tags: ['computer', 'pc', 'desktop', 'tower', 'pc case', 'gaming pc', 'workstation', 'office'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'bedroom', 'study'],
  triangleBudget: 220,
});

const style = param('style', 'office', { choices: ['office', 'gamer'], label: 'Style' });
const size = param('size', 'mid', { choices: ['mini', 'mid', 'full'], label: 'Size' });
const caseC = param('case', '#2b2d31', { label: 'Case' });
const front = param('front', '#3c3f45', { label: 'Front panel' });
const accent = param('accent', '#39c0ff', { label: 'Accent light' });
const dark = param('dark', '#17191c', { label: 'Vents and window' });

presets({
  retro: { case: '#d9cfb4', front: '#e6dec8', accent: '#5ad15a', dark: '#8a8270' },
  white: { case: '#e8e8e5', front: '#f4f4f2', accent: '#7a8cff', dark: '#2a2d33' },
  gamer: { case: '#141416', front: '#1e1f23', accent: '#ff2e7a', dark: '#2a2236' },
});

const sz = size.value === 'mini' ? 0 : size.value === 'full' ? 2 : 1;
const W = [180, 210, 230][sz];
const D = [360, 440, 500][sz];
const H = [340, 450, 540][sz];
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const t = assembly('desktop-tower');
const z0 = 14;
const fy = -D / 2;
t.part('case', blk(-W / 2, fy + 10, z0, W / 2, D / 2, z0 + H).color(caseC));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  t.part(`foot-${sx}-${sy}`, blk(sx * (W / 2 - 30) - 16, sy * (D / 2 - 40) - 22, 0, sx * (W / 2 - 30) + 16, sy * (D / 2 - 40) + 22, z0 + 1).color(dark));
}
t.part('front', blk(-W / 2 - 2, fy, z0 - 2, W / 2 + 2, fy + 12, z0 + H + 2).color(front));
const fz = fy - 3; // just proud of the front panel
if (style.value === 'office') {
  // Two 5.25" bays, a slim slot, vent slots below and a round power button.
  for (let b = 0; b < 2; b++) {
    const z = z0 + H - 50 - b * 50;
    t.part(`bay-${b}`, blk(-W / 2 + 22, fz, z - 40, W / 2 - 22, fy + 1, z).color(caseC));
  }
  t.part('slot', blk(-W / 2 + 40, fz - 1, z0 + H - 52, W / 2 - 40, fz + 1, z0 + H - 47).color(dark));
  for (let v = 0; v < 5; v++) {
    const z = z0 + 30 + v * (H * 0.09);
    t.part(`vent-${v}`, blk(-W / 2 + 30, fz, z, W / 2 - 30, fy + 1, z + H * 0.035).color(dark));
  }
  t.part('power', ngon(13, 8).extrude(6).rotateX(90).translate(0, fy + 1, z0 + H - 160).color(accent));
  t.part('led', blk(28, fz, z0 + H - 164, 40, fy + 1, z0 + H - 156).color(accent));
} else {
  // Mesh intake between two vertical light strips, top vent and a side window.
  t.part('mesh', blk(-W / 2 + 26, fz, z0 + 40, W / 2 - 26, fy + 1, z0 + H - 60).color(dark));
  for (const sx of [-1, 1]) {
    t.part(`strip-${sx}`, blk(sx * (W / 2 - 13) - 5, fz - 1, z0 + 30, sx * (W / 2 - 13) + 5, fy + 1, z0 + H - 30).color(accent));
  }
  t.part('power', ngon(11, 8).extrude(6).rotateX(90).translate(0, fy + 1, z0 + H - 30).color(accent));
  t.part('window', blk(-W / 2 - 3, fy + 40, z0 + 30, -W / 2 + 1, D / 2 - 30, z0 + H - 30).color(dark));
  t.part('glow', blk(-W / 2 - 5, fy + 40, z0 + 30, -W / 2 + 1, D / 2 - 30, z0 + 40).color(accent));
  t.part('top-vent', blk(-W / 2 + 30, fy + 60, z0 + H - 1, W / 2 - 30, D / 2 - 40, z0 + H + 3).color(dark));
}

return t.model();
