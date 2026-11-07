// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "solar-wax-melter",
  license: 'CC0-1.0',
  title: "Solar wax melter",
  description: "Angled-look insulated solar melter box with hinged lid frame, tray and support feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8e7c57", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("solar-wax-melter");
p.part("body",b(0,0,120,600,420,260).color(color));
p.part("lid-frame",b(0,0,390,650,470,55).color(color));
p.part("lid-panel",b(0,0,445,590,410,24).color(color));
p.part("tray",b(0,0,150,470,300,30).color(color));
p.part("front-support-left",b(-230,-150,0,55,55,120).color(color));
p.part("front-support-right",b(230,-150,0,55,55,120).color(color));
p.part("rear-support-left",b(-230,150,0,55,55,180).color(color));
p.part("rear-support-right",b(230,150,0,55,55,180).color(color));
p.part("wax-drain",b(0,-220,160,120,65,45).color(color));

return p.model();
