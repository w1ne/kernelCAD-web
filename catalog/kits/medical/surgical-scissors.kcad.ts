meta({
  "name": "surgical-scissors",
  "license": "CC0-1.0",
  "title": "Surgical scissors",
  "description": "Low-poly surgical scissors with two finger loops, central pivot and long straight blades for medical kit scenes.",
  "tags": [
    "surgical scissors",
    "medical tool",
    "instrument",
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
  "triangleBudget": 350
});

const shell = param('shell', '#99a4a8', { label: 'Shell' });
const accent = param('accent', '#58656a', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('surgical-scissors');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

const ring = (x: number) => cylinder(7, 15, 10).subtract(cylinder(9, 8, 10).translate(0, 0, -1)).translate(x, 0, 0);
p.part('finger-loop-left', ring(-20).color(shell));
p.part('finger-loop-right', ring(20).color(shell));
p.part('blade-left', poly([[-16, 9], [-8, 14], [-3, 80], [-8, 105], [-14, 84]], 7, 6).color(accent));
p.part('blade-right', poly([[16, 9], [8, 14], [3, 80], [8, 105], [14, 84]], 7, 6).color(accent));
p.part('pivot', c(0, 0, 0, 14, 7, 8).color(accent));

return p.model();
