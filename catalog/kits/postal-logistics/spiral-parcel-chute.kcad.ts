// SPDX-License-Identifier: CC0-1.0
// Spiral parcel chute: Compact gravity chute assembled from four turning shelf sections around a central mast. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "spiral-parcel-chute",
  license: 'CC0-1.0',
  title: "Spiral parcel chute",
  description: "Compact gravity chute assembled from four turning shelf sections around a central mast. Scale, painted steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#747d79', { label: 'Painted steel' });
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

const p = assembly("spiral-parcel-chute");
p.part("foot", b(0,0,0,800,800,70).color(structuralSteel));
p.part("mast", b(0,0,60,80,80,1500).color(paintedSteel));
p.part("level-1", b(280,0,310,640,270,60).color(paintedSteel));
p.part("level-2", b(0,280,630,270,640,60).color(paintedSteel));
p.part("level-3", b(-280,0,950,640,270,60).color(paintedSteel));
p.part("level-4", b(0,-280,1270,270,640,60).color(paintedSteel));
p.part("guard-a", b(580,0,370,25,270,120).color(structuralSteel));
p.part("guard-b", b(0,580,690,270,25,120).color(structuralSteel));
p.part("guard-c", b(-580,0,1010,25,270,120).color(structuralSteel));
p.part("guard-d", b(0,-580,1330,270,25,120).color(structuralSteel));
p.part("landing-pad", b(0,0,1450,470,470,65).color(paintedSteel));

return p.model();
