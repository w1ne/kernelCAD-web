// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wind-farm-access-gate",
  license: 'CC0-1.0',
  title: "Wind farm access gate",
  description: "Two-post service gate with a framed swing panel and two weighted post shoes. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747b78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("wind-farm-access-gate");
p.part("post-left",b(-700,0,40,75,75,1250).color(color));
p.part("post-right",b(700,0,40,75,75,1250).color(color));
p.part("top",b(0,0,1180,1380,65,65).color(color));
p.part("bottom",b(0,0,110,1380,65,65).color(color));
p.part("bar-a",b(-400,0,155,65,65,1020).color(color));
p.part("bar-b",b(0,0,155,65,65,1020).color(color));
p.part("bar-c",b(400,0,155,65,65,1020).color(color));
p.part("shoe--700",b(-700,0,0,220,220,80).color(color));
p.part("shoe-700",b(700,0,0,220,220,80).color(color));

return p.model();
