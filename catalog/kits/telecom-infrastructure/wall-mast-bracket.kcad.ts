// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "wall-mast-bracket",
  license: 'CC0-1.0',
  title: "Wall mast stand-off bracket",
  description: "Wall stand-off bracket with backplate, two arms, mast clamps and bolt heads. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687278", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("wall-mast-bracket");
p.part("backplate", b(0, 0, 100, 300, 60, 900).color(color));
p.part("arm-upper", b(0, -220, 430, 90, 460, 80).color(color));
p.part("arm-lower", b(0, -220, 0, 90, 460, 80).color(color));
p.part("clamp-upper", c(0, -220, 450, 100, 85, 8).color(color));
p.part("clamp-lower", c(0, -220, 20, 100, 85, 8).color(color));
p.part("gusset-a", b(0, -90, 260, 40, 300, 330).color(color));
p.part("gusset-b", b(0, -90, 40, 40, 300, 330).color(color));

return p.model();
