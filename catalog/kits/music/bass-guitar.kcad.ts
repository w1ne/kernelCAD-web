// Distinctive silhouette: Electric bass guitar prop with an elongated body, long fretted neck and four strings. Material controls: body lacquer, maple neck, ebony fingerboard, steel hardware; concert and vintage presets.
meta({
  "name": "bass-guitar",
  "license": "CC0-1.0",
  "title": "Bass guitar",
  "description": "Electric bass guitar prop with an elongated body, long fretted neck and four strings.",
  "tags": [
    "bass guitar",
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
const lacquer = param('lacquer', '#315f77', { label: 'Body lacquer' });
const maple = param('maple', '#c99a61', { label: 'Maple neck' });
const ebony = param('ebony', '#27221f', { label: 'Ebony fingerboard' });
const steel = param('steel', '#b7c1c7', { label: 'Steel hardware' });

presets({
  concert: { lacquer: '#bf463d' },
  vintage: { lacquer: '#654335' },
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

const p = assembly("bass-guitar");
p.part("body", outlineBody(208, 140, 160, 212, 34).scale(scale).color(lacquer));
p.part("neck", box(38, 22, 490, true).translate(0, 0, 390).scale(scale).color(maple));
p.part("fingerboard", box(32, 5, 455, true).translate(0, -14, 390).scale(scale).color(ebony));
p.part("head", box(52, 28, 72, true).translate(0, 0, 672).scale(scale).color(maple));
p.part("bridge", box(58, 14, 14, true).translate(0, 0, 27).scale(scale).color(steel));
p.part("pickup-one", box(56, 13, 12, true).translate(0, 0, 105).scale(scale).color(ebony));
p.part("pickup-two", box(56, 13, 12, true).translate(0, 0, 147).scale(scale).color(ebony));
p.part("strings", box(2, 3, 610, true).translate(0, -18, 355).scale(scale).color(steel));

return p.model();
