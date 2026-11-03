// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wind-farm-pad-mount-transformer",
  license: 'CC0-1.0',
  title: "Pad-mount transformer",
  description: "Outdoor transformer box with two side cooling banks, top bushings and concrete pad. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#758078", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("wind-farm-pad-mount-transformer");
p.part("pad",b(0,0,0,900,700,50).color(color));
p.part("tank",b(0,0,355,700,520,660).color(color));
p.part("lid",b(0,0,705,760,570,40).color(color));
p.part("fin-0",b(-220,265,365,50,35,470).color(color));
p.part("fin-1",b(-110,265,365,50,35,470).color(color));
p.part("fin-2",b(0,265,365,50,35,470).color(color));
p.part("fin-3",b(110,265,365,50,35,470).color(color));
p.part("fin-4",b(220,265,365,50,35,470).color(color));
p.part("bushing-0",c(-210,-80,725,130,35,8).color(color));
p.part("bushing-1",c(0,-80,725,130,35,8).color(color));
p.part("bushing-2",c(210,-80,725,130,35,8).color(color));

return p.model();
