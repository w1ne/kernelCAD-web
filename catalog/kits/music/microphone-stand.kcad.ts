// Distinctive silhouette: Stage microphone on a tripod stand with an angled boom arm and round grille head. Material controls: powder-coated steel, microphone polymer, silver grille; concert and vintage presets.
meta({
  "name": "microphone-stand",
  "license": "CC0-1.0",
  "title": "Microphone stand",
  "description": "Stage microphone on a tripod stand with an angled boom arm and round grille head.",
  "tags": [
    "microphone stand",
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
const steel = param('steel', '#4b565d', { label: 'Powder-coated steel' });
const polymer = param('polymer', '#252a2e', { label: 'Microphone polymer' });
const silver = param('silver', '#b8c3c8', { label: 'Silver grille' });

presets({
  concert: { steel: '#385f70' },
  vintage: { steel: '#34383a' },
});
const p = assembly("microphone-stand");
p.part("base-post", cylinder(530, 9, 8).translate(0, 0, 110).scale(scale).color(steel));
p.part("base-foot-one", box(190, 15, 12, true).translate(0, 0, 6).scale(scale).color(steel));
p.part("base-foot-two", box(15, 175, 12, true).translate(0, 0, 6).scale(scale).color(steel));
p.part("base-foot-three", box(150, 15, 12, true).translate(0, 0, 6).scale(scale).color(steel));
p.part("boom", box(300, 12, 12, true).translate(130, 0, 660).scale(scale).color(steel));
p.part("boom-joint", sphere(19).translate(0, 0, 661).scale(scale).color(steel));
p.part("microphone-body", cylinder(92, 19, 10).rotate([1, 0, 0], 90).translate(286, 0, 660).scale(scale).color(polymer));
p.part("microphone-grille", sphere(23).scale([1, 1, 0.7]).translate(286, 0, 709).scale(scale).color(silver));
p.part("clip", box(18, 20, 38, true).translate(230, 0, 660).scale(scale).color(steel));

return p.model();
