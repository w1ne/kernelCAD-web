meta({
  "name": "exam-table",
  "license": "CC0-1.0",
  "title": "Examination table",
  "description": "Low-poly examination table with padded top, adjustable-looking base and paper roll support for clinic scenes.",
  "tags": [
    "exam table",
    "clinic furniture",
    "medical bed",
    "treatment room",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "furniture",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 600
});

const shell = param('shell', '#edf0f2', { label: 'Shell' });
const accent = param('accent', '#2d9b91', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('exam-table');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('padded-top', b(0, 0, 655, 660, 230, 100).color(shell));
p.part('underframe', b(0, 0, 592, 570, 170, 28).color(accent));
for (const x of [-235, 235]) for (const y of [-62, 62]) {
  p.part('leg-' + x + '-' + y, b(x, y, 296, 38, 38, 592).color(accent));
}
p.part('head-cushion', b(0, -106, 657, 190, 16, 68).color(shell));
p.part('paper-bar', c(0, 116, 598, 20, 14, 8).color(accent));

return p.model();
