// SPDX-License-Identifier: CC0-1.0
// Bulk mail sack: Upright dispatch sack with a reinforced base, folded collar and tie-down tabs. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "bulk-mail-sack",
  license: 'CC0-1.0',
  title: "Bulk mail sack",
  description: "Upright dispatch sack with a reinforced base, folded collar and tie-down tabs. Scale, woven fabric, structural steel, label paper, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fabric = param('fabric', '#717b75', { label: 'Woven fabric' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const paper = param('paper', '#eee5ca', { label: 'Label paper' });
presets({
  weathered: { fabric: '#6c6b60', structuralSteel: '#67675f', paper: '#c2b99f' },
  highVisibility: { fabric: '#d66a35', structuralSteel: '#454f54', paper: '#fff1b7' },
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


const p = assembly("bulk-mail-sack");
p.part("sack-body", c(0,0,0,650,250,10).color(fabric));
p.part("folded-collar", b(0,0,610,500,500,90).color(fabric));
p.part("front-tab-left", b(-155,-255,580,80,45,70).color(fabric));
p.part("front-tab-right", b(155,-255,580,80,45,70).color(fabric));
p.part("tie-bar", b(0,-275,655,320,35,40).color(fabric));
p.part("base-seam", b(0,0,55,520,520,38).color(structuralSteel));
p.part("label-patch", b(0,-260,350,170,18,120).color(paper));

return p.model();
