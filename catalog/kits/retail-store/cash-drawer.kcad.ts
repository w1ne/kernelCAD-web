// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "cash-drawer",
  license: 'CC0-1.0',
  title: "Cash drawer",
  description: "Retail till drawer with broad faceplate, recessed pull and compact lock cylinder. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#60676c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("cash-drawer");
p.part("drawer-box", b(0, 0, 80, 430, 440, 160).color(color));
p.part("faceplate", b(0, -226, 90, 450, 22, 138).color(color));
p.part("pull", b(0, -246, 105, 100, 12, 24).color(color));
p.part("lock", c(150, -246, 105, 12, 16, 8).color(color));

return p.model();
