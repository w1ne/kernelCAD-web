// SPDX-License-Identifier: CC0-1.0
// Postal dispatch seal station: Dispatch table with a powered sealing head, mail sack guide and completed-bag shelf. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-dispatch-seal-station",
  license: 'CC0-1.0',
  title: "Postal dispatch seal station",
  description: "Dispatch table with a powered sealing head, mail sack guide and completed-bag shelf. Scale, painted steel, structural steel, stainless steel, woven fabric, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#667778', { label: 'Painted steel' });
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

const p = assembly("postal-dispatch-seal-station");
p.part("table", b(0,0,760,960,600,65).color(paintedSteel));
p.part("leg-left", b(-380,-210,0,55,55,760).color(structuralSteel));
p.part("leg-right", b(380,-210,0,55,55,760).color(structuralSteel));
p.part("leg-back-left", b(-380,210,0,55,55,760).color(structuralSteel));
p.part("leg-back-right", b(380,210,0,55,55,760).color(structuralSteel));
p.part("sealer-post", b(-160,70,825,65,65,400).color(structuralSteel));
p.part("sealer-head", b(-160,70,1225,280,200,100).color(stainlessSteel));
p.part("press-foot", b(-160,70,785,240,160,45).color(structuralSteel));
p.part("bag-guide", b(250,80,820,260,280,90).color(fabric));
p.part("lower-shelf", b(0,170,300,800,80,45).color(paintedSteel));
p.part("control-box", b(400,-100,660,100,150,180).color(paintedSteel));

return p.model();
