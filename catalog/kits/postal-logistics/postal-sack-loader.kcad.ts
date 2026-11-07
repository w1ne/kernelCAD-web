// SPDX-License-Identifier: CC0-1.0
// Postal sack loader: Mobile sack-loading stand with a low roller deck, upright handle and alignment stops. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-sack-loader",
  license: 'CC0-1.0',
  title: "Postal sack loader",
  description: "Mobile sack-loading stand with a low roller deck, upright handle and alignment stops. Scale, painted steel, stainless steel, safety amber, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5b747e', { label: 'Painted steel' });
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
const wheelY=(x:number,y:number,z:number,w:number,d:number,h:number)=>{const radius=Math.min(w,h)*0.48;return loftCylinder(d,radius,10).rotateX(90).translate(x,y+d/2,z+radius).scale(scale);};

const p = assembly("postal-sack-loader");
p.part("base", b(0,0,0,760,650,90).color(structuralSteel));
p.part("deck", b(0,40,420,700,560,60).color(paintedSteel));
p.part("roller-a", rollerX(0,-170,455,630,34,24).color(stainlessSteel));
p.part("roller-b", rollerX(0,0,455,630,34,24).color(stainlessSteel));
p.part("roller-c", rollerX(0,170,455,630,34,24).color(stainlessSteel));
p.part("handle-left", b(-300,220,90,55,55,950).color(paintedSteel));
p.part("handle-right", b(300,220,90,55,55,950).color(paintedSteel));
p.part("handle-top", b(0,220,1040,650,55,55).color(paintedSteel));
p.part("stop-left", b(-310,-170,480,40,55,170).color(safetyAmber));
p.part("stop-right", b(310,-170,480,40,55,170).color(safetyAmber));
p.part("wheel-front", wheelY(0,-280,0,500,90,120).color(paintedSteel));

return p.model();
