meta({
  "name": "defibrillator",
  "license": "CC0-1.0",
  "title": "Automated defibrillator",
  "description": "Portable AED case with carry handle, simple screen, control buttons and two pad shapes for emergency response scenes. Material controls: Medical-grade polymer, Display glass, Silicone electrode pads.",
  "tags": [
    "defibrillator",
    "aed",
    "emergency equipment",
    "medical",
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
  "triangleBudget": 450
});

// A portable defibrillator combines a molded case with a legible screen and paired rubber electrode pads.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const medicalPolymer = param('medicalPolymer', '#e9ecec', { label: 'Medical-grade polymer' });
const displayGlass = param('displayGlass', '#214b50', { label: 'Display glass' });
const siliconeRubber = param('siliconeRubber', '#c94d43', { label: 'Silicone electrode pads' });
presets({
  clinic: { medicalPolymer: '#f1f3f4', displayGlass: '#2d7772', siliconeRubber: '#2d9893' },
  emergency: { medicalPolymer: '#ebe8df', displayGlass: '#384c50', siliconeRubber: '#c9413b' },
});
const p = assembly('defibrillator');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('case', b(0, 0, 105, 230, 150, 210).color(medicalPolymer).scale(overallScale));
p.part('handle-left', b(-32, 0, 222, 24, 30, 38).color(medicalPolymer).scale(overallScale));
p.part('handle-right', b(32, 0, 222, 24, 30, 38).color(medicalPolymer).scale(overallScale));
p.part('handle-grip', b(0, 0, 239, 76, 30, 16).color(medicalPolymer).scale(overallScale));
p.part('screen', b(0, -79, 146, 112, 4, 62).color(displayGlass).scale(overallScale));
p.part('button', c(73, -82, 80, 7, 13, 8).color(siliconeRubber).scale(overallScale));
p.part('pad-left', b(-50, 93, 9, 68, 52, 18).color(siliconeRubber).scale(overallScale));
p.part('pad-right', b(50, 93, 9, 68, 52, 18).color(siliconeRubber).scale(overallScale));

return p.model();
