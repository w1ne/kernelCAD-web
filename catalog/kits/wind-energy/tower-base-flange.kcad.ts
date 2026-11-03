// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tower-base-flange",
  license: 'CC0-1.0',
  title: "Tower base flange",
  description: "Circular tower base flange with raised center sleeve and eight anchor bosses. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747c7d", { label: 'Asset color' });
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("tower-base-flange");
p.part("flange",c(0,0,0,90,310,12).color(color));
p.part("sleeve",c(0,0,90,540,120,8).color(color));
p.part("anchor-0",c(0,-250,0,70,32,8).color(color));
p.part("anchor-1",c(177,-177,0,70,32,8).color(color));
p.part("anchor-2",c(250,0,0,70,32,8).color(color));
p.part("anchor-3",c(177,177,0,70,32,8).color(color));
p.part("anchor-4",c(0,250,0,70,32,8).color(color));
p.part("anchor-5",c(-177,177,0,70,32,8).color(color));
p.part("anchor-6",c(-250,0,0,70,32,8).color(color));
p.part("anchor-7",c(-177,-177,0,70,32,8).color(color));

return p.model();
