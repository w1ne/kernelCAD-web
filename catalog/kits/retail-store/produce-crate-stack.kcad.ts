// SPDX-License-Identifier: CC0-1.0
// Stable two-by-two stack of four ventilated produce crates with open rail sides and corner clips

meta({
  name: "produce-crate-stack",
  license: 'CC0-1.0',
  title: "Produce crate stack",
  description: "Stable two-by-two stack of four ventilated produce crates with open rail sides and corner clips. Knobs: overall scale and polypropylene, stainless steel, paper color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polypropylene = param('polypropylene', '#6d9453', { label: 'Polypropylene color' });
const stainless = param('stainless', '#919da0', { label: 'Stainless steel color' });
const paper = param('paper', '#eee3c7', { label: 'Paper color' });

presets({
  cleanStore: {
    polypropylene: '#d6e0d5',
    stainless: '#bfc8cb',
    paper: '#f0e5c9',
  },
  nightRestock: {
    polypropylene: '#45614e',
    stainless: '#66747a',
    paper: '#c9b27e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("produce-crate-stack");
const cratePositions = [
  { id: "lower-left", x: -310, z: 170 },
  { id: "lower-right", x: 310, z: 170 },
  { id: "upper-left", x: -310, z: 510 },
  { id: "upper-right", x: 310, z: 510 },
];
for (const crate of cratePositions) {
  p.part(`crate-${crate.id}-floor`, b(crate.x, 0, crate.z - 156, 600, 500, 28).color(polypropylene));
  for (const xSide of [-1, 1]) {
    for (const ySide of [-1, 1]) {
      p.part(`crate-${crate.id}-corner-${xSide}-${ySide}`, b(crate.x + xSide * 282, ySide * 232, crate.z, 32, 32, 320).color(polypropylene));
    }
  }
  for (let row = 0; row < 3; row++) {
    const z = crate.z - 75 + row * 75;
    p.part(`crate-${crate.id}-front-rail-${row}`, b(crate.x, -242, z, 580, 22, 22).color(polypropylene));
    p.part(`crate-${crate.id}-back-rail-${row}`, b(crate.x, 242, z, 580, 22, 22).color(polypropylene));
    p.part(`crate-${crate.id}-left-rail-${row}`, b(crate.x - 292, 0, z, 22, 460, 22).color(polypropylene));
    p.part(`crate-${crate.id}-right-rail-${row}`, b(crate.x + 292, 0, z, 22, 460, 22).color(polypropylene));
  }
  p.part(`crate-${crate.id}-label`, b(crate.x - 180, -256, crate.z + 96, 180, 10, 48).color(paper));
}
p.part("stack-clip-left-front", c(-592, -232, 670, 22, 18, 8).color(stainless));
p.part("stack-clip-left-back", c(-592, 232, 670, 22, 18, 8).color(stainless));
p.part("stack-clip-right-front", c(592, -232, 670, 22, 18, 8).color(stainless));
p.part("stack-clip-right-back", c(592, 232, 670, 22, 18, 8).color(stainless));

return p.model();
