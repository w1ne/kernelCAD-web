// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "screened-bottom-board",
  license: 'CC0-1.0',
  title: "Screened bottom board",
  description: "Hive floor assembly with screen grid, side rails and front entrance ledge. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77786d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("screened-bottom-board");
p.part("floor",b(0,0,5,660,500,45).color(color));
p.part("rail-left",b(-315,0,45,35,520,80).color(color));
p.part("rail-right",b(315,0,45,35,520,80).color(color));
p.part("screen-bar-a",b(-180,0,55,18,440,12).color(color));
p.part("screen-bar-b",b(-90,0,55,18,440,12).color(color));
p.part("screen-bar-c",b(0,0,55,18,440,12).color(color));
p.part("screen-bar-d",b(90,0,55,18,440,12).color(color));
p.part("screen-bar-e",b(180,0,55,18,440,12).color(color));
p.part("entrance-ledge",b(0,-290,0,760,100,35).color(color));

return p.model();
