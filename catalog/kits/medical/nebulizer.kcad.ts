meta({
  "name": "nebulizer",
  "license": "CC0-1.0",
  "title": "Nebulizer",
  "description": "Compact tabletop nebulizer with compressor housing, airflow slots, control knob and medicine cup for respiratory care scenes. Material controls: Medical-grade polymer, Clear medicine-cup polymer, Silicone connector, Rubber controls.",
  "tags": [
    "nebulizer",
    "respiratory care",
    "medical equipment",
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

// A tabletop nebulizer pairs a compressor housing with a medicine cup and flexible air connector.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const medicalPolymer = param('medicalPolymer', '#e6eaeb', { label: 'Medical-grade polymer' });
const clearPolycarbonate = param('clearPolycarbonate', '#99c5c2', { label: 'Clear medicine-cup polymer' });
const siliconeTubing = param('siliconeTubing', '#4e8790', { label: 'Silicone connector' });
const rubber = param('rubber', '#374448', { label: 'Rubber controls' });
presets({
  clinic: { medicalPolymer: '#f1f3f4', clearPolycarbonate: '#a9d2cc', siliconeTubing: '#438d89', rubber: '#536166' },
  emergency: { medicalPolymer: '#ebe8df', clearPolycarbonate: '#bfd2cd', siliconeTubing: '#bd6258', rubber: '#5a514d' },
});
const p = assembly('nebulizer');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('compressor', b(0, 0, 48, 190, 150, 96).color(medicalPolymer).scale(overallScale));
for (let i = 0; i < 4; i++) p.part('vent-' + i, b(-68 + i * 24, -77, 47, 10, 4, 46).color(rubber).scale(overallScale));
p.part('knob', c(58, -80, 50, 7, 12, 8).color(medicalPolymer).scale(overallScale));
p.part('cup-base', c(0, 0, 96, 12, 19, 8).color(medicalPolymer).scale(overallScale));
p.part('medicine-cup', c(0, 0, 108, 52, 16, 8).color(clearPolycarbonate).scale(overallScale));
p.part('cup-cap', c(0, 0, 157, 8, 19, 8).color(medicalPolymer).scale(overallScale));
p.part('connector', c(92, 0, 45, 18, 9, 8).color(siliconeTubing).scale(overallScale));

return p.model();
