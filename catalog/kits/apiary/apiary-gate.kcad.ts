// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "apiary-gate",
  license: 'CC0-1.0',
  title: "Apiary gate",
  description: "Simple yard gate with two posts, cross rails and a hinged-looking framed panel. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7e765f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("apiary-gate");
p.part("post-left",b(-500,0,0,75,75,1120).color(color));
p.part("post-right",b(500,0,0,75,75,1120).color(color));
p.part("gate-top",b(0,0,945,980,55,55).color(color));
p.part("gate-bottom",b(0,0,85,980,55,55).color(color));
p.part("gate-rail-a",b(0,0,315,900,45,45).color(color));
p.part("gate-rail-b",b(0,0,615,900,45,45).color(color));
p.part("gate-brace",b(0,0,65,50,60,850).color(color));
p.part("post-cap-left",b(-500,0,1120,110,110,35).color(color));
p.part("post-cap-right",b(500,0,1120,110,110,35).color(color));

return p.model();
