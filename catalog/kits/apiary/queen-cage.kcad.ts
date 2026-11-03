// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "queen-cage",
  license: 'CC0-1.0',
  title: "Queen introduction cage",
  description: "Small ventilated queen cage with end plugs, hanging loop and cross bars. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b79b68", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("queen-cage");
p.part("cage-body",b(0,0,20,180,90,230).color(color));
p.part("end-low",b(0,0,0,190,100,25).color(color));
p.part("end-high",b(0,0,250,190,100,25).color(color));
p.part("vent-0",b(-65,-50,45,16,12,180).color(color));
p.part("vent-1",b(-22,-50,45,16,12,180).color(color));
p.part("vent-2",b(21,-50,45,16,12,180).color(color));
p.part("vent-3",b(64,-50,45,16,12,180).color(color));
p.part("hanging-loop",b(0,0,275,85,35,45).color(color));

return p.model();
