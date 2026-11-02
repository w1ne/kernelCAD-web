// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "wire-grid-display",
  license: 'CC0-1.0',
  title: "Wire grid display",
  description: "Freestanding wire-grid merchandise panel with side feet, cross rails and hanging peg bars. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#60686a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("wire-grid-display");
p.part("grid-frame", b(0, 0, 850, 1200, 36, 1700).color(color));
p.part("vertical-0", b(-500, -24, 850, 18, 18, 1660).color(color));
p.part("vertical-1", b(-300, -24, 850, 18, 18, 1660).color(color));
p.part("vertical-2", b(-100, -24, 850, 18, 18, 1660).color(color));
p.part("vertical-3", b(100, -24, 850, 18, 18, 1660).color(color));
p.part("vertical-4", b(300, -24, 850, 18, 18, 1660).color(color));
p.part("vertical-5", b(500, -24, 850, 18, 18, 1660).color(color));
p.part("horizontal-0", b(0, -24, 160, 1160, 18, 18).color(color));
p.part("horizontal-1", b(0, -24, 390, 1160, 18, 18).color(color));
p.part("horizontal-2", b(0, -24, 620, 1160, 18, 18).color(color));
p.part("horizontal-3", b(0, -24, 850, 1160, 18, 18).color(color));
p.part("horizontal-4", b(0, -24, 1080, 1160, 18, 18).color(color));
p.part("horizontal-5", b(0, -24, 1310, 1160, 18, 18).color(color));
p.part("horizontal-6", b(0, -24, 1540, 1160, 18, 18).color(color));
p.part("foot--430", b(-430, 0, 30, 260, 500, 60).color(color));
p.part("foot-430", b(430, 0, 30, 260, 500, 60).color(color));
p.part("hook-mount", c(0, 0, 1720, 36, 30, 8).color(color));

return p.model();
