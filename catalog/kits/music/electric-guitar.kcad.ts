// Distinctive silhouette: Solid-body electric guitar with a double-cutaway silhouette, pickup bars, bridge and headstock. Material controls: polyurethane body lacquer, maple neck, ebony fingerboard, steel hardware; concert and vintage presets.
meta({
  "name": "electric-guitar",
  "license": "CC0-1.0",
  "title": "Electric guitar",
  "description": "Solid-body electric guitar with a double-cutaway silhouette, pickup bars, bridge and headstock.",
  "tags": [
    "electric guitar",
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
const polyLacquer = param('polyLacquer', '#426784', { label: 'Polyurethane body lacquer' });
const maple = param('maple', '#c49861', { label: 'Maple neck' });
const ebony = param('ebony', '#28221f', { label: 'Ebony fingerboard' });
const steel = param('steel', '#b9c4ca', { label: 'Steel hardware' });

presets({
  concert: { polyLacquer: '#c64238' },
  vintage: { polyLacquer: '#593c32' },
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

const p = assembly("electric-guitar");
p.part("body", outlineBody(160, 90, 124, 190, 34).scale(scale).color(polyLacquer));
p.part("neck", box(32, 20, 380, true).translate(0, 0, 330).scale(scale).color(maple));
p.part("fingerboard", box(27, 5, 350, true).translate(0, -12, 330).scale(scale).color(ebony));
p.part("head", box(44, 24, 64, true).translate(0, 0, 552).scale(scale).color(maple));
p.part("bridge", box(58, 14, 13, true).translate(0, 0, 25).scale(scale).color(steel));
p.part("neck-pickup", box(52, 12, 10, true).translate(0, 0, 132).scale(scale).color(maple));
p.part("bridge-pickup", box(52, 12, 10, true).translate(0, 0, 88).scale(scale).color(ebony));
p.part("strings", box(2, 3, 490, true).translate(0, -15.5, 280).scale(scale).color(steel));

return p.model();
