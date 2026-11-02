// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "antenna-sector-frame",
  license: 'CC0-1.0',
  title: "Sector antenna frame",
  description: "Triangular sector panel support frame with three vertical rails and top and bottom braces. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#677177", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("antenna-sector-frame");
p.part("rail-a", b(-190, 0, 0, 36, 65, 1100).color(color));
p.part("rail-b", b(0, 0, 0, 36, 65, 1100).color(color));
p.part("rail-c", b(190, 0, 0, 36, 65, 1100).color(color));
p.part("top", b(0, 0, 1090, 500, 100, 60).color(color));
p.part("bottom", b(0, 0, 5, 500, 100, 60).color(color));
p.part("mount-arm", b(0, 170, 460, 65, 400, 65).color(color));
p.part("clamp", b(0, 380, 460, 180, 70, 80).color(color));

return p.model();
