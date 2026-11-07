// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "beeswax-block",
  license: 'CC0-1.0',
  title: "Beeswax block",
  description: "Rectangular low-poly beeswax cake with shallow mold ribs and end tabs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d2a64f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("beeswax-block");
p.part("block",b(0,0,0,420,290,150).color(color));
p.part("top",b(0,0,150,400,270,30).color(color));
p.part("rib-left",b(-160,0,150,22,270,25).color(color));
p.part("rib-right",b(160,0,150,22,270,25).color(color));
p.part("tab-front",b(0,-160,10,130,30,50).color(color));
p.part("tab-back",b(0,160,10,130,30,50).color(color));

return p.model();
