meta({
  "name": "centrifuge",
  "license": "CC0-1.0",
  "title": "Laboratory centrifuge",
  "description": "Compact bench-top centrifuge with lidded rotor housing, simple control panel and feet for laboratory scenes. Material controls: Painted steel, Clear polycarbonate, Display glass, Rubber feet.",
  "tags": [
    "centrifuge",
    "lab equipment",
    "sample processing",
    "science",
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

// A benchtop centrifuge has a domed polycarbonate lid, a front display and rubber feet.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#dfe5e6', { label: 'Painted steel' });
const clearPolycarbonate = param('clearPolycarbonate', '#75aeb0', { label: 'Clear polycarbonate' });
const displayGlass = param('displayGlass', '#24494d', { label: 'Display glass' });
const rubber = param('rubber', '#384347', { label: 'Rubber feet' });
presets({
  clinic: { paintedSteel: '#e9edee', clearPolycarbonate: '#83c3bd', displayGlass: '#2f7774', rubber: '#485356' },
  emergency: { paintedSteel: '#e6e1d9', clearPolycarbonate: '#8db3b1', displayGlass: '#415558', rubber: '#494748' },
});
const p = assembly('centrifuge');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', b(0, 0, 48, 190, 180, 96).color(paintedSteel).scale(overallScale));
p.part('lid', c(0, 0, 95, 28, 78, 12).color(clearPolycarbonate).scale(overallScale));
p.part('rotor-hub', c(0, 0, 123, 10, 20, 10).color(paintedSteel).scale(overallScale));
p.part('panel', b(0, -94, 63, 100, 4, 40).color(paintedSteel).scale(overallScale));
p.part('display', b(0, -97, 73, 56, 3, 17).color(displayGlass).scale(overallScale));
for (const x of [-34, 0, 34]) p.part('button-' + x, c(x, -99, 50, 5, 6, 8).color(paintedSteel).scale(overallScale));
for (const x of [-70, 70]) p.part('foot-' + x, b(x, 0, 8, 26, 30, 16).color(rubber).scale(overallScale));

return p.model();
