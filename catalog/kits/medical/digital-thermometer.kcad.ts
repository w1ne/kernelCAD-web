meta({
  "name": "digital-thermometer",
  "license": "CC0-1.0",
  "title": "Digital thermometer",
  "description": "Slim digital thermometer with tapered probe, small display and cap detail for first-aid and clinic scenes. Material controls: Medical-grade polymer, Display glass, Stainless-steel probe, Silicone end cap.",
  "tags": [
    "digital thermometer",
    "temperature",
    "medical tool",
    "first aid",
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
  "triangleBudget": 240
});

// A handheld thermometer has a slim polymer body, inset readout and stainless probe tip.
const medicalPolymer = param('medicalPolymer', '#e4e9eb', { label: 'Medical-grade polymer' });
const displayGlass = param('displayGlass', '#315d62', { label: 'Display glass' });
const stainlessSteel = param('stainlessSteel', '#b7c0c2', { label: 'Stainless-steel probe' });
const silicone = param('silicone', '#4d9ca0', { label: 'Silicone end cap' });
presets({
  clinic: { medicalPolymer: '#f1f3f4', displayGlass: '#318884', stainlessSteel: '#c1c9cb', silicone: '#64aaa5' },
  emergency: { medicalPolymer: '#ebe8df', displayGlass: '#9c4f48', stainlessSteel: '#b7b9b7', silicone: '#c9413b' },
});
const p = assembly('digital-thermometer');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('body', b(0, 0, 66, 22, 14, 132).color(medicalPolymer));
p.part('probe', c(0, 0, 0, 20, 5, 8).color(stainlessSteel));
p.part('display', b(0, -8, 88, 14, 3, 26).color(displayGlass));
p.part('button', c(0, -9, 58, 4, 4, 8).color(medicalPolymer));
p.part('end-cap', c(0, 0, 126, 12, 11, 8).color(silicone));

return p.model();
