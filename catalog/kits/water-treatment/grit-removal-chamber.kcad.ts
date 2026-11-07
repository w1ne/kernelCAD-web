// SPDX-License-Identifier: CC0-1.0
// Grit removal chamber: Rectangular grit chamber with sloped-look hopper base, inlet lip and extraction pipe stand. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "grit-removal-chamber",
  license: 'CC0-1.0',
  title: "Grit removal chamber",
  description: "Rectangular grit chamber with sloped-look hopper base, inlet lip and extraction pipe stand. Parameters: overall scale and concrete, stainless steel; weathered and highVisibility presets.",
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

const p=assembly("grit-removal-chamber");
p.part("basin-floor",b(0,0,20,1000,760,40).color(concrete));
p.part("wall-left",b(0,-360,40,1000,40,380).color(concrete));
p.part("wall-right",b(0,360,40,1000,40,380).color(concrete));
p.part("end-wall",b(480,0,40,40,760,380).color(concrete));
p.part("hopper",b(0,0,40,620,480,220).color(concrete));
p.part("draw-off",c(0,0,0,360,65,10).color(concrete));
p.part("inlet-lip",b(-500,0,280,80,720,70).color(stainlessSteel));

return p.model();
