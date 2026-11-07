// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "deli-service-case",
  license: 'CC0-1.0',
  title: "Deli service case",
  description: "Customer-facing deli counter with raised display deck, sneeze-guard frame and base cabinet. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#858074", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("deli-service-case");
p.part("base", b(0, 0, 430, 1750, 700, 860).color(color));
p.part("display-deck", b(0, -80, 885, 1720, 620, 50).color(color));
p.part("canopy", b(0, 0, 1560, 1760, 720, 60).color(color));
p.part("glass-post--800", b(-800, -250, 1220, 34, 34, 680).color(color));
p.part("glass-post-0", b(0, -250, 1220, 34, 34, 680).color(color));
p.part("glass-post-800", b(800, -250, 1220, 34, 34, 680).color(color));
p.part("customer-rail", b(0, -365, 930, 1720, 24, 34).color(color));
p.part("scale-platform", c(570, 180, 920, 25, 105, 8).color(color));

return p.model();
