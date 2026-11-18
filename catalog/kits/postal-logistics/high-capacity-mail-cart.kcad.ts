// SPDX-License-Identifier: CC0-1.0
// High-capacity mail cart: Two-tier mail cart with push handle, corner guards and four block-style caster housings. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "high-capacity-mail-cart",
  license: 'CC0-1.0',
  title: "High-capacity mail cart",
  description: "Two-tier mail cart with push handle, corner guards and four block-style caster housings. Scale, painted steel, rubber, structural steel, safety amber, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#60767c', { label: 'Painted steel' });
const rubber = param('rubber', '#30373b', { label: 'Rubber' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
presets({
  weathered: { paintedSteel: '#68777a', rubber: '#3d3d39', structuralSteel: '#67675f', safetyAmber: '#bb8c34' },
  highVisibility: { paintedSteel: '#e36d32', rubber: '#252b2e', structuralSteel: '#454f54', safetyAmber: '#ffd12f' },
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

const p = assembly("high-capacity-mail-cart");
p.part("lower-deck", b(0,0,230,760,560,65).color(paintedSteel));
p.part("upper-deck", b(0,0,780,760,560,65).color(paintedSteel));
p.part("upright-left", b(-330,220,295,55,55,1030).color(structuralSteel));
p.part("upright-right", b(330,220,295,55,55,1030).color(structuralSteel));
p.part("push-handle", b(0,220,1300,760,55,55).color(paintedSteel));
p.part("wheel-front-left", wheelY(-330,-220,0,120,100,230).color(rubber));
p.part("wheel-front-right", wheelY(330,-220,0,120,100,230).color(rubber));
p.part("wheel-back-left", wheelY(-330,220,0,120,100,230).color(rubber));
p.part("wheel-back-right", wheelY(330,220,0,120,100,230).color(rubber));
p.part("lower-stop", b(0,-270,295,700,35,100).color(safetyAmber));
p.part("upper-stop", b(0,-270,845,700,35,100).color(safetyAmber));

return p.model();
