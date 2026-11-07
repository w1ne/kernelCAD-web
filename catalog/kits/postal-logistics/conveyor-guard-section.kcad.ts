// SPDX-License-Identifier: CC0-1.0
// Conveyor guard section: Guarding panel around a conveyor bay with frame rails and closely spaced upright bars. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "conveyor-guard-section",
  license: 'CC0-1.0',
  title: "Conveyor guard section",
  description: "Guarding panel around a conveyor bay with frame rails and closely spaced upright bars. Scale, painted steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#758077', { label: 'Painted steel' });
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

const p = assembly("conveyor-guard-section");
p.part("foot-left", b(-500,0,0,90,250,80).color(structuralSteel));
p.part("foot-right", b(500,0,0,90,250,80).color(structuralSteel));
p.part("post-left", b(-500,0,80,55,55,1050).color(structuralSteel));
p.part("post-right", b(500,0,80,55,55,1050).color(structuralSteel));
p.part("top-rail", b(0,0,1090,1040,55,55).color(structuralSteel));
p.part("bottom-rail", b(0,0,140,1040,55,55).color(structuralSteel));
p.part("bar-a", b(-370,0,195,28,32,880).color(paintedSteel));
p.part("bar-b", b(-185,0,195,28,32,880).color(paintedSteel));
p.part("bar-c", b(0,0,195,28,32,880).color(paintedSteel));
p.part("bar-d", b(185,0,195,28,32,880).color(paintedSteel));
p.part("bar-e", b(370,0,195,28,32,880).color(paintedSteel));

return p.model();
