// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nutrient-solution-chiller",
  license: 'CC0-1.0',
  title: "Nutrient solution chiller",
  description: "Compact process cooler with front grille bars, top controls and paired pipe connections. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b807b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("nutrient-solution-chiller");
p.part("base", b(0,0,0,740,650,85).color(color));
p.part("chiller-body", b(0,0,85,700,610,720).color(color));
p.part("top-panel", b(0,0,805,730,640,65).color(color));
p.part("front-door", b(0,-310,190,610,28,490).color(color));
p.part("grille-a", b(0,-333,250,440,18,28).color(color));
p.part("grille-b", b(0,-333,310,440,18,28).color(color));
p.part("grille-c", b(0,-333,370,440,18,28).color(color));
p.part("control-pod", b(220,-350,630,220,65,120).color(color));
p.part("inlet-port", c(-300,0,310,210,38,10).color(color));
p.part("outlet-port", c(300,0,520,210,38,10).color(color));
p.part("service-knob", c(260,-390,600,58,26,10).color(color));

return p.model();
