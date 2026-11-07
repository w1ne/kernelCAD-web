// Distinctive silhouette: Vibraphone with graduated bars, resonator tubes and a compact wheeled stand. Material controls: aluminum bars, steel frame, dark resonator tubes; concert and vintage presets.
meta({
  "name": "vibraphone",
  "license": "CC0-1.0",
  "title": "Vibraphone",
  "description": "Vibraphone with graduated bars, resonator tubes and a compact wheeled stand.",
  "tags": [
    "vibraphone",
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
const aluminum = param('aluminum', '#aebbc2', { label: 'Aluminum bars' });
const steel = param('steel', '#3b464d', { label: 'Steel frame' });
const resonator = param('resonator', '#646b70', { label: 'Dark resonator tubes' });

presets({
  concert: { aluminum: '#dce4e7' },
  vintage: { aluminum: '#94948e' },
});
const p = assembly("vibraphone");
p.part("bar-one", box(270, 32, 16, true).translate(0, -70, 185).scale(scale).color(aluminum));
p.part("bar-two", box(240, 32, 16, true).translate(0, -35, 185).scale(scale).color(aluminum));
p.part("bar-three", box(210, 32, 16, true).translate(0, 0, 185).scale(scale).color(aluminum));
p.part("bar-four", box(180, 32, 16, true).translate(0, 35, 185).scale(scale).color(aluminum));
p.part("bar-five", box(150, 32, 16, true).translate(0, 70, 185).scale(scale).color(aluminum));
p.part("resonator-one", cylinder(115, 15, 8).translate(-68, -70, 55).scale(scale).color(resonator));
p.part("resonator-two", cylinder(95, 13, 8).translate(-35, -35, 75).scale(scale).color(resonator));
p.part("resonator-three", cylinder(80, 12, 8).translate(0, 0, 90).scale(scale).color(resonator));
p.part("resonator-four", cylinder(95, 13, 8).translate(35, 35, 75).scale(scale).color(resonator));
p.part("resonator-five", cylinder(115, 15, 8).translate(68, 70, 55).scale(scale).color(resonator));
p.part("crossbar", box(330, 18, 18, true).translate(0, 0, 120).scale(scale).color(aluminum));
p.part("legs", box(18, 18, 120, true).translate(-150, 0, 60).scale(scale).color(steel));

return p.model();
