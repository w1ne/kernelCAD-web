// SPDX-License-Identifier: CC0-1.0
// Sorter emergency-stop pedestal: Standalone emergency-stop post with a weighted base, button head and low protective collar. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sorter-emergency-stop-pedestal",
  license: 'CC0-1.0',
  title: "Sorter emergency-stop pedestal",
  description: "Standalone emergency-stop post with a weighted base, button head and low protective collar. Scale, painted steel, structural steel, stainless steel, safety amber, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6d7372', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6', safetyAmber: '#bb8c34' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de', safetyAmber: '#ffd12f' },
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
const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);


const p = assembly("sorter-emergency-stop-pedestal");
p.part("base", b(0,0,0,300,300,70).color(structuralSteel));
p.part("post", b(0,0,70,95,95,770).color(structuralSteel));
p.part("head", b(0,0,840,210,190,130).color(stainlessSteel));
p.part("button", c(0,-100,870,75,55,8).color(safetyAmber));
p.part("guard-left", b(-115,-100,870,30,150,120).color(structuralSteel));
p.part("guard-right", b(115,-100,870,30,150,120).color(structuralSteel));
p.part("cable-outlet", b(0,45,200,135,60,90).color(paintedSteel));
p.part("mounting-foot-left", b(-95,0,0,50,230,45).color(structuralSteel));
p.part("mounting-foot-right", b(95,0,0,50,230,45).color(structuralSteel));

return p.model();
