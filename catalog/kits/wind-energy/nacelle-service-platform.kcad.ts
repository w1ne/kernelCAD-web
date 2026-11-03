// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nacelle-service-platform",
  license: 'CC0-1.0',
  title: "Nacelle service platform",
  description: "Narrow service walkway with guard rails, mounting brackets and an access ladder stub. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737c79", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("nacelle-service-platform");
p.part("deck",b(0,0,70,1050,360,70).color(color));
p.part("rail-left",b(0,-180,130,1000,35,90).color(color));
p.part("rail-right",b(0,180,130,1000,35,90).color(color));
p.part("post--440",b(-440,0,130,35,35,640).color(color));
p.part("post-440",b(440,0,130,35,35,640).color(color));
p.part("ladder",b(0,-220,0,400,50,450).color(color));

return p.model();
