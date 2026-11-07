// Distinctive silhouette: Upright double bass with a large body, long neck, bridge and floor endpin. Material controls: maple body, ebony fingerboard, steel strings, nickel endpin; concert and vintage presets.
meta({
  "name": "double-bass",
  "license": "CC0-1.0",
  "title": "Double bass",
  "description": "Upright double bass with a large body, long neck, bridge and floor endpin.",
  "tags": [
    "double bass",
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
const maple = param('maple', '#9a6139', { label: 'Maple body' });
const ebony = param('ebony', '#25201f', { label: 'Ebony fingerboard' });
const steel = param('steel', '#bbc5ca', { label: 'Steel strings' });
const nickel = param('nickel', '#8d979c', { label: 'Nickel endpin' });

presets({
  concert: { maple: '#bd7c47' },
  vintage: { maple: '#6c432d' },
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

const p = assembly("double-bass");
p.part("body", outlineBody(330, 150, 220, 390, 50).scale(scale).color(maple));
p.part("neck", box(42, 26, 490, true).translate(0, 0, 654).scale(scale).color(ebony));
p.part("fingerboard", box(38, 5, 482, true).translate(0, -16.5, 654).scale(scale).color(ebony));
p.part("scroll", sphere(34).translate(0, 0, 956).scale(scale).color(ebony));
p.part("bridge", box(92, 22, 25, true).translate(0, 0, 171).scale(scale).color(maple));
p.part("endpin", cylinder(72, 7, 8).translate(0, 0, 0).scale(scale).color(nickel));
p.part("strings", box(2, 3, 760, true).translate(0, -20, 515).scale(scale).color(steel));

return p.model();
