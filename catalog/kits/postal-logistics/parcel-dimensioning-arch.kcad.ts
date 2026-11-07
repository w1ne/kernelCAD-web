// SPDX-License-Identifier: CC0-1.0
// Parcel dimensioning arch: Conveyor portal with overhead and side sensor blocks for parcel size measurement. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "parcel-dimensioning-arch",
  license: 'CC0-1.0',
  title: "Parcel dimensioning arch",
  description: "Conveyor portal with overhead and side sensor blocks for parcel size measurement. Scale, painted steel, structural steel, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#536f86', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de' },
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

const p = assembly("parcel-dimensioning-arch");
p.part("conveyor", b(0,0,600,720,1050,70).color(paintedSteel));
p.part("left-foot", b(-350,-300,0,60,60,600).color(structuralSteel));
p.part("right-foot", b(350,-300,0,60,60,600).color(structuralSteel));
p.part("left-post", b(-350,0,600,60,60,1320).color(structuralSteel));
p.part("right-post", b(350,0,600,60,60,1320).color(structuralSteel));
p.part("crossbar", b(0,0,1260,760,70,75).color(structuralSteel));
p.part("top-sensor", b(0,0,1170,180,150,110).color(paintedSteel));
p.part("side-sensor-left", b(-295,-40,870,65,160,180).color(paintedSteel));
p.part("side-sensor-right", b(295,-40,870,65,160,180).color(paintedSteel));
p.part("roller-a", rollerX(0,-300,650,650,32,26).color(stainlessSteel));
p.part("roller-b", rollerX(0,0,650,650,32,26).color(stainlessSteel));
p.part("roller-c", rollerX(0,300,650,650,32,26).color(stainlessSteel));

return p.model();
