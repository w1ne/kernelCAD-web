// Distinctive silhouette: Banjo with a circular resonator, narrow neck, bridge and tuning head. Material controls: maple neck, parchment head, nickel hardware, ebony fingerboard; concert and vintage presets.
meta({
  "name": "banjo",
  "license": "CC0-1.0",
  "title": "Banjo",
  "description": "Banjo with a circular resonator, narrow neck, bridge and tuning head.",
  "tags": [
    "banjo",
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
const maple = param('maple', '#bf8a4b', { label: 'Maple neck' });
const parchment = param('parchment', '#e4d7b7', { label: 'Parchment head' });
const nickel = param('nickel', '#bcc5ca', { label: 'Nickel hardware' });
const ebony = param('ebony', '#29221f', { label: 'Ebony fingerboard' });

presets({
  concert: { maple: '#d8a45e' },
  vintage: { maple: '#8f5b34' },
});
const p = assembly("banjo");
p.part("resonator", cylinder(24, 76, 12).translate(0, 0, 0).scale(scale).color(maple));
p.part("rim", cylinder(12, 82, 12).subtract(cylinder(14, 70, 12).translate(0, 0, -1)).translate(0, 0, 26).scale(scale).color(nickel));
p.part("head-skin", cylinder(3, 69, 12).translate(0, 0, 28).scale(scale).color(parchment));
p.part("neck", box(28, 20, 300, true).translate(0, 0, 203).scale(scale).color(maple));
p.part("fingerboard", box(22, 4, 274, true).translate(0, -12, 203).scale(scale).color(ebony));
p.part("head", box(42, 24, 52, true).translate(0, 0, 378).scale(scale).color(maple));
p.part("bridge", box(42, 10, 12, true).translate(0, 0, 43).scale(scale).color(maple));
p.part("strings", box(2, 2, 358, true).translate(0, 0, 203).scale(scale).color(nickel));

return p.model();
