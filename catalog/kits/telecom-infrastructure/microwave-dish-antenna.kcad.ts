// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "microwave-dish-antenna",
  license: 'CC0-1.0',
  title: "Microwave dish antenna",
  description: "Compact parabolic-looking dish on an offset bracket with feed arm and rear mount. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#cfd5d6", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("microwave-dish-antenna");
p.part("dish-rim", c(0, 0, 395, 80, 420, 8).color(color));
p.part("dish-face", b(0, -18, 435, 720, 35, 720).color(color));
p.part("feed-arm", b(0, -270, 445, 55, 430, 55).color(color));
p.part("feed", c(0, -475, 415, 130, 72, 8).color(color));
p.part("mount-post", b(0, 120, 45, 80, 100, 500).color(color));
p.part("base", b(0, 120, 0, 320, 280, 70).color(color));

return p.model();
