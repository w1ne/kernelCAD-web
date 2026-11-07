// Distinctive silhouette: Low-poly acoustic guitar with a waisted body, sound hole, long neck and tuning head. Material controls: spruce soundboard, mahogany tonewood, ebony fingerboard, steel strings; concert and vintage presets.
meta({
  "name": "acoustic-guitar",
  "license": "CC0-1.0",
  "title": "Acoustic guitar",
  "description": "Low-poly acoustic guitar with a waisted body, sound hole, long neck and tuning head.",
  "tags": [
    "acoustic guitar",
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
const spruce = param('spruce', '#d7a466', { label: 'Spruce soundboard' });
const mahogany = param('mahogany', '#71452f', { label: 'Mahogany tonewood' });
const ebony = param('ebony', '#26201d', { label: 'Ebony fingerboard' });
const steel = param('steel', '#bac5ca', { label: 'Steel strings' });

presets({
  concert: { spruce: '#e4b873' },
  vintage: { spruce: '#ab7044' },
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

const p = assembly("acoustic-guitar");
p.part("body", outlineBody(224, 150, 150, 232, 30).subtract(cylinder(32, 23, 16).rotateX(90).translate(0, 16, 112)).scale(scale).color(spruce));
p.part("neck", box(34, 22, 372, true).translate(0, 0, 340).scale(scale).color(mahogany));
p.part("fingerboard", box(28, 5, 350, true).translate(0, -13, 340).scale(scale).color(ebony));
p.part("head", box(48, 26, 74, true).translate(0, 0, 558).scale(scale).color(mahogany));
p.part("bridge", box(55, 12, 12, true).translate(0, 0, 27).scale(scale).color(mahogany));
p.part("string-set", box(2, 3, 500, true).translate(0, -16, 285).scale(scale).color(steel));

return p.model();
