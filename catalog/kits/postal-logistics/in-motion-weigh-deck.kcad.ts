// SPDX-License-Identifier: CC0-1.0
// In-motion weigh deck: Short instrumented roller bed with a raised weighing platform and indicator module. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "in-motion-weigh-deck",
  license: 'CC0-1.0',
  title: "In-motion weigh deck",
  description: "Short instrumented roller bed with a raised weighing platform and indicator module. Scale, painted steel, stainless steel, structural steel, instrument glass, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#697b7b', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const instrumentGlass = param('instrumentGlass', '#57b4c3', { label: 'Instrument glass' });
presets({
  weathered: { paintedSteel: '#68777a', stainlessSteel: '#9ea7a6', structuralSteel: '#67675f', instrumentGlass: '#548a91' },
  highVisibility: { paintedSteel: '#e36d32', stainlessSteel: '#d9e0de', structuralSteel: '#454f54', instrumentGlass: '#6bd0dc' },
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

const p = assembly("in-motion-weigh-deck");
p.part("scale-base", b(0,0,0,780,860,120).color(structuralSteel));
p.part("weigh-deck", b(0,0,520,740,820,70).color(paintedSteel));
p.part("roller-a", rollerX(0,-280,590,680,38,28).color(stainlessSteel));
p.part("roller-b", rollerX(0,-100,590,680,38,28).color(stainlessSteel));
p.part("roller-c", rollerX(0,100,590,680,38,28).color(stainlessSteel));
p.part("roller-d", rollerX(0,280,590,680,38,28).color(stainlessSteel));
p.part("indicator-post", b(470,-340,120,65,65,500).color(structuralSteel));
p.part("indicator-head", b(470,-340,620,220,110,150).color(stainlessSteel));
p.part("display", b(470,-320,660,160,15,75).color(instrumentGlass));
p.part("foot-left", b(-330,-370,0,80,80,80).color(structuralSteel));
p.part("foot-right", b(330,-370,0,80,80,80).color(structuralSteel));

return p.model();
