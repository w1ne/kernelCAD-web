// Original kernelCAD low-poly tube television: a boxy cabinet with a deep
// tapered back, a bulging 4:3 screen in a bezel, a control column with two
// dials and speaker slots, and optional rabbit-ear antenna.
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Screen faces -Y.

meta({
  name: 'crt-television',
  license: 'CC0-1.0',
  title: 'CRT television',
  description: 'Boxy retro cathode-ray tube television with a bulging 4:3 screen, tapered back, two channel dials, speaker slots and optional rabbit-ear antenna. Knobs: screen size, antenna, cabinet, bezel, screen, dial and antenna colours.',
  tags: ['tv', 'television', 'crt', 'tube tv', 'retro', 'vintage', 'screen', 'antenna'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'retro'],
  triangleBudget: 260,
});

const size = param('sizeIn', '21', { choices: ['14', '21', '28'], label: 'Screen (in)' });
const antenna = param('antenna', 'rabbit-ears', { choices: ['rabbit-ears', 'none'], label: 'Antenna' });
const cabinet = param('cabinet', '#6e4a2e', { label: 'Cabinet' });
const bezel = param('bezel', '#2a2a2c', { label: 'Bezel' });
const screen = param('screen', '#40534d', { label: 'Screen' });
const dials = param('dials', '#c9c1b0', { label: 'Dials' });
const rods = param('rods', '#a7aaae', { label: 'Antenna' });

presets({
  beige: { cabinet: '#d6cdb6', bezel: '#bdb39c', dials: '#5a554c' },
  black: { cabinet: '#1f1f21', bezel: '#2f3033', dials: '#8a8d92' },
  on: { screen: '#7fb8d8' },
});

const diag = Number(size.value) * 25.4;
const sw = diag * 0.8;
const sh = diag * 0.6;
const cw = 70 + diag * 0.12; // control column width
const W = sw + 60 + cw;
const H = sh + 80;
const Df = diag * 0.32; // straight front section
const Dt = diag * 0.48; // tapered tube housing
const z0 = 12;
const blk = (x0: number, y0: number, z0b: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0b).translate(x0, y0, z0b);
const rect = (hx: number, hy: number) => path().moveTo(-hx, -hy).lineTo(hx, -hy).lineTo(hx, hy).lineTo(-hx, hy).close();
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const tv = assembly('crt-television');
const fy = -(Df + Dt) / 2;
const zc = z0 + H / 2;
tv.part('cabinet', blk(-W / 2, fy, z0, W / 2, fy + Df, z0 + H).color(cabinet));
// Tapered back: a ruled loft from the cabinet outline to a smaller, lower rear plate.
tv.part('tube', rect(W / 2 - 10, H / 2 - 10).loft(rect(W * 0.3, H * 0.28), { spacing: Dt, ruled: true })
  .rotateX(-90).translate(0, fy + Df - 1, zc).color(cabinet));
for (const sx of [-1, 1]) {
  tv.part(`foot-${sx}`, blk(sx * (W / 2 - 50) - 30, fy + 20, 0, sx * (W / 2 - 50) + 30, fy + Df + Dt * 0.4, z0 + 1).color(bezel));
}
// Screen in a bezel, offset left of the control column.
const scx = -W / 2 + 30 + sw / 2;
const scz = z0 + 40 + sh / 2;
tv.part('bezel', blk(scx - sw / 2 - 18, fy - 6, scz - sh / 2 - 18, scx + sw / 2 + 18, fy + 1, scz + sh / 2 + 18).color(bezel));
tv.part('screen', rect(sw / 2, sh / 2).loft(rect(sw / 2 - 18, sh / 2 - 14), { spacing: 14, ruled: true })
  .rotateX(90).translate(scx, fy - 5, scz).color(screen));
// Control column: two dials over speaker slots.
const ccx = W / 2 - cw / 2 - 8;
tv.part('panel', blk(ccx - cw / 2 + 6, fy - 4, z0 + 24, ccx + cw / 2 - 6, fy + 1, z0 + H - 24).color(bezel));
for (let d = 0; d < 2; d++) {
  const r = cw * 0.26;
  tv.part(`dial-${d}`, ngon(r, 8).extrude(18).rotateX(90).translate(ccx, fy - 3, z0 + H - 40 - r - d * (r * 2 + 22)).color(dials));
}
for (let s = 0; s < 4; s++) {
  const z = z0 + 44 + s * 16;
  tv.part(`slot-${s}`, blk(ccx - cw * 0.3, fy - 6, z, ccx + cw * 0.3, fy - 2, z + 7).color(dials));
}
if (antenna.value === 'rabbit-ears') {
  const tz = z0 + H;
  const ay = fy + Df - 60;
  tv.part('antenna-base', ngon(55, 8).loft(ngon(28, 8), { spacing: 32, ruled: true }).translate(0, ay, tz - 6).color(bezel));
  for (const sx of [-1, 1]) {
    tv.part(`rod-${sx}`, box(7, 7, 300 + diag * 0.3).rotateY(sx * 28).translate(sx * 6, ay - 3, tz + 18).color(rods));
  }
}

return tv.model();
