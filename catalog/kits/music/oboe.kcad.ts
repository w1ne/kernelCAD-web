meta({
  "name": "oboe",
  "license": "CC0-1.0",
  "title": "Oboe",
  "description": "Double-reed oboe with a narrow tapered-looking body, bell, reed and small key pads.",
  "tags": [
    "oboe",
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
const color = param('color', "#8e5b34", { label: 'Asset color' });
const p = assembly("oboe");
p.part("body", cylinder(348, 15, 10).translate(0, 0, 0).scale(scale).color(color));
p.part("bell", sphere(31).scale([1, 1, 0.5]).translate(0, 0, 364).scale(scale).color(color));
p.part("reed", box(8, 8, 55, true).translate(0, 0, 540).scale(scale).color(color));
p.part("upper-joint", cylinder(120, 13, 10).translate(0, 0, 370).scale(scale).color(color));
p.part("key-one", sphere(8).translate(-15, -7, 92).scale(scale).color(color));
p.part("key-two", sphere(8).translate(-15, -7, 150).scale(scale).color(color));
p.part("key-three", sphere(8).translate(-15, -7, 208).scale(scale).color(color));
p.part("key-four", sphere(8).translate(-15, -7, 266).scale(scale).color(color));
p.part("key-five", sphere(8).translate(-15, -7, 324).scale(scale).color(color));

return p.model();
