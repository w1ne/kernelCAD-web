// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mouse-guard",
  license: 'CC0-1.0',
  title: "Hive mouse guard",
  description: "Narrow hive entrance guard plate with a row of evenly spaced vertical bars. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7d817e", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("mouse-guard");
p.part("plate",b(0,0,20,620,32,65).color(color));
p.part("top-rail",b(0,0,85,620,30,25).color(color));
p.part("bottom-rail",b(0,0,0,620,30,25).color(color));
p.part("guard-bar-0",b(-270,0,20,18,28,90).color(color));
p.part("guard-bar-1",b(-210,0,20,18,28,90).color(color));
p.part("guard-bar-2",b(-150,0,20,18,28,90).color(color));
p.part("guard-bar-3",b(-90,0,20,18,28,90).color(color));
p.part("guard-bar-4",b(-30,0,20,18,28,90).color(color));
p.part("guard-bar-5",b(30,0,20,18,28,90).color(color));
p.part("guard-bar-6",b(90,0,20,18,28,90).color(color));
p.part("guard-bar-7",b(150,0,20,18,28,90).color(color));
p.part("guard-bar-8",b(210,0,20,18,28,90).color(color));
p.part("guard-bar-9",b(270,0,20,18,28,90).color(color));

return p.model();
