// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "beekeeper-veil-hood",
  license: 'CC0-1.0',
  title: "Beekeeper veil hood",
  description: "Hat brim and crown framed by a squared mesh veil and lower neck band. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d1cbb4", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("beekeeper-veil-hood");
p.part("brim",b(0,0,245,380,380,35).color(color));
p.part("crown",b(0,0,355,230,230,170).color(color));
p.part("veil-front",b(0,-175,25,330,20,220).color(color));
p.part("veil-back",b(0,175,25,330,20,220).color(color));
p.part("veil-left",b(-155,0,25,20,330,220).color(color));
p.part("veil-right",b(155,0,25,20,330,220).color(color));
p.part("neck-band",b(0,0,0,350,350,30).color(color));

return p.model();
