meta({
  "name": "bedside-cabinet",
  "license": "CC0-1.0",
  "title": "Bedside cabinet",
  "description": "Compact bedside cabinet with two drawer fronts, small pulls and a lower plinth for hospital room scenes.",
  "tags": [
    "bedside cabinet",
    "hospital furniture",
    "nightstand",
    "clinic",
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
  "triangleBudget": 500
});

const shell = param('shell', '#e8ecee', { label: 'Shell' });
const accent = param('accent', '#5c7482', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('bedside-cabinet');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('cabinet-body', b(0, 0, 210, 360, 300, 420).color(shell));
p.part('top', b(0, 0, 430, 380, 320, 20).color(accent));
for (const z of [300, 120]) {
  p.part('drawer-' + z, b(0, -154, z, 335, 10, 145).color(shell));
  p.part('pull-' + z, b(0, -165, z, 54, 12, 10).color(accent));
}
p.part('plinth', b(0, 0, 24, 300, 240, 48).color(accent));

return p.model();
