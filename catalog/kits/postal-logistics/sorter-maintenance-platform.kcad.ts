// SPDX-License-Identifier: CC0-1.0
// Sorter maintenance platform: Raised access deck with guardrails, four support legs and a short three-step approach. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sorter-maintenance-platform",
  license: 'CC0-1.0',
  title: "Sorter maintenance platform",
  description: "Raised access deck with guardrails, four support legs and a short three-step approach. Scale, painted steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#687b7b', { label: 'Painted steel' });
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

const p = assembly("sorter-maintenance-platform");
p.part("deck", b(0,0,760,950,600,75).color(paintedSteel));
p.part("post-left-front", b(-440,-270,835,45,45,470).color(structuralSteel));
p.part("post-right-front", b(440,-270,835,45,45,470).color(structuralSteel));
p.part("post-left-back", b(-440,270,835,45,45,470).color(structuralSteel));
p.part("post-right-back", b(440,270,835,45,45,470).color(structuralSteel));
p.part("rail-front", b(0,-270,1275,900,45,45).color(structuralSteel));
p.part("rail-back", b(0,270,1275,900,45,45).color(structuralSteel));
p.part("rail-left", b(-440,0,1275,45,500,45).color(structuralSteel));
p.part("rail-right", b(440,0,1275,45,500,45).color(structuralSteel));
p.part("leg-left", b(-380,180,0,55,55,760).color(structuralSteel));
p.part("leg-right", b(380,180,0,55,55,760).color(structuralSteel));
p.part("step-a", b(0,-450,220,390,130,60).color(paintedSteel));
p.part("step-b", b(0,-450,400,390,130,60).color(paintedSteel));
p.part("step-c", b(0,-450,580,390,130,60).color(paintedSteel));

return p.model();
