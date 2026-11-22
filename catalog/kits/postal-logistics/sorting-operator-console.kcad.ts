// SPDX-License-Identifier: CC0-1.0
// Sorting operator console: Operator station with angled control desk, twin display blocks, key shelf and status stack. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sorting-operator-console",
  license: 'CC0-1.0',
  title: "Sorting operator console",
  description: "Operator station with angled control desk, twin display blocks, key shelf and status stack. Scale, painted steel, instrument glass, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5b7182', { label: 'Painted steel' });
const instrumentGlass = param('instrumentGlass', '#57b4c3', { label: 'Instrument glass' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', instrumentGlass: '#548a91', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', instrumentGlass: '#6bd0dc', structuralSteel: '#454f54' },
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


const p = assembly("sorting-operator-console");
p.part("pedestal", b(0,70,0,640,360,780).color(paintedSteel));
p.part("desk", b(0,-40,780,900,560,75).color(paintedSteel));
p.part("screen-left", b(-220,80,855,320,60,260).color(instrumentGlass));
p.part("screen-right", b(190,80,855,320,60,260).color(instrumentGlass));
p.part("screen-base-left", b(-220,90,830,90,90,45).color(structuralSteel));
p.part("screen-base-right", b(190,90,830,90,90,45).color(structuralSteel));
p.part("keyboard-shelf", b(0,-270,690,620,170,40).color(paintedSteel));
p.part("keypad", b(0,-250,735,300,110,35).color(paintedSteel));
p.part("status-post", b(470,160,0,70,70,1080).color(structuralSteel));
p.part("status-light-a", c(470,160,1080,70,42,8).color(instrumentGlass));
p.part("status-light-b", c(470,160,1150,70,42,8).color(instrumentGlass));
p.part("status-light-c", c(470,160,1220,70,42,8).color(instrumentGlass));

return p.model();
