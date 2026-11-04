// SPDX-License-Identifier: CC0-1.0
// Portable concentrate can with handle frame, cap and short pickup fitting. Material controls: safety band, steel fittings, vessel paint; weathered and highVisibility presets.
meta({
  name: "foam-concentrate-canister",
  license: 'CC0-1.0',
  title: "Foam concentrate canister",
  description: "Portable concentrate can with handle frame, cap and short pickup fitting. Material controls: safety band, steel fittings, vessel paint; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyBandColor = param('safetyBandColor', '#e5c84d', { label: 'Safety band' });
const steelworkColor = param('steelworkColor', '#aab5b9', { label: 'Steel fittings' });
const vesselPaintColor = param('vesselPaintColor', '#bd3b32', { label: 'Vessel paint' });
presets({
  weathered: { safetyBandColor: '#b19e48', steelworkColor: '#858e91', vesselPaintColor: '#865048' },
  highVisibility: { safetyBandColor: '#f1df64', steelworkColor: '#c4c7b7', vesselPaintColor: '#e27a24' },
});
const p = assembly("foam-concentrate-canister");
const groundOffset = -45;
const add = (name, shape, finish = vesselPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("canister", cylinder(390, 145, 10).translate(0, 0, 45), safetyBandColor);
add("handle", box(210, 48, 30, true).translate(0, 0, 445), steelworkColor);
add("cap", cylinder(55, 54, 8).translate(0, 0, 435), vesselPaintColor);
add("pickup-fitting", cylinder(120, 32, 10).rotateY(90).translate(130, 0, 115), steelworkColor);

return p.model();
