// SPDX-License-Identifier: CC0-1.0
// Membrane filtration rack: Skid-mounted membrane rack with four horizontal pressure tubes and end manifold rails. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "membrane-filtration-rack",
  license: 'CC0-1.0',
  title: "Membrane filtration rack",
  description: "Skid-mounted membrane rack with four horizontal pressure tubes and end manifold rails. Parameters: overall scale and coated equipment steel, structural steel, polymer; weathered and highVisibility presets.",
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
const polymer = param('polymer', '#719582', { label: 'Polymer' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', polymer: '#718477' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', polymer: '#e4bd43' },
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

const p=assembly("membrane-filtration-rack");
p.part("base-left",b(-470,0,0,90,700,50).color(structuralSteel));
p.part("base-right",b(470,0,0,90,700,50).color(structuralSteel));
p.part("membrane-0",c(0,-270,95,620,82,10).color(polymer));
p.part("membrane-1",c(0,-90,95,620,82,10).color(polymer));
p.part("membrane-2",c(0,90,95,620,82,10).color(polymer));
p.part("membrane-3",c(0,270,95,620,82,10).color(polymer));
p.part("manifold-left",b(-350,0,235,70,750,65).color(coatedSteel));
p.part("manifold-right",b(350,0,235,70,750,65).color(coatedSteel));
p.part("post--430",b(-430,0,50,55,60,370).color(structuralSteel));
p.part("post-430",b(430,0,50,55,60,370).color(structuralSteel));

return p.model();
