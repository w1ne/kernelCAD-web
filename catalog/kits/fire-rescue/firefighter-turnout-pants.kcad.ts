// SPDX-License-Identifier: CC0-1.0
// Protective trouser form with suspenders, articulated legs and reflective cuffs. Material controls: turnout fabric, reflective tape; weathered and highVisibility presets.
meta({
  name: "firefighter-turnout-pants",
  license: 'CC0-1.0',
  title: "Firefighter turnout pants",
  description: "Protective trouser form with suspenders, articulated legs and reflective cuffs. Material controls: turnout fabric, reflective tape; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const turnoutFabricColor = param('turnoutFabricColor', '#bd702f', { label: 'Turnout fabric' });
const reflectiveTapeColor = param('reflectiveTapeColor', '#e7d65a', { label: 'Reflective tape' });
presets({
  weathered: { turnoutFabricColor: '#82543b', reflectiveTapeColor: '#b9aa55' },
  highVisibility: { turnoutFabricColor: '#d88727', reflectiveTapeColor: '#f4eb72' },
});
const p = assembly("firefighter-turnout-pants");
const groundOffset = -34;
const add = (name, shape, finish = turnoutFabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("trouser-leg--1", box(220, 190, 455, true).translate(0, -120, 467.5), turnoutFabricColor);
add("trouser-cuff--1", box(240, 205, 58, true).translate(0, -120, 63), reflectiveTapeColor);
add("reflective-cuff--1", box(226, 198, 30, true).translate(0, -120, 110), reflectiveTapeColor);
add("trouser-leg-1", box(220, 190, 455, true).translate(0, 120, 467.5), turnoutFabricColor);
add("trouser-cuff-1", box(240, 205, 58, true).translate(0, 120, 63), reflectiveTapeColor);
add("reflective-cuff-1", box(226, 198, 30, true).translate(0, 120, 110), reflectiveTapeColor);
add("waistband", box(470, 340, 75, true).translate(0, 0, 522.5), reflectiveTapeColor);
add("suspender--1", box(42, 48, 260, true).translate(0, -120, 730), turnoutFabricColor);
add("suspender-1", box(42, 48, 260, true).translate(0, 120, 730), turnoutFabricColor);

return p.model();
