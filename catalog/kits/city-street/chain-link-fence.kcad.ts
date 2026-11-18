// Original kernelCAD low-poly chain-link fence panel: two round posts, a top
// rail and a bottom wire, a diamond mesh of crossing diagonal wires clipped to
// the panel, and optional barbed-wire arms. Millimetres, Z up, runs along X;
// 2.5 m panels tile end to end.

meta({
  name: 'chain-link-fence',
  license: 'CC0-1.0',
  title: 'Chain-link fence',
  description: 'Chain-link fence panel with posts, top rail, diamond wire mesh and optional barbed-wire top. Knobs: height, mesh size, barbed top, post and mesh colours.',
  tags: ['fence', 'chain link', 'wire fence', 'mesh', 'barbed wire', 'industrial', 'yard', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'industrial', 'construction'],
  triangleBudget: 560,
});

const heightMm = param('heightMm', '1800', { choices: ['1200', '1800', '2400'], label: 'Height (mm)' });
const mesh = param('mesh', 'medium', { choices: ['coarse', 'medium'], label: 'Mesh size' });
const barbed = param('barbed', 'no', { choices: ['no', 'yes'], label: 'Barbed top' });
const post = param('post', '#9aa0a6', { label: 'Posts and rail' });
const wire = param('wire', '#b8bdc2', { label: 'Mesh' });

presets({
  green: { post: '#2f5a3a', wire: '#3d6b48' },
  black: { post: '#2a2c2e', wire: '#3a3c3f' },
});

const H = Number(heightMm.value);
const L = 2500;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const cl = assembly('chain-link-fence');
for (const [k, x] of [[1, -L / 2], [2, L / 2]] as const) {
  cl.part(`post-${k}`, ngon(32, 6).extrude(H + 60).translate(x, 0, 0).color(post));
  cl.part(`cap-${k}`, ngon(40, 6).extrude(30).translate(x, 0, H + 60).color(post));
}
cl.part('top-rail', bar(-L / 2, H, L / 2, H, 34).color(post));
cl.part('bottom-wire', bar(-L / 2, 60, L / 2, 60, 12).color(wire));

// Diagonal wires at +-45 degrees, clipped analytically to the panel rectangle.
const x0 = -L / 2 + 30;
const x1 = L / 2 - 30;
const z0 = 60;
const z1 = H - 10;
const p = mesh.value === 'coarse' ? 420 : 300;
let k = 0;
for (let c = x0 - (z1 - z0); c <= x1; c += p) {
  // Rising wire: x = c + (z - z0).
  const za = Math.max(z0, z0 + (x0 - c));
  const zb = Math.min(z1, z0 + (x1 - c));
  if (zb - za > 40) cl.part(`wire-a-${++k}`, bar(c + za - z0, za, c + zb - z0, zb, 10).color(wire));
  // Falling wire: x = c + (z1 - z) mirrored.
  const zc = Math.max(z0, z1 - (x1 - c));
  const zd = Math.min(z1, z1 - (x0 - c));
  if (zd - zc > 40) cl.part(`wire-b-${k}`, bar(c + z1 - zc, zc, c + z1 - zd, zd, 10, 4).color(wire));
}
if (barbed.value === 'yes') {
  for (const [i, x] of [[1, -L / 2], [2, L / 2]] as const) {
    cl.part(`arm-${i}`, box(30, 420, 30, true).rotateX(-40).translate(x, -150, H + 200).color(post));
  }
  for (const [i, [y, z]] of [[-80, H + 110], [-170, H + 190], [-260, H + 270]].entries()) {
    cl.part(`barb-wire-${i + 1}`, box(L, 10, 10, true).translate(0, y, z).color(wire));
  }
}

return cl.model();
