meta({
  "name": "medical-cart",
  "license": "CC0-1.0",
  "title": "Medical cart",
  "description": "Rolling medical cart with two shelves, corner posts, raised tray lips and four low-poly casters for treatment scenes.",
  "tags": [
    "medical cart",
    "clinic trolley",
    "hospital equipment",
    "ward",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "furniture",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 600
});

const shell = param('shell', '#e9eef0', { label: 'Shell' });
const accent = param('accent', '#3c7f87', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const shelfCount = param('shelves', '2', { choices: ['1', '2'], label: 'Shelf count' });
const p = assembly('medical-cart');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

for (let i = 0; i < Number(shelfCount.value); i++) {
  const z = i === 0 ? 180 : 560;
  p.part('shelf-' + i, b(0, 0, z, 420, 300, 24).color(shell));
  p.part('lip-' + i, b(0, -143, z + 20, 420, 14, 18).color(accent));
}
for (const x of [-185, 185]) for (const y of [-125, 125]) {
  p.part('post-' + x + '-' + y, c(x, y, 0, 730, 10, 8).color(accent));
  p.part('wheel-' + x + '-' + y, c(x, y, 0, 18, 16, 8).color(shell));
}

return p.model();
