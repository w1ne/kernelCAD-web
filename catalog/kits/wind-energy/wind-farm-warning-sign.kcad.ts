// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wind-farm-warning-sign",
  license: 'CC0-1.0',
  title: "Wind farm warning sign",
  description: "Field warning placard with two posts, reinforced top edge and weighted feet. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d1a644", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("wind-farm-warning-sign");
p.part("panel",b(0,0,950,850,45,560).color(color));
p.part("top-edge",b(0,0,1240,870,65,40).color(color));
p.part("post--300",b(-300,0,30,55,55,900).color(color));
p.part("post-300",b(300,0,30,55,55,900).color(color));
p.part("foot--300",b(-300,0,0,180,180,50).color(color));
p.part("foot-300",b(300,0,0,180,180,50).color(color));

return p.model();
