// SPDX-License-Identifier: CC0-1.0
// Dual pump manifold skid: Two pump bodies joined by a common suction header, discharge header and service frame. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "dual-pump-manifold-skid",
  license: 'CC0-1.0',
  title: "Dual pump manifold skid",
  description: "Two pump bodies joined by a common suction header, discharge header and service frame. Parameters: overall scale and coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
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

const p=assembly("dual-pump-manifold-skid");
p.part("base",b(0,0,0,1200,640,50).color(structuralSteel));
p.part("pump-0",c(-340,0,55,240,115,10).color(coatedSteel));
p.part("pump-1",c(340,0,55,240,115,10).color(coatedSteel));
p.part("suction-header",c(0,-240,145,760,40,10).color(stainlessSteel));
p.part("discharge-header",c(0,240,275,760,40,10).color(stainlessSteel));
p.part("branch-0",b(-340,0,135,55,220,150).color(coatedSteel));
p.part("branch-1",b(340,0,135,55,220,150).color(coatedSteel));
p.part("frame-post--500",b(-500,0,50,45,55,320).color(structuralSteel));
p.part("frame-post-500",b(500,0,50,45,55,320).color(structuralSteel));
p.part("top-frame",b(0,0,370,1050,45,45).color(structuralSteel));

return p.model();
