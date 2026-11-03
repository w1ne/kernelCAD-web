// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tower-ladder-section",
  license: 'CC0-1.0',
  title: "Tower ladder section",
  description: "Straight internal ladder segment with side rails, rungs and two wall mounts. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#666f70", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("tower-ladder-section");
p.part("rail-left",b(0,-130,0,45,45,1200).color(color));
p.part("rail-right",b(0,130,0,45,45,1200).color(color));
p.part("rung-0",b(0,0,55,260,45,40).color(color));
p.part("rung-1",b(0,0,200,260,45,40).color(color));
p.part("rung-2",b(0,0,345,260,45,40).color(color));
p.part("rung-3",b(0,0,490,260,45,40).color(color));
p.part("rung-4",b(0,0,635,260,45,40).color(color));
p.part("rung-5",b(0,0,780,260,45,40).color(color));
p.part("rung-6",b(0,0,925,260,45,40).color(color));
p.part("rung-7",b(0,0,1070,260,45,40).color(color));
p.part("mount-low",b(0,100,175,400,40,55).color(color));
p.part("mount-high",b(0,100,925,400,40,55).color(color));

return p.model();
