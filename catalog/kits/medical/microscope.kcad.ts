meta({
  "name": "microscope",
  "license": "CC0-1.0",
  "title": "Microscope",
  "description": "Compound microscope with base, upright arm, stage, objective cluster and angled eyepiece for a low-poly lab scene. Material controls: Painted metal, Anodized stage hardware, Optical glass, Rubber eyecup.",
  "tags": [
    "microscope",
    "laboratory equipment",
    "science",
    "diagnostics",
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
  "triangleBudget": 500
});

// A compound microscope is defined by its angled optical tube, revolving objectives and clipped stage.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedMetal = param('paintedMetal', '#56636a', { label: 'Painted metal' });
const anodizedAluminum = param('anodizedAluminum', '#8bb5b4', { label: 'Anodized stage hardware' });
const opticalGlass = param('opticalGlass', '#253f48', { label: 'Optical glass' });
const rubber = param('rubber', '#303b40', { label: 'Rubber eyecup' });
presets({
  clinic: { paintedMetal: '#68777d', anodizedAluminum: '#93c2be', opticalGlass: '#326c70', rubber: '#536669' },
  emergency: { paintedMetal: '#736e68', anodizedAluminum: '#aeb7b5', opticalGlass: '#54585a', rubber: '#4f4b48' },
});
const p = assembly('microscope');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', b(0, 0, 12, 150, 110, 24).color(paintedMetal).scale(overallScale));
p.part('foot', b(0, 24, 90, 72, 76, 150).color(paintedMetal).scale(overallScale));
p.part('arm', box(70, 28, 190, true).rotate([0, 1, 0], -12).translate(0, 48, 180).color(paintedMetal).scale(overallScale));
p.part('stage', b(0, -4, 190, 140, 100, 18).color(anodizedAluminum).scale(overallScale));
p.part('stage-clip-left', b(-48, -8, 202, 26, 18, 10).color(anodizedAluminum).scale(overallScale));
p.part('stage-clip-right', b(48, -8, 202, 26, 18, 10).color(anodizedAluminum).scale(overallScale));
p.part('tube', c(0, 0, 0, 105, 18, 10).rotate([0, 1, 0], -12).translate(0, 0, 270).color(paintedMetal).scale(overallScale));
p.part('eyepiece', c(0, 0, 365, 40, 22, 10).color(rubber).scale(overallScale));
for (const x of [-24, 0, 24]) p.part('objective-' + x, c(x, -18, 230, 52, 8, 8).color(opticalGlass).scale(overallScale));

return p.model();
