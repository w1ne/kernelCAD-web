// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "waveguide-bridge",
  license: 'CC0-1.0',
  title: "Waveguide bridge tray",
  description: "Raised rooftop waveguide bridge with two support frames and a broad crossing tray. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#70777a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("waveguide-bridge");
p.part("tray", b(0, 0, 520, 1800, 420, 65).color(color));
p.part("rail-left", b(0, -215, 600, 1800, 30, 95).color(color));
p.part("rail-right", b(0, 215, 600, 1800, 30, 95).color(color));
p.part("leg--700--155", b(-700, -155, 0, 65, 65, 500).color(color));
p.part("leg--700-155", b(-700, 155, 0, 65, 65, 500).color(color));
p.part("leg-700--155", b(700, -155, 0, 65, 65, 500).color(color));
p.part("leg-700-155", b(700, 155, 0, 65, 65, 500).color(color));
p.part("cross-a", b(-700, 0, 70, 60, 420, 90).color(color));
p.part("cross-b", b(700, 0, 70, 60, 420, 90).color(color));

return p.model();
