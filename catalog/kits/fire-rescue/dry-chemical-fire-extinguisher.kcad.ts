// SPDX-License-Identifier: CC0-1.0
// Portable extinguisher with pressure cylinder, hose, gauge and squeeze handle. Material controls: safety band, rubber seals, steel fittings, vessel paint; weathered and highVisibility presets.
meta({
  name: "dry-chemical-fire-extinguisher",
  license: 'CC0-1.0',
  title: "Dry chemical fire extinguisher",
  description: "Portable extinguisher with pressure cylinder, hose, gauge and squeeze handle. Material controls: safety band, rubber seals, steel fittings, vessel paint; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyBandColor = param('safetyBandColor', '#e5c84d', { label: 'Safety band' });
const sealRubberColor = param('sealRubberColor', '#303539', { label: 'Rubber seals' });
const steelworkColor = param('steelworkColor', '#aab5b9', { label: 'Steel fittings' });
const vesselPaintColor = param('vesselPaintColor', '#bd3b32', { label: 'Vessel paint' });
presets({
  weathered: { safetyBandColor: '#b19e48', sealRubberColor: '#41423f', steelworkColor: '#858e91', vesselPaintColor: '#865048' },
  highVisibility: { safetyBandColor: '#f1df64', sealRubberColor: '#303539', steelworkColor: '#c4c7b7', vesselPaintColor: '#e27a24' },
});
const p = assembly("dry-chemical-fire-extinguisher");
const groundOffset = -40;
const add = (name, shape, finish = vesselPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("pressure-vessel", cylinder(470, 125, 10).translate(0, 0, 60), safetyBandColor);
add("base-ring", cylinder(45, 132, 10).translate(0, 0, 40), sealRubberColor);
add("valve-neck", cylinder(55, 45, 8).translate(0, 0, 530), steelworkColor);
add("handle-bracket", box(125, 32, 35, true).translate(0, 0, 627.5), steelworkColor);
add("squeeze-lever", box(150, 30, 24, true).translate(40, 0, 658), safetyBandColor);
add("gauge", cylinder(18, 38, 8).rotateX(90).translate(38, -38, 585), steelworkColor);
add("hose", cylinder(150, 20, 10).rotateY(90).translate(-125, 0, 420), sealRubberColor);
add("nozzle", box(70, 34, 32, true).translate(-210, 0, 436), safetyBandColor);

return p.model();
