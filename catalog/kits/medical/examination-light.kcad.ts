meta({
  "name": "examination-light",
  "license": "CC0-1.0",
  "title": "Examination light",
  "description": "Clinic examination lamp with weighted base, tall support column, offset arm and broad low-poly lamp head. Material controls: Powder-coated steel, Rubber casters, Anodized-aluminum lamp head, Opal glass diffuser.",
  "tags": [
    "examination light",
    "medical lamp",
    "clinic equipment",
    "treatment room",
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
  "triangleBudget": 450
});

// A mobile examination lamp has a wheeled steel base, articulated arm and glass light face.
const powderCoatedSteel = param('powderCoatedSteel', '#e5e9ea', { label: 'Powder-coated steel' });
const rubber = param('rubber', '#3a4244', { label: 'Rubber casters' });
const anodizedAluminum = param('anodizedAluminum', '#6b8f98', { label: 'Anodized-aluminum lamp head' });
const opalGlass = param('opalGlass', '#f0efe7', { label: 'Opal glass diffuser' });
presets({
  clinic: { powderCoatedSteel: '#eef1f2', rubber: '#4d5859', anodizedAluminum: '#7fa0a5', opalGlass: '#fff9e8' },
  emergency: { powderCoatedSteel: '#e8e4dc', rubber: '#514e4b', anodizedAluminum: '#8a8c86', opalGlass: '#f1e5d5' },
});
const p = assembly('examination-light');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', c(0, 0, 8, 16, 95, 10).color(powderCoatedSteel));
for (const side of [-1, 1]) {
  p.part('base-leg-x-' + side, b(side * 58, 0, 6, 126, 20, 12).color(powderCoatedSteel));
  p.part('base-leg-y-' + side, b(0, side * 58, 6, 20, 126, 12).color(powderCoatedSteel));
  p.part('caster-' + side, c(side * 112, 0, 0, 22, 14, 8).color(rubber));
}
p.part('column', c(0, 0, 14, 780, 12, 10).color(powderCoatedSteel));
p.part('arm', b(115, 0, 810, 250, 18, 18).color(powderCoatedSteel));
p.part('lamp-neck', c(0, 0, 0, 80, 10, 10).rotate([0, 1, 0], 65).translate(240, 0, 810).color(powderCoatedSteel));
p.part('head', c(270, 0, 855, 24, 76, 12).color(anodizedAluminum));
p.part('light-face', c(270, 0, 855, 4, 58, 12).color(opalGlass));

return p.model();
