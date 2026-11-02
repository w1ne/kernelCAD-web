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
const color = param('color', "#9f8751", { label: 'Asset color' });
const p = assembly("vibraphone");
p.part("bar-one", box(270, 32, 16, true).translate(0, -70, 185).scale(scale).color(color));
p.part("bar-two", box(240, 32, 16, true).translate(0, -35, 185).scale(scale).color(color));
p.part("bar-three", box(210, 32, 16, true).translate(0, 0, 185).scale(scale).color(color));
p.part("bar-four", box(180, 32, 16, true).translate(0, 35, 185).scale(scale).color(color));
p.part("bar-five", box(150, 32, 16, true).translate(0, 70, 185).scale(scale).color(color));
p.part("resonator-one", cylinder(115, 15, 8).translate(-68, -70, 55).scale(scale).color(color));
p.part("resonator-two", cylinder(95, 13, 8).translate(-35, -35, 75).scale(scale).color(color));
p.part("resonator-three", cylinder(80, 12, 8).translate(0, 0, 90).scale(scale).color(color));
p.part("resonator-four", cylinder(95, 13, 8).translate(35, 35, 75).scale(scale).color(color));
p.part("resonator-five", cylinder(115, 15, 8).translate(68, 70, 55).scale(scale).color(color));
p.part("crossbar", box(330, 18, 18, true).translate(0, 0, 120).scale(scale).color(color));
p.part("legs", box(18, 18, 120, true).translate(-150, 0, 60).scale(scale).color(color));

return p.model();
