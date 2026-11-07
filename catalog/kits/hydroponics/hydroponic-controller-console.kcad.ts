// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hydroponic-controller-console",
  license: 'CC0-1.0',
  title: "Hydroponic controller console",
  description: "Floor console with raised display hood, selector knobs, lower service door and base plinth. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#617c76", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("hydroponic-controller-console");
p.part("plinth", b(0,0,0,760,560,100).color(color));
p.part("cabinet", b(0,0,100,700,500,1120).color(color));
p.part("display-hood", b(0,-80,1220,650,350,140).color(color));
p.part("screen", b(0,-262,890,420,25,280).color(color));
p.part("lower-door", b(0,-255,360,520,30,420).color(color));
p.part("left-button", b(-240,-285,610,70,35,70).color(color));
p.part("right-button", b(240,-285,610,70,35,70).color(color));
p.part("selector-left", c(-230,-290,500,75,38,10).color(color));
p.part("selector-right", c(230,-290,500,75,38,10).color(color));
p.part("signal-stack", c(270,210,1230,280,34,10).color(color));

return p.model();
