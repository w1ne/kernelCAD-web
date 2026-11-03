// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-terminal-box",
  license: 'CC0-1.0',
  title: "Fiber terminal box",
  description: "Wall-mounted fiber terminal enclosure with weather hood, door seam and cable glands. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89927e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-terminal-box");
p.part("body", b(0, 0, 210, 460, 170, 420).color(color));
p.part("hood", b(0, 0, 440, 500, 210, 45).color(color));
p.part("door", b(0, -90, 225, 390, 16, 340).color(color));
p.part("gland-left", c(-130, 0, 0, 75, 25, 8).color(color));
p.part("gland-right", c(130, 0, 0, 75, 25, 8).color(color));
p.part("latch", c(150, -108, 270, 24, 14, 8).color(color));

return p.model();
