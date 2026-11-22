// Distinctive silhouette: Faceted violin with an hourglass body, raised neck, bridge and four strings. Material controls: maple body, ebony fingerboard, steel strings; concert and vintage presets.
meta({
  "name": "violin",
  "license": "CC0-1.0",
  "title": "Violin",
  "description": "Faceted violin with an hourglass body, raised neck, bridge and four strings.",
  "tags": [
    "violin",
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
const maple = param('maple', '#b47a45', { label: 'Maple body' });
const ebony = param('ebony', '#25201e', { label: 'Ebony fingerboard' });
const steel = param('steel', '#bbc5ca', { label: 'Steel strings' });

presets({
  concert: { maple: '#d09150' },
  vintage: { maple: '#7d4d30' },
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

const p = assembly("violin");
p.part("body", outlineBody(180, 100, 145, 220, 24).scale(scale).color(maple));
p.part("neck", box(22, 16, 194, true).translate(0, 0, 236).scale(scale).color(maple));
p.part("fingerboard", box(18, 5, 186, true).translate(0, -9.5, 236).scale(scale).color(ebony));
p.part("scroll", sphere(19).translate(0, 0, 349).scale(scale).color(maple));
p.part("bridge", box(42, 12, 15, true).translate(0, 0, 64).scale(scale).color(maple));
p.part("strings", box(2, 2, 280, true).translate(0, -14, 196).scale(scale).color(steel));
p.part("f-hole-left", sphere(8).scale([0.42, 0.16, 1.4]).translate(-26, -13, 112).scale(scale).color(ebony));
p.part("f-hole-right", sphere(8).scale([0.42, 0.16, 1.4]).translate(26, -13, 112).scale(scale).color(ebony));

return p.model();
