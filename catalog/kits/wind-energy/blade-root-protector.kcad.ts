// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "blade-root-protector",
  license: 'CC0-1.0',
  title: "Blade root protector",
  description: "Protective cover around a turbine blade root with flanged ring and short securing tabs. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c8c8bd", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("blade-root-protector");
p.part("ring",c(0,0,0,80,250,12).color(color));
p.part("sleeve",c(0,0,80,340,200,10).color(color));
p.part("tab-0",b(180,0,20,60,90,50).color(color));
p.part("tab-1",b(-180,0,20,60,90,50).color(color));
p.part("tab-2",b(0,180,20,60,90,50).color(color));
p.part("tab-3",b(0,-180,20,60,90,50).color(color));

return p.model();
