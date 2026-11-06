meta({
  "name": "sharps-container",
  "license": "CC0-1.0",
  "title": "Sharps container",
  "description": "Rigid sharps disposal container with broad base, stepped lid and narrow drop slot for a clinic or laboratory scene. Material controls: Puncture-resistant polypropylene, Warning marking color, Stainless-steel carry tab.",
  "tags": [
    "sharps container",
    "medical waste",
    "needle disposal",
    "clinic",
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
  "triangleBudget": 300
});

// A sharps container has a rigid puncture-resistant body, red slot lid and metal carry tab.
const polypropylene = param('polypropylene', '#f1b944', { label: 'Puncture-resistant polypropylene' });
const medicalInk = param('medicalInk', '#c9433d', { label: 'Warning marking color' });
const stainlessSteel = param('stainlessSteel', '#aeb8ba', { label: 'Stainless-steel carry tab' });
presets({
  clinic: { polypropylene: '#f5cf62', medicalInk: '#2d8b84', stainlessSteel: '#bdc6c7' },
  emergency: { polypropylene: '#e2b037', medicalInk: '#c9413b', stainlessSteel: '#b4aba2' },
});
const p = assembly('sharps-container');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('base', b(0, 0, 65, 126, 126, 130).color(polypropylene));
p.part('shoulder', b(0, 0, 140, 110, 110, 24).color(medicalInk));
p.part('lid', b(0, 0, 158, 118, 118, 18).color(polypropylene));
p.part('slot', b(0, 0, 169, 56, 18, 4).color(medicalInk));
p.part('handle-tab', b(0, 62, 157, 54, 16, 16).color(stainlessSteel));

return p.model();
