meta({
  "name": "iv-stand",
  "license": "CC0-1.0",
  "title": "IV stand",
  "description": "Mobile IV stand with weighted star base, upright pole, hanging hooks and a simple fluid bag for ward scenes.",
  "tags": [
    "iv stand",
    "infusion pole",
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

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#b6c0c4', { label: 'Shell' });
const accent = param('accent', '#5da7ad', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('iv-stand');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base-hub', c(0, 0, 8, 16, 50, 10).color(shell).scale(overallScale));
for (const side of [-1, 1]) {
  p.part('base-leg-x-' + side, b(side * 46, 0, 7, 104, 18, 14).color(shell).scale(overallScale));
  p.part('base-leg-y-' + side, b(0, side * 46, 7, 18, 104, 14).color(shell).scale(overallScale));
  p.part('caster-' + side, c(side * 80, 0, 0, 20, 14, 8).color(accent).scale(overallScale));
}
p.part('pole', c(0, 0, 14, 1180, 10, 10).color(shell).scale(overallScale));
p.part('hook-bar', b(0, 0, 1190, 160, 12, 12).color(accent).scale(overallScale));
p.part('bag', b(0, 0, 1020, 112, 24, 170).color(shell).scale(overallScale));
p.part('bag-port', c(0, 0, 930, 38, 8, 8).color(accent).scale(overallScale));

return p.model();
