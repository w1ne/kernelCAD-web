// SPDX-License-Identifier: CC0-1.0
// Pair of gauntlet gloves with cuff guards, segmented fingers and palm patches. Material controls: gauntlet cuff fabric, glove leather; weathered and highVisibility presets.
meta({
  name: "firefighter-gloves",
  license: 'CC0-1.0',
  title: "Firefighter gloves",
  description: "Pair of gauntlet gloves with cuff guards, segmented fingers and palm patches. Material controls: gauntlet cuff fabric, glove leather; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cuffFabricColor = param('cuffFabricColor', '#c87a32', { label: 'Gauntlet cuff fabric' });
const gloveLeatherColor = param('gloveLeatherColor', '#45372d', { label: 'Glove leather' });
presets({
  weathered: { cuffFabricColor: '#94653a', gloveLeatherColor: '#39322c' },
  highVisibility: { cuffFabricColor: '#e1bd45', gloveLeatherColor: '#57452f' },
});
const p = assembly("firefighter-gloves");
const groundOffset = -92;
const add = (name, shape, finish = gloveLeatherColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("gauntlet-cuff--1", box(170, 180, 150, true).translate(-90, -160, 170), cuffFabricColor);
add("palm--1", box(210, 155, 150, true).translate(35, -160, 200), gloveLeatherColor);
add("finger--1-0", box(125, 34, 70, true).translate(160, -90, 155), gloveLeatherColor);
add("finger--1-1", box(125, 34, 70, true).translate(160, -45, 155), gloveLeatherColor);
add("finger--1-2", box(125, 34, 70, true).translate(160, 0, 155), gloveLeatherColor);
add("finger--1-3", box(125, 34, 70, true).translate(160, 45, 155), gloveLeatherColor);
add("thumb--1", box(125, 48, 60, true).translate(70, -255, 122), gloveLeatherColor);
add("gauntlet-cuff-1", box(170, 180, 150, true).translate(-90, 160, 170), cuffFabricColor);
add("palm-1", box(210, 155, 150, true).translate(35, 160, 200), gloveLeatherColor);
add("finger-1-0", box(125, 34, 70, true).translate(160, 90, 155), gloveLeatherColor);
add("finger-1-1", box(125, 34, 70, true).translate(160, 135, 155), gloveLeatherColor);
add("finger-1-2", box(125, 34, 70, true).translate(160, 180, 155), gloveLeatherColor);
add("finger-1-3", box(125, 34, 70, true).translate(160, 225, 155), gloveLeatherColor);
add("thumb-1", box(125, 48, 60, true).translate(70, 255, 122), gloveLeatherColor);

return p.model();
