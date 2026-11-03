// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nuc-carrier",
  license: 'CC0-1.0',
  title: "Nucleus hive carrier",
  description: "Compact carrier frame with side handles, bottom slats and corner uprights. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#88765a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("nuc-carrier");
p.part("base",b(0,0,0,500,420,45).color(color));
p.part("rail-left",b(-260,0,40,45,440,280).color(color));
p.part("rail-right",b(260,0,40,45,440,280).color(color));
p.part("handle-left",b(-300,0,320,110,80,45).color(color));
p.part("handle-right",b(300,0,320,110,80,45).color(color));
p.part("cross-front",b(0,-200,220,580,45,45).color(color));
p.part("cross-back",b(0,200,220,580,45,45).color(color));

return p.model();
