meta({
  "name": "adhesive-bandage-box",
  "license": "CC0-1.0",
  "title": "Adhesive bandage box",
  "description": "Small first-aid box with simple cross mark and an individual dressing shape for clinic and emergency scenes. Material controls: Paperboard carton, Cotton gauze, Printed medical ink.",
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

// A paperboard first-aid carton reads through its red medical cross and the cotton dressings visible above it.
const paperboard = param('paperboard', '#f4f0e6', { label: 'Paperboard carton' });
const cottonGauze = param('cottonGauze', '#e8ddc5', { label: 'Cotton gauze' });
const medicalInk = param('medicalInk', '#c8403a', { label: 'Printed medical ink' });
presets({
  clinic: { paperboard: '#f5f2ea', cottonGauze: '#f4eee0', medicalInk: '#2d8b84' },
  emergency: { paperboard: '#e8e0d1', cottonGauze: '#ded2bc', medicalInk: '#c9413b' },
});
const p = assembly('adhesive-bandage-box');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('carton', b(0, 0, 24, 150, 74, 48).color(paperboard));
p.part('cross-vertical', b(0, -39, 25, 24, 3, 30).color(medicalInk));
p.part('cross-horizontal', b(0, -39, 25, 40, 3, 12).color(medicalInk));
p.part('dressing', b(0, 68, 8, 94, 28, 16).color(cottonGauze));
p.part('pad', b(0, 68, 17, 32, 30, 2).color(cottonGauze));

return p.model();
