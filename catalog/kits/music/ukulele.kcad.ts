// Distinctive silhouette: Compact four-string ukulele with a rounded body, short neck, bridge and sound hole. Material controls: koa soundboard, ebony fingerboard, steel strings, brass tuning hardware; concert and vintage presets.
meta({
  "name": "ukulele",
  "license": "CC0-1.0",
  "title": "Ukulele",
  "description": "Compact four-string ukulele with a rounded body, short neck, bridge and sound hole.",
  "tags": [
    "ukulele",
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
const koa = param('koa', '#c7894d', { label: 'Koa soundboard' });
const ebony = param('ebony', '#29211e', { label: 'Ebony fingerboard' });
const steel = param('steel', '#bcc6cb', { label: 'Steel strings' });
const brass = param('brass', '#bd8732', { label: 'Brass tuning hardware' });

presets({
  concert: { koa: '#dfa562' },
  vintage: { koa: '#86502f' },
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

const p = assembly("ukulele");
p.part("body", outlineBody(164, 105, 122, 164, 24).subtract(cylinder(26, 17, 14).rotateX(90).translate(0, 13, 78)).scale(scale).color(koa));
p.part("neck", box(25, 16, 210, true).translate(0, 0, 195).scale(scale).color(koa));
p.part("fingerboard", box(19, 4, 190, true).translate(0, -10, 195).scale(scale).color(ebony));
p.part("head", box(38, 20, 45, true).translate(0, 0, 323).scale(scale).color(koa));
p.part("bridge", box(42, 9, 9, true).translate(0, 0, 19).scale(scale).color(brass));
p.part("sound-hole", cylinder(5, 22, 10).subtract(cylinder(7, 16, 10).translate(0, 0, -1)).rotateX(90).translate(0, -10, 78).scale(scale).color(ebony));
p.part("strings", box(2, 2, 280, true).translate(0, -13, 160).scale(scale).color(steel));

return p.model();
