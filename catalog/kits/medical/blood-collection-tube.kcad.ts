meta({
  "name": "blood-collection-tube",
  "license": "CC0-1.0",
  "title": "Blood collection tube",
  "description": "Single low-poly blood collection tube with colored cap and sample barrel for diagnostic laboratory scenes. Material controls: Clear polymer, Rubber stopper, Label paper.",
  "tags": [
    "blood collection tube",
    "vacutainer",
    "lab sample",
    "medical",
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

// A specimen tube pairs a clear polymer barrel with a color-coded stopper and a paper label band.
const clearPolymer = param('clearPolymer', '#d7e4e4', { label: 'Clear polymer' });
const rubberStopper = param('rubberStopper', '#855b9a', { label: 'Rubber stopper' });
const labelPaper = param('labelPaper', '#f2eee3', { label: 'Label paper' });
presets({
  clinic: { clearPolymer: '#cde5e2', rubberStopper: '#4b8c88', labelPaper: '#f4f1e7' },
  emergency: { clearPolymer: '#d7e0e2', rubberStopper: '#c8403a', labelPaper: '#eee7dc' },
});
const p = assembly('blood-collection-tube');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('tube', c(0, 0, 0, 92, 10, 8).color(clearPolymer));
p.part('cap', c(0, 0, 90, 22, 12, 8).color(rubberStopper));
p.part('cap-ridge', c(0, 0, 104, 4, 13, 8).color(rubberStopper));
p.part('label-band', c(0, 0, 38, 32, 10.5, 8).color(labelPaper));

return p.model();
