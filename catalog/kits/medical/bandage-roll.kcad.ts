meta({
  "name": "bandage-roll",
  "license": "CC0-1.0",
  "title": "Bandage roll",
  "description": "Rolled gauze bandage with a hollow core and wrapped end strip for first-aid or clinic scenes.",
  "tags": [
    "bandage roll",
    "gauze roll",
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
  "triangleBudget": 300
});

const shell = param('shell', '#e8e1cf', { label: 'Shell' });
const accent = param('accent', '#bfa77b', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('bandage-roll');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('roll', c(0, 0, 0, 34, 28, 10).subtract(c(0, 0, -1, 36, 11, 10)).color(shell));
p.part('wrap-end', b(15, 0, 18, 9, 34, 34).color(accent));
p.part('inner-core', c(0, 0, 0, 34, 10, 10).color(accent));

return p.model();
