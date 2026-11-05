// SPDX-License-Identifier: CC0-1.0
// Gravity roller conveyor: Short gravity roller section with raised containment rails and two-height support stands. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "gravity-roller-conveyor",
  license: 'CC0-1.0',
  title: "Gravity roller conveyor",
  description: "Short gravity roller section with raised containment rails and two-height support stands. Scale, painted steel, stainless steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#758078', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', stainlessSteel: '#9ea7a6', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', stainlessSteel: '#d9e0de', structuralSteel: '#454f54' },
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

const p = assembly("gravity-roller-conveyor");
p.part("roller-bed", rollerX(0,0,620,600,950,65).color(paintedSteel));
p.part("left-guide", b(-295,0,685,25,950,80).color(stainlessSteel));
p.part("right-guide", b(295,0,685,25,950,80).color(stainlessSteel));
p.part("front-leg-left", b(-220,-360,0,55,55,600).color(structuralSteel));
p.part("front-leg-right", b(220,-360,0,55,55,600).color(structuralSteel));
p.part("rear-leg-left", b(-220,360,0,55,55,470).color(structuralSteel));
p.part("rear-leg-right", b(220,360,0,55,55,470).color(structuralSteel));
p.part("roller-1", rollerX(0,-330,690,530,38,24).color(stainlessSteel));
p.part("roller-2", rollerX(0,-165,690,530,38,24).color(stainlessSteel));
p.part("roller-3", rollerX(0,0,690,530,38,24).color(stainlessSteel));
p.part("roller-4", rollerX(0,165,690,530,38,24).color(stainlessSteel));
p.part("roller-5", rollerX(0,330,690,530,38,24).color(stainlessSteel));

return p.model();
