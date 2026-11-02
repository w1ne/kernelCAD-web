meta({
  "name": "defibrillator",
  "license": "CC0-1.0",
  "title": "Automated defibrillator",
  "description": "Portable AED case with carry handle, simple screen, control buttons and two pad shapes for emergency response scenes.",
  "tags": [
    "defibrillator",
    "aed",
    "emergency equipment",
    "medical",
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
  "triangleBudget": 450
});

const shell = param('shell', '#e9ecec', { label: 'Shell' });
const accent = param('accent', '#d84b42', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('defibrillator');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('case', b(0, 0, 105, 230, 150, 210).color(shell));
p.part('handle-left', b(-32, 0, 222, 24, 30, 38).color(accent));
p.part('handle-right', b(32, 0, 222, 24, 30, 38).color(accent));
p.part('handle-grip', b(0, 0, 239, 76, 30, 16).color(accent));
p.part('screen', b(0, -79, 146, 112, 4, 62).color(accent));
p.part('button', c(73, -82, 80, 7, 13, 8).color(accent));
p.part('pad-left', b(-50, 93, 9, 68, 52, 18).color(accent));
p.part('pad-right', b(50, 93, 9, 68, 52, 18).color(accent));

return p.model();
