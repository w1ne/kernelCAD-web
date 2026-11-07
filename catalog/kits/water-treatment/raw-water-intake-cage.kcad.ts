// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "raw-water-intake-cage",
  license: 'CC0-1.0',
  title: "Raw water intake cage",
  description: "Protective intake cage with corner posts, horizontal rails and a perforated-look screen face. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7b78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("raw-water-intake-cage");
p.part("base",b(0,0,0,800,700,50).color(color));
p.part("post--360--300",b(-360,-300,25,55,55,800).color(color));
p.part("post--360-300",b(-360,300,25,55,55,800).color(color));
p.part("post-360--300",b(360,-300,25,55,55,800).color(color));
p.part("post-360-300",b(360,300,25,55,55,800).color(color));
p.part("rail-160",b(0,-300,135,720,45,45).color(color));
p.part("rail-400",b(0,-300,375,720,45,45).color(color));
p.part("rail-640",b(0,-300,615,720,45,45).color(color));
p.part("screen-0",b(-280,-270,75,25,20,650).color(color));
p.part("screen-1",b(-200,-270,75,25,20,650).color(color));
p.part("screen-2",b(-120,-270,75,25,20,650).color(color));
p.part("screen-3",b(-40,-270,75,25,20,650).color(color));
p.part("screen-4",b(40,-270,75,25,20,650).color(color));
p.part("screen-5",b(120,-270,75,25,20,650).color(color));
p.part("screen-6",b(200,-270,75,25,20,650).color(color));
p.part("screen-7",b(280,-270,75,25,20,650).color(color));

return p.model();
