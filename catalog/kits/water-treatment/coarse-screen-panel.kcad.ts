// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "coarse-screen-panel",
  license: 'CC0-1.0',
  title: "Coarse intake screen panel",
  description: "Removable screen panel in a reinforced frame with evenly spaced vertical bars. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626e70", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("coarse-screen-panel");
p.part("frame-left",b(-430,0,0,70,100,820).color(color));
p.part("frame-right",b(430,0,0,70,100,820).color(color));
p.part("frame-top",b(0,0,790,900,100,70).color(color));
p.part("frame-bottom",b(0,0,0,900,100,70).color(color));
p.part("bar-0",b(-330,0,70,24,50,680).color(color));
p.part("bar-1",b(-220,0,70,24,50,680).color(color));
p.part("bar-2",b(-110,0,70,24,50,680).color(color));
p.part("bar-3",b(0,0,70,24,50,680).color(color));
p.part("bar-4",b(110,0,70,24,50,680).color(color));
p.part("bar-5",b(220,0,70,24,50,680).color(color));
p.part("bar-6",b(330,0,70,24,50,680).color(color));
p.part("grip",b(0,-55,810,260,28,55).color(color));

return p.model();
