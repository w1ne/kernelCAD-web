// SPDX-License-Identifier: CC0-1.0
// Treatment process pipe rack: Low pipe rack with four parallel process lines, portal supports and end cross braces. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "process-pipe-rack",
  license: 'CC0-1.0',
  title: "Treatment process pipe rack",
  description: "Low pipe rack with four parallel process lines, portal supports and end cross braces. Parameters: overall scale and structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
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

const p=assembly("process-pipe-rack");
p.part("pipe-0",c(0,-300,215,1300,34,10).color(stainlessSteel));
p.part("pipe-1",c(0,-100,215,1300,34,10).color(stainlessSteel));
p.part("pipe-2",c(0,100,215,1300,34,10).color(stainlessSteel));
p.part("pipe-3",c(0,300,215,1300,34,10).color(stainlessSteel));
p.part("portal-leg--520",b(-520,0,0,55,640,420).color(structuralSteel));
p.part("portal-leg-520",b(520,0,0,55,640,420).color(structuralSteel));
p.part("portal-top-a",b(-520,0,395,75,650,55).color(stainlessSteel));
p.part("portal-top-b",b(520,0,395,75,650,55).color(stainlessSteel));
p.part("cross-brace",b(0,0,415,1080,45,45).color(structuralSteel));

return p.model();
