meta({
  "name": "forearm-crutches",
  "license": "CC0-1.0",
  "title": "Forearm crutches",
  "description": "Pair of low-poly forearm crutches with cuffs, hand grips, narrow shafts and rubber tips for medical recovery scenes.",
  "tags": [
    "forearm crutches",
    "crutches",
    "forearm crutch",
    "mobility aid",
    "recovery",
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
  "triangleBudget": 350
});

const shell = param('shell', '#b8c3c8', { label: 'Shell' });
const accent = param('accent', '#2d858d', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('forearm-crutches');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

for (const side of [-1, 1]) {
  const x = side * 76;
  p.part('shaft-' + side, c(x, 0, 0, 870, 12, 8).color(shell));
  p.part('cuff-' + side, c(x, 0, 790, 92, 44, 10).color(accent));
  p.part('grip-' + side, b(x, 0, 650, 68, 34, 24).color(accent));
  p.part('tip-' + side, c(x, 0, 0, 24, 15, 8).color(accent));
}

return p.model();
