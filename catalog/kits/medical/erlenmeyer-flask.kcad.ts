meta({
  "name": "erlenmeyer-flask",
  "license": "CC0-1.0",
  "title": "Erlenmeyer flask",
  "description": "Low-poly Erlenmeyer flask built from stepped conical vessel bands and a narrow neck for laboratory scenes.",
  "tags": [
    "erlenmeyer flask",
    "laboratory glassware",
    "science",
    "beaker",
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
  "triangleBudget": 260
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#b8d6d1', { label: 'Shell' });
const accent = param('accent', '#4b8790', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('erlenmeyer-flask');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('lower-body', c(0, 0, 0, 30, 42, 10).color(shell).scale(overallScale));
p.part('shoulder', c(0, 0, 28, 44, 32, 10).color(shell).scale(overallScale));
p.part('upper-neck', c(0, 0, 68, 45, 14, 10).color(shell).scale(overallScale));
p.part('rim', c(0, 0, 111, 8, 17, 10).color(accent).scale(overallScale));
p.part('liquid-band', c(0, 0, 18, 4, 28, 10).color(accent).scale(overallScale));

return p.model();
