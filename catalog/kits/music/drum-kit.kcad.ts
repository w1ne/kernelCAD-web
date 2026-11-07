meta({
  "name": "drum-kit",
  "license": "CC0-1.0",
  "title": "Drum kit",
  "description": "Compact drum kit with bass drum, supported snare and toms, cymbal stands and a stool.",
  "tags": [
    "drum kit",
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
const color = param('color', "#8b6a46", { label: 'Asset color' });
const p = assembly("drum-kit");
p.part("bass-drum", cylinder(76, 87, 10).rotate([1, 0, 0], 90).translate(0, 0, 87).scale(scale).color(color));
p.part("snare", cylinder(46, 48, 10).translate(-132, 0, 74).scale(scale).color(color));
p.part("snare-stand-post", cylinder(72, 5, 8).translate(-132, 0, 2).scale(scale).color(color));
p.part("snare-stand-foot", box(90, 12, 10, true).translate(-132, 0, 5).scale(scale).color(color));
p.part("floor-tom", cylinder(68, 52, 10).translate(115, 0, 40).scale(scale).color(color));
p.part("rack-tom-left", cylinder(48, 39, 10).translate(-64, 0, 164).scale(scale).color(color));
p.part("rack-tom-right", cylinder(48, 39, 10).translate(64, 0, 164).scale(scale).color(color));
p.part("tom-support", box(158, 18, 14, true).translate(0, 0, 142).scale(scale).color(color));
p.part("cymbal-one", sphere(57).scale([1, 1, 0.12]).translate(-154, 0, 244).scale(scale).color(color));
p.part("cymbal-two", sphere(57).scale([1, 1, 0.12]).translate(152, 0, 258).scale(scale).color(color));
p.part("cymbal-stand-left", cylinder(240, 5, 8).translate(-154, 0, 0).scale(scale).color(color));
p.part("cymbal-stand-right", cylinder(254, 5, 8).translate(152, 0, 0).scale(scale).color(color));
p.part("cymbal-foot-left", box(90, 12, 10, true).translate(-154, 0, 5).scale(scale).color(color));
p.part("cymbal-foot-right", box(90, 12, 10, true).translate(152, 0, 5).scale(scale).color(color));
p.part("stool-seat", cylinder(18, 45, 10).translate(0, 0, 200).scale(scale).color(color));
p.part("stool-post", cylinder(184, 8, 8).translate(0, 0, 16).scale(scale).color(color));

return p.model();
