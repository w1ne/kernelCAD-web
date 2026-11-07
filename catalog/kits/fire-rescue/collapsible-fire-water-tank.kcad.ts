// SPDX-License-Identifier: CC0-1.0
// Portable fold-flat water reservoir with rigid rim, corner supports and drain outlet. Material controls: safety band, vessel paint, steel fittings; weathered and highVisibility presets.
meta({
  name: "collapsible-fire-water-tank",
  license: 'CC0-1.0',
  title: "Collapsible fire water tank",
  description: "Portable fold-flat water reservoir with rigid rim, corner supports and drain outlet. Material controls: safety band, vessel paint, steel fittings; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyBandColor = param('safetyBandColor', '#e5c84d', { label: 'Safety band' });
const vesselPaintColor = param('vesselPaintColor', '#bd3b32', { label: 'Vessel paint' });
const steelworkColor = param('steelworkColor', '#aab5b9', { label: 'Steel fittings' });
presets({
  weathered: { safetyBandColor: '#b19e48', vesselPaintColor: '#865048', steelworkColor: '#858e91' },
  highVisibility: { safetyBandColor: '#f1df64', vesselPaintColor: '#e27a24', steelworkColor: '#c4c7b7' },
});
const p = assembly("collapsible-fire-water-tank");
const groundOffset = 0;
const add = (name, shape, finish = vesselPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tank-floor", box(920, 760, 36, true).translate(0, 0, 36), safetyBandColor);
add("tank-wall-x--1", box(45, 760, 457.6, true).translate(-432.4, 0, 473.2), vesselPaintColor);
add("tank-wall-y--1", box(920, 45, 457.6, true).translate(0, -357.2, 473.2), vesselPaintColor);
add("corner-post--1-a", box(44, 44, 520, true).translate(-395.6, -326.8, 260), safetyBandColor);
add("corner-post--1-b", box(44, 44, 520, true).translate(395.6, 326.8, 260), safetyBandColor);
add("tank-wall-x-1", box(45, 760, 457.6, true).translate(432.4, 0, 473.2), vesselPaintColor);
add("tank-wall-y-1", box(920, 45, 457.6, true).translate(0, 357.2, 473.2), vesselPaintColor);
add("corner-post-1-a", box(44, 44, 520, true).translate(395.6, 326.8, 260), safetyBandColor);
add("corner-post-1-b", box(44, 44, 520, true).translate(-395.6, -326.8, 260), safetyBandColor);
add("drain-outlet", cylinder(130, 42, 10).rotateY(90).translate(441.6, 0, 120), steelworkColor);

return p.model();
