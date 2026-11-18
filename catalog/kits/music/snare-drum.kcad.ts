// Distinctive silhouette: Snare drum with a shallow shell, paired hoops and a simple carry-stand frame. Material controls: shell lacquer, drumhead skin, chrome hoops and stand; concert and vintage presets.
meta({
  "name": "snare-drum",
  "license": "CC0-1.0",
  "title": "Snare drum",
  "description": "Snare drum with a shallow shell, paired hoops and a simple carry-stand frame.",
  "tags": [
    "snare drum",
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
const lacquer = param('lacquer', '#a7383c', { label: 'Shell lacquer' });
const calfskin = param('calfskin', '#e8dfca', { label: 'Drumhead skin' });
const chrome = param('chrome', '#879399', { label: 'Chrome hoops and stand' });

presets({
  concert: { lacquer: '#2e637d' },
  vintage: { lacquer: '#6e4037' },
});
const p = assembly("snare-drum");
p.part("shell", cylinder(72, 76, 12).translate(0, 0, 84).scale(scale).color(lacquer));
p.part("head", cylinder(4, 72, 12).translate(0, 0, 152).scale(scale).color(calfskin));
p.part("top-hoop", cylinder(10, 82, 12).subtract(cylinder(12, 70, 12).translate(0, 0, -1)).translate(0, 0, 150).scale(scale).color(chrome));
p.part("bottom-hoop", cylinder(10, 82, 12).subtract(cylinder(12, 70, 12).translate(0, 0, -1)).translate(0, 0, 81).scale(scale).color(chrome));
p.part("stand-post", cylinder(78, 7, 8).translate(0, 0, 4).scale(scale).color(chrome));
p.part("stand-foot-one", box(105, 10, 8, true).translate(0, 0, 4).scale(scale).color(chrome));
p.part("stand-foot-two", box(10, 100, 8, true).translate(0, 0, 4).scale(scale).color(chrome));

return p.model();
