// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hive-inspection-mirror",
  license: 'CC0-1.0',
  title: "Hive inspection mirror",
  description: "Hand inspection mirror with grip, neck joint and framed rectangular viewing plate. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7d837f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-inspection-mirror");
p.part("handle",b(0,0,30,60,60,330).color(color));
p.part("grip-cap",b(0,0,0,90,85,35).color(color));
p.part("neck",b(0,0,360,38,38,110).color(color));
p.part("back-plate",b(0,-15,470,290,40,210).color(color));
p.part("mirror-face",b(0,-40,480,245,15,165).color(color));
p.part("frame-top",b(0,-50,570,300,25,28).color(color));
p.part("frame-bottom",b(0,-50,470,300,25,28).color(color));

return p.model();
