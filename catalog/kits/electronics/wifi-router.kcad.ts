// Original kernelCAD low-poly wireless router: a low slab with a chamfered
// front carrying a row of status lights, a top vent panel, small feet and
// tapered antennas hinged along the back.
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Status lights face -Y.

meta({
  name: 'wifi-router',
  license: 'CC0-1.0',
  title: 'Wi-Fi router',
  description: 'Home wireless internet router with a chamfered front, status lights, top vents and two to four tilted antennas along the back. Knobs: antennas, body, antenna, vent and light colours.',
  tags: ['router', 'wifi', 'wireless', 'modem', 'network', 'internet', 'antenna', 'gadget'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'living-room', 'bedroom'],
  triangleBudget: 290,
});

const antennas = param('antennas', '3', { choices: ['2', '3', '4'], label: 'Antennas' });
const body = param('body', '#1f2124', { label: 'Body' });
const rod = param('rod', '#2c2e33', { label: 'Antennas' });
const vent = param('vent', '#3c3f45', { label: 'Vents' });
const light = param('light', '#3cf07a', { label: 'Status lights' });

presets({
  white: { body: '#eeeeec', rod: '#e2e2df', vent: '#c9cacc', light: '#4aa8ff' },
  gamer: { body: '#18181b', rod: '#b8232c', vent: '#b8232c', light: '#ff3b3b' },
});

const n = Number(antennas.value);
const W = 160 + n * 30;
const D = 150;
const H = 36;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const rect = (hx: number, hy: number) => path().moveTo(-hx, -hy).lineTo(hx, -hy).lineTo(hx, hy).lineTo(-hx, hy).close();

const r = assembly('wifi-router');
const z0 = 8;
const fy = -D / 2;
r.part('body', extrudePolygon([[-D / 2, z0], [D / 2, z0], [D / 2, z0 + H], [-D / 2 + 30, z0 + H], [-D / 2, z0 + H - 18]], W)
  .rotateX(90).rotateZ(90).translate(-W / 2, 0, 0).color(body));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  r.part(`foot-${sx}-${sy}`, blk(sx * (W / 2 - 22) - 9, sy * (D / 2 - 22) - 9, 0, sx * (W / 2 - 22) + 9, sy * (D / 2 - 22) + 9, z0 + 1).color(vent));
}
// Status lights on the front chamfer: small tilted blocks.
const ch = (Math.atan2(18, 30) * 180) / Math.PI;
const nl = 5;
for (let k = 0; k < nl; k++) {
  const x = -W * 0.32 + (k * W * 0.64) / (nl - 1);
  r.part(`light-${k}`, box(14, 9, 3, true).rotateX(-ch).translate(x, fy + 15, z0 + H - 9).color(light));
}
// Top vent slots.
for (let v = 0; v < 4; v++) {
  const y = -D / 2 + 50 + v * 18;
  r.part(`vent-${v}`, blk(-W * 0.35, y, z0 + H - 1, W * 0.35, y + 8, z0 + H + 1.5).color(vent));
}
// Antennas: a hinge block on the back and a tapered blade, outer ones splayed.
for (let a = 0; a < n; a++) {
  const t = n === 1 ? 0 : a / (n - 1) - 0.5;
  const x = t * (W - 50);
  const splay = t * 2 * 14;
  r.part(`hinge-${a}`, blk(x - 9, D / 2 - 6, z0 + 8, x + 9, D / 2 + 10, z0 + H - 4).color(rod));
  r.part(`antenna-${a}`, rect(8, 5).loft(rect(5, 3.5), { spacing: 170, ruled: true })
    .rotateX(-6).rotateY(splay).translate(x, D / 2 + 3, z0 + H - 14).color(rod));
}

return r.model();
