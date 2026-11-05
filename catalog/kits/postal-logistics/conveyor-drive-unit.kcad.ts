// SPDX-License-Identifier: CC0-1.0
// Conveyor drive unit: Compact conveyor motor and gearbox assembly on a mounting plate with raised vent banks. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "conveyor-drive-unit",
  license: 'CC0-1.0',
  title: "Conveyor drive unit",
  description: "Compact conveyor motor and gearbox assembly on a mounting plate with raised vent banks. Scale, painted steel, stainless steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#69777a', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', stainlessSteel: '#9ea7a6', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', stainlessSteel: '#d9e0de', structuralSteel: '#454f54' },
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

const p = assembly("conveyor-drive-unit");
p.part("mounting-plate", b(0,0,0,520,390,65).color(structuralSteel));
p.part("motor-body", b(-90,0,65,260,310,310).color(stainlessSteel));
p.part("motor-end", b(-90,0,375,280,330,42).color(stainlessSteel));
p.part("gearbox", b(180,0,100,250,300,260).color(stainlessSteel));
p.part("output-block", b(310,0,190,95,130,90).color(paintedSteel));
p.part("vent-a", b(-90,-165,150,210,30,35).color(stainlessSteel));
p.part("vent-b", b(-90,-165,210,210,30,35).color(stainlessSteel));
p.part("vent-c", b(-90,-165,270,210,30,35).color(stainlessSteel));
p.part("terminal-box", b(-70,0,375,120,120,90).color(paintedSteel));
p.part("foot-left", b(-200,0,0,75,390,60).color(structuralSteel));
p.part("foot-right", b(200,0,0,75,390,60).color(structuralSteel));

return p.model();
