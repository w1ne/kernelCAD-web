// SPDX-License-Identifier: CC0-1.0
// Conveyor merge module: Two infeed belts meet at a compact parcel merge deck with a central guide and support frame. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "conveyor-merge-module",
  license: 'CC0-1.0',
  title: "Conveyor merge module",
  description: "Two infeed belts meet at a compact parcel merge deck with a central guide and support frame. Scale, painted steel, stainless steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#547c87', { label: 'Painted steel' });
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
const section = (radius:number,sides:number) => {
  let outline = path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for (let k=1;k<sides;k++) { const angle=Math.PI/2+(2*Math.PI*k)/sides; outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle)); }
  return outline.close();
};
const loftCylinder = (height:number,radius:number,sides:number) => {
  const levels=[0,height*0.07,height*0.93,height];
  const radii=[radius*0.88,radius,radius,radius*0.88];
  const profiles=levels.map((_,i)=>section(radii[i],sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};
const rollerX=(x:number,y:number,z:number,w:number,d:number,h:number)=>loftCylinder(w,Math.min(d,h)*0.48,10).rotateY(90).translate(x-w/2,y,z+h/2).scale(scale);

const p = assembly("conveyor-merge-module");
p.part("merge-deck", b(0,60,740,740,720,55).color(paintedSteel));
p.part("infeed-left", b(-380,-300,700,400,520,50).color(paintedSteel));
p.part("infeed-right", b(380,-300,700,400,520,50).color(paintedSteel));
p.part("left-guide", b(-340,-300,755,22,520,70).color(stainlessSteel));
p.part("right-guide", b(340,-300,755,22,520,70).color(stainlessSteel));
p.part("center-guide", b(0,80,795,45,480,95).color(stainlessSteel));
p.part("support-left", b(-290,70,0,55,55,710).color(structuralSteel));
p.part("support-right", b(290,70,0,55,55,710).color(structuralSteel));
p.part("cross-brace", b(0,70,260,620,65,55).color(structuralSteel));
p.part("roller-row-a", rollerX(0,-140,775,620,35,22).color(stainlessSteel));
p.part("roller-row-b", rollerX(0,10,775,620,35,22).color(stainlessSteel));
p.part("roller-row-c", rollerX(0,160,775,620,35,22).color(stainlessSteel));

return p.model();
