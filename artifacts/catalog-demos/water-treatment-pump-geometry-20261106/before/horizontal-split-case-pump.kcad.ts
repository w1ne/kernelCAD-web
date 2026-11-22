// SPDX-License-Identifier: CC0-1.0
// Horizontal split case pump: Horizontal pump casing with paired suction-discharge ports, base rails and motor coupling. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "horizontal-split-case-pump",
  license: 'CC0-1.0',
  title: "Horizontal split case pump",
  description: "Horizontal pump casing with paired suction-discharge ports, base rails and motor coupling. Parameters: overall scale and coated equipment steel, structural steel, stainless steel, elastomer; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const elastomer = param('elastomer', '#343b3e', { label: 'Elastomer' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', elastomer: '#3b3d3d' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', elastomer: '#282d30' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const section = (radius:number, sides:number) => {
  let outline = path().moveTo(radius * Math.cos(Math.PI / 2), radius * Math.sin(Math.PI / 2));
  for (let k = 1; k < sides; k++) {
    const angle = Math.PI / 2 + (2 * Math.PI * k) / sides;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder = (height:number, radius:number, sides:number) => {
  const levels = [0, height * 0.08, height * 0.92, height];
  const radii = [radius * 0.9, radius, radius, radius * 0.9];
  const profiles = levels.map((_, index) => section(radii[index], sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("horizontal-split-case-pump");
p.part("base",b(0,0,0,1050,450,50).color(structuralSteel));
p.part("pump-case",c(-150,0,55,240,170,10).color(coatedSteel));
p.part("suction",c(-150,-230,70,180,75,10).color(stainlessSteel));
p.part("discharge",c(-150,230,70,180,75,10).color(stainlessSteel));
p.part("motor",b(260,0,155,400,300,240).color(coatedSteel));
p.part("coupling",c(70,0,160,120,38,10).color(elastomer));
p.part("foot--380",b(-380,0,30,120,210,55).color(structuralSteel));
p.part("foot-120",b(120,0,30,120,210,55).color(structuralSteel));
p.part("foot-390",b(390,0,30,120,210,55).color(structuralSteel));

return p.model();
