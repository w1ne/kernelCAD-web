meta({
  "name": "diagnostic-monitor",
  "license": "CC0-1.0",
  "title": "Diagnostic monitor",
  "description": "Freestanding patient monitor with display, control panel, upright support and broad base for clinic and ward scenes. Material controls: Medical-grade polymer, Display glass, Anodized aluminum, Rubber controls.",
  "tags": [
    "diagnostic monitor",
    "patient monitor",
    "hospital equipment",
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
  "triangleBudget": 400
});

// A patient monitor is identifiable by its wide glass display, upright metal stand and tactile controls.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const medicalPolymer = param('medicalPolymer', '#4d5a62', { label: 'Medical-grade polymer' });
const displayGlass = param('displayGlass', '#21888d', { label: 'Display glass' });
const anodizedAluminum = param('anodizedAluminum', '#87969a', { label: 'Anodized aluminum' });
const rubber = param('rubber', '#30383c', { label: 'Rubber controls' });
presets({
  clinic: { medicalPolymer: '#edf1f2', displayGlass: '#2d9893', anodizedAluminum: '#a9b5b8', rubber: '#526368' },
  emergency: { medicalPolymer: '#e9e6de', displayGlass: '#c9413b', anodizedAluminum: '#9d9d97', rubber: '#54504c' },
});
const p = assembly('diagnostic-monitor');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', b(0, 0, 14, 160, 120, 28).color(medicalPolymer).scale(overallScale));
p.part('stem', c(0, 0, 28, 220, 11, 10).color(anodizedAluminum).scale(overallScale));
p.part('bezel', b(0, 0, 204, 210, 44, 150).color(medicalPolymer).scale(overallScale));
p.part('screen', b(0, -24, 213, 178, 4, 114).color(displayGlass).scale(overallScale));
p.part('control-strip', b(0, -25, 133, 150, 4, 18).color(medicalPolymer).scale(overallScale));
for (const x of [-52, 0, 52]) p.part('button-' + x, c(x, -27, 133, 5, 7, 8).color(rubber).scale(overallScale));

return p.model();
