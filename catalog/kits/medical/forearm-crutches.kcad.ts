meta({
  "name": "forearm-crutches",
  "license": "CC0-1.0",
  "title": "Forearm crutches",
  "description": "Pair of low-poly forearm crutches with cuffs, hand grips, narrow shafts and rubber tips for medical recovery scenes. Material controls: Anodized aluminum, Molded cuff polymer, Silicone and rubber.",
  "tags": [
    "forearm crutches",
    "crutches",
    "forearm crutch",
    "mobility aid",
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
  "triangleBudget": 350
});

// A forearm crutch pairs a long aluminum shaft with a molded cuff, hand grip and rubber tip.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminum = param('anodizedAluminum', '#b8c3c8', { label: 'Anodized aluminum' });
const medicalPolymer = param('medicalPolymer', '#76a0a4', { label: 'Molded cuff polymer' });
const siliconeRubber = param('siliconeRubber', '#2d858d', { label: 'Silicone and rubber' });
presets({
  clinic: { anodizedAluminum: '#c5ced1', medicalPolymer: '#70a7a5', siliconeRubber: '#4b9295' },
  emergency: { anodizedAluminum: '#b9b7b1', medicalPolymer: '#c9413b', siliconeRubber: '#a74942' },
});
const p = assembly('forearm-crutches');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

for (const side of [-1, 1]) {
  const x = side * 76;
  p.part('shaft-' + side, c(x, 0, 0, 870, 12, 8).color(anodizedAluminum).scale(overallScale));
  p.part('cuff-' + side, c(x, 0, 790, 92, 44, 10).color(medicalPolymer).scale(overallScale));
  p.part('grip-' + side, b(x, 0, 650, 68, 34, 24).color(siliconeRubber).scale(overallScale));
  p.part('tip-' + side, c(x, 0, 0, 24, 15, 8).color(siliconeRubber).scale(overallScale));
}

return p.model();
