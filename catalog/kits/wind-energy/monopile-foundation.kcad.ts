// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "monopile-foundation",
  license: 'CC0-1.0',
  title: "Monopile foundation",
  description: "Short offshore monopile foundation with top rim, four fender blocks and a flat seabed shoe. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777d7a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("monopile-foundation");
p.part("pile",c(0,0,30,800,260,8).color(color));
p.part("rim",c(0,0,780,80,290,8).color(color));
p.part("shoe",b(0,0,0,720,720,60).color(color));
p.part("fender-0",b(0,-290,80,150,150,520).color(color));
p.part("fender-1",b(290,0,80,150,150,520).color(color));
p.part("fender-2",b(0,290,80,150,150,520).color(color));
p.part("fender-3",b(-290,0,80,150,150,520).color(color));

return p.model();
