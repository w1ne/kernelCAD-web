// SPDX-License-Identifier: CC0-1.0
// Carrier route sequence rack: Wall-mounted route rack with repeated sequence slots, label strips and a lower shelf. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "carrier-route-sequence-rack",
  license: 'CC0-1.0',
  title: "Carrier route sequence rack",
  description: "Wall-mounted route rack with repeated sequence slots, label strips and a lower shelf. Scale, painted steel, label paper, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#697a79', { label: 'Painted steel' });
const paper = param('paper', '#eee5ca', { label: 'Label paper' });
presets({
  weathered: { paintedSteel: '#68777a', paper: '#c2b99f' },
  highVisibility: { paintedSteel: '#e36d32', paper: '#fff1b7' },
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

const p = assembly("carrier-route-sequence-rack");
p.part("backboard", b(0,0,0,1000,70,1570).color(paintedSteel));
p.part("top-cap", b(0,0,1570,1080,100,65).color(paintedSteel));
p.part("left-side", b(-490,0,0,55,100,1570).color(paintedSteel));
p.part("right-side", b(490,0,0,55,100,1570).color(paintedSteel));
p.part("shelf-a", b(0,-75,660,930,250,45).color(paintedSteel));
p.part("shelf-b", b(0,-75,880,930,250,45).color(paintedSteel));
p.part("divider-a", b(-300,-75,685,28,240,190).color(paintedSteel));
p.part("divider-b", b(-100,-75,685,28,240,190).color(paintedSteel));
p.part("divider-c", b(100,-75,685,28,240,190).color(paintedSteel));
p.part("divider-d", b(300,-75,685,28,240,190).color(paintedSteel));
p.part("label-rail-a", b(0,-215,715,930,22,38).color(paper));
p.part("label-rail-b", b(0,-215,935,930,22,38).color(paper));

return p.model();
