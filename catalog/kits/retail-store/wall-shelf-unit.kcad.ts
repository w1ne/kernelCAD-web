// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "wall-shelf-unit",
  license: 'CC0-1.0',
  title: "Wall shelf unit",
  description: "Single-sided wall shelving with four adjustable decks, side uprights and a header board. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#806e5b", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("wall-shelf-unit");
p.part("back", b(0, 0, 1040, 1400, 48, 2080).color(color));
p.part("deck-0", b(0, -180, 330, 1420, 510, 50).color(color));
p.part("deck-1", b(0, -180, 720, 1420, 510, 50).color(color));
p.part("deck-2", b(0, -180, 1110, 1420, 510, 50).color(color));
p.part("deck-3", b(0, -180, 1500, 1420, 510, 50).color(color));
p.part("side--674", b(-674, -180, 1040, 52, 500, 2080).color(color));
p.part("side-674", b(674, -180, 1040, 52, 500, 2080).color(color));
p.part("header", b(0, -160, 2160, 1400, 100, 160).color(color));
p.part("foot", c(0, 0, 0, 48, 80, 8).color(color));

return p.model();
