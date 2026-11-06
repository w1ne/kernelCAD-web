meta({
  "name": "surgical-scissors",
  "license": "CC0-1.0",
  "title": "Surgical scissors",
  "description": "Low-poly surgical scissors with two finger loops, central pivot and long straight blades for medical kit scenes. Material controls: Grip polymer, Stainless-steel blades and pivot.",
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

// Surgical scissors use intersecting stainless blades with distinct finger loops and a pivot screw.
const medicalPolymer = param('medicalPolymer', '#99a4a8', { label: 'Grip polymer' });
const stainlessSteel = param('stainlessSteel', '#58656a', { label: 'Stainless-steel blades and pivot' });
presets({
  clinic: { medicalPolymer: '#839397', stainlessSteel: '#758286' },
  emergency: { medicalPolymer: '#c9413b', stainlessSteel: '#b8b0a6' },
});
const p = assembly('surgical-scissors');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

const ring = (x: number) => cylinder(7, 15, 10).subtract(cylinder(9, 8, 10).translate(0, 0, -1)).translate(x, 0, 0);
p.part('finger-loop-left', ring(-20).color(medicalPolymer));
p.part('finger-loop-right', ring(20).color(medicalPolymer));
p.part('blade-left', poly([[-16, 9], [-8, 14], [-3, 80], [-8, 105], [-14, 84]], 7, 6).color(stainlessSteel));
p.part('blade-right', poly([[16, 9], [8, 14], [3, 80], [8, 105], [14, 84]], 7, 6).color(stainlessSteel));
p.part('pivot', c(0, 0, 0, 14, 7, 8).color(stainlessSteel));

return p.model();
