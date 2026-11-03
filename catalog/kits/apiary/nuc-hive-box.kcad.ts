// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nuc-hive-box",
  license: 'CC0-1.0',
  title: "Nucleus hive box",
  description: "Compact nucleus colony box with lid, handholds, entrance and bottom board. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9f8156", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("nuc-hive-box");
p.part("base",b(0,0,0,430,360,50).color(color));
p.part("body",b(0,0,50,400,330,390).color(color));
p.part("rim",b(0,0,440,430,360,35).color(color));
p.part("lid",b(0,0,475,470,400,70).color(color));
p.part("handle-left",b(-225,0,230,35,150,110).color(color));
p.part("handle-right",b(225,0,230,35,150,110).color(color));
p.part("entrance",b(0,-180,70,220,20,45).color(color));

return p.model();
