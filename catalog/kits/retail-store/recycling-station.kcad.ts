// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "recycling-station",
  license: 'CC0-1.0',
  title: "Retail recycling station",
  description: "Three-stream recycling station with separate openings, top dividers and a shared removable base. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#527a65", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("recycling-station");
p.part("bin-0", b(-390, 0, 400, 360, 440, 800).color(color));
p.part("bin-1", b(0, 0, 400, 360, 440, 800).color(color));
p.part("bin-2", b(390, 0, 400, 360, 440, 800).color(color));
p.part("opening-0", b(-390, -230, 840, 220, 22, 110).color(color));
p.part("opening-1", b(0, -230, 840, 220, 22, 110).color(color));
p.part("opening-2", b(390, -230, 840, 220, 22, 110).color(color));
p.part("shared-top", b(0, 0, 830, 1190, 480, 60).color(color));
p.part("base-plinth", b(0, 0, 35, 1210, 500, 70).color(color));
p.part("corner-foot-0", c(-540, 0, 0, 28, 28, 8).color(color));
p.part("corner-foot-1", c(0, 0, 0, 28, 28, 8).color(color));
p.part("corner-foot-2", c(540, 0, 0, 28, 28, 8).color(color));

return p.model();
