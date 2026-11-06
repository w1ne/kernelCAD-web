meta({
  "name": "specimen-cup",
  "license": "CC0-1.0",
  "title": "Specimen cup",
  "description": "Small specimen cup with screw lid, wide rim and tapered-looking base for a clinic or laboratory sample prop. Material controls: Polypropylene cup, Lid polymer, Identification label paper.",
  "tags": [
    "specimen cup",
    "sample container",
    "laboratory",
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

// A specimen cup has a straight disposable body, threaded polymer lid and a paper identification label.
const polypropylene = param('polypropylene', '#e8eceb', { label: 'Polypropylene cup' });
const medicalPolymer = param('medicalPolymer', '#e6ba54', { label: 'Lid polymer' });
const labelPaper = param('labelPaper', '#f6f0df', { label: 'Identification label paper' });
presets({
  clinic: { polypropylene: '#f0f2ed', medicalPolymer: '#6fa9a1', labelPaper: '#f4f1e7' },
  emergency: { polypropylene: '#ebe7df', medicalPolymer: '#c9413b', labelPaper: '#eee4d7' },
});
const p = assembly('specimen-cup');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('cup', c(0, 0, 0, 62, 27, 10).color(polypropylene));
p.part('base-foot', c(0, 0, 0, 8, 23, 10).color(polypropylene));
p.part('lid', c(0, 0, 61, 13, 30, 10).color(medicalPolymer));
p.part('lid-rim', c(0, 0, 58, 5, 32, 10).color(medicalPolymer));

p.part('label', box(36, 3, 14, true).translate(0, -27, 32).color(labelPaper));

return p.model();
