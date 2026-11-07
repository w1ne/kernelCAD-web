// SPDX-License-Identifier: CC0-1.0
// Sorter chute bank: Multi-lane parcel discharge bank with numbered-looking bays and a high support frame. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sorter-chute-bank",
  license: 'CC0-1.0',
  title: "Sorter chute bank",
  description: "Multi-lane parcel discharge bank with numbered-looking bays and a high support frame. Scale, painted steel, structural steel, label paper, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6d7775', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const paper = param('paper', '#eee5ca', { label: 'Label paper' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', paper: '#c2b99f' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', paper: '#fff1b7' },
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

const p = assembly("sorter-chute-bank");
p.part("base", b(0,0,0,1380,800,80).color(structuralSteel));
p.part("upright-left", b(-620,0,80,55,760,1280).color(structuralSteel));
p.part("upright-right", b(620,0,80,55,760,1280).color(structuralSteel));
p.part("top-beam", b(0,0,1280,1300,75,65).color(structuralSteel));
p.part("bay-divider-a", b(-400,0,360,32,700,880).color(paintedSteel));
p.part("bay-divider-b", b(-130,0,360,32,700,880).color(paintedSteel));
p.part("bay-divider-c", b(140,0,360,32,700,880).color(paintedSteel));
p.part("bay-divider-d", b(410,0,360,32,700,880).color(paintedSteel));
p.part("chute-shelf-a", b(-400,80,180,220,800,45).color(paintedSteel));
p.part("chute-shelf-b", b(-130,80,180,220,800,45).color(paintedSteel));
p.part("chute-shelf-c", b(140,80,180,220,800,45).color(paintedSteel));
p.part("chute-shelf-d", b(410,80,180,220,800,45).color(paintedSteel));
p.part("front-label-rail", b(0,-390,310,1200,30,45).color(paper));

return p.model();
