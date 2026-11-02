meta({
  "name": "walking-cane",
  "license": "CC0-1.0",
  "title": "Walking cane",
  "description": "Simple walking cane with a long shaft, hooked handle and rubber foot for a medical or recovery scene.",
  "tags": [
    "walking cane",
    "mobility aid",
    "cane",
    "recovery",
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
  "triangleBudget": 220
});

const shell = param('shell', '#8a6748', { label: 'Shell' });
const accent = param('accent', '#2a555d', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('walking-cane');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('shaft', c(0, 0, 0, 790, 12, 8).color(shell));
p.part('handle-stem', c(0, 0, 775, 44, 11, 8).color(accent));
p.part('crook', b(-18, 0, 815, 52, 18, 16).color(accent));
p.part('foot', c(0, 0, 0, 34, 17, 8).color(accent));

return p.model();
