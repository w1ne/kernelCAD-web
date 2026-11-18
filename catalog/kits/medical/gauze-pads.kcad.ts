meta({
  "name": "gauze-pads",
  "license": "CC0-1.0",
  "title": "Gauze pads",
  "description": "Stack of folded gauze pads with layered edges for a first-aid cabinet or clinic supply tray. Material controls: Cotton gauze, Sterile mesh, Medical tape.",
  "tags": [
    "gauze pads",
    "dressing",
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
  "triangleBudget": 240
});

// A layered gauze stack shows woven cotton faces, a finer center weave and folded tape edge.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const cottonGauze = param('cottonGauze', '#f1eee7', { label: 'Cotton gauze' });
const sterileMesh = param('sterileMesh', '#c8d0d1', { label: 'Sterile mesh' });
const medicalTape = param('medicalTape', '#d5c9af', { label: 'Medical tape' });
presets({
  clinic: { cottonGauze: '#f8f5ec', sterileMesh: '#c8dcda', medicalTape: '#e0d3b8' },
  emergency: { cottonGauze: '#eee9df', sterileMesh: '#d1d2cc', medicalTape: '#d8c5a9' },
});
const p = assembly('gauze-pads');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

for (let i = 0; i < 4; i++) p.part('pad-' + i, b(0, 0, 5 + i * 7, 88, 88, 10).color(cottonGauze).scale(overallScale));
p.part('woven-center', b(0, 0, 34, 62, 62, 2).color(sterileMesh).scale(overallScale));
p.part('fold-band', b(0, 43, 18, 88, 4, 8).color(medicalTape).scale(overallScale));

return p.model();
