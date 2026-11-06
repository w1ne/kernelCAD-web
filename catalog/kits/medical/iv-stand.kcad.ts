meta({
  "name": "iv-stand",
  "license": "CC0-1.0",
  "title": "IV stand",
  "description": "Mobile IV stand with weighted star base, upright pole, hanging hooks and a simple fluid bag for ward scenes. Material controls: Stainless steel, Fluid-bag polymer, Rubber casters.",
  "tags": [
    "iv stand",
    "infusion pole",
    "hospital equipment",
    "clinic",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "prop",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 400
});

// An IV stand has a stainless telescoping pole and hooks, fluid bag and rubber-wheeled base.
const stainlessSteel = param('stainlessSteel', '#b6c0c4', { label: 'Stainless steel' });
const medicalPolymer = param('medicalPolymer', '#dce9e8', { label: 'Fluid-bag polymer' });
const rubber = param('rubber', '#3d474a', { label: 'Rubber casters' });
presets({
  clinic: { stainlessSteel: '#c6ced0', medicalPolymer: '#d6e9e6', rubber: '#515e60' },
  emergency: { stainlessSteel: '#bdbbb5', medicalPolymer: '#e9e0d6', rubber: '#554f4d' },
});
const p = assembly('iv-stand');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base-hub', c(0, 0, 8, 16, 50, 10).color(stainlessSteel));
for (const side of [-1, 1]) {
  p.part('base-leg-x-' + side, b(side * 46, 0, 7, 104, 18, 14).color(stainlessSteel));
  p.part('base-leg-y-' + side, b(0, side * 46, 7, 18, 104, 14).color(stainlessSteel));
  p.part('caster-' + side, c(side * 80, 0, 0, 20, 14, 8).color(rubber));
}
p.part('pole', c(0, 0, 14, 1180, 10, 10).color(stainlessSteel));
p.part('hook-bar', b(0, 0, 1190, 160, 12, 12).color(stainlessSteel));
p.part('bag', b(0, 0, 1020, 112, 24, 170).color(medicalPolymer));
p.part('bag-port', c(0, 0, 930, 38, 8, 8).color(medicalPolymer));

return p.model();
