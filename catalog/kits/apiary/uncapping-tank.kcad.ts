// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "uncapping-tank",
  license: 'CC0-1.0',
  title: "Uncapping tank",
  description: "Open rectangular uncapping tank with rim, ledge and elevated collection legs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8e8e84", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("uncapping-tank");
p.part("tank",b(0,0,150,620,440,250).color(color));
p.part("rim-front",b(0,-220,400,650,35,55).color(color));
p.part("rim-back",b(0,220,400,650,35,55).color(color));
p.part("rim-left",b(-310,0,400,35,405,55).color(color));
p.part("rim-right",b(310,0,400,35,405,55).color(color));
p.part("frame-ledge-left",b(-390,0,440,180,60,45).color(color));
p.part("frame-ledge-right",b(390,0,440,180,60,45).color(color));
p.part("leg--240",b(-240,0,0,55,55,150).color(color));
p.part("leg-240",b(240,0,0,55,55,150).color(color));

return p.model();
