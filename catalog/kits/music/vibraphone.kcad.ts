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
p.part("bar-bed", box(300, 190, 10, true).translate(0, 0, 172).scale(scale).color(steel));
p.part("bar-one", box(270, 32, 16, true).translate(0, -70, 185).scale(scale).color(aluminum));
p.part("bar-two", box(240, 32, 16, true).translate(0, -35, 185).scale(scale).color(aluminum));
p.part("bar-three", box(210, 32, 16, true).translate(0, 0, 185).scale(scale).color(aluminum));
p.part("bar-four", box(180, 32, 16, true).translate(0, 35, 185).scale(scale).color(aluminum));
p.part("bar-five", box(150, 32, 16, true).translate(0, 70, 185).scale(scale).color(aluminum));
p.part("resonator-one", cylinder(115, 15, 8).translate(0, -70, 52).scale(scale).color(resonator));
p.part("resonator-two", cylinder(95, 13, 8).translate(0, -35, 72).scale(scale).color(resonator));
p.part("resonator-three", cylinder(80, 12, 8).translate(0, 0, 87).scale(scale).color(resonator));
p.part("resonator-four", cylinder(95, 13, 8).translate(0, 35, 72).scale(scale).color(resonator));
p.part("resonator-five", cylinder(115, 15, 8).translate(0, 70, 52).scale(scale).color(resonator));
p.part("crossbar", box(300, 16, 16, true).translate(0, -80, 40).scale(scale).color(aluminum));
p.part("crossbar-back", box(300, 16, 16, true).translate(0, 80, 40).scale(scale).color(aluminum));
p.part("leg-1", box(16, 16, 170, true).translate(-140, -80, 85).scale(scale).color(steel));
p.part("leg-2", box(16, 16, 170, true).translate(140, -80, 85).scale(scale).color(steel));
p.part("leg-3", box(16, 16, 170, true).translate(-140, 80, 85).scale(scale).color(steel));
p.part("leg-4", box(16, 16, 170, true).translate(140, 80, 85).scale(scale).color(steel));

return p.model();
