// SPDX-License-Identifier: CC0-1.0
// Aeration basin: Rectangular aeration basin with divider wall, two pipe headers and service walkway. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "aeration-basin",
  license: 'CC0-1.0',
  title: "Aeration basin",
  description: "Rectangular aeration basin with divider wall, two pipe headers and service walkway. Parameters: overall scale and concrete, structural steel, stainless steel; weathered and highVisibility presets.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#9b9587', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { concrete: '#c6bdac', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
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

const p=assembly("aeration-basin");
p.part("basin-floor",b(0,0,0,1500,950,40).color(concrete));
p.part("wall-front",b(0,-450,20,1500,55,450).color(concrete));
p.part("wall-back",b(0,450,20,1500,55,450).color(concrete));
p.part("divider",b(0,0,20,60,850,400).color(concrete));
p.part("walkway",b(0,0,480,1500,180,60).color(structuralSteel));
p.part("header-left",c(-420,0,440,760,55,10).color(stainlessSteel));
p.part("header-right",c(420,0,440,760,55,10).color(stainlessSteel));

return p.model();
