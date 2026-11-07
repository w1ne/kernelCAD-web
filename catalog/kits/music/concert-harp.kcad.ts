// Distinctive silhouette: Concert harp with a triangular frame, soundboard, slanted pillar and a fan of strings. Material controls: maple frame, brass neck fittings, steel strings; concert and vintage presets.
meta({
  "name": "concert-harp",
  "license": "CC0-1.0",
  "title": "Concert harp",
  "description": "Concert harp with a triangular frame, soundboard, slanted pillar and a fan of strings.",
  "tags": [
    "concert harp",
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
const maple = param('maple', '#c19151', { label: 'Maple frame' });
const brass = param('brass', '#b78331', { label: 'Brass neck fittings' });
const steel = param('steel', '#bac5ca', { label: 'Steel strings' });

presets({
  concert: { maple: '#d5a562' },
  vintage: { maple: '#855331' },
});
const p = assembly("concert-harp");
p.part("soundboard", box(100, 72, 670, true).translate(-60, 0, 335).scale(scale).color(maple));
p.part("pillar", box(58, 70, 900, true).rotate([0, 1, 0], 12).translate(50, 0, 452).scale(scale).color(maple));
p.part("neck", box(250, 70, 72, true).translate(65, 0, 850).scale(scale).color(brass));
p.part("base", box(260, 100, 48, true).translate(20, 0, 24).scale(scale).color(maple));
p.part("string-01", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(34, -42, 460).scale(scale).color(steel));
p.part("string-02", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(46, -42, 460).scale(scale).color(steel));
p.part("string-03", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(58, -42, 460).scale(scale).color(steel));
p.part("string-04", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(70, -42, 460).scale(scale).color(steel));
p.part("string-05", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(82, -42, 460).scale(scale).color(steel));
p.part("string-06", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(94, -42, 460).scale(scale).color(steel));
p.part("string-07", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(106, -42, 460).scale(scale).color(steel));
p.part("string-08", box(6, 6, 705, true).rotate([0, 1, 0], 15).translate(118, -42, 460).scale(scale).color(steel));

return p.model();
