meta({
  "name": "pulse-oximeter",
  "license": "CC0-1.0",
  "title": "Pulse oximeter",
  "description": "Compact fingertip pulse oximeter with hinged clamp, display panel and simple control button for first-aid scenes. Material controls: Medical-grade polymer, Stainless-steel hinge, Display glass, Silicone finger pad.",
  "tags": [
    "pulse oximeter",
    "finger monitor",
    "medical device",
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
  "triangleBudget": 300
});

// A fingertip oximeter has a hinged polymer clamp, inset display and soft finger pads.
const medicalPolymer = param('medicalPolymer', '#eef2f2', { label: 'Medical-grade polymer' });
const stainlessSteel = param('stainlessSteel', '#9aa6a8', { label: 'Stainless-steel hinge' });
const displayGlass = param('displayGlass', '#284c50', { label: 'Display glass' });
const silicone = param('silicone', '#399da1', { label: 'Silicone finger pad' });
presets({
  clinic: { medicalPolymer: '#f3f5f3', stainlessSteel: '#aab7b8', displayGlass: '#2c827c', silicone: '#54aaa2' },
  emergency: { medicalPolymer: '#ebe8df', stainlessSteel: '#b4aca4', displayGlass: '#c0473f', silicone: '#c9413b' },
});
const p = assembly('pulse-oximeter');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('lower-jaw', b(0, 0, 14, 92, 42, 28).color(medicalPolymer));
p.part('upper-jaw', box(82, 42, 24, true).rotate([0, 1, 0], -7).translate(-4, 0, 53).color(medicalPolymer));
p.part('hinge', c(0, 0, 0, 48, 8, 8).rotate([0, 1, 0], 90).translate(-24, 0, 38).color(stainlessSteel));
p.part('display', b(0, -22, 58, 48, 4, 20).color(displayGlass));
p.part('button', c(28, -24, 57, 4, 5, 8).color(silicone));

p.part('finger-pad-lower', b(0, 0, 29, 62, 30, 4).color(silicone));
p.part('finger-pad-upper', b(0, 0, 41, 62, 30, 4).color(silicone));

return p.model();
