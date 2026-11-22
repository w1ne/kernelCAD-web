// SPDX-License-Identifier: CC0-1.0
// Automated label applicator: Labeling head suspended above a narrow parcel conveyor with guarding and feed controls. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "automated-label-applicator",
  license: 'CC0-1.0',
  title: "Automated label applicator",
  description: "Labeling head suspended above a narrow parcel conveyor with guarding and feed controls. Scale, painted steel, structural steel, stainless steel, label paper, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5a7287', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const paper = param('paper', '#eee5ca', { label: 'Label paper' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6', paper: '#c2b99f' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de', paper: '#fff1b7' },
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

const p = assembly("automated-label-applicator");
p.part("conveyor", b(0,0,620,720,1000,65).color(paintedSteel));
p.part("frame-left", b(-320,-120,0,55,55,620).color(structuralSteel));
p.part("frame-right", b(320,-120,0,55,55,620).color(structuralSteel));
p.part("upright-left", b(-320,-120,620,55,55,980).color(structuralSteel));
p.part("upright-right", b(320,-120,620,55,55,980).color(structuralSteel));
p.part("crossbeam", b(0,-120,1540,720,65,65).color(structuralSteel));
p.part("label-roll", rollerX(-150,-120,1220,170,160,180).color(paper));
p.part("applicator-head", b(80,-120,1120,200,170,190).color(stainlessSteel));
p.part("press-pad", b(80,-120,1030,140,120,45).color(stainlessSteel));
p.part("control-box", b(410,-60,440,110,190,210).color(paintedSteel));
p.part("roller-a", rollerX(0,-300,680,650,30,22).color(stainlessSteel));
p.part("roller-b", rollerX(0,0,680,650,30,22).color(stainlessSteel));
p.part("roller-c", rollerX(0,300,680,650,30,22).color(stainlessSteel));

return p.model();
