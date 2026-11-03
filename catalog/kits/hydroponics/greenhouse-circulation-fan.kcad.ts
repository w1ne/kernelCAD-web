// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "greenhouse-circulation-fan",
  license: 'CC0-1.0',
  title: "Greenhouse circulation fan",
  description: "Guarded circulation fan on a floor stand with a broad base, mast and cross-blade rotor. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697e77", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("greenhouse-circulation-fan");
p.part("base-foot", b(0,0,0,680,420,70).color(color));
p.part("mast", b(0,0,70,65,65,1070).color(color));
p.part("motor-housing", b(0,0,1140,260,250,220).color(color));
p.part("blade-horizontal", b(0,0,1270,760,55,55).color(color));
p.part("blade-vertical", b(0,0,1270,55,760,55).color(color));
p.part("guard-crossbar-a", b(0,0,1420,620,34,34).color(color));
p.part("guard-crossbar-b", b(0,0,1420,34,620,34).color(color));
p.part("fan-guard", c(0,0,1320,55,380,10).color(color));
p.part("hub", c(0,0,1260,140,86,10).color(color));
p.part("stand-collar", c(0,0,1070,100,68,10).color(color));

return p.model();
