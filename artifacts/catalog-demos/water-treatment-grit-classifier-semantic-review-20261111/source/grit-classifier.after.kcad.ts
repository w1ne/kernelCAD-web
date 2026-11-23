// SPDX-License-Identifier: CC0-1.0
// Grit classifier unit: Open decanting trough with an inclined helical grit-extraction screw, feed hopper, discharge chute and a driven upper end. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "grit-classifier",
  license: 'CC0-1.0',
  title: "Grit classifier unit",
  description: "Illustrative compact grit classifier with an open settling trough, an inclined exposed extraction screw, a feed hopper and a high-end discharge chute. Parameters: overall scale and coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets. Not vendor-dimensioned process equipment.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("grit-classifier");
// An open decanting trough leaves the screw and settling zone visible.
p.part("trough-floor",b(0,0,100,850,330,40).color(coatedSteel));
p.part("trough-wall-left",b(0,-155,140,850,20,230).color(coatedSteel));
p.part("trough-wall-right",b(0,155,140,850,20,230).color(coatedSteel));
p.part("trough-inlet-wall",b(-415,0,140,20,310,230).color(coatedSteel));
p.part("feed-hopper",b(-265,0,370,340,360,300).color(coatedSteel));

// The screw lifts settled grit out of the trough to the raised outlet. The
// broad thin sweep is the flight; it is separate from the stainless shaft so
// the two material zones remain visible in the catalog render.
const screwAngle = 50;
const screwStart: [number, number, number] = [-90, 0, 215];
const screwLength = 480;
const screwShaft = cylinder(screwLength, 14, 12)
  .rotateY(screwAngle)
  .translate(...screwStart)
  .scale(scale);
const screwFlight = path()
  .moveTo(-48, -6)
  .lineTo(48, -6)
  .lineTo(48, 6)
  .lineTo(-48, 6)
  .close()
  .sweep(helix({ radius: 62, pitch: 92, turns: 5, pointsPerTurn: 12 }), {
    spine: 'helix',
    section: 'transverse',
  })
  .rotateY(screwAngle)
  .translate(...screwStart)
  .scale(scale);
p.part("classifier-screw-shaft",screwShaft.color(stainlessSteel));
p.part("classifier-screw-flight",screwFlight.color(stainlessSteel));

// The outlet receives the raised end of the screw. The motor is coaxial with
// the shaft, as on compact screw classifiers.
p.part("discharge-chute",box(150,190,90,true).rotateY(-30).translate(390,0,450).scale(scale).color(stainlessSteel));
p.part("drive",cylinder(100,42,12).rotateY(screwAngle).translate(278,0,507).scale(scale).color(coatedSteel));
for (const x of [-330,330]) {
  for (const y of [-105,105]) {
    p.part(`support-leg-${x}-${y}`,b(x,y,0,55,55,140).color(structuralSteel));
  }
}

return p.model();
