// SPDX-License-Identifier: CC0-1.0
// Parcel overflow container: Deep overflow tub with a reinforcing rim, drain-like feet and two lift handles. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "parcel-overflow-container",
  license: 'CC0-1.0',
  title: "Parcel overflow container",
  description: "Deep overflow tub with a reinforcing rim, drain-like feet and two lift handles. Scale, moulded polymer, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#5f7880', { label: 'Moulded polymer' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { polymer: '#6c7c7c', structuralSteel: '#67675f' },
  highVisibility: { polymer: '#e0b245', structuralSteel: '#454f54' },
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

const p = assembly("parcel-overflow-container");
p.part("tub-base", b(0,0,0,780,600,90).color(polymer));
p.part("front-wall", b(0,-265,90,780,70,520).color(polymer));
p.part("back-wall", b(0,265,90,780,70,520).color(polymer));
p.part("left-wall", b(-355,0,90,70,460,520).color(polymer));
p.part("right-wall", b(355,0,90,70,460,520).color(polymer));
p.part("rim-front", b(0,-270,610,820,80,55).color(polymer));
p.part("rim-back", b(0,270,610,820,80,55).color(polymer));
p.part("rim-left", b(-365,0,610,80,540,55).color(polymer));
p.part("rim-right", b(365,0,610,80,540,55).color(polymer));
p.part("handle-left", b(-425,0,340,65,160,90).color(polymer));
p.part("handle-right", b(425,0,340,65,160,90).color(polymer));
p.part("foot-left", b(-240,0,0,110,120,55).color(structuralSteel));
p.part("foot-right", b(240,0,0,110,120,55).color(structuralSteel));

return p.model();
