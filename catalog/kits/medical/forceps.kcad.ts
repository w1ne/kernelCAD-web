meta({
  "name": "forceps",
  "license": "CC0-1.0",
  "title": "Forceps",
  "description": "Long low-poly forceps with tapered jaws and broad finger grips for a surgical tray or clinic instrument set. Material controls: Stainless steel, Medical-grade grip polymer.",
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

// Spring forceps have two tapered stainless arms and contrasting polymer grip pads.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#a5afb2', { label: 'Stainless steel' });
const medicalPolymer = param('medicalPolymer', '#56646a', { label: 'Medical-grade grip polymer' });
presets({
  clinic: { stainlessSteel: '#b8c1c3', medicalPolymer: '#2d858d' },
  emergency: { stainlessSteel: '#b4aaa1', medicalPolymer: '#c9413b' },
});
const p = assembly('forceps');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('left-arm', poly([[-22, -75], [-10, -75], [-2, 88], [-6, 120], [-15, 82]], 0, 8).color(stainlessSteel).scale(overallScale));
p.part('right-arm', poly([[22, -75], [10, -75], [2, 88], [6, 120], [15, 82]], 0, 8).color(stainlessSteel).scale(overallScale));
p.part('grip-left', b(-16, -59, 5, 30, 28, 10).color(medicalPolymer).scale(overallScale));
p.part('grip-right', b(16, -59, 5, 30, 28, 10).color(medicalPolymer).scale(overallScale));
p.part('jaw', b(0, 111, 4, 18, 10, 8).color(stainlessSteel).scale(overallScale));

return p.model();
