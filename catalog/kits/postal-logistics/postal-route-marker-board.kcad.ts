// SPDX-License-Identifier: CC0-1.0
// Postal route marker board: Freestanding route board with a broad display panel, label ledge and two weighted feet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-route-marker-board",
  license: 'CC0-1.0',
  title: "Postal route marker board",
  description: "Freestanding route board with a broad display panel, label ledge and two weighted feet. Scale, moulded polymer, structural steel, label paper, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#677b79', { label: 'Moulded polymer' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const paper = param('paper', '#eee5ca', { label: 'Label paper' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { polymer: '#6c7c7c', structuralSteel: '#67675f', paper: '#c2b99f', stainlessSteel: '#9ea7a6' },
  highVisibility: { polymer: '#e0b245', structuralSteel: '#454f54', paper: '#fff1b7', stainlessSteel: '#d9e0de' },
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

const p = assembly("postal-route-marker-board");
p.part("panel", b(0,0,880,900,70,620).color(polymer));
p.part("header", b(0,0,1510,980,90,100).color(stainlessSteel));
p.part("post-left", b(-350,0,100,60,60,780).color(structuralSteel));
p.part("post-right", b(350,0,100,60,60,780).color(structuralSteel));
p.part("foot-left", b(-350,0,0,230,220,100).color(structuralSteel));
p.part("foot-right", b(350,0,0,230,220,100).color(structuralSteel));
p.part("label-ledge", b(0,-65,810,940,160,45).color(paper));
p.part("route-row-a", b(0,-42,1260,780,28,28).color(paper));
p.part("route-row-b", b(0,-42,1150,780,28,28).color(paper));
p.part("route-row-c", b(0,-42,1040,780,28,28).color(paper));

return p.model();
