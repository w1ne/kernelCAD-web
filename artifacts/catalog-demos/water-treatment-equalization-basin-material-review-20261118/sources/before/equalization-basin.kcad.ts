// SPDX-License-Identifier: CC0-1.0
// Equalization basin: Low open equalization basin with thick perimeter walls and a central mixer column. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "equalization-basin",
  license: 'CC0-1.0',
  title: "Equalization basin",
  description: "Low open equalization basin with thick perimeter walls and a central mixer column. Parameters: overall scale and concrete, stainless steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#9b9587', stainlessSteel: '#9ca7a6' },
  highVisibility: { concrete: '#c6bdac', stainlessSteel: '#e1ddd0' },
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

const p=assembly("equalization-basin");
p.part("floor",b(0,0,0,1400,1100,40).color(stainlessSteel));
p.part("wall-front",b(0,-520,20,1400,60,480).color(concrete));
p.part("wall-back",b(0,520,20,1400,60,480).color(concrete));
p.part("wall-left",b(-670,0,20,60,1000,480).color(concrete));
p.part("wall-right",b(670,0,20,60,1000,480).color(concrete));
p.part("mixer-pedestal",c(0,0,40,460,120,10).color(concrete));
p.part("mixer-arm",b(0,0,480,800,70,60).color(concrete));
p.part("mixer-hub",c(0,0,410,140,95,10).color(concrete));

return p.model();
