// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "trolley-corral",
  license: 'CC0-1.0',
  title: "Trolley corral",
  description: "Low cart-return bay with parallel divider rails, end stop and corner guard posts. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5d6b70", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("trolley-corral");
p.part("floor-rail-left", b(0, -330, 24, 1800, 35, 48).color(color));
p.part("floor-rail-right", b(0, 330, 24, 1800, 35, 48).color(color));
p.part("end-stop", b(850, 0, 240, 50, 690, 480).color(color));
p.part("front-gate", b(-850, 0, 330, 38, 690, 660).color(color));
p.part("divider-0", b(-600, 0, 145, 26, 620, 290).color(color));
p.part("divider-1", b(-300, 0, 145, 26, 620, 290).color(color));
p.part("divider-2", b(0, 0, 145, 26, 620, 290).color(color));
p.part("divider-3", b(300, 0, 145, 26, 620, 290).color(color));
p.part("divider-4", b(600, 0, 145, 26, 620, 290).color(color));
p.part("post-cap--850", c(-850, 0, 660, 32, 32, 8).color(color));
p.part("post-cap-850", c(850, 0, 660, 32, 32, 8).color(color));

return p.model();
