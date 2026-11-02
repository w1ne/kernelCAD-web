// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "self-checkout-kiosk",
  license: 'CC0-1.0',
  title: "Self-checkout kiosk",
  description: "Compact self-checkout pedestal with tilted display housing, scanner deck, bag hook and payment shelf. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#556b73", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("self-checkout-kiosk");
p.part("foot", b(0, 0, 30, 570, 500, 60).color(color));
p.part("pedestal", b(0, 0, 360, 250, 220, 660).color(color));
p.part("scanner-deck", b(0, -140, 725, 510, 330, 70).color(color));
p.part("display", b(0, 40, 900, 500, 100, 300).color(color));
p.part("screen", b(0, -18, 910, 390, 18, 205).color(color));
p.part("scanner-window", c(0, -160, 765, 12, 72, 8).color(color));
p.part("bag-hook", b(235, 105, 490, 170, 26, 24).color(color));

return p.model();
