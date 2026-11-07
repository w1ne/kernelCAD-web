meta({
  "name": "timpani",
  "license": "CC0-1.0",
  "title": "Timpani",
  "description": "Kettle drum with a broad bowl, top head, adjustment legs and pedal base.",
  "tags": [
    "timpani",
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
const color = param('color', "#a18a56", { label: 'Asset color' });
const p = assembly("timpani");
p.part("bowl", sphere(107).scale([1, 1, 0.7]).translate(0, 0, 94).scale(scale).color(color));
p.part("head-rim", cylinder(9, 111, 12).subtract(cylinder(11, 99, 12).translate(0, 0, -1)).translate(0, 0, 158).scale(scale).color(color));
p.part("head", cylinder(8, 101, 12).translate(0, 0, 160).scale(scale).color(color));
p.part("leg-one", box(16, 16, 98, true).translate(-68, 0, 49).scale(scale).color(color));
p.part("leg-two", box(16, 16, 98, true).translate(68, 0, 49).scale(scale).color(color));
p.part("leg-three", box(16, 16, 98, true).translate(0, 68, 49).scale(scale).color(color));
p.part("pedal", box(55, 62, 12, true).translate(0, 0, 6).scale(scale).color(color));

return p.model();
