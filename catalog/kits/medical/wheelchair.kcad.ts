meta({
  "name": "wheelchair",
  "license": "CC0-1.0",
  "title": "Wheelchair",
  "description": "Low-poly manual wheelchair with seat, backrest, armrests, footplates, large rear wheels and small front casters. Material controls: Anodized aluminum frame, Vinyl upholstery, Rubber tires and casters, Molded armrest polymer.",
  "tags": [
    "wheelchair",
    "mobility aid",
    "hospital",
    "accessibility",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "vehicle",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 500
});

// A manual wheelchair separates its fabric seat and back, aluminum frame, rubber wheels and polymer armrests.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminum = param('anodizedAluminum', '#aeb9bd', { label: 'Anodized aluminum frame' });
const vinylUpholstery = param('vinylUpholstery', '#3d83a6', { label: 'Vinyl upholstery' });
const rubber = param('rubber', '#30363a', { label: 'Rubber tires and casters' });
const medicalPolymer = param('medicalPolymer', '#367e8c', { label: 'Molded armrest polymer' });
presets({
  clinic: { anodizedAluminum: '#c2cbcd', vinylUpholstery: '#3189b5', rubber: '#414c4f', medicalPolymer: '#2d9893' },
  emergency: { anodizedAluminum: '#bcb7b0', vinylUpholstery: '#ebe5dc', rubber: '#4e4946', medicalPolymer: '#c9413b' },
});
const p = assembly('wheelchair');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('seat', b(0, 0, 430, 360, 380, 36).color(vinylUpholstery).scale(overallScale));
p.part('backrest', b(0, 162, 655, 360, 36, 430).color(vinylUpholstery).scale(overallScale));
for (const side of [-1, 1]) {
  p.part('arm-' + side, b(0, side * 205, 550, 360, 34, 26).color(medicalPolymer).scale(overallScale));
  p.part('arm-support-' + side, b(0, side * 195, 498, 18, 40, 104).color(medicalPolymer).scale(overallScale));
  p.part('rear-wheel-' + side, c(0, 0, 0, 22, 125, 12).rotate([0, 1, 0], 90).translate(-11, side * 236, 125).color(rubber).scale(overallScale));
  p.part('rear-support-' + side, b(0, side * 205, 280, 20, 22, 300).color(anodizedAluminum).scale(overallScale));
  p.part('front-caster-' + side, c(125, side * 174, 0, 22, 18, 10).color(rubber).scale(overallScale));
  p.part('foot-hanger-' + side, b(182, side * 125, 260, 16, 16, 360).color(anodizedAluminum).scale(overallScale));
  p.part('footplate-' + side, b(182, side * 125, 90, 130, 100, 14).color(anodizedAluminum).scale(overallScale));
}
p.part('cross-frame', b(0, 0, 280, 20, 410, 20).color(anodizedAluminum).scale(overallScale));

return p.model();
