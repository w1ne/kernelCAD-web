// SPDX-License-Identifier: CC0-1.0
// Mailbag closing machine: Industrial bag-closing head mounted above a work surface with a sack guide and foot control. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mailbag-closing-machine",
  license: 'CC0-1.0',
  title: "Mailbag closing machine",
  description: "Industrial bag-closing head mounted above a work surface with a sack guide and foot control. Scale, painted steel, structural steel, stainless steel, woven fabric, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#657a7c', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const fabric = param('fabric', '#476b7d', { label: 'Woven fabric' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6', fabric: '#6c6b60' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de', fabric: '#d66a35' },
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

const p = assembly("mailbag-closing-machine");
p.part("tabletop", b(0,0,760,880,560,55).color(paintedSteel));
p.part("leg-left", b(-350,-190,0,55,55,760).color(structuralSteel));
p.part("leg-right", b(350,-190,0,55,55,760).color(structuralSteel));
p.part("rear-leg-left", b(-350,190,0,55,55,760).color(structuralSteel));
p.part("rear-leg-right", b(350,190,0,55,55,760).color(structuralSteel));
p.part("machine-head", b(-110,0,815,260,220,250).color(stainlessSteel));
p.part("thread-post", b(-250,110,815,38,38,440).color(structuralSteel));
p.part("thread-guide", b(-250,110,1255,180,38,35).color(stainlessSteel));
p.part("bag-guide", b(190,0,815,240,280,100).color(fabric));
p.part("foot-pedal", b(220,-220,0,170,130,55).color(structuralSteel));
p.part("crossbar", b(0,190,210,760,55,45).color(structuralSteel));

return p.model();
