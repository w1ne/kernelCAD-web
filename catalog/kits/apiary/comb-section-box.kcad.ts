// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "comb-section-box",
  license: 'CC0-1.0',
  title: "Comb section box",
  description: "Small presentation box frame with top rim, lower tray and open-look center panel. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b29054", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("comb-section-box");
p.part("base",b(0,0,0,260,220,35).color(color));
p.part("left",b(-115,0,35,30,220,240).color(color));
p.part("right",b(115,0,35,30,220,240).color(color));
p.part("front",b(0,-95,35,230,30,240).color(color));
p.part("back",b(0,95,35,230,30,240).color(color));
p.part("top-rim",b(0,0,275,270,230,35).color(color));
p.part("comb-panel",b(0,0,110,160,12,130).color(color));

return p.model();
