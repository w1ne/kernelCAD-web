meta({
  "name": "otoscope",
  "license": "CC0-1.0",
  "title": "Otoscope",
  "description": "Handheld otoscope with a textured grip, narrow tapered head and removable-looking ear speculum for clinic scenes.",
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

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#50636b', { label: 'Shell' });
const accent = param('accent', '#e9bc4b', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('otoscope');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('handle', c(0, 0, 0, 120, 24, 10).color(shell).scale(overallScale));
p.part('grip-band', c(0, 0, 40, 10, 25, 10).color(accent).scale(overallScale));
p.part('head', c(0, 0, 116, 34, 21, 10).color(shell).scale(overallScale));
p.part('speculum', c(0, 0, 150, 40, 9, 8).color(accent).scale(overallScale));
p.part('lens-rim', c(0, 0, 148, 6, 17, 8).color(shell).scale(overallScale));

return p.model();
