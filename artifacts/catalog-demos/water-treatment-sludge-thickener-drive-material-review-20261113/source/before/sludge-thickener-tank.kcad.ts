// SPDX-License-Identifier: CC0-1.0
// Sludge thickener tank: Circular thickener tank with deep skirt, center feed well, bridge beam and scraper arm. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sludge-thickener-tank",
  license: 'CC0-1.0',
  title: "Sludge thickener tank",
  description: "Circular thickener tank with deep skirt, center feed well, bridge beam and scraper arm. Parameters: overall scale and concrete, structural steel; weathered and highVisibility presets.",
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

const p=assembly("sludge-thickener-tank");
p.part("tank",c(0,0,0,480,500,16).color(concrete));
p.part("rim",c(0,0,460,60,535,16).color(concrete));
p.part("feed-well",c(0,0,520,220,150,12).color(concrete));
p.part("bridge",b(0,0,555,990,60,50).color(structuralSteel));
p.part("drive",b(0,0,605,190,160,110).color(concrete));
p.part("scraper-arm",b(0,0,230,760,45,45).color(concrete));
p.part("skirt",c(0,0,0,160,520,16).color(concrete));

return p.model();
