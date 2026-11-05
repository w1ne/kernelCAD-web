// SPDX-License-Identifier: CC0-1.0
// Surface aerator assembly: Floating bridge aerator with twin pontoons, motor housing and a low polygon rotor guard. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "surface-aerator",
  license: 'CC0-1.0',
  title: "Surface aerator assembly",
  description: "Floating bridge aerator with twin pontoons, motor housing and a low polygon rotor guard. Parameters: overall scale and coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
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

const p=assembly("surface-aerator");
p.part("pontoon-left",b(-300,0,10,520,180,80).color(structuralSteel));
p.part("pontoon-right",b(300,0,10,520,180,80).color(structuralSteel));
p.part("bridge",b(0,0,95,800,110,60).color(structuralSteel));
p.part("motor",b(0,0,180,260,220,170).color(coatedSteel));
p.part("shaft",c(0,0,40,160,45,10).color(stainlessSteel));
p.part("guard",b(0,0,0,420,420,35).color(structuralSteel));
p.part("guard-post--180--180",b(-180,-180,35,28,28,180).color(structuralSteel));
p.part("guard-post--180-180",b(-180,180,35,28,28,180).color(structuralSteel));
p.part("guard-post-180--180",b(180,-180,35,28,28,180).color(structuralSteel));
p.part("guard-post-180-180",b(180,180,35,28,28,180).color(structuralSteel));

return p.model();
