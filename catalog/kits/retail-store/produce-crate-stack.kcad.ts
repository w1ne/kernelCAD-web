// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "produce-crate-stack",
  license: 'CC0-1.0',
  title: "Produce crate stack",
  description: "Stack of four ventilated produce crates with hand slots and reinforced corner posts. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71945a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("produce-crate-stack");
p.part("crate-0", b(-320, -260, 170, 620, 520, 340).color(color));
p.part("crate-1", b(320, -260, 520, 620, 520, 340).color(color));
p.part("crate-2", b(-320, 260, 870, 620, 520, 340).color(color));
p.part("crate-3", b(320, 260, 1220, 620, 520, 340).color(color));
p.part("vent-0", b(-320, -530, 175, 260, 18, 60).color(color));
p.part("vent-1", b(320, -530, 175, 260, 18, 60).color(color));
p.part("vent-2", b(-320, -530, 525, 260, 18, 60).color(color));
p.part("vent-3", b(320, -530, 525, 260, 18, 60).color(color));
p.part("stack-pin", c(0, 0, 1370, 28, 26, 8).color(color));

return p.model();
