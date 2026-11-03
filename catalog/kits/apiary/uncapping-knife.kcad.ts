// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "uncapping-knife",
  license: 'CC0-1.0',
  title: "Uncapping knife",
  description: "Long straight uncapping blade with broad handle and a small guard collar. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#85898a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("uncapping-knife");
p.part("blade",b(0,0,250,40,18,290).color(color));
p.part("blade-tip",b(0,0,520,40,18,45).color(color));
p.part("guard",b(0,0,230,100,55,25).color(color));
p.part("handle",b(0,0,20,70,65,210).color(color));
p.part("pommel",b(0,0,0,85,75,30).color(color));

return p.model();
