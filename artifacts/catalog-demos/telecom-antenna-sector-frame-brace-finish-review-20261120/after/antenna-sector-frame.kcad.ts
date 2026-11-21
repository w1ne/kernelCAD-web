// SPDX-License-Identifier: CC0-1.0
// Sector antenna frame: a triangular sector mount. Three galvanized mounting pipes stand at the
// corners of a triangle (one face per sector), joined by galvanized top and bottom braces and a
// rear mid-brace, with polymer pipe caps, a galvanized stand-off arm and a stainless pole clamp.
// The whole welded frame is hot-dip galvanized, so both brace levels share one finish.

meta({
  name: "antenna-sector-frame",
  license: 'CC0-1.0',
  title: "Sector antenna frame",
  description: "Triangular sector antenna frame: three galvanized mounting pipes at the corners of a triangle, joined by galvanized top and bottom braces and a rear mid-brace, with polymer pipe caps, a stand-off arm and a stainless pole clamp. Knobs: overall scale; galvanized steel, stainless steel clamp, polymer pipe caps.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel frame' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel pole clamp' });
const polymer = param('polymer', '#22282b', { label: 'Polymer pipe caps' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    stainlessSteel: '#d0d9d6',
    polymer: '#263a37',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    stainlessSteel: '#e4e9e6',
    polymer: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z).scale(scale);

// Pipe centres on a 260 mm circumradius: rail-a faces front, rail-b/c form the rear face.
const R = 260;
const corners: Record<string, [number, number]> = {
  a: [0, -R],
  b: [R * Math.cos(Math.PI / 6), R * Math.sin(Math.PI / 6)],
  c: [-R * Math.cos(Math.PI / 6), R * Math.sin(Math.PI / 6)],
};
const brace = (from: string, to: string, z: number) => {
  const [x0, y0] = corners[from]!;
  const [x1, y1] = corners[to]!;
  const length = Math.hypot(x1 - x0, y1 - y0);
  return box(length, 50, 50, true)
    .rotateZ((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI)
    .translate((x0 + x1) / 2, (y0 + y1) / 2, z + 25)
    .scale(scale);
};

const p = assembly("antenna-sector-frame");
for (const [key, [x, y]] of Object.entries(corners)) {
  p.part(`rail-${key}`, c(x, y, 0, 1100, 38).color(galvanizedSteel));
  p.part(`pipe-cap-${key}`, c(x, y, 1100, 14, 42).color(polymer));
}
for (const [from, to] of [['a', 'b'], ['b', 'c'], ['c', 'a']] as const) {
  p.part(`top-brace-${from}${to}`, brace(from, to, 990).color(galvanizedSteel));
  p.part(`bottom-brace-${from}${to}`, brace(from, to, 60).color(galvanizedSteel));
}
// Rear mid-brace carries the stand-off arm between rail-b and rail-c.
p.part("mid-brace-bc", brace('b', 'c', 487).color(galvanizedSteel));
p.part("mount-arm", b(0, 280, 480, 65, 300, 65).color(galvanizedSteel));
p.part("clamp", b(0, 465, 472, 180, 70, 80).color(stainlessSteel));

return p.model();
