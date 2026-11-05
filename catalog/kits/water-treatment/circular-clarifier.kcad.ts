// SPDX-License-Identifier: CC0-1.0
// Circular clarifier tank: Circular clarifier with wide rim, central feed well, bridge beam and scraper drive housing. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "circular-clarifier",
  license: 'CC0-1.0',
  title: "Circular clarifier tank",
  description: "Circular clarifier with wide rim, central feed well, bridge beam and scraper drive housing. Parameters: overall scale and concrete, structural steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
presets({
  weathered: { concrete: '#9b9587', structuralSteel: '#6e6b63' },
  highVisibility: { concrete: '#c6bdac', structuralSteel: '#505b60' },
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

const p=assembly("circular-clarifier");
p.part("tank",c(0,0,0,430,520,16).color(concrete));
p.part("rim",c(0,0,420,70,560,16).color(concrete));
p.part("feed-well",c(0,0,470,220,165,12).color(concrete));
p.part("bridge",b(0,0,500,1000,65,55).color(structuralSteel));
p.part("drive",b(0,0,555,230,180,100).color(concrete));
p.part("walkway",b(0,250,475,560,110,45).color(structuralSteel));

return p.model();
