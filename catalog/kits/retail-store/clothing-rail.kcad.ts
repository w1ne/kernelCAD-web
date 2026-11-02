// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "clothing-rail",
  license: 'CC0-1.0',
  title: "Clothing rail",
  description: "Retail garment rail with straight hanging bar, four corner posts and stabilizing feet. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5c6264", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("clothing-rail");
p.part("top-rail", b(0, 0, 1510, 1500, 50, 50).color(color));
p.part("post--700--205", b(-700, -205, 755, 42, 42, 1510).color(color));
p.part("post--700-205", b(-700, 205, 755, 42, 42, 1510).color(color));
p.part("post-700--205", b(700, -205, 755, 42, 42, 1510).color(color));
p.part("post-700-205", b(700, 205, 755, 42, 42, 1510).color(color));
p.part("foot--700", b(-700, 0, 30, 220, 420, 60).color(color));
p.part("foot-700", b(700, 0, 30, 220, 420, 60).color(color));
p.part("end-cap", c(750, 0, 1510, 40, 36, 8).color(color));

return p.model();
