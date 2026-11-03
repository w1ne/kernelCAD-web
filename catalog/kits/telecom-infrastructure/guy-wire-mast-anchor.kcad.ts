// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "guy-wire-mast-anchor",
  license: 'CC0-1.0',
  title: "Guyed mast anchor set",
  description: "Three-point guy-wire anchor layout with a central mast stub and ground cleat blocks. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747b70", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("guy-wire-mast-anchor");
p.part("mast", c(0, 0, 0, 820, 45, 8).color(color));
p.part("base", c(0, 0, 0, 32, 180, 8).color(color));
p.part("anchor-a", b(-660, -380, 15, 180, 180, 30).color(color));
p.part("anchor-b", b(660, -380, 15, 180, 180, 30).color(color));
p.part("anchor-c", b(0, 760, 15, 180, 180, 30).color(color));
p.part("guy-a", b(-330, -190, 420, 22, 22, 650).color(color));
p.part("guy-b", b(330, -190, 420, 22, 22, 650).color(color));
p.part("guy-c", b(0, 380, 420, 22, 22, 650).color(color));

return p.model();
