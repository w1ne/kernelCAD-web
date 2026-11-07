meta({
  "name": "syringe",
  "license": "CC0-1.0",
  "title": "Syringe",
  "description": "Disposable syringe prop with graduated barrel bands, plunger thumb pad and fine needle, built as simple low-poly geometry.",
  "tags": [
    "syringe",
    "injection",
    "medical supply",
    "clinic",
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
  "triangleBudget": 300
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#e9edef', { label: 'Shell' });
const accent = param('accent', '#7eacb0', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('syringe');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('barrel', c(0, 0, 24, 132, 16, 10).color(shell).scale(overallScale));
p.part('finger-flange', b(0, 0, 151, 50, 18, 8).color(accent).scale(overallScale));
p.part('plunger-rod', c(0, 0, 155, 42, 5, 8).color(shell).scale(overallScale));
p.part('thumb-pad', b(0, 0, 197, 35, 24, 8).color(accent).scale(overallScale));
p.part('needle-hub', c(0, 0, 16, 12, 8, 8).color(accent).scale(overallScale));
p.part('needle', c(0, 0, 0, 18, 2, 8).color(shell).scale(overallScale));
for (const z of [50, 76, 102, 128]) p.part('mark-' + z, b(9, -15, z, 9, 2, 3).color(accent).scale(overallScale));

return p.model();
