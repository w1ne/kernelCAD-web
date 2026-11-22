// SPDX-License-Identifier: CC0-1.0
// Postal sack rack: Freestanding rack with hanging sack bays, crossbars and a weighted floor frame. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-sack-rack",
  license: 'CC0-1.0',
  title: "Postal sack rack",
  description: "Freestanding rack with hanging sack bays, crossbars and a weighted floor frame. Scale, painted steel, woven fabric, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6e7a78', { label: 'Painted steel' });
const fabric = param('fabric', '#476b7d', { label: 'Woven fabric' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', fabric: '#6c6b60', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', fabric: '#d66a35', structuralSteel: '#454f54' },
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

const p = assembly("postal-sack-rack");
p.part("base-left", b(-430,0,0,70,700,80).color(structuralSteel));
p.part("base-right", b(430,0,0,70,700,80).color(structuralSteel));
p.part("post-left", b(-430,0,80,60,60,1420).color(structuralSteel));
p.part("post-right", b(430,0,80,60,60,1420).color(structuralSteel));
p.part("top-bar", b(0,0,1430,920,65,65).color(paintedSteel));
p.part("middle-bar", b(0,0,790,870,45,45).color(paintedSteel));
p.part("bay-divider-left", b(-145,0,120,32,650,1260).color(paintedSteel));
p.part("bay-divider-right", b(145,0,120,32,650,1260).color(paintedSteel));
p.part("sack-a", b(-275,0,160,250,390,610).color(fabric));
p.part("sack-b", b(0,0,160,250,390,610).color(fabric));
p.part("sack-c", b(275,0,160,250,390,610).color(fabric));
p.part("sack-collar-a", b(-275,0,770,260,390,55).color(fabric));
p.part("sack-collar-b", b(0,0,770,260,390,55).color(fabric));
p.part("sack-collar-c", b(275,0,770,260,390,55).color(fabric));

return p.model();
