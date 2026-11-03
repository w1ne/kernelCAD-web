// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "queen-excluder",
  license: 'CC0-1.0',
  title: "Queen excluder",
  description: "Flat framed excluder grid with a dense array of narrow parallel bars. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8f846d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("queen-excluder");
p.part("frame-front",b(0,-245,0,620,30,32).color(color));
p.part("frame-back",b(0,245,0,620,30,32).color(color));
p.part("frame-left",b(-295,0,0,30,460,32).color(color));
p.part("frame-right",b(295,0,0,30,460,32).color(color));
p.part("grid-0",b(-250,0,20,14,460,14).color(color));
p.part("grid-1",b(-200,0,20,14,460,14).color(color));
p.part("grid-2",b(-150,0,20,14,460,14).color(color));
p.part("grid-3",b(-100,0,20,14,460,14).color(color));
p.part("grid-4",b(-50,0,20,14,460,14).color(color));
p.part("grid-5",b(0,0,20,14,460,14).color(color));
p.part("grid-6",b(50,0,20,14,460,14).color(color));
p.part("grid-7",b(100,0,20,14,460,14).color(color));
p.part("grid-8",b(150,0,20,14,460,14).color(color));
p.part("grid-9",b(200,0,20,14,460,14).color(color));
p.part("grid-10",b(250,0,20,14,460,14).color(color));

return p.model();
