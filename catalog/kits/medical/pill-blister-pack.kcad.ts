meta({
  "name": "pill-blister-pack",
  "license": "CC0-1.0",
  "title": "Pill blister pack",
  "description": "Flat blister pack with a foil backing and repeated raised tablet pockets for medication scene dressing. Material controls: Aluminum foil, Tablet coating, Blister polymer.",
  "tags": [
    "pill blister pack",
    "medicine",
    "pharmacy",
    "tablets",
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
  "triangleBudget": 350
});

// A blister pack separates its aluminum backing, molded polymer bubbles and colored tablets.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const aluminumFoil = param('aluminumFoil', '#bfc9cd', { label: 'Aluminum foil' });
const tabletCoating = param('tabletCoating', '#d6b95f', { label: 'Tablet coating' });
const blisterPolymer = param('blisterPolymer', '#92b4b7', { label: 'Blister polymer' });
presets({
  clinic: { aluminumFoil: '#cbd3d5', tabletCoating: '#d9c77c', blisterPolymer: '#a5c9c8' },
  emergency: { aluminumFoil: '#b8b6b2', tabletCoating: '#c9413b', blisterPolymer: '#b8c6c4' },
});
const p = assembly('pill-blister-pack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('foil-card', b(0, 0, 5, 132, 84, 10).color(aluminumFoil).scale(overallScale));
for (const x of [-42, 0, 42]) for (const y of [-24, 24]) {
  p.part('tablet-' + x + '-' + y, c(x, y, 10, 9, 13, 8).color(tabletCoating).scale(overallScale));
}
p.part('edge-band', b(0, 0, 11, 136, 8, 4).color(blisterPolymer).scale(overallScale));

return p.model();
