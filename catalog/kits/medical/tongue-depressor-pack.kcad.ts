meta({
  "name": "tongue-depressor-pack",
  "license": "CC0-1.0",
  "title": "Tongue depressor pack",
  "description": "Neatly stacked low-poly tongue depressors in a simple paper sleeve for examination room scenes. Material controls: Birch wood, Paper sleeve, Printed seal ink.",
  "tags": [
    "tongue depressor pack",
    "tongue depressor",
    "medical supplies",
    "clinic",
    "wooden spatula",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "item",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 240
});

// A wrapped tongue-depressor pack shows stacked birch sticks, a paper sleeve and printed seal.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const birchWood = param('birchWood', '#d9c29a', { label: 'Birch wood' });
const paperSleeve = param('paperSleeve', '#f1eee4', { label: 'Paper sleeve' });
const medicalInk = param('medicalInk', '#a86842', { label: 'Printed seal ink' });
presets({
  clinic: { birchWood: '#ddcba8', paperSleeve: '#f5f2e9', medicalInk: '#4d8c83' },
  emergency: { birchWood: '#d3b98c', paperSleeve: '#eee5d9', medicalInk: '#c9413b' },
});
const p = assembly('tongue-depressor-pack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('sleeve', b(0, 0, 10, 140, 38, 20).color(paperSleeve).scale(overallScale));
for (let i = 0; i < 5; i++) p.part('depressor-' + i, b(0, 0, 23 + i * 3, 118, 24, 3).color(birchWood).scale(overallScale));
p.part('end-band', b(0, -21, 10, 48, 2, 20).color(medicalInk).scale(overallScale));

return p.model();
