// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cable-reel-stand",
  license: 'CC0-1.0',
  title: "Power cable reel stand",
  description: "Freestanding cable drum stand with two side supports, bottom tie and central axle. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727976", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("cable-reel-stand");
p.part("foot-left",b(-360,0,0,130,700,60).color(color));
p.part("foot-right",b(360,0,0,130,700,60).color(color));
p.part("upright-left",b(-360,0,340,70,90,680).color(color));
p.part("upright-right",b(360,0,340,70,90,680).color(color));
p.part("axle",c(0,0,550,90,45,8).color(color));
p.part("reel",c(0,0,290,180,240,8).color(color));
p.part("crossbar",b(0,0,660,790,70,55).color(color));

return p.model();
