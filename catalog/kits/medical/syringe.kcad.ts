meta({
  "name": "syringe",
  "license": "CC0-1.0",
  "title": "Syringe",
  "description": "Disposable syringe prop with graduated barrel bands, plunger thumb pad and fine needle, built as simple low-poly geometry. Material controls: Clear barrel polymer, Silicone plunger seal, Stainless-steel needle, Graduation ink.",
  "tags": [
    "syringe",
    "injection",
    "medical supply",
    "clinic",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "item",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 300
});

// A syringe separates its graduated clear barrel, black plunger seal and fine stainless needle.
const clearPolymer = param('clearPolymer', '#e9edef', { label: 'Clear barrel polymer' });
const siliconeRubber = param('siliconeRubber', '#303a3d', { label: 'Silicone plunger seal' });
const stainlessSteel = param('stainlessSteel', '#b7c1c3', { label: 'Stainless-steel needle' });
const graduationInk = param('graduationInk', '#7eacb0', { label: 'Graduation ink' });
presets({
  clinic: { clearPolymer: '#dcebea', siliconeRubber: '#445355', stainlessSteel: '#c2cbcd', graduationInk: '#358b87' },
  emergency: { clearPolymer: '#e7e4dd', siliconeRubber: '#544d49', stainlessSteel: '#bcb7b0', graduationInk: '#c9413b' },
});
const p = assembly('syringe');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('barrel', c(0, 0, 24, 132, 16, 10).color(clearPolymer));
p.part('finger-flange', b(0, 0, 151, 50, 18, 8).color(clearPolymer));
p.part('plunger-rod', c(0, 0, 155, 42, 5, 8).color(clearPolymer));
p.part('thumb-pad', b(0, 0, 197, 35, 24, 8).color(clearPolymer));
p.part('needle-hub', c(0, 0, 16, 12, 8, 8).color(stainlessSteel));
p.part('needle', c(0, 0, 0, 18, 2, 8).color(stainlessSteel));
for (const z of [50, 76, 102, 128]) p.part('mark-' + z, b(9, -15, z, 9, 2, 3).color(graduationInk));

p.part('plunger-seal', c(0, 0, 153, 5, 14, 10).color(siliconeRubber));

return p.model();
