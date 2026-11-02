meta({
  "name": "conga-drums",
  "license": "CC0-1.0",
  "title": "Conga drums",
  "description": "Pair of tall conga drums with tapered-looking shells, top heads and floor feet.",
  "tags": [
    "conga drums",
    "music",
    "instrument",
    "orchestra",
    "low poly",
    "CC0"
  ],
  "kit": "music",
  "category": "prop",
  "origin": "base",
  "compat": [
    "music",
    "orchestra",
    "stage",
    "indoor"
  ],
  "triangleBudget": 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#956a43", { label: 'Asset color' });
const p = assembly("conga-drums");
p.part("left-shell", cylinder(390, 53, 10).translate(-68, 0, 8).scale(scale).color(color));
p.part("right-shell", cylinder(390, 53, 10).translate(68, 0, 8).scale(scale).color(color));
p.part("left-head", cylinder(10, 57, 10).translate(-68, 0, 394).scale(scale).color(color));
p.part("right-head", cylinder(10, 57, 10).translate(68, 0, 394).scale(scale).color(color));
p.part("left-foot", cylinder(14, 58, 10).translate(-68, 0, 0).scale(scale).color(color));
p.part("right-foot", cylinder(14, 58, 10).translate(68, 0, 0).scale(scale).color(color));
p.part("cross-brace", box(145, 18, 18, true).translate(0, 0, 70).scale(scale).color(color));

return p.model();
