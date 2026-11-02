// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "receipt-printer",
  license: 'CC0-1.0',
  title: "Receipt printer",
  description: "Small point-of-sale receipt printer with paper slot, lid seam and roll cover. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596167", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("receipt-printer");
p.part("base", b(0, 0, 48, 255, 235, 96).color(color));
p.part("cover", b(0, 0, 128, 250, 230, 65).color(color));
p.part("paper-slot", b(0, -120, 165, 180, 12, 14).color(color));
p.part("status-button", c(91, -122, 167, 15, 10, 8).color(color));

return p.model();
