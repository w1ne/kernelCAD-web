meta({
  "name": "otoscope",
  "license": "CC0-1.0",
  "title": "Otoscope",
  "description": "Handheld otoscope with a textured grip, narrow tapered head and removable-looking ear speculum for clinic scenes. Material controls: Medical-grade polymer, Rubber grip band, Stainless-steel head, Optical glass.",
  "tags": [
    "otoscope",
    "ear exam tool",
    "medical instrument",
    "doctor",
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
  "triangleBudget": 280
});

// A handheld otoscope has a textured polymer handle, steel head and separate viewing lens.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const medicalPolymer = param('medicalPolymer', '#50636b', { label: 'Medical-grade polymer' });
const rubber = param('rubber', '#c49a32', { label: 'Rubber grip band' });
const stainlessSteel = param('stainlessSteel', '#a8b2b4', { label: 'Stainless-steel head' });
const opticalGlass = param('opticalGlass', '#253f48', { label: 'Optical glass' });
presets({
  clinic: { medicalPolymer: '#60757b', rubber: '#d2b34d', stainlessSteel: '#bbc4c5', opticalGlass: '#4a7777' },
  emergency: { medicalPolymer: '#6b6862', rubber: '#c9413b', stainlessSteel: '#b2aaa0', opticalGlass: '#6b6661' },
});
const p = assembly('otoscope');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('handle', c(0, 0, 0, 120, 24, 10).color(medicalPolymer).scale(overallScale));
p.part('grip-band', c(0, 0, 40, 10, 25, 10).color(rubber).scale(overallScale));
p.part('head', c(0, 0, 116, 34, 21, 10).color(stainlessSteel).scale(overallScale));
p.part('speculum', c(0, 0, 150, 40, 9, 8).color(stainlessSteel).scale(overallScale));
p.part('lens-rim', c(0, 0, 148, 6, 17, 8).color(opticalGlass).scale(overallScale));

return p.model();
