// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "apiary-sign",
  license: 'CC0-1.0',
  title: "Apiary sign",
  description: "Outdoor apiary marker with framed sign panel, two posts and weighted feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#987a4f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("apiary-sign");
p.part("panel",b(0,0,620,660,55,360).color(color));
p.part("top-frame",b(0,0,990,700,75,55).color(color));
p.part("post-left",b(-250,0,50,55,55,570).color(color));
p.part("post-right",b(250,0,50,55,55,570).color(color));
p.part("foot-left",b(-250,0,0,180,180,50).color(color));
p.part("foot-right",b(250,0,0,180,180,50).color(color));

return p.model();
