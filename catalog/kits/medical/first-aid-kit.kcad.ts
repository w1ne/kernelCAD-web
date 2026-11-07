meta({
  "name": "first-aid-kit",
  "license": "CC0-1.0",
  "title": "First aid kit",
  "description": "Portable first-aid case with carry handle, front latches and raised medical cross for emergency and clinic scenes. Material controls: Medical-grade polymer, Printed medical ink, Stainless-steel latches.",
  "tags": [
    "first aid kit",
    "medical case",
    "emergency kit",
    "healthcare",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "prop",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 350
});

// A handled first-aid case uses a molded shell, red medical cross and metal latches.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const medicalPolymer = param('medicalPolymer', '#e8ecee', { label: 'Medical-grade polymer' });
const medicalInk = param('medicalInk', '#c8403a', { label: 'Printed medical ink' });
const stainlessSteel = param('stainlessSteel', '#aab4b7', { label: 'Stainless-steel latches' });
presets({
  clinic: { medicalPolymer: '#f1f3f4', medicalInk: '#2d8b84', stainlessSteel: '#b7c0c2' },
  emergency: { medicalPolymer: '#ebe8df', medicalInk: '#c9413b', stainlessSteel: '#a8aaa8' },
});
const p = assembly('first-aid-kit');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('case', b(0, 0, 41, 190, 120, 82).color(medicalPolymer).scale(overallScale));
p.part('lid', b(0, 0, 88, 194, 124, 14).color(medicalPolymer).scale(overallScale));
p.part('handle-left', b(-28, 0, 112, 18, 20, 32).color(medicalPolymer).scale(overallScale));
p.part('handle-right', b(28, 0, 112, 18, 20, 32).color(medicalPolymer).scale(overallScale));
p.part('handle-grip', b(0, 0, 128, 72, 20, 12).color(medicalPolymer).scale(overallScale));
p.part('cross-vertical', b(0, -64, 44, 22, 4, 52).color(medicalInk).scale(overallScale));
p.part('cross-horizontal', b(0, -64, 44, 54, 4, 20).color(medicalInk).scale(overallScale));
p.part('latch-left', b(-58, -64, 12, 26, 8, 22).color(stainlessSteel).scale(overallScale));
p.part('latch-right', b(58, -64, 12, 26, 8, 22).color(stainlessSteel).scale(overallScale));

return p.model();
