meta({
  "name": "bass-guitar",
  "license": "CC0-1.0",
  "title": "Bass guitar",
  "description": "Electric bass guitar prop with an elongated body, long fretted neck and four strings.",
  "tags": [
    "bass guitar",
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
const color = param('color', "#5b6d66", { label: 'Asset color' });
const p = assembly("bass-guitar");
p.part("body", sphere(87).scale([1.2, 0.38, 1]).translate(0, 0, 87).scale(scale).color(color));
p.part("neck", box(38, 22, 490, true).translate(0, 0, 390).scale(scale).color(color));
p.part("head", box(52, 28, 72, true).translate(0, 0, 672).scale(scale).color(color));
p.part("bridge", box(58, 14, 14, true).translate(0, 0, 27).scale(scale).color(color));
p.part("pickup-one", box(56, 13, 12, true).translate(0, 0, 105).scale(scale).color(color));
p.part("pickup-two", box(56, 13, 12, true).translate(0, 0, 147).scale(scale).color(color));
p.part("strings", box(2, 3, 610, true).translate(0, 0, 355).scale(scale).color(color));

return p.model();
