// SPDX-License-Identifier: CC0-1.0
// Parcel tray transfer cart: Low transfer cart with wide deck, raised stops, four wheel blocks and a push bar. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "parcel-tray-transfer-cart",
  license: 'CC0-1.0',
  title: "Parcel tray transfer cart",
  description: "Low transfer cart with wide deck, raised stops, four wheel blocks and a push bar. Scale, structural steel, rubber, safety amber, moulded polymer, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#607982', { label: 'Structural steel' });
const rubber = param('rubber', '#30373b', { label: 'Rubber' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
presets({
  weathered: { structuralSteel: '#67675f', rubber: '#3d3d39', safetyAmber: '#bb8c34', polymer: '#6c7c7c' },
  highVisibility: { structuralSteel: '#454f54', rubber: '#252b2e', safetyAmber: '#ffd12f', polymer: '#e0b245' },
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
const wheelY=(x:number,y:number,z:number,w:number,d:number,h:number)=>{const radius=Math.min(w,h)*0.48;return loftCylinder(d,radius,10).rotateX(90).translate(x,y+d/2,z+radius).scale(scale);};

const p = assembly("parcel-tray-transfer-cart");
p.part("deck", b(0,0,220,880,650,70).color(structuralSteel));
p.part("front-stop", b(0,-300,290,820,45,115).color(safetyAmber));
p.part("back-stop", b(0,300,290,820,45,115).color(safetyAmber));
p.part("wheel-left-front", wheelY(-340,-245,0,120,95,220).color(rubber));
p.part("wheel-right-front", wheelY(340,-245,0,120,95,220).color(rubber));
p.part("wheel-left-back", wheelY(-340,245,0,120,95,220).color(rubber));
p.part("wheel-right-back", wheelY(340,245,0,120,95,220).color(rubber));
p.part("handle-left", b(-390,245,290,55,55,750).color(structuralSteel));
p.part("handle-right", b(390,245,290,55,55,750).color(structuralSteel));
p.part("handle", b(0,245,1040,800,55,55).color(structuralSteel));
p.part("tray-rack", b(0,0,330,740,500,45).color(polymer));

return p.model();
