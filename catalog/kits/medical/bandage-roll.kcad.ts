meta({
  "name": "bandage-roll",
  "license": "CC0-1.0",
  "title": "Bandage roll",
  "description": "Rolled gauze bandage with a hollow core and wrapped end strip for first-aid or clinic scenes. Material controls: Cotton gauze, Compression gauze, Cardboard core.",
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

// A rolled gauze cylinder exposes its hollow cardboard core and a loose wrapped tail.
const cottonGauze = param('cottonGauze', '#e8e1cf', { label: 'Cotton gauze' });
const compressionWrap = param('compressionWrap', '#cbb994', { label: 'Compression gauze' });
const cardboard = param('cardboard', '#936b43', { label: 'Cardboard core' });
presets({
  clinic: { cottonGauze: '#f4f1e6', compressionWrap: '#d9cfb7', cardboard: '#a47e54' },
  emergency: { cottonGauze: '#e8e1cf', compressionWrap: '#cbb994', cardboard: '#855d3c' },
});
const p = assembly('bandage-roll');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('roll', c(0, 0, 0, 34, 28, 10).subtract(c(0, 0, -1, 36, 11, 10)).color(cottonGauze));
p.part('wrap-end', b(15, 0, 18, 9, 34, 34).color(compressionWrap));
p.part('inner-core', c(0, 0, 0, 34, 10, 10).color(cardboard));

return p.model();
