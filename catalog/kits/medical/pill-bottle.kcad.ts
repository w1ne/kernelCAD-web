meta({
  "name": "pill-bottle",
  "license": "CC0-1.0",
  "title": "Pill bottle",
  "description": "Small medicine bottle with screw cap, label band and broad stable base for pharmacy or bathroom props. Material controls: Amber polymer, Label paper, Cap polymer.",
  "tags": [
    "pill bottle",
    "medicine bottle",
    "pharmacy",
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
  "triangleBudget": 260
});

// A prescription bottle has an amber polymer body, paper label and separate child-safe cap.
const amberPolymer = param('amberPolymer', '#c28d39', { label: 'Amber polymer' });
const labelPaper = param('labelPaper', '#eee9dd', { label: 'Label paper' });
const medicalPolymer = param('medicalPolymer', '#d8bd65', { label: 'Cap polymer' });
presets({
  clinic: { amberPolymer: '#cc9b49', labelPaper: '#f4f1e8', medicalPolymer: '#73a29d' },
  emergency: { amberPolymer: '#bd8640', labelPaper: '#eee3d5', medicalPolymer: '#c9413b' },
});
const p = assembly('pill-bottle');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('bottle', c(0, 0, 0, 82, 27, 10).color(amberPolymer));
p.part('label', c(0, 0, 22, 38, 28, 10).color(labelPaper));
p.part('neck', c(0, 0, 82, 15, 20, 10).color(amberPolymer));
p.part('cap', c(0, 0, 96, 24, 24, 10).color(medicalPolymer));
p.part('cap-rim', c(0, 0, 94, 5, 26, 10).color(medicalPolymer));

return p.model();
