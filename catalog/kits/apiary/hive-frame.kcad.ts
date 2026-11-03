// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hive-frame",
  license: 'CC0-1.0',
  title: "Hive frame",
  description: "Wooden beehive frame with top bar, side rails, bottom bar and hanging ears. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b08c54", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-frame");
p.part("top-bar",b(0,0,695,500,38,42).color(color));
p.part("ear-left",b(-280,0,695,65,50,30).color(color));
p.part("ear-right",b(280,0,695,65,50,30).color(color));
p.part("side-left",b(-220,0,20,35,32,675).color(color));
p.part("side-right",b(220,0,20,35,32,675).color(color));
p.part("bottom-bar",b(0,0,0,470,35,35).color(color));

return p.model();
