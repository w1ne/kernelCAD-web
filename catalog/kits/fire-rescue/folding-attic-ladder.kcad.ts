// SPDX-License-Identifier: CC0-1.0
// Foldable attic ladder with paired hinged sections, rails and rung steps. Material controls: aluminum rails, safety finish, ladder hardware; weathered and highVisibility presets.
meta({
  name: "folding-attic-ladder",
  license: 'CC0-1.0',
  title: "Folding attic ladder",
  description: "Foldable attic ladder with paired hinged sections, rails and rung steps. Material controls: aluminum rails, safety finish, ladder hardware; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const aluminumColor = param('aluminumColor', '#aeb8ba', { label: 'Aluminum rails' });
const safetyFinishColor = param('safetyFinishColor', '#e0ad32', { label: 'Safety finish' });
const hardwareColor = param('hardwareColor', '#68777c', { label: 'Ladder hardware' });
presets({
  weathered: { aluminumColor: '#899496', safetyFinishColor: '#ad7730', hardwareColor: '#596568' },
  highVisibility: { aluminumColor: '#d4d2bd', safetyFinishColor: '#f2d34d', hardwareColor: '#aeb9bc' },
});
const p = assembly("folding-attic-ladder");
const groundOffset = -126.242;
const add = (name, shape, finish = aluminumColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("section-0-rail--1", box(393.6, 42, 45, true).rotateY(-28).translate(-147.6, -144, 238.5), aluminumColor);
add("section-0-rail-1", box(393.6, 42, 45, true).rotateY(-28).translate(-147.6, 144, 238.5), aluminumColor);
add("section-0-rung-0", box(26, 288, 24, true).translate(-311.6, 0, 242), safetyFinishColor);
add("section-0-rung-1", box(26, 288, 24, true).translate(-246, 0, 257), safetyFinishColor);
add("section-0-rung-2", box(26, 288, 24, true).translate(-180.4, 0, 242), safetyFinishColor);
add("section-0-rung-3", box(26, 288, 24, true).translate(-114.8, 0, 257), safetyFinishColor);
add("section-0-rung-4", box(26, 288, 24, true).translate(-49.2, 0, 242), safetyFinishColor);
add("section-0-rung-5", box(26, 288, 24, true).translate(16.4, 0, 257), safetyFinishColor);
add("section-1-rail--1", box(393.6, 42, 45, true).rotateY(28).translate(147.6, -144, 238.5), aluminumColor);
add("section-1-rail-1", box(393.6, 42, 45, true).rotateY(28).translate(147.6, 144, 238.5), aluminumColor);
add("section-1-rung-0", box(26, 288, 24, true).translate(-16.4, 0, 242), safetyFinishColor);
add("section-1-rung-1", box(26, 288, 24, true).translate(49.2, 0, 257), safetyFinishColor);
add("section-1-rung-2", box(26, 288, 24, true).translate(114.8, 0, 242), safetyFinishColor);
add("section-1-rung-3", box(26, 288, 24, true).translate(180.4, 0, 257), safetyFinishColor);
add("section-1-rung-4", box(26, 288, 24, true).translate(246, 0, 242), safetyFinishColor);
add("section-1-rung-5", box(26, 288, 24, true).translate(311.6, 0, 257), safetyFinishColor);
add("hinge", cylinder(320, 45, 8).rotateX(90).translate(0, 0, 216), hardwareColor);

return p.model();
