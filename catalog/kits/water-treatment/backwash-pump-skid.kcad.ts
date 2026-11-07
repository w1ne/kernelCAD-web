// SPDX-License-Identifier: CC0-1.0
// Filter backwash pump skid: Twin backwash pump set on a shared base with suction headers and motor blocks. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "backwash-pump-skid",
  license: 'CC0-1.0',
  title: "Filter backwash pump skid",
  description: "Twin backwash pump set on a shared base with suction headers and motor blocks. Parameters: overall scale and coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
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
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
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

const p=assembly("backwash-pump-skid");
p.part("base",b(0,0,0,1250,560,50).color(structuralSteel));
p.part("pump-a",c(-320,0,50,250,120,10).color(coatedSteel));
p.part("pump-b",c(320,0,50,250,120,10).color(coatedSteel));
p.part("motor-a",b(-320,0,205,320,240,180).color(coatedSteel));
p.part("motor-b",b(320,0,205,320,240,180).color(coatedSteel));
p.part("suction-header",c(0,-230,255,850,42,10).color(stainlessSteel));
p.part("discharge-header",c(0,230,255,850,42,10).color(stainlessSteel));
p.part("foot--420",b(-420,0,25,85,120,60).color(structuralSteel));
p.part("foot-420",b(420,0,25,85,120,60).color(structuralSteel));

return p.model();
