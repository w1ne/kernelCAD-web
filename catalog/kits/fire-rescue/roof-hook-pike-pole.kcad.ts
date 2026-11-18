// SPDX-License-Identifier: CC0-1.0
// Long fireground pole with protective grip bands and a hooked metal head. Material controls: aluminum rails, safety finish, ladder hardware; weathered and highVisibility presets.
meta({
  name: "roof-hook-pike-pole",
  license: 'CC0-1.0',
  title: "Roof hook pike pole",
  description: "Long fireground pole with protective grip bands and a hooked metal head. Material controls: aluminum rails, safety finish, ladder hardware; weathered and highVisibility presets.",
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
const p = assembly("roof-hook-pike-pole");
const groundOffset = 0;
const add = (name, shape, finish = aluminumColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("shaft", cylinder(1280, 24, 8).translate(0, 0, 0), aluminumColor);
add("grip-band-0", cylinder(18, 30, 8).translate(0, 0, 180), safetyFinishColor);
add("grip-band-1", cylinder(18, 30, 8).translate(0, 0, 222), safetyFinishColor);
add("grip-band-2", cylinder(18, 30, 8).translate(0, 0, 264), safetyFinishColor);
add("grip-band-3", cylinder(18, 30, 8).translate(0, 0, 306), safetyFinishColor);
add("grip-band-4", cylinder(18, 30, 8).translate(0, 0, 348), safetyFinishColor);
add("hook-spine", box(35, 32, 170, true).translate(0, 0, 1435), hardwareColor);
add("hook-tip", box(145, 32, 35, true).translate(72, 0, 1432.5), hardwareColor);

return p.model();
