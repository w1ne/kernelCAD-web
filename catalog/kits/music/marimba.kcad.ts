meta({
  "name": "marimba",
  "license": "CC0-1.0",
  "title": "Marimba",
  "description": "Marimba with long graduated bars, resonator tubes and a sturdy frame.",
  "tags": [
    "marimba",
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
const color = param('color', "#92653f", { label: 'Asset color' });
const p = assembly("marimba");
p.part("bar-low", box(340, 35, 18, true).translate(0, -86, 190).scale(scale).color(color));
p.part("bar-mid-low", box(300, 35, 18, true).translate(0, -43, 190).scale(scale).color(color));
p.part("bar-mid", box(260, 35, 18, true).translate(0, 0, 190).scale(scale).color(color));
p.part("bar-mid-high", box(220, 35, 18, true).translate(0, 43, 190).scale(scale).color(color));
p.part("bar-high", box(180, 35, 18, true).translate(0, 86, 190).scale(scale).color(color));
p.part("resonator-low", cylinder(145, 17, 8).translate(0, -86, 22).scale(scale).color(color));
p.part("resonator-mid", cylinder(115, 15, 8).translate(0, -20, 52).scale(scale).color(color));
p.part("resonator-high", cylinder(85, 13, 8).translate(0, 54, 82).scale(scale).color(color));
p.part("frame-left", box(20, 210, 30, true).translate(-155, 0, 145).scale(scale).color(color));
p.part("frame-right", box(20, 210, 30, true).translate(155, 0, 145).scale(scale).color(color));
p.part("legs", box(18, 18, 136, true).translate(-148, 0, 68).scale(scale).color(color));

return p.model();
