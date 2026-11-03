// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sorter-emergency-stop-pedestal",
  license: 'CC0-1.0',
  title: "Sorter emergency-stop pedestal",
  description: "Standalone emergency-stop post with a weighted base, button head and low protective collar. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7372", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("sorter-emergency-stop-pedestal");
p.part("base", b(0,0,0,300,300,70).color(color));
p.part("post", b(0,0,70,95,95,770).color(color));
p.part("head", b(0,0,840,210,190,130).color(color));
p.part("button", c(0,-100,870,75,55,8).color(color));
p.part("guard-left", b(-115,-100,870,30,150,120).color(color));
p.part("guard-right", b(115,-100,870,30,150,120).color(color));
p.part("cable-outlet", b(0,45,200,135,60,90).color(color));
p.part("mounting-foot-left", b(-95,0,0,50,230,45).color(color));
p.part("mounting-foot-right", b(95,0,0,50,230,45).color(color));

return p.model();
