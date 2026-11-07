// SPDX-License-Identifier: CC0-1.0
// Parcel staging rack: Three-level parcel rack with reinforced uprights, shelf beams and a top clearance frame. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "parcel-staging-rack",
  license: 'CC0-1.0',
  title: "Parcel staging rack",
  description: "Three-level parcel rack with reinforced uprights, shelf beams and a top clearance frame. Scale, painted steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#687b79', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54' },
});
const octRect = (w:number,d:number,cut:number) => path()
  .moveTo(-w/2+cut,-d/2).lineTo(w/2-cut,-d/2).lineTo(w/2,-d/2+cut)
  .lineTo(w/2,d/2-cut).lineTo(w/2-cut,d/2).lineTo(-w/2+cut,d/2)
  .lineTo(-w/2,d/2-cut).lineTo(-w/2,-d/2+cut).close();
const bevelled = (w:number,d:number,h:number) => {
  const edge = Math.min(w,d,h) * 0.08;
  const profiles = [
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
  ];
  const levels = [0,edge,h-edge,h];
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })),
    ruled: true,
  });
};
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => bevelled(w,d,h).translate(x,y,z).scale(scale);

const p = assembly("parcel-staging-rack");
p.part("upright-left", b(-500,0,0,55,70,1700).color(structuralSteel));
p.part("upright-right", b(500,0,0,55,70,1700).color(structuralSteel));
p.part("front-post-left", b(-500,-280,0,55,55,1700).color(structuralSteel));
p.part("front-post-right", b(500,-280,0,55,55,1700).color(structuralSteel));
p.part("rear-post-left", b(-500,280,0,55,55,1700).color(structuralSteel));
p.part("rear-post-right", b(500,280,0,55,55,1700).color(structuralSteel));
p.part("shelf-bottom", b(0,0,120,1060,650,55).color(paintedSteel));
p.part("shelf-middle", b(0,0,680,1060,650,55).color(paintedSteel));
p.part("shelf-top", b(0,0,1240,1060,650,55).color(paintedSteel));
p.part("beam-front-a", b(0,-280,600,1000,55,65).color(structuralSteel));
p.part("beam-back-a", b(0,280,600,1000,55,65).color(structuralSteel));
p.part("beam-front-b", b(0,-280,1160,1000,55,65).color(structuralSteel));
p.part("beam-back-b", b(0,280,1160,1000,55,65).color(structuralSteel));

return p.model();
