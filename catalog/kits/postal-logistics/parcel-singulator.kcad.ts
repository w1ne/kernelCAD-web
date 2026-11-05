// SPDX-License-Identifier: CC0-1.0
// Parcel singulator: Induction belt with adjustable side guides, separator bars and a raised feed throat. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "parcel-singulator",
  license: 'CC0-1.0',
  title: "Parcel singulator",
  description: "Induction belt with adjustable side guides, separator bars and a raised feed throat. Scale, painted steel, stainless steel, structural steel, safety amber, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#536e7b', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
presets({
  weathered: { paintedSteel: '#68777a', stainlessSteel: '#9ea7a6', structuralSteel: '#67675f', safetyAmber: '#bb8c34' },
  highVisibility: { paintedSteel: '#e36d32', stainlessSteel: '#d9e0de', structuralSteel: '#454f54', safetyAmber: '#ffd12f' },
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

const p = assembly("parcel-singulator");
p.part("feed-deck", b(0,0,610,720,1100,65).color(paintedSteel));
p.part("guide-left", b(-320,0,675,34,1100,105).color(stainlessSteel));
p.part("guide-right", b(320,0,675,34,1100,105).color(stainlessSteel));
p.part("throat-left", b(-240,-460,700,120,160,95).color(paintedSteel));
p.part("throat-right", b(240,-460,700,120,160,95).color(paintedSteel));
p.part("separator-a", b(0,-260,705,650,30,28).color(paintedSteel));
p.part("separator-b", b(0,-40,705,650,30,28).color(paintedSteel));
p.part("separator-c", b(0,180,705,650,30,28).color(paintedSteel));
p.part("separator-d", b(0,400,705,650,30,28).color(paintedSteel));
p.part("stand-left", b(-280,0,0,60,60,610).color(structuralSteel));
p.part("stand-right", b(280,0,0,60,60,610).color(structuralSteel));
p.part("infeed-stop", b(0,-520,680,520,40,45).color(safetyAmber));

return p.model();
