// Distinctive silhouette: Large concert bass drum on a floor cradle with a broad circular drumhead. Material controls: shell lacquer, calfskin heads, cradle steel; concert and vintage presets.
meta({
  "name": "bass-drum",
  "license": "CC0-1.0",
  "title": "Bass drum",
  "description": "Large concert bass drum on a floor cradle with a broad circular drumhead.",
  "tags": [
    "bass drum",
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
const lacquer = param('lacquer', '#9e343d', { label: 'Shell lacquer' });
const calfskin = param('calfskin', '#e9dfc9', { label: 'Calfskin heads' });
const steel = param('steel', '#67747d', { label: 'Cradle steel' });

presets({
  concert: { lacquer: '#23627a' },
  vintage: { lacquer: '#6c3435' },
});
const p = assembly("bass-drum");
p.part("shell", cylinder(94, 126, 12).rotate([1, 0, 0], 90).translate(0, 0, 140).scale(scale).color(lacquer));
p.part("front-head", cylinder(7, 132, 12).rotate([1, 0, 0], 90).translate(0, -50, 140).scale(scale).color(calfskin));
p.part("rear-head", cylinder(7, 132, 12).rotate([1, 0, 0], 90).translate(0, 42, 140).scale(scale).color(calfskin));
p.part("cradle-left", box(15, 115, 70, true).translate(-96, 0, 35).scale(scale).color(steel));
p.part("cradle-right", box(15, 115, 70, true).translate(96, 0, 35).scale(scale).color(steel));
p.part("cradle-bar", box(218, 20, 16, true).translate(0, 0, 14).scale(scale).color(steel));

return p.model();
