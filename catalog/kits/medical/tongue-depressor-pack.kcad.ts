meta({
  "name": "tongue-depressor-pack",
  "license": "CC0-1.0",
  "title": "Tongue depressor pack",
  "description": "Neatly stacked low-poly tongue depressors in a simple paper sleeve for examination room scenes.",
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

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#d9c29a', { label: 'Shell' });
const accent = param('accent', '#f1eee4', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('tongue-depressor-pack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('sleeve', b(0, 0, 10, 140, 38, 20).color(accent).scale(overallScale));
for (let i = 0; i < 5; i++) p.part('depressor-' + i, b(0, 0, 23 + i * 3, 118, 24, 3).color(shell).scale(overallScale));
p.part('end-band', b(0, -21, 10, 48, 2, 20).color(shell).scale(overallScale));

return p.model();
