// Distinctive silhouette: Slightly larger viola prop with an hourglass body, neck, bridge and four strings. Material controls: maple body, ebony fingerboard, steel strings; concert and vintage presets.
meta({
  "name": "viola",
  "license": "CC0-1.0",
  "title": "Viola",
  "description": "Slightly larger viola prop with an hourglass body, neck, bridge and four strings.",
  "tags": [
    "viola",
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
const maple = param('maple', '#a66c3d', { label: 'Maple body' });
const ebony = param('ebony', '#25201e', { label: 'Ebony fingerboard' });
const steel = param('steel', '#bcc6cb', { label: 'Steel strings' });

presets({
  concert: { maple: '#c1834b' },
  vintage: { maple: '#75472e' },
});
const outlineBody = (lower: number, waist: number, upper: number, length: number, depth: number) =>
  path().moveTo(0, 0)
    .lineTo(-lower * 0.43, length * 0.04).lineTo(-lower * 0.5, length * 0.17)
    .lineTo(-lower * 0.42, length * 0.29).lineTo(-waist * 0.46, length * 0.4)
    .lineTo(-waist * 0.42, length * 0.55).lineTo(-upper * 0.42, length * 0.66)
    .lineTo(-upper * 0.5, length * 0.82).lineTo(-upper * 0.4, length * 0.95)
    .lineTo(0, length).lineTo(upper * 0.4, length * 0.95)
    .lineTo(upper * 0.5, length * 0.82).lineTo(upper * 0.42, length * 0.66)
    .lineTo(waist * 0.42, length * 0.55).lineTo(waist * 0.46, length * 0.4)
    .lineTo(lower * 0.42, length * 0.29).lineTo(lower * 0.5, length * 0.17)
    .lineTo(lower * 0.43, length * 0.04).close()
    .extrude(depth).rotateX(90).translate(0, depth / 2, 0);

const p = assembly("viola");
p.part("body", outlineBody(205, 120, 160, 245, 28).scale(scale).color(maple));
p.part("neck", box(24, 17, 208, true).translate(0, 0, 262).scale(scale).color(maple));
p.part("fingerboard", box(20, 5, 200, true).translate(0, -10.5, 262).scale(scale).color(ebony));
p.part("scroll", sphere(20).translate(0, 0, 383).scale(scale).color(maple));
p.part("bridge", box(47, 12, 15, true).translate(0, 0, 74).scale(scale).color(maple));
p.part("strings", box(2, 2, 310, true).translate(0, -15, 220).scale(scale).color(steel));
p.part("f-hole-left", sphere(9).scale([0.42, 0.16, 1.5]).translate(-30, -14, 124).scale(scale).color(ebony));
p.part("f-hole-right", sphere(9).scale([0.42, 0.16, 1.5]).translate(30, -14, 124).scale(scale).color(ebony));

return p.model();
