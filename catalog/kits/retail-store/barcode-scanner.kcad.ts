// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "barcode-scanner",
  license: 'CC0-1.0',
  title: "Barcode scanner",
  description: "Countertop barcode scanner with a sloped reading window, raised side housing and low base. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#3e4a51", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("barcode-scanner");
p.part("base", b(0, 0, 36, 310, 240, 72).color(color));
p.part("scanner-head", b(0, 0, 112, 260, 210, 90).color(color));
p.part("front-window", b(0, -108, 145, 185, 12, 52).color(color));
p.part("side-window", b(136, 0, 144, 12, 135, 44).color(color));
p.part("status-light", c(110, 60, 158, 18, 10, 8).color(color));

return p.model();
