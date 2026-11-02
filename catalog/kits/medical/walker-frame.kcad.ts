meta({
  "name": "walker-frame",
  "license": "CC0-1.0",
  "title": "Walker frame",
  "description": "Lightweight walking frame with twin hand grips, four legs and front glides for a clinic or recovery scene.",
  "tags": [
    "walker frame",
    "walker",
    "walking frame",
    "mobility aid",
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

const shell = param('shell', '#dce2e4', { label: 'Shell' });
const accent = param('accent', '#4a8991', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('walker-frame');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

for (const side of [-1, 1]) {
  p.part('side-rail-' + side, b(0, side * 195, 705, 28, 22, 570).color(shell));
  p.part('rear-leg-' + side, b(-230, side * 195, 350, 24, 22, 700).color(shell));
  p.part('front-leg-' + side, b(230, side * 195, 350, 24, 22, 700).color(shell));
  p.part('grip-' + side, b(0, side * 195, 1010, 180, 42, 24).color(accent));
  p.part('glide-' + side, c(230, side * 195, 0, 24, 18, 8).color(accent));
}
p.part('top-bar', b(0, 0, 990, 430, 22, 22).color(shell));

return p.model();
