// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "returns-drop-bin",
  license: 'CC0-1.0',
  title: "Returns drop bin",
  description: "Store returns collection bin with hinged-look lid, front deposit slot and lower label plate. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#47736e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("returns-drop-bin");
p.part("bin", b(0, 0, 430, 680, 600, 860).color(color));
p.part("lid", b(0, 0, 885, 720, 640, 50).color(color));
p.part("deposit-slot", b(0, -315, 840, 300, 18, 36).color(color));
p.part("label-panel", b(0, -314, 490, 410, 16, 180).color(color));
p.part("lid-hinge-left", c(-285, 280, 885, 35, 26, 8).color(color));
p.part("lid-hinge-right", c(285, 280, 885, 35, 26, 8).color(color));

return p.model();
