// SPDX-License-Identifier: CC0-1.0
// Sliding shoe sorter section: Parcel sorter deck with diverter shoes, guide rails and a compact discharge lane. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sliding-shoe-sorter-section",
  license: 'CC0-1.0',
  title: "Sliding shoe sorter section",
  description: "Parcel sorter deck with diverter shoes, guide rails and a compact discharge lane. Scale, painted steel, safety amber, structural steel, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5a737b', { label: 'Painted steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#68777a', safetyAmber: '#bb8c34', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6' },
  highVisibility: { paintedSteel: '#e36d32', safetyAmber: '#ffd12f', structuralSteel: '#454f54', stainlessSteel: '#d9e0de' },
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

const p = assembly("sliding-shoe-sorter-section");
p.part("sorter-bed", b(0,0,700,680,1200,70).color(paintedSteel));
p.part("left-guide", b(-330,0,745,28,1200,80).color(stainlessSteel));
p.part("right-guide", b(330,0,745,28,1200,80).color(stainlessSteel));
p.part("shoe-rail", b(0,0,790,55,1140,35).color(safetyAmber));
p.part("shoe-a", b(-130,-260,820,70,95,42).color(safetyAmber));
p.part("shoe-b", b(-60,-60,820,70,95,42).color(safetyAmber));
p.part("shoe-c", b(20,150,820,70,95,42).color(safetyAmber));
p.part("shoe-d", b(100,360,820,70,95,42).color(safetyAmber));
p.part("discharge-lane", b(470,260,690,280,650,65).color(paintedSteel));
p.part("support-left-a", b(-270,-420,0,55,55,700).color(structuralSteel));
p.part("support-right-a", b(270,-420,0,55,55,700).color(structuralSteel));
p.part("support-left-b", b(-270,420,0,55,55,700).color(structuralSteel));
p.part("support-right-b", b(270,420,0,55,55,700).color(structuralSteel));

return p.model();
