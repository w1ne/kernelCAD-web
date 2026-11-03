// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "solution-mixing-tank",
  license: 'CC0-1.0',
  title: "Solution mixing tank",
  description: "Vertical mixing vessel with top motor bridge, short agitator shaft and side sampling ports. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c8379", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("solution-mixing-tank");
p.part("tank-body", b(0,0,0,1000,1000,1300).color(color));
p.part("top-rim", b(0,0,1300,1040,1040,75).color(color));
p.part("motor-bridge", b(0,0,1375,700,100,90).color(color));
p.part("motor-cover", b(0,0,1465,300,300,210).color(color));
p.part("service-panel", b(0,-505,320,550,28,420).color(color));
p.part("leg-front", b(0,-360,0,900,70,110).color(color));
p.part("agitator-shaft", c(0,0,180,1130,32,10).color(color));
p.part("agitator-blade", c(0,0,530,110,220,10).color(color));
p.part("sampling-port", c(0,-540,410,170,32,10).color(color));
p.part("drain-outlet", c(360,-530,70,150,35,10).color(color));

return p.model();
