// SPDX-License-Identifier: CC0-1.0
// Postage meter workstation: Postage meter, small scale platform and mailpiece catch tray arranged on a service stand. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postage-meter-workstation",
  license: 'CC0-1.0',
  title: "Postage meter workstation",
  description: "Postage meter, small scale platform and mailpiece catch tray arranged on a service stand. Scale, painted steel, moulded polymer, structural steel, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#617780', { label: 'Painted steel' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#68777a', polymer: '#6c7c7c', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6' },
  highVisibility: { paintedSteel: '#e36d32', polymer: '#e0b245', structuralSteel: '#454f54', stainlessSteel: '#d9e0de' },
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

const p = assembly("postage-meter-workstation");
p.part("cabinet", b(0,0,0,620,420,760).color(polymer));
p.part("countertop", b(0,0,760,700,500,55).color(paintedSteel));
p.part("meter-base", b(-90,20,815,280,260,200).color(structuralSteel));
p.part("meter-head", b(-90,20,1015,260,220,180).color(stainlessSteel));
p.part("display", b(-90,-112,1050,145,18,78).color(paintedSteel));
p.part("scale-platform", b(220,70,820,190,180,55).color(paintedSteel));
p.part("catch-tray", b(80,-210,820,410,120,35).color(polymer));
p.part("paper-roll", rollerX(-280,100,815,95,95,80).color(paintedSteel));
p.part("lower-door", b(0,-214,250,430,18,360).color(paintedSteel));

return p.model();
