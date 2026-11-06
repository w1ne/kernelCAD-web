meta({
  "name": "bedside-cabinet",
  "license": "CC0-1.0",
  "title": "Bedside cabinet",
  "description": "Compact bedside cabinet with two drawer fronts, small pulls and a lower plinth for hospital room scenes. Material controls: Painted steel, Laminate top, Stainless-steel pulls.",
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

// A two-drawer bedside cabinet has a wipe-clean painted body, a laminate top and metal pulls.
const paintedSteel = param('paintedSteel', '#e8ecee', { label: 'Painted steel' });
const laminate = param('laminate', '#d3c9b7', { label: 'Laminate top' });
const stainlessSteel = param('stainlessSteel', '#aab4b7', { label: 'Stainless-steel pulls' });
presets({
  clinic: { paintedSteel: '#f1f3f4', laminate: '#d9d1c3', stainlessSteel: '#b7c0c2' },
  emergency: { paintedSteel: '#ebe8df', laminate: '#c6b9a5', stainlessSteel: '#aaaeb0' },
});
const p = assembly('bedside-cabinet');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('cabinet-body', b(0, 0, 210, 360, 300, 420).color(paintedSteel));
p.part('top', b(0, 0, 430, 380, 320, 20).color(laminate));
for (const z of [300, 120]) {
  p.part('drawer-' + z, b(0, -154, z, 335, 10, 145).color(paintedSteel));
  p.part('pull-' + z, b(0, -165, z, 54, 12, 10).color(stainlessSteel));
}
p.part('plinth', b(0, 0, 24, 300, 240, 48).color(paintedSteel));

return p.model();
