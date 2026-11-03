// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "frame-carrier",
  license: 'CC0-1.0',
  title: "Hive frame carrier",
  description: "Portable frame rack with paired side rails, end handles and protective crossbars. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8f7952", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("frame-carrier");
p.part("bottom",b(0,0,0,620,430,55).color(color));
p.part("side-left",b(-295,0,55,40,430,480).color(color));
p.part("side-right",b(295,0,55,40,430,480).color(color));
p.part("handle-left",b(-350,0,535,100,70,40).color(color));
p.part("handle-right",b(350,0,535,100,70,40).color(color));
p.part("cross-front",b(0,-210,490,650,35,35).color(color));
p.part("cross-back",b(0,210,490,650,35,35).color(color));

return p.model();
