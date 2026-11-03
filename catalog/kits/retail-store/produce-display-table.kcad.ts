// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "produce-display-table",
  license: 'CC0-1.0',
  title: "Produce display table",
  description: "Tiered produce island with three broad sloped-look display decks and a stout lower frame. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7954", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("produce-display-table");
p.part("lower-deck", b(0, 0, 560, 1900, 900, 70).color(color));
p.part("middle-deck", b(0, -120, 880, 1750, 700, 70).color(color));
p.part("upper-deck", b(0, -230, 1200, 1550, 500, 70).color(color));
p.part("front-apron", b(0, -465, 645, 1780, 32, 170).color(color));
p.part("leg--820--350", b(-820, -350, 265, 65, 65, 530).color(color));
p.part("leg--820-350", b(-820, 350, 265, 65, 65, 530).color(color));
p.part("leg-820--350", b(820, -350, 265, 65, 65, 530).color(color));
p.part("leg-820-350", b(820, 350, 265, 65, 65, 530).color(color));
p.part("corner-cap", c(0, 0, 1370, 40, 48, 8).color(color));

return p.model();
