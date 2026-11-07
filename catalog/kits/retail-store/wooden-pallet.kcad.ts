// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "wooden-pallet",
  license: 'CC0-1.0',
  title: "Wooden pallet",
  description: "Reusable three-runner pallet with spaced top boards and open forklift entry gaps. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#96774f", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("wooden-pallet");
p.part("top-board-0", b(0, -360, 150, 1200, 112, 44).color(color));
p.part("top-board-1", b(0, -180, 150, 1200, 112, 44).color(color));
p.part("top-board-2", b(0, 0, 150, 1200, 112, 44).color(color));
p.part("top-board-3", b(0, 180, 150, 1200, 112, 44).color(color));
p.part("top-board-4", b(0, 360, 150, 1200, 112, 44).color(color));
p.part("runner--440", b(-440, 0, 78, 120, 950, 156).color(color));
p.part("runner-0", b(0, 0, 78, 120, 950, 156).color(color));
p.part("runner-440", b(440, 0, 78, 120, 950, 156).color(color));
p.part("block--440--335", b(-440, -335, 26, 145, 180, 52).color(color));
p.part("block--440-335", b(-440, 335, 26, 145, 180, 52).color(color));
p.part("block-0--335", b(0, -335, 26, 145, 180, 52).color(color));
p.part("block-0-335", b(0, 335, 26, 145, 180, 52).color(color));
p.part("block-440--335", b(440, -335, 26, 145, 180, 52).color(color));
p.part("block-440-335", b(440, 335, 26, 145, 180, 52).color(color));
p.part("nail-head", c(-530, -360, 174, 10, 10, 8).color(color));

return p.model();
