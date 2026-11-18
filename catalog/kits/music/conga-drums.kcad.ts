// Distinctive silhouette: Pair of tall conga drums with tapered-looking shells, top heads and floor feet. Material controls: maple shells, calfskin heads, chrome fittings; concert and vintage presets.
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
const maple = param('maple', '#b8753f', { label: 'Maple shells' });
const calfskin = param('calfskin', '#e6d6b4', { label: 'Calfskin heads' });
const chrome = param('chrome', '#818e94', { label: 'Chrome fittings' });

presets({
  concert: { maple: '#ce914d' },
  vintage: { maple: '#825032' },
});
const p = assembly("conga-drums");
p.part("left-shell", cylinder(390, 53, 10).translate(-68, 0, 8).scale(scale).color(maple));
p.part("right-shell", cylinder(390, 53, 10).translate(68, 0, 8).scale(scale).color(maple));
p.part("left-head", cylinder(10, 57, 10).translate(-68, 0, 394).scale(scale).color(calfskin));
p.part("right-head", cylinder(10, 57, 10).translate(68, 0, 394).scale(scale).color(calfskin));
p.part("left-foot", cylinder(14, 58, 10).translate(-68, 0, 0).scale(scale).color(chrome));
p.part("right-foot", cylinder(14, 58, 10).translate(68, 0, 0).scale(scale).color(chrome));
p.part("cross-brace", box(145, 18, 18, true).translate(0, 0, 70).scale(scale).color(chrome));

return p.model();
