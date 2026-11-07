// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "optical-patch-panel",
  license: 'CC0-1.0',
  title: "Optical patch panel",
  description: "Rack-width optical patch panel with two connector rows and rack ears. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#555e61", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("optical-patch-panel");
p.part("panel", b(0, 0, 70, 480, 180, 240).color(color));
p.part("ear-left", b(-270, 0, 70, 60, 190, 280).color(color));
p.part("ear-right", b(270, 0, 70, 60, 190, 280).color(color));
p.part("port-0-0", c(-170, -96, 0, 38, 17, 8).color(color));
p.part("port-0-1", c(-102, -96, 0, 38, 17, 8).color(color));
p.part("port-0-2", c(-34, -96, 0, 38, 17, 8).color(color));
p.part("port-0-3", c(34, -96, 0, 38, 17, 8).color(color));
p.part("port-0-4", c(102, -96, 0, 38, 17, 8).color(color));
p.part("port-1-0", c(-170, -96, 120, 38, 17, 8).color(color));
p.part("port-1-1", c(-102, -96, 120, 38, 17, 8).color(color));
p.part("port-1-2", c(-34, -96, 120, 38, 17, 8).color(color));
p.part("port-1-3", c(34, -96, 120, 38, 17, 8).color(color));
p.part("port-1-4", c(102, -96, 120, 38, 17, 8).color(color));

return p.model();
