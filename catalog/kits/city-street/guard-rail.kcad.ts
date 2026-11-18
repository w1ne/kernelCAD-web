// Original kernelCAD low-poly highway guard rail: a W-beam rail on spacer
// blocks and posts with flared fishtail ends. Millimetres, Z up, runs along X,
// traffic side -Y.

meta({
  name: 'guard-rail',
  license: 'CC0-1.0',
  title: 'Guard rail',
  description: 'Roadside W-beam guard rail on posts with spacer blocks and flared ends. Knobs: length, rail and post colours.',
  tags: ['guard rail', 'guardrail', 'crash barrier', 'highway', 'road', 'barrier', 'armco', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'road', 'highway'],
  triangleBudget: 320,
});

const lengthM = param('lengthM', '4', { choices: ['4', '6', '8'], label: 'Length (m)' });
const rail = param('rail', '#b8bdc2', { label: 'Rail' });
const post = param('post', '#7d8288', { label: 'Posts' });

presets({
  weathered: { rail: '#8a7a68', post: '#6b5a48' },
  painted: { rail: '#f2c418', post: '#3a3c3f' },
});

const L = Number(lengthM.value) * 1000;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

// W-beam cross-section in (y, z): a zig-zag ribbon 25 mm thick.
const w: [number, number][] = [
  [0, 430], [-70, 510], [0, 590], [-70, 670], [0, 750],
  [25, 750], [-45, 670], [25, 590], [-45, 510], [25, 430],
];
const gr = assembly('guard-rail');
gr.part('rail', sideProfile(w, -L / 2 - 100, L + 200).color(rail));
const n = Math.round(L / 2000) + 1;
for (let i = 0; i < n; i++) {
  const x = -L / 2 + 150 + (i * (L - 300)) / (n - 1);
  gr.part(`post-${i + 1}`, blk(x - 50, 40, 0, x + 50, 190, 760).color(post));
  gr.part(`spacer-${i + 1}`, blk(x - 45, 15, 520, x + 45, 45, 660).color(post));
}
for (const side of [-1, 1]) {
  const end = box(420, 25, 320, true).rotateZ(side * 25).translate(side * (L / 2 + 270), 70, 590);
  gr.part(`end-${side < 0 ? 'l' : 'r'}`, end.color(rail));
}

return gr.model();
