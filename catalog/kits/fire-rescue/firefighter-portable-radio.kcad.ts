// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly firefighter portable radio scene prop, modeled from scratch.
meta({
  name: "firefighter-portable-radio",
  license: 'CC0-1.0',
  title: "Firefighter portable radio",
  description: "Handheld radio with antenna, channel knob, speaker grille and shoulder mic. Knobs: overall scale, body color and accent color.",
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
const p = assembly("firefighter-portable-radio");
const groundOffset = -180;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("radio-body", box(190, 115, 360, true).translate(0, 0, 360), body);
add("antenna", cylinder(220, 12, 8).translate(-65, 0, 540), accent);
add("channel-knob", cylinder(35, 32, 8).translate(75, -42, 565), accent);
add("speaker-slot-0", box(96, 16, 10, true).translate(0, -62, 325), accent);
add("speaker-slot-1", box(96, 16, 10, true).translate(0, -62, 350), accent);
add("speaker-slot-2", box(96, 16, 10, true).translate(0, -62, 375), accent);
add("speaker-slot-3", box(96, 16, 10, true).translate(0, -62, 400), accent);
add("speaker-slot-4", box(96, 16, 10, true).translate(0, -62, 425), accent);
add("display", box(100, 18, 48, true).translate(0, -62, 514), accent);
add("shoulder-mic", cylinder(120, 28, 10).rotate([0, 1, 0], 90).translate(140, 55, 400), body);

return p.model();
