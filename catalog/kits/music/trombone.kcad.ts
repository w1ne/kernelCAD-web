// Distinctive silhouette: Trombone with a wide bell, long slide tubes and a cross brace. Material controls: lacquered brass bell, nickel slide tubes, ebonite mouthpiece; concert and vintage presets.
meta({
  "name": "trombone",
  "license": "CC0-1.0",
  "title": "Trombone",
  "description": "Trombone with a wide bell, long slide tubes and a cross brace.",
  "tags": [
    "trombone",
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
const brass = param('brass', '#c18b34', { label: 'Lacquered brass bell' });
const nickel = param('nickel', '#bbc5ca', { label: 'Nickel slide tubes' });
const ebonite = param('ebonite', '#292a2d', { label: 'Ebonite mouthpiece' });

presets({
  concert: { brass: '#e1b144' },
  vintage: { brass: '#a56c2b' },
});
const p = assembly("trombone");
const Z = 58;
const tx = (len: number, r: number, x0: number, y: number) => cylinder(len, r, 8).rotate([0, 1, 0], 90).translate(x0, y, Z);
const ty = (len: number, r: number, y0: number, x: number) => cylinder(len, r, 8).rotate([1, 0, 0], -90).translate(x, y0, Z);
p.part("inner-slide-left", tx(440, 6, -240, -18).scale(scale).color(nickel));
p.part("inner-slide-right", tx(440, 6, -240, 18).scale(scale).color(nickel));
p.part("outer-slide-left", tx(120, 8, 160, -18).scale(scale).color(nickel));
p.part("outer-slide-right", tx(120, 8, 160, 18).scale(scale).color(nickel));
p.part("slide-crossbar", box(14, 52, 12, true).translate(-240, 0, Z).scale(scale).color(nickel));
p.part("slide-bow", ty(104, 8, -18, 280).scale(scale).color(brass));
p.part("bell-pipe", tx(380, 8, -100, 86).scale(scale).color(brass));
p.part("bell-flare-a", tx(40, 14, -140, 86).scale(scale).color(brass));
p.part("bell-flare-b", tx(40, 26, -180, 86).scale(scale).color(brass));
p.part("bell-flare-c", tx(40, 42, -220, 86).scale(scale).color(brass));
p.part("bell-flare-d", tx(30, 58, -250, 86).scale(scale).color(brass));
p.part("mouthpiece", tx(40, 8, -280, -18).scale(scale).color(ebonite));

return p.model();
