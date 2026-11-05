meta({
  "name": "lab-incubator",
  "license": "CC0-1.0",
  "title": "Laboratory incubator",
  "description": "Small laboratory incubator with square chamber door, viewing panel, top controls and short feet for bench scenes.",
  "tags": [
    "lab incubator",
    "laboratory equipment",
    "science",
    "medical lab",
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
  "triangleBudget": 500
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#e6eaeb', { label: 'Shell' });
const accent = param('accent', '#4c8f93', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('lab-incubator');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('cabinet', b(0, 0, 145, 240, 190, 290).color(shell).scale(overallScale));
p.part('door', b(0, -99, 150, 200, 8, 245).color(accent).scale(overallScale));
p.part('window', b(0, -105, 166, 140, 4, 150).color(shell).scale(overallScale));
p.part('handle', b(82, -108, 150, 12, 12, 84).color(shell).scale(overallScale));
p.part('control-panel', b(0, 0, 305, 100, 130, 24).color(accent).scale(overallScale));
p.part('screen', b(0, -67, 310, 54, 4, 14).color(shell).scale(overallScale));
for (const x of [-76, 76]) p.part('foot-' + x, b(x, 70, 10, 36, 36, 20).color(accent).scale(overallScale));

return p.model();
