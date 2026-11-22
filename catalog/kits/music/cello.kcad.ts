// Distinctive silhouette: Seated cello with a broad resonant body, long neck, bridge and extended endpin. Material controls: maple body, ebony fingerboard, steel strings, nickel endpin; concert and vintage presets.
meta({
  "name": "cello",
  "license": "CC0-1.0",
  "title": "Cello",
  "description": "Seated cello with a broad resonant body, long neck, bridge and extended endpin.",
  "tags": [
    "cello",
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
const maple = param('maple', '#a96c3e', { label: 'Maple body' });
const ebony = param('ebony', '#25201f', { label: 'Ebony fingerboard' });
const steel = param('steel', '#bbc5ca', { label: 'Steel strings' });
const nickel = param('nickel', '#858f94', { label: 'Nickel endpin' });

presets({
  concert: { maple: '#c8894e' },
  vintage: { maple: '#79482e' },
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

const p = assembly("cello");
p.part("body", outlineBody(270, 160, 178, 316, 40).scale(scale).color(maple));
p.part("neck", box(34, 22, 335, true).translate(0, 0, 448).scale(scale).color(ebony));
p.part("fingerboard", box(30, 5, 327, true).translate(0, -13.5, 448).scale(scale).color(ebony));
p.part("scroll", sphere(27).translate(0, 0, 655).scale(scale).color(ebony));
p.part("bridge", box(70, 18, 22, true).translate(0, 0, 135).scale(scale).color(maple));
p.part("endpin", cylinder(46, 5, 8).translate(0, 0, 0).scale(scale).color(nickel));
p.part("strings", box(2, 3, 516, true).translate(0, -17, 376).scale(scale).color(steel));

return p.model();
