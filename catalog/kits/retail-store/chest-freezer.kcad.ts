// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "chest-freezer",
  license: 'CC0-1.0',
  title: "Chest freezer",
  description: "Lidded chest freezer with raised sliding cover rails, insulated tub and recessed foot plinth. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#cad2d2", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("chest-freezer");
p.part("plinth", b(0, 0, 80, 1480, 760, 160).color(color));
p.part("tub", b(0, 0, 400, 1400, 680, 640).color(color));
p.part("lid-left", b(-340, 0, 750, 720, 700, 60).color(color));
p.part("lid-right", b(340, 0, 750, 720, 700, 60).color(color));
p.part("handle", b(0, -365, 735, 260, 24, 30).color(color));
p.part("thermostat", c(560, -355, 705, 32, 32, 8).color(color));

return p.model();
