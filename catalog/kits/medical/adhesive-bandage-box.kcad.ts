meta({
  "name": "adhesive-bandage-box",
  "license": "CC0-1.0",
  "title": "Adhesive bandage box",
  "description": "Small first-aid box with simple cross mark and an individual dressing shape for clinic and emergency scenes.",
  "tags": [
    "adhesive bandage box",
    "adhesive bandage",
    "bandage box",
    "first aid",
    "medical supplies",
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
  "triangleBudget": 260
});

const shell = param('shell', '#f4f0e6', { label: 'Shell' });
const accent = param('accent', '#c8403a', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('adhesive-bandage-box');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('carton', b(0, 0, 24, 150, 74, 48).color(shell));
p.part('cross-vertical', b(0, -39, 25, 24, 3, 30).color(accent));
p.part('cross-horizontal', b(0, -39, 25, 40, 3, 12).color(accent));
p.part('dressing', b(0, 68, 8, 94, 28, 16).color(accent));
p.part('pad', b(0, 68, 17, 32, 30, 2).color(shell));

return p.model();
