// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly folded fire hose pack scene prop, modeled from scratch.
meta({
  name: "folded-hose-pack",
  license: 'CC0-1.0',
  title: "Folded fire hose pack",
  description: "Layered accordion fold of attack hose with a carrying strap and outlet coupling. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("folded-hose-pack");
const groundOffset = 2;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("pack-base", box(500, 360, 34, true).translate(0, 0, 32), accent);
add("fold-0-0", box(95, 50.4, 100, true).translate(-180, -122.4, 98), body);
add("fold-0-1", box(95, 50.4, 100, true).translate(-60, -122.4, 98), body);
add("fold-0-2", box(95, 50.4, 100, true).translate(60, -122.4, 98), body);
add("fold-0-3", box(95, 50.4, 100, true).translate(180, -122.4, 98), body);
add("fold-1-0", box(95, 50.4, 100, true).translate(-180, -61.2, 118), body);
add("fold-1-1", box(95, 50.4, 100, true).translate(-60, -61.2, 118), body);
add("fold-1-2", box(95, 50.4, 100, true).translate(60, -61.2, 118), body);
add("fold-1-3", box(95, 50.4, 100, true).translate(180, -61.2, 118), body);
add("fold-2-0", box(95, 50.4, 100, true).translate(-180, 0, 98), body);
add("fold-2-1", box(95, 50.4, 100, true).translate(-60, 0, 98), body);
add("fold-2-2", box(95, 50.4, 100, true).translate(60, 0, 98), body);
add("fold-2-3", box(95, 50.4, 100, true).translate(180, 0, 98), body);
add("fold-3-0", box(95, 50.4, 100, true).translate(-180, 61.2, 118), body);
add("fold-3-1", box(95, 50.4, 100, true).translate(-60, 61.2, 118), body);
add("fold-3-2", box(95, 50.4, 100, true).translate(60, 61.2, 118), body);
add("fold-3-3", box(95, 50.4, 100, true).translate(180, 61.2, 118), body);
add("fold-4-0", box(95, 50.4, 100, true).translate(-180, 122.4, 98), body);
add("fold-4-1", box(95, 50.4, 100, true).translate(-60, 122.4, 98), body);
add("fold-4-2", box(95, 50.4, 100, true).translate(60, 122.4, 98), body);
add("fold-4-3", box(95, 50.4, 100, true).translate(180, 122.4, 98), body);
add("carry-strap", box(60, 302.4, 24, true).translate(0, 0, 180), accent);
add("coupling", cylinder(130, 42, 8).rotate([0, 1, 0], 90).translate(210, 0, 40), accent);

return p.model();
