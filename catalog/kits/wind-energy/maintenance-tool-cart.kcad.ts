// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "maintenance-tool-cart",
  license: 'CC0-1.0',
  title: "Turbine maintenance tool cart",
  description: "Compact maintenance cart with two shelves, push handle and four low polygon casters. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737a77", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("maintenance-tool-cart");
p.part("lower",b(0,0,120,850,520,65).color(color));
p.part("upper",b(0,0,520,850,520,65).color(color));
p.part("post--360--210",b(-360,-210,120,45,45,400).color(color));
p.part("post--360-210",b(-360,210,120,45,45,400).color(color));
p.part("post-360--210",b(360,-210,120,45,45,400).color(color));
p.part("post-360-210",b(360,210,120,45,45,400).color(color));
p.part("handle",b(0,260,760,760,45,45).color(color));
p.part("wheel--330--210",c(-330,-210,0,75,75,8).color(color));
p.part("wheel--330-210",c(-330,210,0,75,75,8).color(color));
p.part("wheel-330--210",c(330,-210,0,75,75,8).color(color));
p.part("wheel-330-210",c(330,210,0,75,75,8).color(color));

return p.model();
