meta({
  "name": "forceps",
  "license": "CC0-1.0",
  "title": "Forceps",
  "description": "Long low-poly forceps with tapered jaws and broad finger grips for a surgical tray or clinic instrument set.",
  "tags": [
    "forceps",
    "tweezers",
    "surgical tool",
    "medical instrument",
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

const shell = param('shell', '#a5afb2', { label: 'Shell' });
const accent = param('accent', '#56646a', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('forceps');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('left-arm', poly([[-22, -75], [-10, -75], [-2, 88], [-6, 120], [-15, 82]], 0, 8).color(shell));
p.part('right-arm', poly([[22, -75], [10, -75], [2, 88], [6, 120], [15, 82]], 0, 8).color(shell));
p.part('grip-left', b(-16, -59, 5, 30, 28, 10).color(accent));
p.part('grip-right', b(16, -59, 5, 30, 28, 10).color(accent));
p.part('jaw', b(0, 111, 4, 18, 10, 8).color(accent));

return p.model();
