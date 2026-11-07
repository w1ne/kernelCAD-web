// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "shopping-bag-dispenser",
  license: 'CC0-1.0',
  title: "Shopping bag dispenser",
  description: "Wall-mounted bag dispenser with cover hood, stack cavity and lower pull slot. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c776c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("shopping-bag-dispenser");
p.part("backplate", b(0, 30, 390, 470, 75, 780).color(color));
p.part("hood", b(0, -70, 730, 520, 210, 100).color(color));
p.part("bag-stack", b(0, -160, 420, 360, 20, 540).color(color));
p.part("pull-slot", b(0, -180, 130, 260, 20, 50).color(color));
p.part("mount-left", c(-170, 85, 680, 28, 24, 8).color(color));
p.part("mount-right", c(170, 85, 680, 28, 24, 8).color(color));

return p.model();
