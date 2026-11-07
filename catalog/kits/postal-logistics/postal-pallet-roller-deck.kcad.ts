// SPDX-License-Identifier: CC0-1.0
// Postal pallet roller deck: Heavy parcel transfer deck with continuous rollers, raised end stops and forklift-clear base. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-pallet-roller-deck",
  license: 'CC0-1.0',
  title: "Postal pallet roller deck",
  description: "Heavy parcel transfer deck with continuous rollers, raised end stops and forklift-clear base. Scale, painted steel, stainless steel, safety amber, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6a7876', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', stainlessSteel: '#9ea7a6', safetyAmber: '#bb8c34', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', stainlessSteel: '#d9e0de', safetyAmber: '#ffd12f', structuralSteel: '#454f54' },
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

const p = assembly("postal-pallet-roller-deck");
p.part("deck-frame", b(0,0,360,1180,1000,110).color(structuralSteel));
p.part("left-side", b(-560,0,415,48,1000,65).color(paintedSteel));
p.part("right-side", b(560,0,415,48,1000,65).color(paintedSteel));
p.part("roller-a", rollerX(0,-420,415,1080,40,32).color(stainlessSteel));
p.part("roller-b", rollerX(0,-210,415,1080,40,32).color(stainlessSteel));
p.part("roller-c", rollerX(0,0,415,1080,40,32).color(stainlessSteel));
p.part("roller-d", rollerX(0,210,415,1080,40,32).color(stainlessSteel));
p.part("roller-e", rollerX(0,420,415,1080,40,32).color(stainlessSteel));
p.part("fork-channel-left", b(-300,0,0,150,960,190).color(paintedSteel));
p.part("fork-channel-right", b(300,0,0,150,960,190).color(paintedSteel));
p.part("end-stop-front", b(0,-495,470,1080,45,110).color(safetyAmber));
p.part("end-stop-back", b(0,495,470,1080,45,110).color(safetyAmber));

return p.model();
