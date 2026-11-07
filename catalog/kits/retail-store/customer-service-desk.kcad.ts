// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "customer-service-desk",
  license: 'CC0-1.0',
  title: "Customer service desk",
  description: "Store service counter with lowered accessible return ledge, raised worktop and back display panel. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#81705d", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("customer-service-desk");
p.part("main-counter", b(0, 80, 470, 1900, 620, 940).color(color));
p.part("customer-ledge", b(0, -320, 500, 1950, 160, 60).color(color));
p.part("accessible-return", b(600, 180, 390, 650, 650, 780).color(color));
p.part("back-display", b(0, 350, 1240, 1850, 70, 520).color(color));
p.part("screen", b(300, 300, 1570, 360, 35, 280).color(color));
p.part("call-button", c(-720, -420, 540, 22, 26, 8).color(color));

return p.model();
