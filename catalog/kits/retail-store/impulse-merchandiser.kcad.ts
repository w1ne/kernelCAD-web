// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "impulse-merchandiser",
  license: 'CC0-1.0',
  title: "Impulse merchandiser",
  description: "Narrow checkout-side impulse display with four shallow trays and a signboard mast. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#bc7d3d", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("impulse-merchandiser");
p.part("base", b(0, 0, 30, 430, 390, 60).color(color));
p.part("backboard", b(0, 150, 770, 400, 45, 1540).color(color));
p.part("tray-0", b(0, -40, 200, 440, 310, 90).color(color));
p.part("tray-1", b(0, -40, 490, 440, 310, 90).color(color));
p.part("tray-2", b(0, -40, 780, 440, 310, 90).color(color));
p.part("tray-3", b(0, -40, 1070, 440, 310, 90).color(color));
p.part("header", b(0, 150, 1620, 410, 65, 160).color(color));
p.part("mast-cap", c(0, 150, 1700, 24, 38, 8).color(color));

return p.model();
